import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    // Use service role key if available to bypass RLS for public ID verification
    let supabase;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      supabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
    } else {
      supabase = await createClient();
    }

    // Support short ID prefix (e.g. KSJI-589578EF)
    let searchId = id.trim();
    if (searchId.toUpperCase().startsWith('KSJI-')) {
      const shortCode = searchId.slice(5).toLowerCase();
      const { data: matchedMember } = await supabase
        .from('members')
        .select('id')
        .ilike('id', `${shortCode}%`)
        .limit(1)
        .maybeSingle();

      if (matchedMember) {
        searchId = matchedMember.id;
      }
    }

    // Fetch member profile along with degrees, positions, and commandery name
    const { data: member, error } = await supabase
      .from('members')
      .select('*, degrees(*), positions(*), commanderies(name, code)')
      .eq('id', searchId)
      .single();

    if (error || !member) {
      return NextResponse.json(
        { error: 'Membership record not found' },
        { status: 404 }
      );
    }

    // Sanitize and return official public verification payload
    return NextResponse.json({
      id: member.id,
      first_name: member.first_name,
      surname: member.surname,
      other_names: member.other_names,
      title: member.title,
      photo_url: member.photo_url,
      status: member.status,
      date_joined: member.date_joined,
      commandery: member.commanderies?.name || null,
      commandery_code: member.commanderies?.code || null,
      degrees: member.degrees || [],
      positions: member.positions || [],
    });
  } catch (err: any) {
    console.error('Member verification error:', err);
    return NextResponse.json(
      { error: 'Internal server error verifying member ID' },
      { status: 500 }
    );
  }
}
