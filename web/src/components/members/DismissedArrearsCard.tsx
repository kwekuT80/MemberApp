'use client';

import React, { useState, useEffect } from 'react';
import {
  getDismissedMemberIndebtedness,
  saveDismissedIndebtedness,
  reinstateDismissedMember
} from '@/services/financialService';

interface Props {
  memberId: string;
  memberName: string;
}

export default function DismissedArrearsCard({ memberId, memberName }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  // Modals
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [debtInput, setDebtInput] = useState('');
  const [showReinstateModal, setShowReinstateModal] = useState(false);
  const [reinstateDate, setReinstateDate] = useState(new Date().toISOString().split('T')[0]);
  const [reinstateNotes, setReinstateNotes] = useState('');

  async function loadStatus() {
    setLoading(true);
    try {
      const res = await getDismissedMemberIndebtedness(memberId);
      setData(res);
      if (res.configuredDebt > 0) {
        setDebtInput(res.configuredDebt.toString());
      }
    } catch (err: any) {
      console.error('Error loading dismissed status:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, [memberId]);

  function showToast(msg: string, type: 'ok' | 'err') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleSaveDebt(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(debtInput);
    if (isNaN(parsed) || parsed < 0) {
      showToast('Please enter a valid indebtedness amount.', 'err');
      return;
    }

    setBusy(true);
    try {
      const res = await saveDismissedIndebtedness(memberId, parsed);
      if (!res.success) throw new Error(res.error);
      showToast('Historical indebtedness configured successfully.', 'ok');
      setShowDebtModal(false);
      await loadStatus();
    } catch (err: any) {
      showToast(err.message || 'Failed saving indebtedness.', 'err');
    } finally {
      setBusy(false);
    }
  }

  async function handleReinstate(e: React.FormEvent) {
    e.preventDefault();
    if (!reinstateDate) {
      showToast('Please select a reinstatement date.', 'err');
      return;
    }

    setBusy(true);
    try {
      const res = await reinstateDismissedMember(memberId, reinstateDate, reinstateNotes);
      if (!res.success) throw new Error(res.error);
      showToast(`Brother ${memberName} reinstated successfully!`, 'ok');
      setShowReinstateModal(false);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      showToast(err.message || 'Failed to reinstate member.', 'err');
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={{ padding: 16, textAlign: 'center', color: '#64748B', fontSize: 13 }}>
          Loading arrears recovery & reinstatement status...
        </div>
      </div>
    );
  }

  if (!data) return null;

  const fmt = (n: number) => 'GH₵ ' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct = data.configuredDebt > 0 ? Math.min(100, (data.totalRecovered / data.configuredDebt) * 100) : 0;

  return (
    <div style={containerStyle}>
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 99999,
          background: toast.type === 'ok' ? '#166534' : '#991B1B',
          color: '#FFF', padding: '12px 24px', borderRadius: 8,
          fontWeight: 700, fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Fraternal Discipline & Debt Recovery
          </span>
          <h3 style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 900, color: '#1E293B' }}>
            Arrears Liquidation & Reinstatement Review
          </h3>
        </div>

        {/* Readiness Badge */}
        {data.isReinstatementReady ? (
          <span style={{
            background: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC',
            padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 800,
            display: 'inline-flex', alignItems: 'center', gap: 6
          }}>
            🎉 ELIGIBLE FOR REINSTATEMENT
          </span>
        ) : data.isConfigured ? (
          <span style={{
            background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D',
            padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 800,
            display: 'inline-flex', alignItems: 'center', gap: 6
          }}>
            ⏳ Arrears Recovery In Progress
          </span>
        ) : (
          <span style={{
            background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1',
            padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 800,
            display: 'inline-flex', alignItems: 'center', gap: 6
          }}>
            ⚠️ Historical Indebtedness Unrecorded
          </span>
        )}
      </div>

      {/* Metric Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
        {/* Configured Debt */}
        <div style={metricBox}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
            Historical Indebtedness
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: data.isConfigured ? '#991B1B' : '#64748B', marginTop: 4 }}>
            {data.isConfigured ? fmt(data.configuredDebt) : 'Pending Lookup'}
          </div>
          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
            {data.isConfigured ? 'Recorded prior debt' : 'Leave blank if unknown'}
          </div>
        </div>

        {/* Total Recovered */}
        <div style={metricBox}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
            Total Paid Towards Debt
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#166534', marginTop: 4 }}>
            {fmt(data.totalRecovered)}
          </div>
          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
            {data.paymentCount} recovery payments logged
          </div>
        </div>

        {/* Remaining Balance */}
        <div style={metricBox}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
            Remaining Arrears
          </div>
          <div style={{
            fontSize: 20, fontWeight: 900,
            color: !data.isConfigured ? '#64748B' : (data.remainingDebt > 0 ? '#991B1B' : '#166534'),
            marginTop: 4
          }}>
            {!data.isConfigured ? '—' : fmt(data.remainingDebt)}
          </div>
          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
            {!data.isConfigured ? 'Pending debt entry' : (data.remainingDebt === 0 ? 'Indebtedness cleared!' : 'Balance to clear')}
          </div>
        </div>
      </div>

      {/* Progress Bar (if configured) */}
      {data.isConfigured && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
            <span style={{ color: '#475569' }}>Recovery Progress</span>
            <span style={{ color: pct >= 100 ? '#166534' : '#1E293B' }}>{pct.toFixed(1)}% ({fmt(data.totalRecovered)} / {fmt(data.configuredDebt)})</span>
          </div>
          <div style={{ width: '100%', height: 8, background: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? '#166534' : '#F59E0B', transition: 'width 0.3s ease' }} />
          </div>
        </div>
      )}

      {/* Status Notice & Action Controls */}
      <div style={{
        background: data.isReinstatementReady ? '#F0FDF4' : (data.isConfigured ? '#FFFBEB' : '#F8FAFC'),
        border: `1px solid ${data.isReinstatementReady ? '#BBF7D0' : (data.isConfigured ? '#FDE68A' : '#E2E8F0')}`,
        borderRadius: 8,
        padding: '14px 18px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ fontSize: 13, color: '#334155', maxWidth: 650, lineHeight: 1.5 }}>
          {data.isReinstatementReady ? (
            <span>
              <strong>Reinstatement Ready:</strong> Brother {memberName} has fully cleared his recorded arrears of {fmt(data.configuredDebt)}. The financial prerequisite for reinstatement has been satisfied.
            </span>
          ) : data.isConfigured ? (
            <span>
              <strong>Recovery in Progress:</strong> Brother {memberName} has paid {fmt(data.totalRecovered)}. An outstanding balance of <strong>{fmt(data.remainingDebt)}</strong> remains to be cleared before reinstatement review can be triggered.
            </span>
          ) : (
            <span>
              <strong>Indebtedness Pending:</strong> Payments towards this brother's past debt can be logged anytime without an existing bill. When you locate his archived arrears or agree on a settlement figure, enter it below to begin tracking his clearance balance.
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowDebtModal(true)}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: '#1E293B',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            ✏️ {data.isConfigured ? 'Update Indebtedness' : 'Set Historical Indebtedness'}
          </button>

          {data.isReinstatementReady && (
            <button
              type="button"
              onClick={() => setShowReinstateModal(true)}
              style={{
                padding: '8px 18px',
                borderRadius: 6,
                background: '#166534',
                border: 'none',
                color: '#FFFFFF',
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(22, 101, 52, 0.2)'
              }}
            >
              🛡️ Proceed with Reinstatement
            </button>
          )}
        </div>
      </div>

      {/* ── MODAL: CONFIGURE INDEBTEDNESS ── */}
      {showDebtModal && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <h4 style={{ margin: '0 0 8px', fontSize: 17, color: '#10233F', fontWeight: 800 }}>
              Set Historical Indebtedness
            </h4>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>
              Enter the confirmed or agreed arrears amount owed by Brother <strong>{memberName}</strong> at the time of dismissal. Past and future recovery payments will automatically offset this figure.
            </p>

            <form onSubmit={handleSaveDebt}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Total Indebtedness Amount (GH₵)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  autoFocus
                  placeholder="e.g. 1200.00"
                  value={debtInput}
                  onChange={(e) => setDebtInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: 15,
                    fontWeight: 700,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowDebtModal(false)}
                  disabled={busy}
                  style={{ padding: '8px 16px', borderRadius: 6, background: '#F1F5F9', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  style={{ padding: '8px 20px', borderRadius: 6, background: '#10233F', color: '#FFF', border: 'none', fontWeight: 800, cursor: 'pointer' }}
                >
                  {busy ? 'Saving...' : 'Save Indebtedness'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: REINSTATEMENT RESOLUTION ── */}
      {showReinstateModal && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <div style={{ textAlign: 'center', fontSize: 32, marginBottom: 8 }}>🛡️</div>
            <h4 style={{ margin: '0 0 8px', fontSize: 18, color: '#166534', fontWeight: 900, textAlign: 'center' }}>
              Reinstate Brother to Active Roll
            </h4>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#475569', textAlign: 'center', lineHeight: 1.5 }}>
              Brother <strong>{memberName}</strong> has fully settled his indebtedness of <strong>{fmt(data.configuredDebt)}</strong>. Executing this will update his official status to <strong>Active</strong>.
            </p>

            <form onSubmit={handleReinstate}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Date of Reinstatement
                </label>
                <input
                  type="date"
                  required
                  value={reinstateDate}
                  onChange={(e) => setReinstateDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    fontSize: 14,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Resolution / Meeting Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Approved per Executive Committee resolution #24"
                  value={reinstateNotes}
                  onChange={(e) => setReinstateNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    fontSize: 13,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowReinstateModal(false)}
                  disabled={busy}
                  style={{ padding: '8px 16px', borderRadius: 6, background: '#F1F5F9', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  style={{ padding: '8px 20px', borderRadius: 6, background: '#166534', color: '#FFF', border: 'none', fontWeight: 800, cursor: 'pointer' }}
                >
                  {busy ? 'Reinstating...' : 'Confirm Reinstatement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Styles ──
const containerStyle: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #E2E8F0',
  borderRadius: 12,
  padding: '20px 24px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
};

const metricBox: React.CSSProperties = {
  background: '#F8FAFC',
  border: '1px solid #E2E8F0',
  borderRadius: 8,
  padding: '12px 16px'
};

const modalOverlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10000,
  padding: 16
};

const modalBox: React.CSSProperties = {
  background: '#FFFFFF',
  borderRadius: 12,
  maxWidth: 460,
  width: '100%',
  padding: '24px',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
};
