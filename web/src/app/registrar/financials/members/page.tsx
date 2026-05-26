export const dynamic = 'force-dynamic';

import { requireFinancialRegistrar } from '@/lib/auth/requireFinancialRegistrar';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { getAllMemberSummaries } from '@/services/financialService';
import Link from 'next/link';

interface SummaryFilters {
  status?: string;
  search?: string;
}

export default async function MemberSummaryPage({
  searchParams,
}: {
  searchParams: Promise<SummaryFilters>;
}) {
  await requireFinancialRegistrar();
  const filters = await searchParams;

  const summaries = await getAllMemberSummaries(filters);

  // Calculate aggregate statistics
  const totalAssessed = summaries.reduce((s, m) => s + parseFloat(m.total_assessed || 0), 0);
  const totalPaid = summaries.reduce((s, m) => s + parseFloat(m.total_paid || 0), 0);
  const totalOutstanding = totalAssessed - totalPaid;
  const delinquentCount = summaries.filter(m => m.payment_status === 'delinquent').length;

  return (
    <RegistrarShell title="Member Financial Overview" subtitle="Consolidated real-time billing and payment summary for all members">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Aggregate Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-5 shadow-sm space-y-2">
            <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Total Amount Assessed</p>
            <div className="flex justify-between items-baseline">
              <span className="text-2xl font-bold text-gray-950 dark:text-gray-50">₵{totalAssessed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="text-xs font-semibold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400 px-2 py-0.5 rounded-full">Cumulative</span>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-5 shadow-sm space-y-2">
            <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Total Amount Collected</p>
            <div className="flex justify-between items-baseline">
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">₵{totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="text-xs font-semibold bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400 px-2 py-0.5 rounded-full">
                {totalAssessed > 0 ? ((totalPaid / totalAssessed) * 100).toFixed(1) : 0}% Collection
              </span>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-5 shadow-sm space-y-2">
            <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Outstanding Arrears</p>
            <div className="flex justify-between items-baseline">
              <span className="text-2xl font-bold text-amber-600 dark:text-amber-500">₵{totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="text-xs font-semibold bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 px-2 py-0.5 rounded-full">Receivables</span>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-5 shadow-sm space-y-2">
            <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Delinquent Roster</p>
            <div className="flex justify-between items-baseline">
              <span className="text-2xl font-bold text-rose-600 dark:text-rose-450">{delinquentCount} Brothers</span>
              <span className="text-xs font-semibold bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-450 px-2 py-0.5 rounded-full">No Payments</span>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-5 shadow-sm">
          <form method="GET" className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="search" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Search Members</label>
              <input
                id="search"
                type="text"
                name="search"
                defaultValue={filters.search || ''}
                placeholder="Search by name, email..."
                className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-200 dark:border-gray-700 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label htmlFor="status" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Payment Status Filter</label>
              <select
                id="status"
                name="status"
                defaultValue={filters.status || ''}
                className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-200 dark:border-gray-700 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-gray-900 dark:text-gray-100"
              >
                <option value="">All Statuses</option>
                <option value="paid">Fully Paid</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="delinquent">Delinquent</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="flex-1 bg-indigo-650 hover:bg-indigo-700 text-white font-medium text-sm py-2 px-4 rounded-lg shadow-sm transition-colors"
              >
                Apply Filters
              </button>
              <Link
                href="/registrar/financials/members"
                className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 font-medium text-sm py-2 px-4 rounded-lg transition-colors text-center"
              >
                Reset
              </Link>
            </div>
          </form>
        </div>

        {/* Member Table */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-850 border-b border-gray-100 dark:border-gray-800">
                  <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Brother's Name</th>
                  <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact Info</th>
                  <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Total Assessed</th>
                  <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Total Paid</th>
                  <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Outstanding Balance</th>
                  <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Status</th>
                  <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {summaries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500 dark:text-gray-450">
                      No member financial summaries match the current filters.
                    </td>
                  </tr>
                ) : (
                  summaries.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-850/30 transition-colors">
                      <td className="p-4">
                        <Link href={`/registrar/members/${m.id}`} className="font-semibold text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors block">
                          {m.full_name}
                        </Link>
                        <span className="text-xs text-gray-450">ID: {m.id.substring(0, 8)}...</span>
                      </td>
                      <td className="p-4">
                        <span className="block text-sm text-gray-800 dark:text-gray-250">{m.phone_number || 'No Phone'}</span>
                        <span className="text-xs text-gray-450 block">{m.email || 'No Email'}</span>
                      </td>
                      <td className="p-4 text-right font-medium text-gray-850 dark:text-gray-200">
                        ₵{parseFloat(m.total_assessed || 0).toFixed(2)}
                      </td>
                      <td className="p-4 text-right font-medium text-green-600 dark:text-green-450">
                        ₵{parseFloat(m.total_paid || 0).toFixed(2)}
                      </td>
                      <td className="p-4 text-right font-bold text-amber-600 dark:text-amber-500">
                        ₵{parseFloat(m.outstanding_balance || 0).toFixed(2)}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          m.payment_status === 'paid'
                            ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                            : m.payment_status === 'partially_paid'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-455'
                        }`}>
                          {m.payment_status === 'paid' ? 'Fully Paid' : m.payment_status === 'partially_paid' ? 'Partially Paid' : 'Delinquent'}
                        </span>
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </RegistrarShell>
  );
}
