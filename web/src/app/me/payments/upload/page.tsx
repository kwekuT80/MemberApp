'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import MemberShell from '@/components/layout/MemberShell';
import { createClient } from '@/lib/supabase/client';
import { submitMoMoPayment, getMemberMoMoSubmissions, MoMoSubmission } from '@/services/momoSubmissionService';
import { formatDisplayDate } from '@/lib/utils/ksji-logic';

export default function MoMoUploadPage() {
  const [member, setMember] = useState<any>(null);
  const [submissions, setSubmissions] = useState<MoMoSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  // Form State
  const [category, setCategory] = useState<'assessment' | 'welfare' | 'voluntary_relief'>('assessment');
  const [amount, setAmount] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: m } = await supabase
        .from('members')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (m) {
        setMember(m);
        if (m.phone) setSenderPhone(m.phone);
        const subs = await getMemberMoMoSubmissions(m.id);
        setSubmissions(subs);
      }
      setLoading(false);
    }
    init();
  }, []);

  const showToast = (msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) {
      showToast('Member profile not found.', 'err');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      showToast('Please enter a valid contribution amount.', 'err');
      return;
    }
    if (!transactionRef.trim()) {
      showToast('Please enter the MoMo transaction reference / ID.', 'err');
      return;
    }

    setSubmitting(true);
    try {
      const created = await submitMoMoPayment({
        member_id: member.id,
        payment_category: category,
        amount: parseFloat(amount),
        transaction_ref: transactionRef.trim(),
        sender_phone: senderPhone.trim() || undefined,
        receipt_notes: notes.trim() || undefined
      });

      setSubmissions(prev => [created, ...prev]);
      setAmount('');
      setTransactionRef('');
      setNotes('');
      showToast('🎉 Payment reference submitted! The Finance Officer will verify and credit your ledger shortly.', 'ok');
    } catch (err: any) {
      console.error('Submission error:', err);
      showToast(err.message || 'Failed to submit payment reference.', 'err');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val: number) =>
    `GH₵ ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <MemberShell title="Mobile Money Receipt Verification" subtitle="Submit offline payment references">
        <div style={{ textAlign: 'center', padding: 48, color: '#64748B' }}>Loading profile...</div>
      </MemberShell>
    );
  }

  return (
    <MemberShell
      title="Mobile Money Receipt Verification"
      subtitle="Log your offline MoMo transfers for Financial Secretary or Welfare Treasurer verification"
    >
      <div style={{ maxWidth: 860, margin: '0 auto', paddingBottom: 48, fontFamily: 'Inter, sans-serif' }}>
        
        {/* Navigation */}
        <div style={{ marginBottom: 20 }}>
          <Link href="/me" style={{ textDecoration: 'none', color: '#1E293B', fontWeight: 700, fontSize: 14 }}>
            ← Back to Overview
          </Link>
        </div>

        {/* Toast Alert */}
        {toast && (
          <div style={{
            padding: '14px 20px',
            borderRadius: 12,
            marginBottom: 20,
            fontWeight: 800,
            fontSize: 14,
            background: toast.type === 'ok' ? '#DCFCE7' : '#FEE2E2',
            color: toast.type === 'ok' ? '#166534' : '#991B1B',
            border: `1px solid ${toast.type === 'ok' ? '#86EFAC' : '#FCA5A5'}`
          }}>
            {toast.msg}
          </div>
        )}

        {/* Informational Guidance Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #10233F 0%, #1E3A8A 100%)',
          borderRadius: 16,
          padding: '24px 28px',
          color: 'white',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          marginBottom: 28
        }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: '#FCD34D', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            📱 OFFICIAL MOBILE MONEY VERIFICATION FLOW
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 900, margin: '6px 0 8px' }}>
            Paid via MoMo? Register Your Reference Here!
          </h2>
          <p style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.6, margin: 0 }}>
            After transferring your dues or welfare contribution to the official Commandery MoMo account, enter the transaction ID below. Your submission will be routed directly to the <strong>Financial Secretary</strong> (for Assessment Dues) or <strong>Welfare Treasurer</strong> (for Welfare Fund) for verification.
          </p>
        </div>

        {/* Form Container */}
        <div style={{
          background: 'white',
          borderRadius: 16,
          border: '1px solid #E2E8F0',
          padding: '28px 32px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
          marginBottom: 36
        }}>
          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', marginTop: 0, marginBottom: 20 }}>
            📝 Log MoMo Transfer Reference
          </h3>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 20 }}>
              
              {/* Category */}
              <div>
                <label style={labelStyle}>Payment Type / Fund Category *</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as any)}
                  style={inputStyle}
                  required
                >
                  <option value="assessment">💳 Annual Assessment Dues (Financial Secretary)</option>
                  <option value="welfare">🤝 Commandery Welfare Fund (Welfare Treasurer)</option>
                  <option value="voluntary_relief">❤️ Voluntary Member Relief / Appeal (Financial Secretary)</option>
                </select>
              </div>

              {/* Amount */}
              <div>
                <label style={labelStyle}>Amount Transferred (GH₵) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="e.g. 150.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>

              {/* Transaction Ref */}
              <div>
                <label style={labelStyle}>MoMo Transaction ID / Reference No. *</label>
                <input
                  type="text"
                  placeholder="e.g. 29384910482 or TX12938"
                  value={transactionRef}
                  onChange={e => setTransactionRef(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>

              {/* Sender Phone */}
              <div>
                <label style={labelStyle}>Sender MoMo Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. 0244123456"
                  value={senderPhone}
                  onChange={e => setSenderPhone(e.target.value)}
                  style={inputStyle}
                />
              </div>

            </div>

            {/* Optional Notes */}
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Notes / Additional Details (Optional)</label>
              <textarea
                rows={2}
                placeholder="e.g. Paid via MTN MoMo for 2026 dues and outstanding arrears"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              style={{
                background: submitting ? '#94A3B8' : '#10233F',
                color: 'white',
                border: 0,
                padding: '14px 28px',
                borderRadius: 12,
                fontWeight: 900,
                fontSize: 15,
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 12px rgba(16,35,63,0.2)'
              }}
            >
              {submitting ? 'Submitting Reference...' : '🚀 Submit Reference for Verification'}
            </button>
          </form>
        </div>

        {/* History Table */}
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 16, fontWeight: 900, margin: 0, color: '#0F172A' }}>
              📜 Your Submitted Payment References ({submissions.length})
            </h3>
          </div>

          {submissions.length === 0 ? (
            <div style={{ padding: 36, textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
              No payment reference submissions recorded yet.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#F1F5F9', color: '#475569', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px' }}>Date Submitted</th>
                  <th style={{ padding: '12px 16px' }}>Category</th>
                  <th style={{ padding: '12px 16px' }}>Transaction ID</th>
                  <th style={{ padding: '12px 16px' }}>Amount</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => {
                  let statusBadge = (
                    <span style={{ background: '#FEF3C7', color: '#92400E', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800 }}>
                      ⏳ Pending Review
                    </span>
                  );
                  if (s.status === 'approved') {
                    statusBadge = (
                      <span style={{ background: '#DCFCE7', color: '#166534', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800 }}>
                        ✅ Approved & Credited
                      </span>
                    );
                  } else if (s.status === 'rejected') {
                    statusBadge = (
                      <span style={{ background: '#FEE2E2', color: '#991B1B', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800 }}>
                        ❌ Rejected
                      </span>
                    );
                  }

                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 16px', color: '#64748B' }}>
                        {formatDisplayDate(s.created_at)}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 800, color: '#0F172A' }}>
                        {s.payment_category === 'assessment' ? '💳 Assessment Dues' : (s.payment_category === 'welfare' ? '🤝 Welfare Fund' : '❤️ Voluntary Relief')}
                      </td>
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 700, color: '#2563EB' }}>
                        {s.transaction_ref}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 900, fontFamily: 'monospace' }}>
                        {formatCurrency(Number(s.amount))}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        {statusBadge}
                        {s.status === 'rejected' && s.rejection_reason && (
                          <div style={{ fontSize: 11, color: '#B91C1C', marginTop: 4 }}>
                            Reason: {s.rejection_reason}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </MemberShell>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 800,
  color: '#475569',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: 0.5
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid #CBD5E1',
  fontSize: 14,
  outline: 'none',
  background: '#F8FAFC',
  color: '#0F172A'
};
