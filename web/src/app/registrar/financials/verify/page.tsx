'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { createClient } from '@/lib/supabase/client';
import {
  getPendingMoMoSubmissionsForRole,
  approveMoMoSubmission,
  rejectMoMoSubmission,
  MoMoSubmission
} from '@/services/momoSubmissionService';
import { formatDisplayDate } from '@/lib/utils/ksji-logic';

export default function VerificationQueuePage() {
  const [role, setRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [submissions, setSubmissions] = useState<MoMoSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  // Rejection Modal State
  const [rejectingSub, setRejectingSub] = useState<MoMoSubmission | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setCurrentUserId(user.id);

      const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      const userRole = prof?.role || '';
      setRole(userRole);

      if (['financial_registrar', 'welfare_treasurer', 'super_admin'].includes(userRole)) {
        const data = await getPendingMoMoSubmissionsForRole(userRole);
        setSubmissions(data);
      }
      setLoading(false);
    }
    init();
  }, []);

  const showToast = (msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleApprove = async (sub: MoMoSubmission) => {
    if (!sub.id) return;
    setProcessingId(sub.id);
    try {
      await approveMoMoSubmission(sub, currentUserId);
      setSubmissions(prev =>
        prev.map(s => (s.id === sub.id ? { ...s, status: 'approved' } : s))
      );
      showToast(`✅ Payment of GH₵ ${sub.amount.toFixed(2)} approved & credited to member ledger!`, 'ok');
    } catch (err: any) {
      console.error('Approval failed:', err);
      showToast(err.message || 'Failed to approve payment.', 'err');
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingSub || !rejectingSub.id) return;
    if (!rejectReason.trim()) {
      showToast('Please state a reason for rejecting the submission.', 'err');
      return;
    }

    const targetId = rejectingSub.id;
    setProcessingId(targetId);
    try {
      await rejectMoMoSubmission(targetId, rejectReason.trim(), currentUserId);
      setSubmissions(prev =>
        prev.map(s => (s.id === targetId ? { ...s, status: 'rejected', rejection_reason: rejectReason.trim() } : s))
      );
      setRejectingSub(null);
      setRejectReason('');
      showToast('Payment submission rejected.', 'ok');
    } catch (err: any) {
      console.error('Rejection failed:', err);
      showToast(err.message || 'Failed to reject payment.', 'err');
    } finally {
      setProcessingId(null);
    }
  };

  const formatCurrency = (val: number) =>
    `GH₵ ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const isFinancialRegistrar = role === 'financial_registrar' || role === 'super_admin';
  const isWelfareTreasurer = role === 'welfare_treasurer' || role === 'super_admin';
  const hasAccess = isFinancialRegistrar || isWelfareTreasurer;

  if (loading) {
    return (
      <RegistrarShell title="Payment Verification Queue" subtitle="Loading submitted MoMo receipts">
        <div style={{ textAlign: 'center', padding: 48, color: '#64748B' }}>Loading queue...</div>
      </RegistrarShell>
    );
  }

  if (!hasAccess) {
    return (
      <RegistrarShell title="Access Restricted" subtitle="Verification Queue">
        <div style={{ padding: 40, textAlign: 'center', color: '#991B1B', background: '#FEE2E2', borderRadius: 16 }}>
          ⛔ Access Restricted: This verification queue is reserved for <strong>Financial Secretary</strong> (financial_registrar) and <strong>Welfare Treasurer</strong> (welfare_treasurer).
        </div>
      </RegistrarShell>
    );
  }

  const filteredSubmissions = submissions.filter(s => {
    if (filterTab === 'all') return true;
    return s.status === filterTab;
  });

  const pendingCount = submissions.filter(s => s.status === 'pending').length;

  return (
    <RegistrarShell
      title="Mobile Money Verification Queue"
      subtitle={
        role === 'financial_registrar'
          ? 'Financial Secretary Queue • Verification of Assessment Dues & Voluntary Relief Transfers'
          : role === 'welfare_treasurer'
          ? 'Welfare Treasurer Queue • Verification of Welfare Fund Transfers'
          : 'Super Admin Verification Queue • Full Access'
      }
    >
      <div style={{ maxWidth: 1050, margin: '0 auto', paddingBottom: 48, fontFamily: 'Inter, sans-serif' }}>
        
        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Link href="/registrar/financials" style={{ textDecoration: 'none', color: '#1E293B', fontWeight: 700, fontSize: 14 }}>
            ← Back to Financial Hub
          </Link>

          {/* Role Pill */}
          <div style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 800, color: '#334155' }}>
            Officer Scope: {role === 'financial_registrar' ? '💳 Financial Secretary (Dues & Relief)' : role === 'welfare_treasurer' ? '🤝 Welfare Treasurer (Welfare Dues)' : '👑 Super Admin'}
          </div>
        </div>

        {/* Toast */}
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

        {/* Filter Bar */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          <button
            onClick={() => setFilterTab('pending')}
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              border: 0,
              background: filterTab === 'pending' ? '#10233F' : '#E2E8F0',
              color: filterTab === 'pending' ? 'white' : '#475569'
            }}
          >
            ⏳ Pending Approval ({pendingCount})
          </button>
          <button
            onClick={() => setFilterTab('approved')}
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              border: 0,
              background: filterTab === 'approved' ? '#166534' : '#E2E8F0',
              color: filterTab === 'approved' ? 'white' : '#475569'
            }}
          >
            ✅ Approved
          </button>
          <button
            onClick={() => setFilterTab('rejected')}
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              border: 0,
              background: filterTab === 'rejected' ? '#991B1B' : '#E2E8F0',
              color: filterTab === 'rejected' ? 'white' : '#475569'
            }}
          >
            ❌ Rejected
          </button>
          <button
            onClick={() => setFilterTab('all')}
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              border: 0,
              background: filterTab === 'all' ? '#475569' : '#E2E8F0',
              color: filterTab === 'all' ? 'white' : '#475569'
            }}
          >
            All History ({submissions.length})
          </button>
        </div>

        {/* Queue Table */}
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          {filteredSubmissions.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
              No submissions found in this queue.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#F1F5F9', color: '#475569', textAlign: 'left' }}>
                  <th style={{ padding: '14px 16px' }}>Member</th>
                  <th style={{ padding: '14px 16px' }}>Category</th>
                  <th style={{ padding: '14px 16px' }}>Transaction ID</th>
                  <th style={{ padding: '14px 16px' }}>Sender Phone</th>
                  <th style={{ padding: '14px 16px' }}>Amount</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map((s) => {
                  const isProcessing = processingId === s.id;
                  const memberName = s.members
                    ? `${s.members.title || 'Bro.'} ${s.members.first_name} ${s.members.surname}`
                    : 'Member';

                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 800, color: '#0F172A' }}>{memberName}</div>
                        <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                          Submitted: {formatDisplayDate(s.created_at)}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 800,
                          background: s.payment_category === 'welfare' ? '#FEF3C7' : (s.payment_category === 'voluntary_relief' ? '#F3E8FF' : '#E0F2FE'),
                          color: s.payment_category === 'welfare' ? '#92400E' : (s.payment_category === 'voluntary_relief' ? '#6D28D9' : '#0369A1')
                        }}>
                          {s.payment_category === 'assessment' ? '💳 Assessment Dues' : (s.payment_category === 'welfare' ? '🤝 Welfare Fund' : '❤️ Voluntary Relief')}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 800, color: '#2563EB' }}>
                        {s.transaction_ref}
                      </td>

                      <td style={{ padding: '14px 16px', color: '#64748B' }}>
                        {s.sender_phone || 'N/A'}
                      </td>

                      <td style={{ padding: '14px 16px', fontWeight: 900, fontFamily: 'monospace', color: '#0F172A' }}>
                        {formatCurrency(Number(s.amount))}
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        {s.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handleApprove(s)}
                              disabled={isProcessing}
                              style={{
                                background: '#166534',
                                color: 'white',
                                border: 0,
                                padding: '6px 14px',
                                borderRadius: 8,
                                fontWeight: 800,
                                fontSize: 12,
                                cursor: isProcessing ? 'not-allowed' : 'pointer'
                              }}
                            >
                              {isProcessing ? 'Crediting...' : '✓ Approve & Credit'}
                            </button>

                            <button
                              onClick={() => setRejectingSub(s)}
                              disabled={isProcessing}
                              style={{
                                background: '#DC2626',
                                color: 'white',
                                border: 0,
                                padding: '6px 14px',
                                borderRadius: 8,
                                fontWeight: 800,
                                fontSize: 12,
                                cursor: isProcessing ? 'not-allowed' : 'pointer'
                              }}
                            >
                              ✕ Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 800,
                            background: s.status === 'approved' ? '#DCFCE7' : '#FEE2E2',
                            color: s.status === 'approved' ? '#166534' : '#991B1B'
                          }}>
                            {s.status === 'approved' ? 'Approved & Credited' : `Rejected (${s.rejection_reason || 'Invalid'})`}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Rejection Reason Modal */}
        {rejectingSub && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{ background: 'white', borderRadius: 16, padding: 28, maxWidth: 460, width: '90%', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
              <h3 style={{ margin: '0 0 12px', color: '#991B1B', fontSize: 18, fontWeight: 900 }}>
                Reject MoMo Payment Reference
              </h3>
              <p style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>
                Please state why this transaction reference (<strong>{rejectingSub.transaction_ref}</strong>) for <strong>{formatCurrency(Number(rejectingSub.amount))}</strong> is being rejected:
              </p>

              <textarea
                rows={3}
                placeholder="e.g. Reference ID not found on bank statement, or incorrect amount"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #CBD5E1', marginBottom: 20, fontSize: 14 }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  onClick={() => { setRejectingSub(null); setRejectReason(''); }}
                  style={{ background: '#E2E8F0', border: 0, padding: '10px 18px', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReject}
                  style={{ background: '#DC2626', color: 'white', border: 0, padding: '10px 18px', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </RegistrarShell>
  );
}
