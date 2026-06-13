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

  async function loadData(actionOverride?: string, memberIdOverride?: string) {
    setLoading(true);
    try {
      // Load members for filter dropdown
      const supabase = createClient();
      const { data: memberList } = await supabase
        .from('members')
        .select('id, first_name, surname')
        .not('status', 'in', '("Dismissed","Transfer-Out","Deceased")');

      if (memberList) setMembers(memberList);

      const activeAction = actionOverride !== undefined ? actionOverride : filterAction;
      const activeMemberId = memberIdOverride !== undefined ? memberIdOverride : filterMemberId;

      // Load audit log with filters
      const data = await getAuditLog({
        action: activeAction || undefined,
        memberId: activeMemberId || undefined,
        limit: 500,
      });
      setEntries(data as any[]);
    } finally {
      setLoading(false);
    }
  }

  const downloadAuditCSV = () => {
    if (!entries.length) return;

    const headers = [
      'Timestamp',
      'Action Type',
      'Target Member',
      'Changed By',
      'Details'
    ];

    const rows = entries.map(entry => {
      const actionLabel = ACTION_LABELS[entry.action as AuditAction] || entry.action;
      const memberName = entry.members ? `${entry.members.first_name} ${entry.members.surname}` : '—';
      const changedBy = entry.profiles?.email || entry.changed_by_email || 'System';
      const details = entry.entity_type === 'payment' ? `Payment ID: ${entry.entity_id}` : '—';

      return [
        new Date(entry.changed_at).toLocaleString(),
        actionLabel,
        memberName,
        changedBy,
        details
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `financial_audit_trail_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printAuditPDF = () => {
    if (!entries.length) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print this report.');
      return;
    }

    const rowsHtml = entries.map(entry => {
      const timestamp = new Date(entry.changed_at).toLocaleString();
      const actionLabel = ACTION_LABELS[entry.action as AuditAction] || entry.action;
      const memberName = entry.members ? `${entry.members.first_name} ${entry.members.surname}` : '—';
      const changedBy = entry.profiles?.email || entry.changed_by_email || 'System';
      const details = entry.entity_type === 'payment' ? `#${entry.entity_id.toString().slice(-6)}` : '—';

      return `
        <tr>
          <td>${timestamp}</td>
          <td><strong>${actionLabel}</strong></td>
          <td>${memberName}</td>
          <td>${changedBy}</td>
          <td style="font-family: monospace; font-size: 11px;">${details}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Financial Audit Trail</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #10233f; }
            .report-header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #C9A84C; padding-bottom: 20px; }
            .report-header h1 { text-transform: uppercase; letter-spacing: 2px; margin: 0; font-size: 24px; color: #10233f; }
            .report-header p { color: #C9A84C; font-weight: 700; margin: 5px 0 0 0; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; padding: 12px; border-bottom: 2px solid #10233f; font-size: 12px; text-transform: uppercase; background: #f1f5f9; }
            td { padding: 12px; border-bottom: 1px solid #eee; font-size: 12px; }
            .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #64748b; }
            @page { margin: 1.5cm; }
          </style>
        </head>
        <body onload="window.print(); window.onafterprint = function() { window.close(); }">
          <div class="report-header">
            <h1>Knight St. John International</h1>
            <p>Official Financial Audit Trail — Journal Log</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Member</th>
                <th>Changed By</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="footer">
            <p>Confidential — Official System Audit Trail</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4 flex flex-wrap gap-3 items-center">
        <label className="text-sm font-medium text-gray-700">
          Action Type
          <select
            value={filterAction}
            onChange={(e) => { const val = e.target.value; setFilterAction(val); loadData(val, undefined); }}
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
            onChange={(e) => { const val = e.target.value; setFilterMemberId(val); loadData(undefined, val); }}
            className="ml-2 block rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
          >
            <option value="">All Members</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.first_name} {m.surname}</option>
            ))}
          </select>
        </label>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => loadData()}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-medium"
          >
            Refresh
          </button>
          {entries.length > 0 && (
            <>
              <button
                onClick={downloadAuditCSV}
                className="px-4 py-2 bg-gray-100 text-gray-700 border rounded-md hover:bg-gray-200 text-sm font-medium"
              >
                📥 Export CSV
              </button>
              <button
                onClick={printAuditPDF}
                style={{ background: 'var(--gold)', color: 'var(--navy)' }}
                className="px-4 py-2 rounded-md hover:opacity-90 text-sm font-medium"
              >
                🖨️ Print PDF
              </button>
            </>
          )}
        </div>

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
