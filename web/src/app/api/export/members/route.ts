import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireRegistrar } from '@/lib/auth/requireRegistrar';

// CSV-safe value - escape quotes and wrap in quotes if contains commas
function csvEscape(
  value: string | number | null
): string {
  const str = String(value || '');

  // If contains comma, quote, or newline, wrap in double quotes and escape internal quotes
  if (
    str.includes(',') ||
    str.includes('"') ||
    str.includes('\n')
  ) {
    return `"${str.replace(
      /"/g,
      '""'
    )}"`;
  }

  return str;
}

// GET /api/export/members - Download all active members as CSV
export async function GET(
  request: NextRequest
) {
  try {
    await requireRegistrar();

    const supabase =
      await createClient();

    // Fetch all active members with their latest assessment year
    const {
      data: members,
      error: membersError,
    } = await supabase
      .from('members')
      .select('*')
      .not(
        'status',
        'in',
        '("Dismissed","Transfer-Out","Deceased")'
      )
      .order('surname');

    if (membersError) {
      throw membersError;
    }

    if (
      !members ||
      members.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            'No members found to export',
        },
        { status: 404 }
      );
    }

    // CSV Headers matching import format + extra columns for export
    const headers = [
      'surname',
      'first_name',
      'other_names',
      'title',
      'occupation',
      'phone',
      'email',
      'status',
      'rank',
      'admission_date',
      'last_assessment_year',
    ];

    // Get latest assessment year per member for export enrichment
    const {
      data: assessments,
      error: assessmentsError,
    } = await supabase
      .from(
        'financial_assessments'
      )
      .select('member_id, year')
      .order('year', {
        ascending: false,
      });

    if (assessmentsError) {
      throw assessmentsError;
    }

    // Build year lookup map
    const memberLastYear =
      new Map<string, number>();

    if (assessments) {
      assessments.forEach(
        (a: any) => {
          if (
            !memberLastYear.has(
              a.member_id
            )
          ) {
            memberLastYear.set(
              a.member_id,
              a.year
            );
          }
        }
      );
    }

    // Build CSV content
    const csvLines = [
      headers.join(','),
    ];

    for (const m of members) {
      const row = headers.map(
        (header) => {
          switch (header) {
            case 'last_assessment_year':
              return String(
                memberLastYear.get(
                  m.id
                ) || ''
              );

            default:
              return csvEscape(
                (m as any)[header]
              );
          }
        }
      );

      csvLines.push(
        row.join(',')
      );
    }

    const csvContent =
      csvLines.join('\n');

    // Return as downloadable file
    const filename = `ksji-members-export-${
      new Date()
        .toISOString()
        .split('T')[0]
    }.csv`;

    return new NextResponse(
      csvContent,
      {
        status: 200,
        headers: {
          'Content-Type':
            'text/csv; charset=utf-8',

          'Content-Disposition': `attachment; filename="${filename}"`,

          'Cache-Control':
            'no-store, no-cache',
        },
      }
    );
  } catch (error) {
    console.error(
      'Export error:',
      error
    );

    return NextResponse.json(
      {
        error:
          'Failed to export members',
      },
      { status: 500 }
    );
  }
}