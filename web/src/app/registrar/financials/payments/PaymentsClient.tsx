'use client';

import { useState } from 'react';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { createClient } from '@/lib/supabase/client';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

type Member = { id: string; first_name: string | null; surname: string | null; title: string | null; membership_type: string | null; };
type Payment = {
  id: string;
  member_id: string;
  assessment_year: number;
  month: string;
  amount: number;
  payment_date: string;
  members: { first_name: string | null; surname: string | null; title: string | null } | null;
};

export default function PaymentsClient({
  initialYear,
  initialMembers,
  initialPayments,
  currentUserId,
}: {
  initialYear: number;
  initialMembers: Member[];
  initialPayments: Payment[];
  currentUserId: string;
}) {
  const supabase = createClient();
  const [year, setYear] = useState(initialYear);
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [members] = useState<Member[]>(initialMembers);
  const [search, setSearch] = useState('');
  const [paySearch, setPaySearch] = useState('');

  // Form state
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  function showToast(msg: string, type: 'ok' | 'err') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // Member dropdown filtered by search
  const filteredMembers = members.filter(m => {
    const name = `${m.first_name} ${m.surname}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  // Payments filtered by search
  const filteredPayments = payments.filter(p => {
    const name = `${p.members?.first_name} ${p.members?.surname}`.toLowerCase();
    return name.includes(paySearch.toLowerCase());
  });

  async function handleRecord() {
    if (!selectedMemberId || !amount || parseFloat(amount) <= 0) {
      showToast('Please select a member and enter a valid amount.', 'err');
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase
      .from('financial_payments')
      .insert({
        member_id: selectedMemberId,
        assessment_year: year,
        month: selectedMonth,
        amount: parseFloat(amount),
        payment_date: new Date(paymentDate).toISOString(),
        recorded_by: currentUserId,
      })
      .select('*, members(first_name, surname, title)')
      .single();

    setSubmitting(false);
    if (error) { showToast('Error: ' + error.message, 'err'); return; }
    setPayments(prev => [data as Payment, ...prev]);
    setAmount('');
    showToast('Payment recorded successfully!', 'ok');
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    const { error } = await supabase.from('financial_payments').delete().eq('id', id);
    setDeleting(null);
    if (error) { showToast('Error deleting: ' + error.message, 'err'); return; }
    setPayments(prev => prev.filter(p => p.id !== id));
    showToast('Payment deleted.', 'ok');
  }

  async function handleYearChange(newYear: number) {
    setYear(newYear);
    const { data } = await supabase
      .from('financial_payments')
      .select('*, members(first_name, surname, title)')
      .eq('assessment_year', newYear)
      .order('payment_date', { ascending: false });
    setPayments((data || []) as Payment[]);
  }

  const fmt = (n: number) =>
    `GH¢ ${parseFloat(n as any).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  const totalCollected = payments.reduce((s, p) => s + parseFloat(p.amount as any), 0);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const selectedMember = members.find(m => m.id === selectedMemberId);

  return (
    <RegistrarShell title="Record Payments" subtitle="Log monthly payment receipts for members">
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          background: toast.type === 'ok' ? '#166534' : '#991B1B',
          color: 'white', padding: '14px 24px', borderRadius: 12,
          fontWeight: 700, fontSize: 14, boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
        }}>{toast.msg}</div>
      )}

      {/* Year Selector */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div className="label" style={{ marginBottom: 0 }}>Assessment Year</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {years.map(y => (
              <button key={y} onClick={() => handleYearChange(y)}
                className={year === y ? 'tab tab-active' : 'tab'}
                style={{ padding: '8px 18px' }}>{y}</button>
            ))}
          </div>
          <div style={{ marginLeft: 'auto', fontWeight: 800, color: '#166534', fontSize: 15 }}>
            {year} Total Collected: {fmt(totalCollected)}
          </div>
        </div>
      </div>

      <div className="grid-cols-2" style={{ marginBottom: 24, alignItems: 'start' }}>
        {/* Payment Entry Form */}
        <div className="card">
          <h3 style={{ margin: '0 0 20px', color: 'var(--navy)', fontWeight: 800 }}>
            💳 Record New Payment
          </h3>

          {/* Member Search */}
          <div className="input-group">
            <label className="label">Search Member</label>
            <input className="input" placeholder="Type name to search..." value={search}
              onChange={e => { setSearch(e.target.value); setSelectedMemberId(''); }} />
          </div>

          {/* Filtered Member List */}
          {search && !selectedMemberId && (
            <div style={{
              border: '1px solid #CFD8E3', borderRadius: 10, maxHeight: 200,
              overflowY: 'auto', marginBottom: 16, background: 'white',
            }}>
              {filteredMembers.length === 0 ? (
                <div style={{ padding: 16, color: 'var(--grey)', fontSize: 13 }}>No members found</div>
              ) : filteredMembers.slice(0, 20).map(m => (
                <div key={m.id}
                  onClick={() => { setSelectedMemberId(m.id); setSearch(`${m.title || 'Bro.'} ${m.first_name} ${m.surname}`); }}
                  style={{
                    padding: '10px 14px', cursor: 'pointer', fontSize: 14,
                    borderBottom: '1px solid var(--bg)', display: 'flex',
                    justifyContent: 'space-between', alignItems: 'center',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--gold-faint)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <span style={{ fontWeight: 600 }}>
                    {m.title || 'Bro.'} {m.first_name} {m.surname}
                  </span>
                  <span className="badge-blue">{m.membership_type || 'Regular'}</span>
                </div>
              ))}
            </div>
          )}

          {selectedMemberId && (
            <div style={{
              background: 'var(--gold-faint)', border: '1px solid var(--gold-pale)',
              borderRadius: 8, padding: '10px 14px', marginBottom: 16,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 14 }}>
                ✅ {search}
              </span>
              <button onClick={() => { setSelectedMemberId(''); setSearch(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--grey)', fontSize: 18 }}>✕</button>
            </div>
          )}

          {/* Month */}
          <div className="input-group">
            <label className="label">Month</label>
            <select className="input select" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Amount */}
          <div className="input-group">
            <label className="label">Amount (GH¢)</label>
            <input className="input" type="number" min="0" step="0.01" placeholder="0.00"
              value={amount} onChange={e => setAmount(e.target.value)} />
          </div>

          {/* Date */}
          <div className="input-group">
            <label className="label">Payment Date</label>
            <input className="input" type="date" value={paymentDate}
              onChange={e => setPaymentDate(e.target.value)} />
          </div>

          <button className="btn-primary" onClick={handleRecord} disabled={submitting}
            style={{ width: '100%', fontSize: 15, marginTop: 4 }}>
            {submitting ? 'Recording...' : '💾 Record Payment'}
          </button>
        </div>

        {/* Recent Payments */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ margin: 0, color: 'var(--navy)', fontWeight: 800, fontSize: 16 }}>
              Payment Log ({year})
            </h3>
            <input className="input" placeholder="Filter payments..."
              value={paySearch} onChange={e => setPaySearch(e.target.value)}
              style={{ width: 170, padding: '8px 12px', fontSize: 12 }} />
          </div>

          {filteredPayments.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--grey)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>💳</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>No payments recorded yet</div>
            </div>
          ) : (
            <div style={{ maxHeight: 520, overflowY: 'auto' }}>
              {filteredPayments.map(p => (
                <div key={p.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 20px', borderBottom: '1px solid var(--bg)',
                  gap: 8, flexWrap: 'wrap',
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      {p.members?.title || 'Bro.'} {p.members?.first_name} {p.members?.surname}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>
                      {p.month} — {new Date(p.payment_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontWeight: 800, color: '#166534', fontSize: 15 }}>
                      {fmt(parseFloat(p.amount as any))}
                    </span>
                    <button
                      onClick={() => handleDelete(p.id)}
                      disabled={deleting === p.id}
                      style={{
                        background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA',
                        borderRadius: 6, padding: '4px 10px', fontSize: 12,
                        fontWeight: 700, cursor: 'pointer',
                      }}>
                      {deleting === p.id ? '...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </RegistrarShell>
  );
}
