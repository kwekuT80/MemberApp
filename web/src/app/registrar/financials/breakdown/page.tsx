export const dynamic = 'force-dynamic';

import React from 'react';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { requireFinancialRegistrar } from '@/lib/auth/requireFinancialRegistrar';
import BreakdownClient from './BreakdownClient';

export default async function FinancialBreakdownPage() {
  await requireFinancialRegistrar();

  return (
    <RegistrarShell
      title="Monthly & Yearly Collections Breakdown"
      subtitle="Detailed audit matrix of Annual Dues assessments, monthly payment subtotals, and Welfare Fund performance."
    >
      <BreakdownClient />
    </RegistrarShell>
  );
}
