'use client';

import { useEffect, useState } from 'react';
import { getAuditLog, type AuditAction } from '@/services/auditService';
import { createClient } from '@/lib/supabase/client';

const ACTION_LABELS: Record<AuditAction, string> = {
  payment_amount_change: 'Payment Amount Changed',
  rate_change: 'Rate Configuration Changed',
  assessment_edit: 'Assessment Edited',
  payment_delete: 'Payment Deleted',
};

const ACTION_COLORS: Record<AuditAction, string> = {
  payment_amount_change: 'bg-blue-100 text-blue-800',
  rate_change: 'bg-purple-100 text-purple-800',
  assessment_edit: 'bg-yellow-100 text-yellow-800',
  payment_delete: 'bg-red-100 text-red-800',
};

export default function AuditLogClient() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<string>('');
  const [filterMemberId, setFilterMemberId] = useState('');
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Load members for filter dropdown
      const supabase = createClient();
      const { data: memberList } = await supabase
        .from('members')
        .select('id, first_name, surname')
        .not('status', 'in', '("Dismissed","Transfer-Out","Deceased")');

      if (memberList) setMembers(memberList);

      // Load audit log with filters
      const data = await getAuditLog({
        action: filterAction || undefined,
        memberId: filterMemberId || undefined,
        limit: 500,
      });
      setEntries(data as any[]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4 flex flex-wrap gap-3 items-center">
        <label className="text-sm font-medium text-gray-700">
          Action Type
          <select
            value={filterAction}
            onChange={(e) => { setFilterAction(e.target.value); loadData(); }}
            className="ml-2 block rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
          >
            <option value="">All</option>
            <option value="payment_amount_change">Payment Amount Changed</option>
            <option value="rate_change">Rate Configuration Changed</option>
            <option value="assessment_edit">Assessment Edited</option>
            <option value="payment_delete">Payment Deleted</option>
          </select>
        </label>

        <label className="text-sm font-medium text-gray-700">
          Member
          <select
            value={filterMemberId}
            onChange={(e) => { setFilterMemberId(e.target.value); loadData(); }}
            className="ml-2 block rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
          >
            <option value="">All Members</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.first_name} {m.surname}</option>
            ))}
          </select>
        </label>

        <button
          onClick={() => loadData()}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-medium"
        >
          Refresh
        </button>

        <span className="text-sm text-gray-500 ml-auto">
          {entries.length} entries found
        </span>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <p className="text-gray-500">No audit log entries found.</p>
          <p className="text-sm text-gray-400 mt-2">Entries will appear when payments or rates are modified.</p>
        </div>
      ) : (
        /* Audit Log Table */
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Changed By</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Change Details</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {entries.map((entry: any) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {new Date(entry.changed_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${ACTION_COLORS[entry.action as AuditAction] || 'bg-gray-100 text-gray-800'}`}>
                      {ACTION_LABELS[entry.action as AuditAction] || entry.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {entry.members ? `${entry.members.first_name} ${entry.members.surname}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {entry.profiles?.email || entry.changed_by_email || 'System'}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-mono text-gray-500 whitespace-nowrap">
                    {entry.entity_type === 'payment' && `#${entry.entity_id.toString().slice(-6)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
