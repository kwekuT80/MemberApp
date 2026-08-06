'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDisplayDate } from '@/lib/utils/ksji-logic';

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

  // Pre-fill amount based on configured annual assessment rates for that year & member type
  async function updateDefaultAmountForMember(mId: string, targetYear: number) {
    if (!mId) return;
    const targetMember = members.find(m => m.id === mId);
    if (!targetMember) return;

    try {
      const { data: rateObj } = await supabase
        .from('annual_assessment_rates')
        .select('*')
        .eq('year', targetYear)
        .maybeSingle();

      const mType = (targetMember.membership_type || '').toLowerCase();
      let annualRate = 1050; // Fallback
      if (rateObj) {
        if (mType.includes('social')) annualRate = Number(rateObj.social_rate) || 750;
        else if (mType.includes('student')) annualRate = Number(rateObj.student_rate) || 500;
        else annualRate = Number(rateObj.regular_rate) || 1050;
      }
      const monthlyVal = (annualRate / 12).toFixed(2);
      setAmount(monthlyVal);
    } catch (e) {
      console.error('Failed to pre-fill member monthly assessment rate:', e);
    }
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

  const [paymentCategory, setPaymentCategory] = useState<'assessment' | 'voluntary_relief' | 'special_appeal'>('assessment');
  const [activeTab, setActiveTab] = useState<'all' | 'assessment' | 'voluntary'>('all');

  const isVoluntaryPayment = (p: Payment) => {
    const m = (p.month || '').toLowerCase();
    return m.includes('voluntary') || m.includes('appeal') || m.includes('relief') || m.includes('donation');
  };

  async function handleRecord(keepOpen = false) {
    if (!selectedMemberId || !amount || parseFloat(amount) <= 0) {
      showToast('Please select a member and enter a valid amount.', 'err');
      return;
    }
    setSubmitting(true);

    let recordedMonth = selectedMonth;
    if (paymentCategory === 'voluntary_relief') {
      recordedMonth = 'Voluntary Relief Donation';
    } else if (paymentCategory === 'special_appeal') {
      recordedMonth = 'Special Emergency Appeal';
    }

    const { data, error } = await supabase
      .from('financial_payments')
      .insert({
        member_id: selectedMemberId,
        assessment_year: year,
        month: recordedMonth,
        amount: parseFloat(amount),
        payment_date: new Date(paymentDate).toISOString(),
        recorded_by: currentUserId,
      })
      .select('*, members(first_name, surname, title)')
      .single();

    setSubmitting(false);
    if (error) { showToast('Error: ' + error.message, 'err'); return; }

    const savedName = data?.members ? `${data.members.title || 'Bro.'} ${data.members.first_name} ${data.members.surname}` : 'Member';
    const savedAmt = Number(amount).toFixed(2);

    setPayments(prev => [data as Payment, ...prev]);
    setSelectedMemberId('');
    setSearch('');
    setAmount('');

    if (keepOpen) {
      showToast(`🎉 Recorded GH₵ ${savedAmt} (${paymentCategory === 'assessment' ? 'Dues' : 'Voluntary Relief'}) for ${savedName}!`, 'ok');
    } else {
      showToast(`🎉 Payment recorded for ${savedName}!`, 'ok');
    }
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

  const downloadPaymentsCSV = () => {
    if (!filteredPayments.length) return;

    const headers = [
      'Member Name',
      'Assessment Year',
      'Month',
      'Amount (GH¢)',
      'Payment Date'
    ];

    const rows = filteredPayments.map(p => [
      `${p.members?.title || 'Bro.'} ${p.members?.first_name} ${p.members?.surname}`,
      p.assessment_year,
      p.month,
      p.amount.toFixed(2),
      new Date(p.payment_date).toLocaleDateString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `payments_log_${year}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printPaymentsPDF = () => {
    if (!filteredPayments.length) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print this report.');
      return;
    }

    const rowsHtml = filteredPayments.map(p => {
      const dateStr = formatDisplayDate(p.payment_date);
      return `
        <tr>
          <td><strong>${p.members?.title || 'Bro.'} ${p.members?.first_name} ${p.members?.surname}</strong></td>
          <td>${p.month}</td>
          <td>${dateStr}</td>
          <td style="text-align: right; font-weight: 700; color: #166534;">GH¢ ${parseFloat(p.amount as any).toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Payments Log - ${year}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #10233f; }
            .report-header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #C9A84C; padding-bottom: 20px; }
            .report-header h1 { text-transform: uppercase; letter-spacing: 2px; margin: 0; font-size: 24px; color: #10233f; }
            .report-header p { color: #C9A84C; font-weight: 700; margin: 5px 0 0 0; }
            
            .summary-info { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
            .summary-info h3 { margin: 0; font-size: 13px; color: #64748b; text-transform: uppercase; }
            .summary-info .val { font-size: 20px; font-weight: 800; color: #166534; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; padding: 12px; border-bottom: 2px solid #10233f; font-size: 13px; text-transform: uppercase; background: #f1f5f9; }
            td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; }
            .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #64748b; }
            @page { margin: 1.5cm; }
          </style>
        </head>
        <body onload="window.print(); window.onafterprint = function() { window.close(); }">
          <div class="report-header">
            <h1>Knight St. John International</h1>
            <p>Recorded Payments Journal — Year ${year}</p>
          </div>
          
          <div class="summary-info">
            <div>
              <h3>Total Collected Amount</h3>
              <p style="margin: 4px 0 0; font-size: 12px; color: #64748b;">Filtered records count: ${filteredPayments.length}</p>
            </div>
            <div class="val">GH¢ ${totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Member Name</th>
                <th>Month</th>
                <th>Payment Date</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="footer">
            <p>Confidential — Official Financial Registrar Ledger Record</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const fmt = (n: number) =>
    `GH¢ ${parseFloat(n as any).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  const duesPaymentsList = payments.filter(p => !isVoluntaryPayment(p));
  const voluntaryPaymentsList = payments.filter(p => isVoluntaryPayment(p));

  const duesTotal = duesPaymentsList.reduce((s: number, p: Payment) => s + parseFloat(p.amount as any), 0);
  const voluntaryTotal = voluntaryPaymentsList.reduce((s: number, p: Payment) => s + parseFloat(p.amount as any), 0);
  const totalCollected = duesTotal + voluntaryTotal;

  // Payments filtered by search & activeTab
  const filteredPayments = payments.filter(p => {
    const isVol = isVoluntaryPayment(p);
    if (activeTab === 'assessment' && isVol) return false;
    if (activeTab === 'voluntary' && !isVol) return false;

    const name = `${p.members?.first_name} ${p.members?.surname}`.toLowerCase();
    const month = (p.month || '').toLowerCase();
    const query = paySearch.toLowerCase();
    return name.includes(query) || month.includes(query);
  });

  const years = Array.from({ length: 5 }, (_, i: number) => new Date().getFullYear() - 2 + i);

  const selectedMember = members.find(m => m.id === selectedMemberId);

  return (
    <div style={{ width: '100%' }}>
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
                  onClick={() => { 
                    setSelectedMemberId(m.id); 
                    setSearch(`${m.title || 'Bro.'} ${m.first_name} ${m.surname}`); 
                    updateDefaultAmountForMember(m.id, year);
                  }}
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

          {/* Payment Classification */}
          <div className="input-group">
            <label className="label">Payment Type</label>
            <select 
              className="input select" 
              value={paymentCategory} 
              onChange={e => setPaymentCategory(e.target.value as any)}
              style={{ fontWeight: 700 }}
            >
              <option value="assessment">💳 Assessment Dues Payment</option>
              <option value="voluntary_relief">❤️ Voluntary Member Relief Donation</option>
              <option value="special_appeal">📢 Special Emergency Appeal</option>
            </select>
          </div>

          {/* Month / Purpose */}
          {paymentCategory === 'assessment' && (
            <div className="input-group">
              <label className="label">Assessment Month</label>
              <select className="input select" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          )}

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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
            <button 
              className="btn-primary" 
              onClick={() => handleRecord(false)} 
              disabled={submitting}
              style={{ fontSize: 13, padding: '10px 14px', background: 'var(--navy)' }}
            >
              {submitting ? 'Saving...' : '💾 Save Payment'}
            </button>
            <button 
              className="btn-primary" 
              onClick={() => handleRecord(true)} 
              disabled={submitting}
              style={{ fontSize: 13, padding: '10px 14px', background: '#16a34a' }}
            >
              {submitting ? 'Saving...' : '➕ Save & Add Another'}
            </button>
          </div>
        </div>

        {/* Recent Payments */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, color: 'var(--navy)', fontWeight: 800, fontSize: 16 }}>
                Payment Journal ({year})
              </h3>
              {filteredPayments.length > 0 && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button 
                    onClick={downloadPaymentsCSV}
                    style={{ background: '#f8fafc', color: 'var(--navy)', border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                  >
                    📥 CSV
                  </button>
                  <button 
                    onClick={printPaymentsPDF}
                    style={{ background: 'var(--gold)', color: 'var(--navy)', border: 'none', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                  >
                    🖨️ PDF
                  </button>
                </div>
              )}
            </div>
            <input className="input" placeholder="Filter receipts..."
              value={paySearch} onChange={e => setPaySearch(e.target.value)}
              style={{ width: 170, padding: '8px 12px', fontSize: 12 }} />
          </div>

          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: 6, padding: '10px 20px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
            <button
              onClick={() => setActiveTab('all')}
              style={{
                padding: '6px 14px', borderRadius: 6, border: 'none', fontWeight: 800, fontSize: 12, cursor: 'pointer',
                background: activeTab === 'all' ? '#0F172A' : '#E2E8F0',
                color: activeTab === 'all' ? '#FFF' : '#475569'
              }}
            >
              All Receipts ({payments.length})
            </button>
            <button
              onClick={() => setActiveTab('assessment')}
              style={{
                padding: '6px 14px', borderRadius: 6, border: 'none', fontWeight: 800, fontSize: 12, cursor: 'pointer',
                background: activeTab === 'assessment' ? '#166534' : '#E2E8F0',
                color: activeTab === 'assessment' ? '#FFF' : '#475569'
              }}
            >
              💳 Assessment Dues ({duesPaymentsList.length})
            </button>
            <button
              onClick={() => setActiveTab('voluntary')}
              style={{
                padding: '6px 14px', borderRadius: 6, border: 'none', fontWeight: 800, fontSize: 12, cursor: 'pointer',
                background: activeTab === 'voluntary' ? '#6D28D9' : '#E2E8F0',
                color: activeTab === 'voluntary' ? '#FFF' : '#475569'
              }}
            >
              ❤️ Voluntary Relief ({voluntaryPaymentsList.length})
            </button>
          </div>

          {filteredPayments.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--grey)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>💳</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>No payments recorded yet for this view</div>
            </div>
          ) : (
            <div style={{ maxHeight: 520, overflowY: 'auto' }}>
              {filteredPayments.map(p => {
                const isVol = isVoluntaryPayment(p);
                return (
                  <div key={p.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 20px', borderBottom: '1px solid var(--bg)',
                    gap: 8, flexWrap: 'wrap',
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{p.members?.title || 'Bro.'} {p.members?.first_name} {p.members?.surname}</span>
                        <span style={{
                          background: isVol ? '#F3E8FF' : '#DCFCE7',
                          color: isVol ? '#6D28D9' : '#166534',
                          padding: '2px 8px', borderRadius: 100, fontSize: 11, fontWeight: 700
                        }}>
                          {isVol ? '❤️ Voluntary Relief' : '💳 Assessment Dues'}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>
                        {p.month} — {formatDisplayDate(p.payment_date)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontWeight: 800, color: isVol ? '#6D28D9' : '#166534', fontSize: 15, fontFamily: 'monospace' }}>
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
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
