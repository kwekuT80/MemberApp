export const dynamic = 'force-dynamic';

import { requireFinancialRegistrar } from '@/lib/auth/requireFinancialRegistrar';
import RegistrarShell from '@/components/layout/RegistrarShell';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

interface DashboardMetric {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  description?: string;
}

export default async function CommanderyHealthPage() {
  await requireFinancialRegistrar();
  const currentYear = new Date().getFullYear();

  // Fetch all metrics in parallel
  const supabase = createClient();

  // Total active members
  const [{ data: totalMembers }: any] = await Promise.all([
    supabase.from('members').select('*', { count: 'exact', head: true }).not('status', 'in', '("Dismissed","Transfer-Out","Deceased")'),
  ]);

  // Members with financial summaries (those who have been assessed)
  const [{ count: assessedCount }: any] = await Promise.all([
    supabase.from('financial_assessments').select('*', { count: 'exact' }).eq('year', currentYear),
  ]);

  // Delinquent members count
  const [{ data: delinquentMembers }: any] = await Promise.all([
    supabase.from('member_financial_summary').select('*').eq('payment_status', 'delinquent'),
  ]);

  // Total payments this year
  const [{ sum: totalPaymentsSum }: any] = await Promise.all([
    supabase.from('financial_payments').select('amount').eq('assessment_year', currentYear),
  ]);

  // Calculate metrics
  const paymentComplianceRate = assessedCount && assessedCount > 0
    ? ((assessedCount - (delinquentMembers?.length || 0)) / assessedCount * 100).toFixed(1)
    : '0.0';

  const totalRevenue = parseFloat(totalPaymentsSum?.sum || '0');

  // Active vs inactive member ratio
  const activeMemberRatio = totalMembers ? `${((totalMembers as number) > 0 ? ((assessedCount || 0) / (totalMembers as number)) * 100 : 0).toFixed(1)}%` : 'N/A';

  const metrics: DashboardMetric[] = [
    {
      label: 'Commandery Membership',
      value: totalMembers || 0,
      description: 'Total active members',
    },
    {
      label: 'Assessed Members',
      value: assessedCount || 0,
      trend: 'neutral',
      description: `Members billed for ${currentYear}`,
    },
    {
      label: 'Payment Compliance Rate',
      value: `${paymentComplianceRate}%`,
      trend: (parseFloat(paymentComplianceRate) > 80 ? 'up' : 'down'),
      description: 'Current on payments this year',
    },
    {
      label: 'Active Member Ratio',
      value: activeMemberRatio,
      trend: 'neutral',
      description: 'Assessed vs total membership',
    },
    {
      label: 'Delinquent Members',
      value: delinquentMembers?.length || 0,
      trend: (delinquentMembers && delinquentMembers.length > 5 ? 'down' : 'neutral'),
      description: 'No payments recorded this year',
    },
    {
      label: 'Total Revenue Collected',
      value: `₵${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      trend: 'up',
      description: `${currentYear} collections`,
    },
  ];

  return (
    <RegistrarShell title="Commandery Health Dashboard" subtitle="Aggregate metrics for chapter oversight and planning">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{metric.label}</p>
                {metric.trend && (
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                    metric.trend === 'up' ? 'bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400' :
                    metric.trend === 'down' ? 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400' :
                    'bg-gray-50 text-gray-600 dark:bg-gray-850 dark:text-gray-400'
                  }`}>
                    {metric.trend === 'up' ? '▲ Improving' : metric.trend === 'down' ? '▼ Declining' : '● Stable'}
                  </span>
                )}
              </div>

              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {metric.value}
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400">{metric.description}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-5 shadow-sm">
          <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/registrar/financials/delinquency"
              className="block p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors text-center"
            >
              <span className="font-semibold text-red-700 dark:text-red-400 block">View Delinquency Report</span>
              <span className="text-sm text-red-600 dark:text-red-500">Members by aging bucket</span>
            </Link>

            <Link
              href="/registrar/financials/members"
              className="block p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-950/30 transition-colors text-center"
            >
              <span className="font-semibold text-blue-700 dark:text-blue-400 block">Member Financial Overview</span>
              <span className="text-sm text-blue-600 dark:text-blue-500">Detailed member summaries</span>
            </Link>

            <Link
              href="/registrar/financials/payments"
              className="block p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-950/30 transition-colors text-center"
            >
              <span className="font-semibold text-green-700 dark:text-green-400 block">Record Payments</span>
              <span className="text-sm text-green-600 dark:text-green-500">Log new transactions</span>
            </Link>
          </div>
        </div>

      </div>
    </RegistrarShell>
  );
}
