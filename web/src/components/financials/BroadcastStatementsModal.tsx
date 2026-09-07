'use client';

import React, { useState } from 'react';
import { broadcastFinancialStatements } from '@/services/communicationService';
import { formatDisplayDate } from '@/lib/utils/ksji-logic';

interface BroadcastStatementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  summaries: any[];
}

export default function BroadcastStatementsModal({
  isOpen,
  onClose,
  summaries = [],
}: BroadcastStatementsModalProps) {
  const [channel, setChannel] = useState<'sms' | 'email' | 'both'>('sms');
  const [target, setTarget] = useState<'outstanding_only' | 'all_active'>('outstanding_only');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; totalQueued?: number } | null>(null);

  if (!isOpen) return null;

  // Filter out deceased, dismissed, senior exempt
  const eligibleMembers = summaries.filter(m => {
    if (m.is_deceased || m.status === 'Deceased' || m.status === 'Dismissed') return false;
    if (m.is_senior_exempt) return false;
    return true;
  });

  const outstandingMembers = eligibleMembers.filter(m => {
    const bal = parseFloat(String(m.outstanding_balance || 0));
    return bal > 0;
  });

  const targetCount = target === 'outstanding_only' ? outstandingMembers.length : eligibleMembers.length;
  const estimatedSmsMinutes = Math.ceil(targetCount / 3);

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setResult(null);

    try {
      const res = await broadcastFinancialStatements({
        channel,
        target,
      });

      setResult({
        success: res.success,
        message: res.message,
        totalQueued: res.totalQueued,
      });
    } catch (err: any) {
      setResult({
        success: false,
        message: err.message || 'Failed to dispatch financial statements',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(10, 22, 40, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          maxWidth: 620,
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            background: 'linear-gradient(135deg, #0A1628 0%, #1e293b 100%)',
            color: '#ffffff',
            borderRadius: '16px 16px 0 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#C9A84C' }}>
              📢 Broadcast Member Financial Statements
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#94a3b8' }}>
              Knights of St. John International • Commandery No. 500
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: 22,
              cursor: 'pointer',
              lineHeight: 1,
              padding: 4,
            }}
          >
            &times;
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleDispatch} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Channel Selection */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
              Delivery Channel
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                { id: 'sms', label: '💬 Cellular SMS', desc: 'Via SIM 1 (+233)' },
                { id: 'email', label: '✉️ Official Email', desc: 'Glossy Ledger' },
                { id: 'both', label: '📲 Both (SMS + Email)', desc: 'Full Dispatch' },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setChannel(opt.id as any)}
                  style={{
                    padding: '12px 10px',
                    borderRadius: 10,
                    border: channel === opt.id ? '2px solid #C9A84C' : '1px solid #e2e8f0',
                    background: channel === opt.id ? '#fffdf7' : '#f8fafc',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: 13, color: channel === opt.id ? '#0A1628' : '#475569' }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Target Audience */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
              Recipient Group
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                type="button"
                onClick={() => setTarget('outstanding_only')}
                style={{
                  padding: '12px',
                  borderRadius: 10,
                  border: target === 'outstanding_only' ? '2px solid #C9A84C' : '1px solid #e2e8f0',
                  background: target === 'outstanding_only' ? '#fffdf7' : '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 13, color: target === 'outstanding_only' ? '#0A1628' : '#475569' }}>
                  ⚠️ Outstanding Balance Only
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  {outstandingMembers.length} brothers with pending balance (&gt; GHS 0.00)
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTarget('all_active')}
                style={{
                  padding: '12px',
                  borderRadius: 10,
                  border: target === 'all_active' ? '2px solid #C9A84C' : '1px solid #e2e8f0',
                  background: target === 'all_active' ? '#fffdf7' : '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 13, color: target === 'all_active' ? '#0A1628' : '#475569' }}>
                  👥 All Active Members
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  {eligibleMembers.length} active brothers on roll
                </div>
              </button>
            </div>
          </div>

          {/* Queue Pacing & Safe Rate Limiting Alert */}
          {(channel === 'sms' || channel === 'both') && (
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
              }}
            >
              <span style={{ fontSize: 18 }}>⏱️</span>
              <div style={{ fontSize: 12, color: '#1e40af', lineHeight: 1.4 }}>
                <strong>Strict Queue Rate Limiter (3 SMS/min):</strong> Outbound messages will be spaced by{' '}
                <strong>20 seconds</strong> using native scheduling via SIM 1 (+233246258166).{' '}
                {targetCount > 0 && (
                  <span>
                    Queue duration: ~{estimatedSmsMinutes} {estimatedSmsMinutes === 1 ? 'minute' : 'minutes'} for {targetCount} brothers.
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Preview of Statement Text */}
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: '#f8fafc',
              border: '1px dashed #cbd5e1',
              fontSize: 12,
              color: '#334155',
            }}
          >
            <div style={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', fontSize: 10, marginBottom: 4 }}>
              Statement Preview ({formatDisplayDate(new Date().toISOString())})
            </div>
            <div style={{ lineHeight: 1.4 }}>
              &ldquo;KSJI Commandery No. 500 Statement ({formatDisplayDate(new Date().toISOString())})<br/>
              Dear Brother [Name],<br/>
              Assessed: GHS 1,250.00 | Paid: GHS 800.00 | <strong>Balance Due: GHS 450.00</strong><br/>
              Please settle with the Fin Registrar. Fraternally, KSJI 500.&rdquo;
            </div>
          </div>

          {/* Result Banner */}
          {result && (
            <div
              style={{
                padding: 14,
                borderRadius: 8,
                background: result.success ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${result.success ? '#86efac' : '#fca5a5'}`,
                color: result.success ? '#166534' : '#991b1b',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {result.success ? '✅ ' : '❌ '} {result.message}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              style={{
                padding: '10px 18px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {result?.success ? 'Close' : 'Cancel'}
            </button>

            <button
              type="submit"
              disabled={sending || targetCount === 0}
              style={{
                padding: '10px 22px',
                borderRadius: 8,
                border: 'none',
                background: sending || targetCount === 0 ? '#94a3b8' : 'linear-gradient(135deg, #0A1628 0%, #1e293b 100%)',
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 800,
                cursor: sending || targetCount === 0 ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 6px -1px rgba(10, 22, 40, 0.3)',
              }}
            >
              {sending ? '⏳ Enqueuing Statements…' : `🚀 Dispatch to ${targetCount} Brothers`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
