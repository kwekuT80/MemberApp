'use client';

import React, { useEffect, useState } from 'react';
import { getWelfareAuditLog } from '@/services/welfareService';
import { WelfareAuditEntry } from '@/types/welfare';
import { formatDisplayDate } from '@/lib/utils/ksji-logic';

const ACTION_LABELS: Record<string, string> = {
  contribution_add: '💳 Contribution Added',
  contribution_edit: '✏️ Contribution Edited',
  contribution_delete: '🗑️ Contribution Deleted',
  disbursement_add: '🎁 Disbursement Added',
  disbursement_edit: '✏️ Disbursement Edited',
  disbursement_delete: '🗑️ Disbursement Deleted',
  category_change: '⚙️ Category Rule Change',
  rate_change: '📐 Contribution Rate Set',
};

const ACTION_COLORS: Record<string, string> = {
  contribution_add: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  contribution_delete: 'bg-rose-100 text-rose-800 border-rose-300',
  disbursement_add: 'bg-rose-100 text-rose-800 border-rose-300',
  disbursement_delete: 'bg-amber-100 text-amber-800 border-amber-300',
  category_change: 'bg-blue-100 text-blue-800 border-blue-300',
  rate_change: 'bg-violet-100 text-violet-800 border-violet-300',
};

export default function WelfareAuditClient() {
  const [logs, setLogs] = useState<WelfareAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadAuditLog();
  }, [actionFilter]);

  async function loadAuditLog() {
    setLoading(true);
    try {
      const data = await getWelfareAuditLog({ action: actionFilter || undefined });
      setLogs(data);
    } catch (err) {
      console.error('Failed to load welfare audit trail:', err);
    } finally {
      setLoading(false);
    }
  }

  const downloadCSV = () => {
    const headers = ['Action', 'Entity Type', 'Target Member', 'Changed By', 'Changed At', 'New Values JSON'];
    const rows = logs.map(entry => [
      entry.action,
      entry.entity_type,
      entry.members ? `${entry.members.first_name} ${entry.members.surname}` : '',
      entry.profiles?.email || 'System/Admin',
      entry.changed_at,
      `"${JSON.stringify(entry.new_values || {}).replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `welfare_audit_trail_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      
      {/* Controls & Filter Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <select 
          value={actionFilter} 
          onChange={e => setActionFilter(e.target.value)}
          style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14, background: 'white' }}
        >
          <option value="">All Welfare Actions</option>
          <option value="contribution_add">Contribution Added</option>
          <option value="contribution_delete">Contribution Deleted</option>
          <option value="disbursement_add">Disbursement Added</option>
          <option value="disbursement_delete">Disbursement Deleted</option>
          <option value="category_change">Category Rule Change</option>
          <option value="rate_change">Contribution Rate Set</option>
        </select>

        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            onClick={downloadCSV}
            style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '10px 20px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
          >
            📥 Export Audit CSV
          </button>
          <button 
            onClick={() => window.print()}
            style={{ background: '#334155', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}
          >
            🖨️ Print Journal
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading welfare audit trail...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>No welfare audit entries found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px' }}>Date & Time</th>
                <th style={{ padding: '12px 16px' }}>Action</th>
                <th style={{ padding: '12px 16px' }}>Target Member</th>
                <th style={{ padding: '12px 16px' }}>Executed By</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(entry => {
                const isExpanded = expandedId === entry.id;
                return (
                  <React.Fragment key={entry.id}>
                    <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 16px', color: '#64748B', whiteSpace: 'nowrap' }}>
                        {new Date(entry.changed_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ 
                          padding: '4px 10px', 
                          borderRadius: 100, 
                          fontSize: 12, 
                          fontWeight: 700,
                          background: entry.action === 'rate_change'
                            ? '#EDE9FE'
                            : entry.action.includes('delete') ? '#FEF2F2'
                            : entry.action.includes('disbursement') ? '#FFFBEB' : '#ECFDF5',
                          color: entry.action === 'rate_change'
                            ? '#5B21B6'
                            : entry.action.includes('delete') ? '#991B1B'
                            : entry.action.includes('disbursement') ? '#B45309' : '#065F46'
                        }}>
                          {ACTION_LABELS[entry.action] || entry.action}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0F172A' }}>
                        {entry.members ? `${entry.members.first_name} ${entry.members.surname}` : '---'}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#475569' }}>
                        {entry.profiles?.email || 'Super Admin / Treasurer'}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <button 
                          onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                          style={{ background: 'none', border: 'none', color: '#3B82F6', fontWeight: 800, cursor: 'pointer' }}
                        >
                          {isExpanded ? 'Hide Payload ▲' : 'View Payload ▼'}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                        <td colSpan={5} style={{ padding: 16 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontFamily: 'monospace', fontSize: 12 }}>
                            {entry.old_values && (
                              <div style={{ background: '#FFF5F5', padding: 12, borderRadius: 8, border: '1px solid #FEB2B2' }}>
                                <strong style={{ color: '#9B2C2C', display: 'block', marginBottom: 6 }}>Previous Values (Old):</strong>
                                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(entry.old_values, null, 2)}</pre>
                              </div>
                            )}
                            {entry.new_values && (
                              <div style={{ background: '#F0FFF4', padding: 12, borderRadius: 8, border: '1px solid #9AE6B4' }}>
                                <strong style={{ color: '#22543D', display: 'block', marginBottom: 6 }}>Recorded Values (New):</strong>
                                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(entry.new_values, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
