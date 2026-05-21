export const dynamic = 'force-dynamic';

import { requireFinancialRegistrar } from '@/lib/auth/requireFinancialRegistrar';
import { getAnnualRates, getAssessmentsForYear } from '@/services/financialService';
import RatesClient from './RatesClient';
import RegistrarShell from '@/components/layout/RegistrarShell';

export default async function RatesPage() {
  await requireFinancialRegistrar();
  const currentYear = new Date().getFullYear();

  const [rates, assessments] = await Promise.all([
    getAnnualRates(currentYear),
    getAssessmentsForYear(currentYear),
  ]);

  return (
    <RegistrarShell title="Rates & Billing" subtitle="Set annual assessment rates and generate member bills">
      <RatesClient
        initialYear={currentYear}
        initialRates={rates}
        initialAssessments={assessments as any}
      />
    </RegistrarShell>
  );
}
