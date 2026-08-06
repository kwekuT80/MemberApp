'use client';

import React, { useEffect, useState } from 'react';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { 
  getWelfareContributions, 
  recordWelfareContribution, 
  deleteWelfareContribution 
} from '@/services/welfareService';
import { createClient } from '@/lib/supabase/client';
import { formatDisplayDate } from '@/lib/utils/ksji-logic';
import { WelfareContribution } from '@/types/welfare';

export default function WelfareContributionsPage() {
  const [contributions, setContributions] = useState<WelfareContribution[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [memberId, setMemberId] = useState('');
  const [amount, setAmount] = useState('20');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [periodYear, setPeriodYear] = useState(new Date().getFullYear().toString());
  const [periodMonth, setPeriodMonth] = useState((new Date().getMonth() + 1).toString());
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile_money' | 'bank_transfer' | 'cheque'>('mobile_money');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [list, { data: memberList }] = await Promise.all([
        getWelfareContributions(),
        supabase
          .from('members')
          .select('id, first_name, surname, title, status, is_deceased')
          .order('surname'),
      ]);
      setContributions(list);
      const filtered = (memberList || []).filter(m => {
        if (m.is_deceased) return false;
        const s = String(m.status || '').trim().toLowerCase();
        return !['deceased', 'dismissed', 'transfer-out'].includes(s);
      });
      setMembers(filtered);
    } catch (err) {
      console.error('Failed to load welfare contributions:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent, keepModalOpen = false) => {
    e.preventDefault();
    if (!memberId || !amount) {
      alert('Please select a member and enter an amount');
      return;
    }

    const selectedMember = members.find(m => m.id === memberId);
    const memberName = selectedMember ? `${selectedMember.title || 'Bro.'} ${selectedMember.first_name} ${selectedMember.surname}` : 'Member';

    setSubmitting(true);
    try {
      await recordWelfareContribution({
        member_id: memberId,
        amount: parseFloat(amount),
        payment_date: paymentDate,
        period_year: parseInt(periodYear, 10),
        period_month: periodMonth ? parseInt(periodMonth, 10) : undefined,
        payment_method: paymentMethod,
        reference_no: referenceNo || undefined,
        notes: notes || undefined,
      });

      // Reset member specific fields
      setMemberId('');
      setReferenceNo('');
      setNotes('');

      if (keepModalOpen) {
        alert(`🎉 Contribution of GH₵ ${parseFloat(amount).toFixed(2)} recorded for ${memberName}! Select next member.`);
      } else {
        alert(`Welfare contribution recorded for ${memberName}!`);
        setShowModal(false);
      }
      loadData();
    } catch (err: any) {
      console.error('Record contribution error:', err);
      alert(err.message || 'Failed to record contribution');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this welfare contribution entry? An audit trail entry will be recorded.')) return;
    try {
      await deleteWelfareContribution(id);
      loadData();
    } catch (err) {
      alert('Failed to delete entry');
    }
  };

  const filteredContributions = contributions.filter(c => {
    const name = c.members ? `${c.members.first_name} ${c.members.surname}`.toLowerCase() : '';
    const ref = (c.reference_no || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || ref.includes(query);
  });

  const exportCSV = () => {
    const headers = ['Member Name', 'Payment Date', 'Year', 'Month', 'Method', 'Reference', 'Amount (GHc)'];
    const rows = filteredContributions.map(c => [
      c.members ? `${c.members.first_name} ${c.members.surname}` : 'Unknown',
      c.payment_date,
      c.period_year,
      c.period_month || '',
      c.payment_method,
      c.reference_no || '',
      c.amount
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `welfare_contributions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <RegistrarShell title="Welfare Contributions Ledger" subtitle="Record and track member welfare dues and subscriptions">
      <div style={{ padding: '24px 0', fontFamily: 'Inter, sans-serif' }}>
        
        {/* Actions & Filters Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <input 
            type="text"
            placeholder="🔍 Search member name or reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #CBD5E1', width: 320, fontSize: 14 }}
          />

          <div style={{ display: 'flex', gap: 12 }}>
            <button 
              onClick={exportCSV} 
              style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '10px 20px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
            >
              📥 Export CSV
            </button>
            <button 
              onClick={() => setShowModal(true)} 
              style={{ background: '#10B981', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}
            >
              ➕ Record Contribution
            </button>
          </div>
        </div>

        {/* Ledger Table */}
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading contributions ledger...</div>
          ) : filteredContributions.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>No welfare contributions found.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px' }}>Member</th>
                  <th style={{ padding: '12px 16px' }}>Date</th>
                  <th style={{ padding: '12px 16px' }}>Period</th>
                  <th style={{ padding: '12px 16px' }}>Method</th>
                  <th style={{ padding: '12px 16px' }}>Reference</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Amount</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredContributions.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0F172A' }}>
                      {c.members ? `${c.members.first_name} ${c.members.surname}` : 'Unknown Member'}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#64748B' }}>
                      {formatDisplayDate(c.payment_date)}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#64748B' }}>
                      {c.period_year} {c.period_month ? `(Month ${c.period_month})` : ''}
                    </td>
                    <td style={{ padding: '14px 16px', textTransform: 'capitalize', color: '#64748B' }}>
                      {c.payment_method?.replace('_', ' ')}
                    </td>
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 12, color: '#64748B' }}>
                      {c.reference_no || '---'}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 900, color: '#10B981', fontFamily: 'monospace' }}>
                      GH₵ {Number(c.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <button 
                        onClick={() => handleDelete(c.id)}
                        style={{ background: 'none', border: 'none', color: '#EF4444', fontWeight: 800, cursor: 'pointer' }}
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Record Modal */}
        {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div style={{ background: 'white', borderRadius: 16, padding: 32, maxWidth: 500, width: '90%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Record Member Welfare Contribution</h3>
                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 6 }}>SELECT MEMBER</label>
                  <select 
                    value={memberId} 
                    onChange={e => setMemberId(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1' }}
                  >
                    <option value="">-- Choose Member --</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.surname.toUpperCase()}, {m.first_name} ({m.title || 'Bro.'})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 6 }}>AMOUNT (GH₵)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      required
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 6 }}>PAYMENT DATE</label>
                    <input 
                      type="date"
                      value={paymentDate}
                      onChange={e => setPaymentDate(e.target.value)}
                      required
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 6 }}>PERIOD YEAR</label>
                    <input 
                      type="number"
                      value={periodYear}
                      onChange={e => setPeriodYear(e.target.value)}
                      required
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 6 }}>PAYMENT METHOD</label>
                    <select 
                      value={paymentMethod} 
                      onChange={e => setPaymentMethod(e.target.value as any)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1' }}
                    >
                      <option value="mobile_money">Mobile Money</option>
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cheque">Cheque</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 6 }}>REFERENCE NO / TRANSACTION ID</label>
                  <input 
                    type="text"
                    placeholder="e.g. MOMO-98123471"
                    value={referenceNo}
                    onChange={e => setReferenceNo(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                  <button type="button" onClick={() => setShowModal(false)} style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '10px 16px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button type="button" onClick={e => handleSubmit(e, false)} disabled={submitting} style={{ background: '#0F172A', color: 'white', border: 'none', padding: '10px 18px', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}>
                    {submitting ? 'Saving...' : '💾 Save & Close'}
                  </button>
                  <button type="button" onClick={e => handleSubmit(e, true)} disabled={submitting} style={{ background: '#10B981', color: 'white', border: 'none', padding: '10px 18px', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}>
                    {submitting ? 'Saving...' : '➕ Save & Add Another'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </RegistrarShell>
  );
}
