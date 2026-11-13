import React from 'react';
import MemberShell from '@/components/layout/MemberShell';
import EmptyState from '@/components/shared/EmptyState';
import { requireUser } from '@/lib/auth/requireUser';
import { getMyMember, getMemberPersonalReport } from '@/services/memberService';
import { createClient } from '@/lib/supabase/server';
import AnnualDuesStatement from '@/components/documents/AnnualDuesStatement';

export default async function MyDuesStatementPage() {
  await requireUser();
  const myMember = await getMyMember();

  if (!myMember) {
    return (
      <MemberShell title="Annual Dues Statement" subtitle="Official accounting statement">
        <EmptyState message="Unable to locate your member profile." />
      </MemberShell>
    );
  }

  const supabase = await createClient();
  const [report, paymentsRes] = await Promise.all([
    getMemberPersonalReport(myMember.id),
    supabase
      .from('financial_payments')
      .select('*')
      .eq('member_id', myMember.id)
      .order('payment_date', { ascending: false })
  ]);

  if (!report) {
    return (
      <MemberShell title="Annual Dues Statement" subtitle="Official accounting statement">
        <EmptyState message="Could not compile financial ledger statement for your record." />
      </MemberShell>
    );
  }

  return (
    <MemberShell title="Annual Dues Statement" subtitle="Official record of assessments, carryovers, and payments">
      <AnnualDuesStatement 
        report={report} 
        payments={paymentsRes.data || []} 
        backHref="/me/financials" 
      />
    </MemberShell>
  );
}
