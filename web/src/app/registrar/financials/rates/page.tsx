export const dynamic = 'force-dynamic';

import { requireFinancialRegistrar } from '@/lib/auth/requireFinancialRegistrar';
import { getAnnualRates, getAssessmentsForYear } from '@/services/financialService';
import RatesClient from './RatesClient';

export default async function RatesPage() {
  await requireFinancialRegistrar();
  const currentYear = new Date().getFullYear();

  const [rates, assessments] = await Promise.all([
    getAnnualRates(currentYear),
    getAssessmentsForYear(currentYear),
  ]);

  return (
    <RatesClient
      initialYear={currentYear}
      initialRates={rates}
      initialAssessments={assessments as any}
    />
  );
}
