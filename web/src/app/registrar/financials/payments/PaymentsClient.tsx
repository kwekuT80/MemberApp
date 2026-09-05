'use client';

import React, { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDisplayDate } from '@/lib/utils/ksji-logic';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  reclassifyDuesToWelfare,
  getPaymentsForYear,
  getDismissedMemberIndebtedness
} from '@/services/financialService';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

type Member = {
  id: string;
  first_name: string | null;
  surname: string | null;
  title: string | null;
  membership_type: string | null;
  status?: string | null;
  isDismissed?: boolean;
};

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
  initialDismissedMembers = [],
  initialPayments,
  currentUserId,
}: {
  initialYear: number;
  initialMembers: Member[];
  initialDismissedMembers?: Member[];
  initialPayments: Payment[];
  currentUserId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [year, setYear] = useState(initialYear);
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [members] = useState<Member[]>(initialMembers);
  const [dismissedMembersList] = useState<Member[]>(initialDismissedMembers);
  const [includeDismissed, setIncludeDismissed] = useState(false);
  
  const [search, setSearch] = useState('');
  const [paySearch, setPaySearch] = useState('');

  // Form state
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Dismissed Member Arrears Recovery State
  const [dismissedDebtInfo, setDismissedDebtInfo] = useState<any>(null);
  const [loadingDebtInfo, setLoadingDebtInfo] = useState(false);

  // Payment Category
  const [paymentCategory, setPaymentCategory] = useState<'assessment' | 'voluntary_relief' | 'special_appeal' | 'arrears_recovery'>('assessment');
  const [activeTab, setActiveTab] = useState<'all' | 'assessment' | 'voluntary' | 'recovery'>('all');

  // Reclassify Modal State
  const [reclassifyModalOpen, setReclassifyModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [targetWelfareYear, setTargetWelfareYear] = useState(new Date().getFullYear().toString());
  const [targetWelfareMonth, setTargetWelfareMonth] = useState((new Date().getMonth() + 1).toString());
  const [targetPaymentMethod, setTargetPaymentMethod] = useState<'cash' | 'mobile_money' | 'bank_transfer' | 'cheque'>('mobile_money');
  const [reclassifyReason, setReclassifyReason] = useState('');
  const [reclassifying, setReclassifying] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  function showToast(msg: string, type: 'ok' | 'err') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
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

  // Searchable members pool
  const searchableMembers: (Member & { isDismissed: boolean })[] = useMemo(() => {
    const active = members.map(m => ({ ...m, isDismissed: false }));
    if (!includeDismissed) return active;
    const dismissed = dismissedMembersList.map(m => ({ ...m, isDismissed: true }));
    return [...active, ...dismissed];
  }, [members, dismissedMembersList, includeDismissed]);

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return searchableMembers.filter(m => {
      const name = `${m.first_name || ''} ${m.surname || ''}`.toLowerCase();
      return name.includes(q);
    });
  }, [searchableMembers, search]);

  const selectedMember = useMemo(() => {
    return searchableMembers.find(m => m.id === selectedMemberId);
  }, [searchableMembers, selectedMemberId]);

  async function handleSelectMember(m: Member & { isDismissed: boolean }) {
    setSelectedMemberId(m.id);
    setSearch(`${m.title || 'Bro.'} ${m.first_name || ''} ${m.surname || ''}`);

    if (m.isDismissed) {
      setPaymentCategory('arrears_recovery');
      setSelectedMonth('Arrears Recovery (Dismissed)');
      setLoadingDebtInfo(true);
      try {
        const info = await getDismissedMemberIndebtedness(m.id);
        setDismissedDebtInfo(info);
      } catch (e) {
        console.error('Failed to fetch dismissed indebtedness:', e);
      } finally {
        setLoadingDebtInfo(false);
      }
    } else {
      setDismissedDebtInfo(null);
      if (paymentCategory === 'arrears_recovery') {
        setPaymentCategory('assessment');
        setSelectedMonth(MONTHS[new Date().getMonth()]);
      }
      updateDefaultAmountForMember(m.id, year);
    }
  }

  const isVoluntaryPayment = (p: Payment) => {
    const m = (p.month || '').toLowerCase();
    return m.includes('voluntary') || m.includes('appeal') || m.includes('relief') || m.includes('donation');
  };

  const isRecoveryPayment = (p: Payment) => {
    const m = (p.month || '').toLowerCase();
    return m.includes('recovery') || m.includes('dismissed');
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
    } else if (paymentCategory === 'arrears_recovery' || selectedMember?.isDismissed) {
      recordedMonth = selectedMonth.includes('Recovery') ? selectedMonth : 'Arrears Recovery (Dismissed)';
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

    // Handle dismissed brother toast & state update
    if (selectedMember?.isDismissed) {
      try {
        const updated = await getDismissedMemberIndebtedness(selectedMemberId);
        setDismissedDebtInfo(updated);
        if (updated.isReinstatementReady) {
          showToast(`🏆 GH¢ ${savedAmt} recorded! ${savedName} has fully cleared his indebtedness and is now REINSTATEMENT READY!`, 'ok');
        } else if (updated.isConfigured) {
          showToast(`🎉 Recorded GH¢ ${savedAmt} (Arrears Recovery) for ${savedName}! Remaining debt: GH¢ ${updated.remainingDebt.toFixed(2)}`, 'ok');
        } else {
          showToast(`🎉 Recorded GH¢ ${savedAmt} (Arrears Recovery) for ${savedName}! (Historical debt pending configuration)`, 'ok');
        }
      } catch (err) {
        showToast(`🎉 Recorded GH¢ ${savedAmt} for ${savedName}!`, 'ok');
      }
    } else {
      if (keepOpen) {
        showToast(`🎉 Recorded GH¢ ${savedAmt} (${paymentCategory === 'assessment' ? 'Dues' : 'Voluntary Relief'}) for ${savedName}!`, 'ok');
      } else {
        showToast(`🎉 Payment recorded for ${savedName}!`, 'ok');
      }
    }

    if (!keepOpen) {
      setSelectedMemberId('');
      setSearch('');
      setAmount('');
      setDismissedDebtInfo(null);
    } else {
      setAmount('');
    }
  }

  function handleOpenReclassify(payment: Payment) {
    setSelectedPayment(payment);
    setTargetWelfareYear(payment.assessment_year ? payment.assessment_year.toString() : new Date().getFullYear().toString());
    setTargetWelfareMonth((new Date().getMonth() + 1).toString());
    setTargetPaymentMethod('mobile_money');
    setReclassifyReason('Miscategorized payment reallocated from Assessment Dues to Welfare Scheme');
    setReclassifyModalOpen(true);
  }

  async function handleConfirmReclassify(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPayment) return;

    setReclassifying(true);
    try {
      const res = await reclassifyDuesToWelfare(selectedPayment.id, {
        periodYear: parseInt(targetWelfareYear, 10),
        periodMonth: parseInt(targetWelfareMonth, 10) || 1,
        paymentMethod: targetPaymentMethod,
        reason: reclassifyReason,
      });

      if (!res.success) {
        showToast(res.error || 'Failed to reclassify payment', 'err');
        setReclassifying(false);
        return;
      }

      showToast('✓ Successfully moved payment to Welfare Scheme!', 'ok');
      setReclassifyModalOpen(false);
      setSelectedPayment(null);
      
      // Refresh list
      const updated = await getPaymentsForYear(year);
      setPayments(updated);
      router.refresh();
    } catch (err: any) {
      showToast(err.message || 'Error reclassifying payment', 'err');
    } finally {
      setReclassifying(false);
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
      'Month / Purpose',
      'Amount (GH¢)',
      'Payment Date'
    ];

    const rows = filteredPayments.map(p => [
      `${p.members?.title || 'Bro.'} ${p.members?.first_name} ${p.members?.surname}`,
      p.assessment_year,
      p.month,
      p.amount.toFixed(2),
      formatDisplayDate(p.payment_date)
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
                <th>Month / Purpose</th>
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

  const duesPaymentsList = payments.filter(p => !isVoluntaryPayment(p) && !isRecoveryPayment(p));
  const voluntaryPaymentsList = payments.filter(p => isVoluntaryPayment(p));
  const recoveryPaymentsList = payments.filter(p => isRecoveryPayment(p));

  const duesTotal = duesPaymentsList.reduce((s: number, p: Payment) => s + parseFloat(p.amount as any), 0);
  const voluntaryTotal = voluntaryPaymentsList.reduce((s: number, p: Payment) => s + parseFloat(p.amount as any), 0);
  const recoveryTotal = recoveryPaymentsList.reduce((s: number, p: Payment) => s + parseFloat(p.amount as any), 0);
  const totalCollected = duesTotal + voluntaryTotal + recoveryTotal;

  // Payments filtered by search & activeTab
  const filteredPayments = payments.filter(p => {
    const isVol = isVoluntaryPayment(p);
    const isRec = isRecoveryPayment(p);

    if (activeTab === 'assessment' && (isVol || isRec)) return false;
    if (activeTab === 'voluntary' && !isVol) return false;
    if (activeTab === 'recovery' && !isRec) return false;

    const name = `${p.members?.first_name || ''} ${p.members?.surname || ''}`.toLowerCase();
    const month = (p.month || '').toLowerCase();
    const query = paySearch.toLowerCase();
    return name.includes(query) || month.includes(query);
  });

  const years = Array.from({ length: 5 }, (_, i: number) => new Date().getFullYear() - 2 + i);

  return (
    <div style={{ width: '100%' }}>
      {/* ── Top Navigation & Back Link ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Link
          href="/registrar/financials"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            textDecoration: 'none',
            color: '#10233F',
            fontWeight: 700,
            fontSize: 14,
            padding: '8px 16px',
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: 8,
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            transition: 'all 0.15s ease'
          }}
        >
          ← Back to Financial Hub
        </Link>
        <Link
          href="/registrar/financials/breakdown"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            textDecoration: 'none',
            color: '#0369A1',
            fontWeight: 600,
            fontSize: 13,
            padding: '8px 14px',
            background: '#F0F9FF',
            border: '1px solid #BAE6FD',
            borderRadius: 8
          }}
        >
          📊 Periodic Subtotals & Breakdown →
        </Link>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          background: toast.type === 'ok' ? '#166534' : '#991B1B',
          color: 'white', padding: '14px 24px', borderRadius: 12,
          fontWeight: 700, fontSize: 14, boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
          maxWidth: '480px'
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
          <h3 style={{ margin: '0 0 16px', color: 'var(--navy)', fontWeight: 800 }}>
            💳 Record New Payment
          </h3>

          {/* Member Search Header with Dismissed Toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label className="label" style={{ marginBottom: 0 }}>Search Member</label>
            <label style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              cursor: 'pointer',
              color: includeDismissed ? '#B45309' : '#64748B',
              fontWeight: includeDismissed ? 700 : 500,
              background: includeDismissed ? '#FEF3C7' : '#F1F5F9',
              padding: '3px 8px',
              borderRadius: 6,
              border: `1px solid ${includeDismissed ? '#FDE68A' : '#E2E8F0'}`
            }}>
              <input
                type="checkbox"
                checked={includeDismissed}
                onChange={e => {
                  setIncludeDismissed(e.target.checked);
                  setSelectedMemberId('');
                  setSearch('');
                  setDismissedDebtInfo(null);
                }}
                style={{ accentColor: '#D97706', cursor: 'pointer' }}
              />
              <span>Include Dismissed Brothers (Debt Recovery)</span>
            </label>
          </div>

          <div className="input-group">
            <input
              className="input"
              placeholder={includeDismissed ? "Search active or dismissed brother..." : "Type name to search active members..."}
              value={search}
              onChange={e => { setSearch(e.target.value); setSelectedMemberId(''); setDismissedDebtInfo(null); }}
            />
          </div>

          {/* Filtered Member Dropdown List */}
          {search && !selectedMemberId && (
            <div style={{
              border: '1px solid #CFD8E3', borderRadius: 10, maxHeight: 220,
              overflowY: 'auto', marginBottom: 16, background: 'white',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
            }}>
              {filteredMembers.length === 0 ? (
                <div style={{ padding: 16, color: 'var(--grey)', fontSize: 13 }}>
                  No members found matching &quot;{search}&quot;.
                  {!includeDismissed && (
                    <div style={{ marginTop: 6, fontSize: 12, color: '#B45309' }}>
                      Looking for a dismissed brother? Check the <strong>&quot;Include Dismissed Brothers&quot;</strong> toggle above.
                    </div>
                  )}
                </div>
              ) : filteredMembers.slice(0, 25).map(m => (
                <div
                  key={m.id}
                  onClick={() => handleSelectMember(m)}
                  style={{
                    padding: '10px 14px', cursor: 'pointer', fontSize: 14,
                    borderBottom: '1px solid var(--bg)', display: 'flex',
                    justifyContent: 'space-between', alignItems: 'center',
                    background: m.isDismissed ? '#FFFBEB' : 'white',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = m.isDismissed ? '#FEF3C7' : 'var(--gold-faint)')}
                  onMouseLeave={e => (e.currentTarget.style.background = m.isDismissed ? '#FFFBEB' : '')}
                >
                  <span style={{ fontWeight: 600, color: m.isDismissed ? '#92400E' : 'inherit' }}>
                    {m.title || 'Bro.'} {m.first_name} {m.surname}
                  </span>
                  {m.isDismissed ? (
                    <span style={{
                      background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A',
                      padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700
                    }}>
                      ⚠️ Dismissed • Recovery
                    </span>
                  ) : (
                    <span className="badge-blue">{m.membership_type || 'Regular'}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Selected Member Confirmation Pill */}
          {selectedMemberId && (
            <div style={{
              background: selectedMember?.isDismissed ? '#FEF3C7' : 'var(--gold-faint)',
              border: `1px solid ${selectedMember?.isDismissed ? '#FDE68A' : 'var(--gold-pale)'}`,
              borderRadius: 8, padding: '10px 14px', marginBottom: 16,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <span style={{ fontWeight: 700, color: selectedMember?.isDismissed ? '#92400E' : 'var(--navy)', fontSize: 14 }}>
                  {selectedMember?.isDismissed ? '⚠️' : '✅'} {search}
                </span>
                {selectedMember?.isDismissed && (
                  <span style={{
                    marginLeft: 8, background: '#F59E0B', color: '#FFF',
                    fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4
                  }}>
                    DISMISSED MEMBER
                  </span>
                )}
              </div>
              <button onClick={() => { setSelectedMemberId(''); setSearch(''); setDismissedDebtInfo(null); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--grey)', fontSize: 18 }}>✕</button>
            </div>
          )}

          {/* Dismissed Member Indebtedness & Recovery Card */}
          {selectedMember?.isDismissed && (
            <div style={{
              background: dismissedDebtInfo?.isReinstatementReady ? '#F0FDF4' : '#FFFBEB',
              border: `1px solid ${dismissedDebtInfo?.isReinstatementReady ? '#86EFAC' : '#FDE68A'}`,
              borderRadius: 8,
              padding: '12px 14px',
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{
                  fontSize: 12,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: dismissedDebtInfo?.isReinstatementReady ? '#166534' : '#92400E',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  {dismissedDebtInfo?.isReinstatementReady ? '🎉 Reinstatement Ready' : '⚠️ Arrears Recovery Mode'}
                </span>
                <Link
                  href={`/registrar/members/${selectedMemberId}`}
                  target="_blank"
                  style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', textDecoration: 'underline' }}
                >
                  Member Profile ↗
                </Link>
              </div>

              {loadingDebtInfo ? (
                <div style={{ fontSize: 12, color: '#64748B' }}>Fetching historical indebtedness...</div>
              ) : dismissedDebtInfo ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 6, marginBottom: 8 }}>
                    <div style={{ background: '#FFF', padding: '6px 8px', borderRadius: 6, border: '1px solid #E2E8F0', textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: '#64748B', fontWeight: 700 }}>CONFIGURED DEBT</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#1E293B' }}>
                        {dismissedDebtInfo.isConfigured ? `GH¢ ${dismissedDebtInfo.configuredDebt.toFixed(2)}` : 'Pending'}
                      </div>
                    </div>
                    <div style={{ background: '#FFF', padding: '6px 8px', borderRadius: 6, border: '1px solid #E2E8F0', textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: '#64748B', fontWeight: 700 }}>RECOVERED</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#166534' }}>
                        GH¢ {dismissedDebtInfo.totalRecovered.toFixed(2)}
                      </div>
                    </div>
                    <div style={{ background: '#FFF', padding: '6px 8px', borderRadius: 6, border: '1px solid #E2E8F0', textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: '#64748B', fontWeight: 700 }}>REMAINING</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: dismissedDebtInfo.remainingDebt > 0 ? '#DC2626' : '#166534' }}>
                        {dismissedDebtInfo.isConfigured ? `GH¢ ${dismissedDebtInfo.remainingDebt.toFixed(2)}` : 'N/A'}
                      </div>
                    </div>
                  </div>

                  {!dismissedDebtInfo.isConfigured ? (
                    <div style={{ fontSize: 11, color: '#B45309', background: '#FEF3C7', padding: '6px 8px', borderRadius: 4, lineHeight: 1.4 }}>
                      ℹ️ <strong>Indebtedness not yet entered:</strong> Payments can be logged immediately without waiting. His historical indebtedness can be entered at any later date on his member profile, which will automatically evaluate reinstatement readiness.
                    </div>
                  ) : dismissedDebtInfo.isReinstatementReady ? (
                    <div style={{ fontSize: 11, color: '#15803D', background: '#DCFCE7', padding: '6px 8px', borderRadius: 4, lineHeight: 1.4 }}>
                      🏆 <strong>Indebtedness fully cleared!</strong> Brother has settled all outstanding arrears and is eligible for formal reinstatement.
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.4 }}>
                      Payments recorded will count directly towards clearing this brother&apos;s historical indebtedness of GH¢ {dismissedDebtInfo.configuredDebt.toFixed(2)}.
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* Payment Classification */}
          <div className="input-group">
            <label className="label">Payment Purpose</label>
            <select 
              className="input select" 
              value={paymentCategory} 
              onChange={e => {
                const val = e.target.value as any;
                setPaymentCategory(val);
                if (val === 'arrears_recovery') {
                  setSelectedMonth('Arrears Recovery (Dismissed)');
                } else if (val === 'assessment') {
                  setSelectedMonth(MONTHS[new Date().getMonth()]);
                }
              }}
              style={{ fontWeight: 700 }}
            >
              <option value="assessment">💳 Assessment Dues Payment</option>
              {selectedMember?.isDismissed && (
                <option value="arrears_recovery">⚠️ Arrears Recovery (Dismissed Member)</option>
              )}
              <option value="voluntary_relief">❤️ Voluntary Member Relief Donation</option>
              <option value="special_appeal">📢 Special Emergency Appeal</option>
            </select>
          </div>

          {/* Month / Period Selection */}
          {paymentCategory === 'assessment' && (
            <div className="input-group">
              <label className="label">Assessment Month</label>
              <select className="input select" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          )}

          {paymentCategory === 'arrears_recovery' && (
            <div className="input-group">
              <label className="label">Recovery Description / Period</label>
              <input
                className="input"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                placeholder="Arrears Recovery (Dismissed)"
              />
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
          <div style={{ display: 'flex', gap: 6, padding: '10px 20px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', flexWrap: 'wrap' }}>
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
            {recoveryPaymentsList.length > 0 && (
              <button
                onClick={() => setActiveTab('recovery')}
                style={{
                  padding: '6px 14px', borderRadius: 6, border: 'none', fontWeight: 800, fontSize: 12, cursor: 'pointer',
                  background: activeTab === 'recovery' ? '#B45309' : '#FEF3C7',
                  color: activeTab === 'recovery' ? '#FFF' : '#92400E'
                }}
              >
                ⚠️ Arrears Recovery ({recoveryPaymentsList.length})
              </button>
            )}
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
                const isRec = isRecoveryPayment(p);
                return (
                  <div key={p.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 20px', borderBottom: '1px solid var(--bg)',
                    gap: 8, flexWrap: 'wrap',
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{p.members?.title || 'Bro.'} {p.members?.first_name} {p.members?.surname}</span>
                        {isRec ? (
                          <span style={{
                            background: '#FEF3C7',
                            color: '#92400E',
                            border: '1px solid #FDE68A',
                            padding: '2px 8px', borderRadius: 100, fontSize: 11, fontWeight: 700
                          }}>
                            ⚠️ Arrears Recovery
                          </span>
                        ) : isVol ? (
                          <span style={{
                            background: '#F3E8FF',
                            color: '#6D28D9',
                            padding: '2px 8px', borderRadius: 100, fontSize: 11, fontWeight: 700
                          }}>
                            ❤️ Voluntary Relief
                          </span>
                        ) : (
                          <span style={{
                            background: '#DCFCE7',
                            color: '#166534',
                            padding: '2px 8px', borderRadius: 100, fontSize: 11, fontWeight: 700
                          }}>
                            💳 Assessment Dues
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>
                        {p.month} — {formatDisplayDate(p.payment_date)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontWeight: 800, color: isRec ? '#B45309' : isVol ? '#6D28D9' : '#166534', fontSize: 15, fontFamily: 'monospace' }}>
                        {fmt(parseFloat(p.amount as any))}
                      </span>
                      <button
                        onClick={() => handleOpenReclassify(p)}
                        style={{
                          background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE',
                          borderRadius: 6, padding: '4px 10px', fontSize: 12,
                          fontWeight: 700, cursor: 'pointer',
                        }}
                        title="Reclassify to Welfare Scheme Contribution"
                      >
                        🔄 Move to Welfare
                      </button>
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

      {/* Reclassify Modal */}
      {reclassifyModalOpen && selectedPayment && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16
        }}>
          <div style={{
            background: 'white', borderRadius: 12, maxWidth: 480, width: '100%',
            padding: 24, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 18, color: 'var(--navy)' }}>
              🔄 Reclassify Payment to Welfare
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748B' }}>
              Transferring receipt of <strong>GH¢ {parseFloat(selectedPayment.amount as any).toFixed(2)}</strong> for{' '}
              <strong>{selectedPayment.members?.title || 'Bro.'} {selectedPayment.members?.first_name} {selectedPayment.members?.surname}</strong>{' '}
              from Assessment Dues into the Welfare Contribution Ledger.
            </p>

            <form onSubmit={handleConfirmReclassify}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label className="label">Welfare Year</label>
                  <input
                    className="input"
                    type="number"
                    value={targetWelfareYear}
                    onChange={e => setTargetWelfareYear(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label">Welfare Month (1-12)</label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    max="12"
                    value={targetWelfareMonth}
                    onChange={e => setTargetWelfareMonth(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="label">Payment Method</label>
                <select
                  className="input select"
                  value={targetPaymentMethod}
                  onChange={e => setTargetPaymentMethod(e.target.value as any)}
                >
                  <option value="mobile_money">Mobile Money</option>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div className="input-group">
                <label className="label">Audit Note / Reason</label>
                <input
                  className="input"
                  value={reclassifyReason}
                  onChange={e => setReclassifyReason(e.target.value)}
                  placeholder="e.g. Member made payment towards welfare dues"
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  onClick={() => setReclassifyModalOpen(false)}
                  disabled={reclassifying}
                  style={{
                    background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1',
                    borderRadius: 8, padding: '8px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reclassifying}
                  style={{
                    background: '#6D28D9', color: 'white', border: 'none',
                    borderRadius: 8, padding: '8px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer'
                  }}
                >
                  {reclassifying ? 'Transferring...' : 'Confirm Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
