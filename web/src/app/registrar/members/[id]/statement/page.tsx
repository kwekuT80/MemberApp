import React from 'react';
import RegistrarShell from '@/components/layout/RegistrarShell';
import EmptyState from '@/components/shared/EmptyState';
import { requireRegistrar } from '@/lib/auth/requireRegistrar';
import { getMemberPersonalReport } from '@/services/memberService';
import { createClient } from '@/lib/supabase/server';
import AnnualDuesStatement from '@/components/documents/AnnualDuesStatement';

export default async function RegistrarMemberStatementPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRegistrar();
  const { id } = await params;
  const supabase = await createClient();

  const [report, paymentsRes] = await Promise.all([
    getMemberPersonalReport(id),
    supabase
      .from('financial_payments')
      .select('*')
      .eq('member_id', id)
      .order('payment_date', { ascending: false })
  ]);

  if (!report) {
    return (
      <RegistrarShell title="Annual Dues Statement" subtitle="Official accounting statement">
        <EmptyState message="Could not compile financial ledger statement for this member." />
      </RegistrarShell>
    );
  }

  return (
    <RegistrarShell 
      title="Annual Dues Statement" 
      subtitle={`Official assessment & payment record for Bro. ${report.member.surname}`}
    >
      <AnnualDuesStatement 
        report={report} 
        payments={paymentsRes.data || []} 
        backHref={`/registrar/members/${id}`} 
      />
    </RegistrarShell>
  );
}
