'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { getAllWelfareContributionRates, upsertWelfareContributionRate } from '@/services/welfareService';
import { WelfareContributionRate } from '@/types/welfare';
import { formatDisplayDate } from '@/lib/utils/ksji-logic';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR + 1 - i); // e.g. 2026 down to 2022

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function WelfareContributionRatesPage() {
  const [rates, setRates] = useState<WelfareContributionRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Form state
  const [year, setYear] = useState(CURRENT_YEAR);
  const [monthlyRate, setMonthlyRate] = useState('25.00');
  const [notes, setNotes] = useState('');
  const [showForm, setShowForm] = useState(false);

  const canEdit = userRole === 'super_admin' || userRole === 'welfare_treasurer';

  useEffect(() => {
    loadRates();
    fetchUserRole();
  }, []);

  async function fetchUserRole() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile) setUserRole(profile.role);
  }

  // Pre-fill form when year changes (if a rate already exists for that year)
  useEffect(() => {
    const existing = rates.find(r => r.year === year);
    if (existing) {
      setMonthlyRate(String(existing.monthly_rate));
      setNotes(existing.notes || '');
    } else {
      setMonthlyRate('25.00');
      setNotes('');
    }
  }, [year, rates]);

  async function loadRates() {
    setLoading(true);
    try {
      const data = await getAllWelfareContributionRates();
      setRates(data);
    } catch (err) {
      console.error('Failed to load welfare contribution rates:', err);
    } finally {
      setLoading(false);
    }
  }

  function showToast(msg: string, type: 'ok' | 'err') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const rate = parseFloat(monthlyRate);
    if (!rate || rate <= 0) {
      showToast('Please enter a valid monthly rate greater than 0.', 'err');
      return;
    }
    setSaving(true);
    try {
      await upsertWelfareContributionRate({ year, monthly_rate: rate, notes });
      showToast(`Monthly rate for ${year} saved successfully.`, 'ok');
      setShowForm(false);
      await loadRates();
    } catch (err: any) {
      console.error('Save error:', err);
      showToast(err.message || 'Failed to save rate.', 'err');
    } finally {
      setSaving(false);
    }
  }

  const annualEquivalent = (rate: number) => rate * 12;

  return (
    <RegistrarShell
      title="Welfare Contribution Rates"
      subtitle="Set the monthly welfare contribution rate for each year. This determines how much each member is expected to contribute monthly to the welfare fund."
    >
      <div style={{ padding: '24px 0', fontFamily: 'Inter, sans-serif', color: '#1E293B' }}>

        {/* Toast */}
        {toast && (
          <div style={{
            position: 'fixed', top: 24, right: 24, zIndex: 999,
            background: toast.type === 'ok' ? '#10B981' : '#EF4444',
            color: 'white', padding: '14px 24px', borderRadius: 12,
            fontWeight: 700, fontSize: 14, boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
            animation: 'fadeIn 0.3s ease'
          }}>
            {toast.type === 'ok' ? '✅ ' : '❌ '}{toast.msg}
          </div>
        )}

        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#0F172A' }}>
              Monthly Contribution Rate Schedule
            </h2>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748B', maxWidth: 560 }}>
              Unlike commandery assessments (which are billed as a yearly lump sum), welfare contributions are collected
              monthly. Set the rate for each calendar year below.
            </p>
          </div>
          {canEdit ? (
            <button
              onClick={() => {
                setYear(CURRENT_YEAR);
                setShowForm(true);
              }}
              style={{
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                color: 'white', border: 'none', padding: '11px 24px',
                borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 14,
                boxShadow: '0 4px 12px rgba(99,102,241,0.3)', whiteSpace: 'nowrap'
              }}
            >
              ✏️ Set Rate
            </button>
          ) : userRole !== null ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#FFF7ED', border: '1px solid #FED7AA',
              borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#92400E', fontWeight: 600
            }}>
              🔒 View-only — Super Admin or Welfare Treasurer access required to edit
            </div>
          ) : null}
        </div>

        {/* Info Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #EEF2FF 0%, #F0FDF4 100%)',
          border: '1px solid #C7D2FE',
          borderRadius: 12, padding: '16px 20px', marginBottom: 28,
          display: 'flex', gap: 14, alignItems: 'flex-start'
        }}>
          <span style={{ fontSize: 22 }}>ℹ️</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#3730A3', marginBottom: 4 }}>
              HOW WELFARE CONTRIBUTIONS WORK
            </div>
            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
              Each member pays a <strong>fixed monthly amount</strong> into the welfare fund — typically <strong>GH₵ 25.00 per month</strong>.
              Over a full year, this amounts to <strong>GH₵ 300.00 annually</strong>. The rate set here is used to compute
              each member's expected annual welfare contribution on their personal statement.
            </div>
          </div>
        </div>

        {/* Rates table */}
        {loading ? (
          <div style={{ padding: 40, color: '#64748B', textAlign: 'center' }}>Loading rates...</div>
        ) : rates.length === 0 ? (
          <div style={{
            background: 'white', borderRadius: 16, border: '2px dashed #CBD5E1',
            padding: '48px 32px', textAlign: 'center'
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#334155', marginBottom: 6 }}>
              No rates configured yet
            </div>
            <div style={{ fontSize: 13, color: '#94A3B8' }}>
              Click "Set Rate" to configure the monthly welfare contribution for the current year.
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {rates.map(r => {
              const isCurrent = r.year === CURRENT_YEAR;
              return (
                <div
                  key={r.id}
                  style={{
                    background: isCurrent
                      ? 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)'
                      : 'white',
                    borderRadius: 18, padding: 24,
                    border: isCurrent ? 'none' : '1px solid #E2E8F0',
                    boxShadow: isCurrent
                      ? '0 12px 30px rgba(49,46,129,0.3)'
                      : '0 4px 12px rgba(0,0,0,0.04)',
                    color: isCurrent ? 'white' : '#0F172A',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                      <div style={{
                        fontSize: 11, fontWeight: 800, letterSpacing: 1.5,
                        color: isCurrent ? '#A5B4FC' : '#94A3B8', textTransform: 'uppercase', marginBottom: 4
                      }}>
                        {isCurrent ? '● CURRENT YEAR' : 'HISTORICAL'}
                      </div>
                      <div style={{ fontSize: 28, fontWeight: 900 }}>
                        {r.year}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (!canEdit) return;
                        setYear(r.year);
                        setMonthlyRate(String(r.monthly_rate));
                        setNotes(r.notes || '');
                        setShowForm(true);
                      }}
                      style={{
                        background: isCurrent ? 'rgba(255,255,255,0.15)' : '#F1F5F9',
                        color: isCurrent ? 'white' : '#475569',
                        border: 'none', borderRadius: 8, padding: '6px 14px',
                        fontSize: 12, fontWeight: 700,
                        cursor: canEdit ? 'pointer' : 'not-allowed',
                        opacity: canEdit ? 1 : 0.45,
                      }}
                      title={canEdit ? 'Edit rate' : 'Only Super Admin or Welfare Treasurer can edit rates'}
                    >
                      {canEdit ? '✏️ Edit' : '🔒 Locked'}
                    </button>
                  </div>

                  <div style={{
                    borderTop: `1px solid ${isCurrent ? 'rgba(255,255,255,0.15)' : '#F1F5F9'}`,
                    paddingTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16
                  }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: isCurrent ? '#A5B4FC' : '#94A3B8', marginBottom: 4 }}>
                        Monthly Rate
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: isCurrent ? '#A5F3FC' : '#6366F1', fontFamily: 'monospace' }}>
                        GH₵ {fmt(r.monthly_rate)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: isCurrent ? '#A5B4FC' : '#94A3B8', marginBottom: 4 }}>
                        Annual Equivalent
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: isCurrent ? '#86EFAC' : '#10B981', fontFamily: 'monospace' }}>
                        GH₵ {fmt(annualEquivalent(r.monthly_rate))}
                      </div>
                    </div>
                  </div>

                  {r.notes && (
                    <div style={{
                      marginTop: 14, background: isCurrent ? 'rgba(255,255,255,0.1)' : '#F8FAFC',
                      borderRadius: 8, padding: '10px 14px',
                      fontSize: 12, color: isCurrent ? '#CBD5E1' : '#64748B', fontStyle: 'italic'
                    }}>
                      📝 {r.notes}
                    </div>
                  )}

                  {r.created_at && (
                    <div style={{ marginTop: 12, fontSize: 11, color: isCurrent ? 'rgba(255,255,255,0.4)' : '#CBD5E1' }}>
                      Last set: {formatDisplayDate(r.created_at)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Set/Edit Rate Modal */}
        {showForm && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
          }}>
            <div style={{
              background: 'white', borderRadius: 20, padding: '36px 32px',
              maxWidth: 500, width: '90%', boxShadow: '0 24px 60px rgba(0,0,0,0.25)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#0F172A' }}>
                    Set Monthly Welfare Rate
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>
                    Enter the monthly contribution amount per member.
                  </p>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  style={{ background: '#F1F5F9', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 18, cursor: 'pointer', color: '#475569' }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSave}>
                {/* Year select */}
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    YEAR
                  </label>
                  <select
                    value={year}
                    onChange={e => setYear(Number(e.target.value))}
                    style={{
                      width: '100%', padding: '11px 14px', borderRadius: 10,
                      border: '1.5px solid #CBD5E1', fontSize: 15, fontWeight: 700, background: '#F8FAFC'
                    }}
                  >
                    {YEARS.map(y => (
                      <option key={y} value={y}>{y} {y === CURRENT_YEAR ? '(Current)' : ''}</option>
                    ))}
                  </select>
                </div>

                {/* Monthly rate input */}
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    MONTHLY RATE (GH₵)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                      fontWeight: 800, color: '#6366F1', fontSize: 15
                    }}>GH₵</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={monthlyRate}
                      onChange={e => setMonthlyRate(e.target.value)}
                      required
                      style={{
                        width: '100%', padding: '11px 14px 11px 52px', borderRadius: 10,
                        border: '1.5px solid #CBD5E1', fontSize: 16, fontWeight: 800,
                        background: '#F8FAFC', boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  {monthlyRate && parseFloat(monthlyRate) > 0 && (
                    <div style={{
                      marginTop: 8, background: '#EEF2FF', borderRadius: 8, padding: '8px 14px',
                      fontSize: 13, color: '#4338CA', fontWeight: 600
                    }}>
                      💡 Annual equivalent: <strong>GH₵ {fmt(parseFloat(monthlyRate) * 12)}</strong> per member (12 months × GH₵ {fmt(parseFloat(monthlyRate))})
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    NOTES (OPTIONAL)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Rate approved at Annual General Meeting, January 2026"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10,
                      border: '1.5px solid #CBD5E1', fontSize: 13, resize: 'vertical',
                      background: '#F8FAFC', boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    style={{
                      background: '#F1F5F9', border: '1px solid #CBD5E1',
                      padding: '11px 22px', borderRadius: 10, fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      background: saving ? '#A5B4FC' : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                      color: 'white', border: 'none', padding: '11px 28px',
                      borderRadius: 10, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer',
                      fontSize: 14, boxShadow: saving ? 'none' : '0 4px 12px rgba(99,102,241,0.4)'
                    }}
                  >
                    {saving ? '⏳ Saving...' : '💾 Save Rate'}
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
