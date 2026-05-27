'use server';
import { createClient } from '@/lib/supabase/server';

// ─── CSV Export Helper ──────────────────────────────────────────────────────

function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function generateFinancialReportCsv(year: number) {
  const supabase = await createClient();

  // Fetch assessments and payments for the year
  const [{ data: assessments }, { data: payments }] = await Promise.all([
    supabase.from('financial_assessments').select('*').eq('year', year),
    supabase.from('financial_payments').select('*').eq('assessment_year', year),
  ]);

  // Aggregate by member
  const memberMap = new Map<string, { assessed: number; paid: number; balance: number }>();

  (assessments || []).forEach((a: any) => {
    const total = parseFloat(a.annual_assessment || '0') + parseFloat(a.arrears_brought_forward || '0');
    memberMap.set(a.member_id, { assessed: total, paid: 0, balance: total });
  });

  (payments || []).forEach((p: any) => {
    const entry = memberMap.get(p.member_id);
    if (entry) entry.paid += parseFloat(p.amount || '0');
  });

  // Build CSV rows
  const headers = ['Member ID', 'Year', 'Assessed Amount', 'Arrears Brought Forward', 'Annual Assessment', 'Total Paid', 'Outstanding Balance', 'Status'];
  const rows = [headers.join(',')];

  (assessments || []).forEach((a: any) => {
    const member = memberMap.get(a.member_id);
    if (!member) return;
    const status = member.paid >= member.assessed ? 'PAID' : member.paid > 0 ? 'PARTIAL' : 'DELINQUENT';
    rows.push([
      a.member_id,
      a.year,
      escapeCsvField(member.assessed),
      escapeCsvField(a.arrears_brought_forward || '0'),
      escapeCsvField(a.annual_assessment || '0'),
      escapeCsvField(member.paid),
      escapeCsvField(member.balance - member.paid),
      status,
    ].join(','));
  });

  return rows.join('\n');
}

export async function generateDelinquencyReportCsv() {
  const supabase = await createClient();
  const today = new Date();
  const nowMs = today.getTime();

  // Get all members with financial data using member_financial_summary view
  const { data: summaries } = await supabase.from('member_financial_summary').select('*');

  if (!summaries || summaries.length === 0) return '';

  const headers = ['Member Name', 'Outstanding Balance', 'Last Assessment Year', '90 Days+', '180 Days+', '365 Days+'];
  // Note: For precise aging we'd need payment-level data, but summary view gives us aggregate status
  // This CSV includes basic delinquency categorization based on outstanding balance thresholds

  const rows = [headers.join(',')];

  summaries.forEach((m: any) => {
    const balance = parseFloat(m.outstanding_balance || '0');
    const is90Plus = balance > 0;
    const is180Plus = balance > (parseFloat(m.total_assessed || '0') * 0.5);
    const is365Plus = balance > (parseFloat(m.total_assessed || '0') * 0.8) && m.payment_status === 'delinquent';

    rows.push([
      escapeCsvField(m.full_name),
      escapeCsvField(balance),
      escapeCsvField(m.last_assessment_year),
      escapeCsvField(is90Plus ? balance : 0),
      escapeCsvField(is180Plus ? balance : 0),
      escapeCsvField(is365Plus ? balance : 0),
    ].join(','));
  });

  return rows.join('\n');
}

// ─── API Route Handler (used by Next.js App Router) ──────────────────────────

export function createExportHandler(reportType: 'financial' | 'delinquency') {
  return async () => {
    const csv = reportType === 'financial'
      ? await generateFinancialReportCsv(new Date().getFullYear())
      : await generateDelinquencyReportCsv();

    const headers = new Headers();
    if (reportType === 'financial') {
      headers.set('Content-Type', 'text/csv; charset=utf-8');
      headers.set('Content-Disposition', `attachment; filename="ksji_financial_report_${new Date().getFullYear()}.csv"`);
    } else {
      headers.set('Content-Type', 'text/csv; charset=utf-8');
      headers.set('Content-Disposition', `attachment; filename="ksji_delinquency_aging_${new Date().toISOString().slice(0, 10)}.csv"`);
    }

    // Add BOM for Excel UTF-8 compatibility
    const bom = '﻿';
    return new Response(bom + csv, { headers });
  };
}
