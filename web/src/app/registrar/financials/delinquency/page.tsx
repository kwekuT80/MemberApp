export const dynamic = 'force-dynamic';

import { requireFinancialRegistrar } from '@/lib/auth/requireFinancialRegistrar';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import DelinquencyPrintView from './DelinquencyPrintView';

interface DelinquencyMember {
  id: string;
  full_name: string;
  phone_number?: string;
  email?: string;
  outstanding_balance: number | string;
  payment_status: string;
  last_assessment_year?: number;
  total_assessed?: number | string;
}

interface DelinquencyBucket {
  key: string;
  label: string;
  members: DelinquencyMember[];
  totalOutstanding: number;
}

export default async function DelinquencyAgingPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; bucket?: string }>;
}) {
  await requireFinancialRegistrar();
  const params = await searchParams;
  const currentYear = parseInt(params.year || new Date().getFullYear().toString());

  // Fetch all members with financial summaries
  const supabase = createClient();
  const { data: summaries }: any[] | any = await supabase
    .from('member_financial_summary')
    .select('*');

  if (!summaries) return <RegistrarShell title="Delinquency Report" subtitle="">
    <div style={{ padding: 40, textAlign: 'center' }}>No data available</div>
  </RegistrarShell>;

  // Filter for active delinquent members only
  const filtered = (summaries as any[]).filter((m: any) => m.payment_status === 'delinquent');

  // Categorize into buckets based on outstanding balance ratio
  const bucketMap = new Map<string, DelinquencyMember[]>();
  const totalOutstandingByBucket = new Map<string, number>();

  for (const member of filtered) {
    const balance = parseFloat(member.outstanding_balance || '0');
    const assessed = parseFloat(member.total_assessed || '1') || 1;
    const ratio = balance / assessed;

    let bucket: string;
    if (ratio >= 0.8) bucket = '365_plus';
    else if (ratio >= 0.5) bucket = '180_days';
    else bucket = '90_days';

    const existing = bucketMap.get(bucket) || [];
    bucketMap.set(bucket, [...existing, member as DelinquencyMember]);
    totalOutstandingByBucket.set(bucket, (totalOutstandingByBucket.get(bucket) || 0) + balance);
  }

  const bucketConfig: Record<string, { key: string; label: string }> = {
    '90_days': { key: '90_days', label: 'Within 90 Days' },
    '180_days': { key: '180_days', label: '90–180 Days' },
    '365_plus': { key: '365_plus', label: '180+ Days' },
  };

  const buckets: DelinquencyBucket[] = Object.values(bucketConfig)
    .map(config => ({
      ...config,
      members: bucketMap.get(config.key) || [],
      totalOutstanding: totalOutstandingByBucket.get(config.key) || 0,
    }))
    .filter(b => b.members.length > 0);

  // Sort by severity (most severe first)
  buckets.sort((a, b) => {
    const order = { '365_plus': 0, '180_days': 1, '90_days': 2 };
    return order[a.key as keyof typeof order] - order[b.key as keyof typeof order];
  });

  const totalMembers = buckets.reduce((sum, b) => sum + b.members.length, 0);
  const totalOutstanding = buckets.reduce((sum, b) => sum + b.totalOutstanding, 0);

  return (
    <RegistrarShell title="Delinquency Aging Report" subtitle={`${currentYear} | ${totalMembers} Members with Outstanding Balances`}>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Print/Export Actions */}
        <DelinquencyPrintView
          buckets={buckets}
          totalOutstanding={totalOutstanding}
          currentYear={currentYear}
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {buckets.map((bucket) => (
            <Link
              key={bucket.key}
              href={`/registrar/financials/delinquency?bucket=${bucket.key}`}
              className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">
                {bucket.label}
              </p>
              <div className="mt-2 flex justify-between items-baseline">
                <span className="text-2xl font-bold text-red-600 dark:text-red-450">{bucket.members.length} Members</span>
                <span className="text-xs font-semibold bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 px-2 py-0.5 rounded-full">
                  ₵{bucket.totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Bucket Filter */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-5 shadow-sm">
          <form method="GET" className="flex items-center gap-4">
            <label htmlFor="bucket" className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 whitespace-nowrap">
              Filter by Bucket:
            </label>
            <select
              id="bucket"
              name="bucket"
              defaultValue={params.bucket || ''}
              className="bg-gray-50 dark:bg-gray-850 border border-gray-200 dark:border-gray-700 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900 dark:text-gray-100"
            >
              <option value="">All Buckets</option>
              <option value="90_days">Within 90 Days</option>
              <option value="180_days">90–180 Days</option>
              <option value="365_plus">180+ Days</option>
            </select>
          </form>
        </div>

        {/* Member List */}
        {buckets.map((bucket) => {
          const filteredMembers = params.bucket ? (params.bucket === bucket.key ? bucket.members : []) : bucket.members;

          if (filteredMembers.length === 0) return null;

          return (
            <div key={bucket.key} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
              <div className="p-5 bg-gradient-to-r from-red-50 to-transparent dark:from-red-950/20 dark:to-transparent">
                <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">
                  {bucket.label} ({filteredMembers.length} members)
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-850 border-b border-gray-100 dark:border-gray-800">
                      <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Brother's Name</th>
                      <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact Info</th>
                      <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Outstanding Balance</th>
                      <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredMembers.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-850/30 transition-colors">
                        <td className="p-4">
                          <Link href={`/registrar/members/${m.id}`} className="font-semibold text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors block">
                            {m.full_name}
                          </Link>
                        </td>
                        <td className="p-4">
                          <span className="block text-sm text-gray-800 dark:text-gray-250">{m.phone_number || 'No Phone'}</span>
                          <span className="text-xs text-gray-450 block">{m.email || 'No Email'}</span>
                        </td>
                        <td className="p-4 text-right font-bold text-red-600 dark:text-red-500">
                          ₵{parseFloat(m.outstanding_balance || 0).toFixed(2)}
                        </td>
                        <td className="p-4 text-center">
                          <Link
                            href={`/registrar/members/${m.id}/dossier`}
                            className="text-xs font-semibold bg-gray-50 hover:bg-indigo-50 border border-gray-250 text-gray-700 hover:text-indigo-650 hover:border-indigo-200 py-1.5 px-3 rounded transition-colors inline-block dark:bg-gray-850 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-indigo-950 dark:hover:text-indigo-400"
                          >
                            View Dossier
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

      </div>
    </RegistrarShell>
  );
}
