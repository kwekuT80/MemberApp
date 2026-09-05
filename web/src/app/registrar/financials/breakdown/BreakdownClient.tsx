'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { isSystemMember, formatMemberTitle } from '@/lib/utils/ksji-logic';

type TabMode = 'dues' | 'welfare';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function normalizeMonth(mStr?: string | null, dateStr?: string | null): number {
  if (mStr) {
    const s = mStr.toLowerCase().trim();
    if (s.startsWith('jan')) return 1;
    if (s.startsWith('feb')) return 2;
    if (s.startsWith('mar')) return 3;
    if (s.startsWith('apr')) return 4;
    if (s.startsWith('may')) return 5;
    if (s.startsWith('jun')) return 6;
    if (s.startsWith('jul')) return 7;
    if (s.startsWith('aug')) return 8;
    if (s.startsWith('sep')) return 9;
    if (s.startsWith('oct')) return 10;
    if (s.startsWith('nov')) return 11;
    if (s.startsWith('dec')) return 12;
  }
  if (dateStr) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.getMonth() + 1;
    }
  }
  return 0;
}

export default function BreakdownClient() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<TabMode>('dues');
  const [loading, setLoading] = useState(true);

  // Raw data
  const [assessments, setAssessments] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [welfareContributions, setWelfareContributions] = useState<any[]>([]);
  const [welfareDisbursements, setWelfareDisbursements] = useState<any[]>([]);
  const [membersMap, setMembersMap] = useState<Map<string, any>>(new Map());

  // Selected drilldown year
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [
          { data: rawMembers },
          { data: rawAssessments },
          { data: rawPayments },
          { data: rawWelfare },
          { data: rawDisbursements }
        ] = await Promise.all([
          supabase.from('members').select('id, first_name, surname, title, phone, status, is_deceased'),
          supabase.from('financial_assessments').select('*').order('year', { ascending: false }),
          supabase.from('financial_payments').select('*').order('payment_date', { ascending: false }),
          supabase.from('welfare_contributions').select('*').order('period_year', { ascending: false }),
          supabase.from('welfare_disbursements').select('*, welfare_categories(name)').order('disbursement_date', { ascending: false })
        ]);

        const map = new Map<string, any>();
        (rawMembers || []).forEach(m => {
          if (!isSystemMember(m)) {
            map.set(m.id, m);
          }
        });
        setMembersMap(map);

        setAssessments(rawAssessments || []);
        setPayments(rawPayments || []);
        setWelfareContributions(rawWelfare || []);
        setWelfareDisbursements(rawDisbursements || []);

        // Pick highest recorded year as default
        if (rawAssessments && rawAssessments.length > 0) {
          const maxAssYear = Math.max(...rawAssessments.map((a: any) => a.year));
          setSelectedYear(maxAssYear);
        }
      } catch (err) {
        console.error('Failed to load breakdown data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [supabase]);

  // Available recorded years
  const availableDuesYears = useMemo(() => {
    const set = new Set<number>();
    assessments.forEach(a => set.add(a.year));
    payments.forEach(p => set.add(p.assessment_year));
    return Array.from(set).sort((a, b) => b - a);
  }, [assessments, payments]);

  const availableWelfareYears = useMemo(() => {
    const set = new Set<number>();
    welfareContributions.forEach(w => set.add(w.period_year));
    welfareDisbursements.forEach(d => {
      const dt = new Date(d.disbursement_date);
      if (!isNaN(dt.getTime())) set.add(dt.getFullYear());
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [welfareContributions, welfareDisbursements]);

  // ── Dues Yearly Aggregates ──
  const duesYearlyStats = useMemo(() => {
    return availableDuesYears.map(yr => {
      const yrAssessments = assessments.filter(a => a.year === yr);
      const yrPayments = payments.filter(p => p.assessment_year === yr);

      const totalAnnual = yrAssessments.reduce((sum, a) => sum + Number(a.annual_assessment || 0), 0);
      const totalArrearsBf = yrAssessments.reduce((sum, a) => sum + Number(a.arrears_brought_forward || 0), 0);
      const totalObligation = totalAnnual + totalArrearsBf;
      const totalCollected = yrPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const balance = totalObligation - totalCollected;
      const collectionRate = totalObligation > 0 ? (totalCollected / totalObligation) * 100 : 0;

      const contributingBrothers = new Set(yrPayments.map(p => p.member_id)).size;

      return {
        year: yr,
        assessedCount: yrAssessments.length,
        totalAnnual,
        totalArrearsBf,
        totalObligation,
        totalCollected,
        balance,
        collectionRate,
        paymentCount: yrPayments.length,
        contributingBrothers
      };
    });
  }, [availableDuesYears, assessments, payments]);

  // ── Selected Year Dues Monthly Breakdown ──
  const duesMonthlyBreakdown = useMemo(() => {
    const yrPayments = payments.filter(p => p.assessment_year === selectedYear);
    const yrTotal = yrPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const monthsData = MONTH_NAMES.map((name, idx) => {
      const monthNum = idx + 1;
      const mPayments = yrPayments.filter(p => normalizeMonth(p.month, p.payment_date) === monthNum);
      const total = mPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const percent = yrTotal > 0 ? (total / yrTotal) * 100 : 0;
      const contributors = new Set(mPayments.map(p => p.member_id)).size;

      return {
        monthNum,
        monthName: name,
        total,
        count: mPayments.length,
        contributors,
        percent,
        payments: mPayments
      };
    });

    return { total: yrTotal, months: monthsData };
  }, [payments, selectedYear]);

  // ── Welfare Yearly Aggregates ──
  const welfareYearlyStats = useMemo(() => {
    return availableWelfareYears.map(yr => {
      const yrContributions = welfareContributions.filter(w => w.period_year === yr);
      const yrDisbursements = welfareDisbursements.filter(d => {
        const dt = new Date(d.disbursement_date);
        return !isNaN(dt.getTime()) && dt.getFullYear() === yr;
      });

      const totalCollected = yrContributions.reduce((sum, c) => sum + Number(c.amount || 0), 0);
      const totalDisbursed = yrDisbursements.reduce((sum, d) => sum + Number(d.amount || 0), 0);
      const netGrowth = totalCollected - totalDisbursed;
      const contributors = new Set(yrContributions.map(c => c.member_id)).size;

      return {
        year: yr,
        totalCollected,
        totalDisbursed,
        netGrowth,
        contributors,
        transactionCount: yrContributions.length
      };
    });
  }, [availableWelfareYears, welfareContributions, welfareDisbursements]);

  // ── Selected Year Welfare Monthly Breakdown ──
  const welfareMonthlyBreakdown = useMemo(() => {
    const yrContributions = welfareContributions.filter(w => w.period_year === selectedYear);
    const yrDisbursements = welfareDisbursements.filter(d => {
      const dt = new Date(d.disbursement_date);
      return !isNaN(dt.getTime()) && dt.getFullYear() === selectedYear;
    });

    const yrCollected = yrContributions.reduce((sum, c) => sum + Number(c.amount || 0), 0);
    const yrDisbursed = yrDisbursements.reduce((sum, d) => sum + Number(d.amount || 0), 0);

    const monthsData = MONTH_NAMES.map((name, idx) => {
      const monthNum = idx + 1;
      const mContributions = yrContributions.filter(c => Number(c.period_month) === monthNum);
      const mDisbursements = yrDisbursements.filter(d => {
        const dt = new Date(d.disbursement_date);
        return !isNaN(dt.getTime()) && dt.getMonth() + 1 === monthNum;
      });

      const collected = mContributions.reduce((sum, c) => sum + Number(c.amount || 0), 0);
      const disbursed = mDisbursements.reduce((sum, d) => sum + Number(d.amount || 0), 0);
      const net = collected - disbursed;
      const contributors = new Set(mContributions.map(c => c.member_id)).size;

      return {
        monthNum,
        monthName: name,
        collected,
        disbursed,
        net,
        contributors,
        contributionsCount: mContributions.length,
        disbursementsCount: mDisbursements.length
      };
    });

    return {
      totalCollected: yrCollected,
      totalDisbursed: yrDisbursed,
      netTotal: yrCollected - yrDisbursed,
      months: monthsData
    };
  }, [welfareContributions, welfareDisbursements, selectedYear]);

  const currency = (val: number) =>
    `GH¢ ${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
        <div style={{ fontWeight: 700, fontSize: 16 }}>Calculating monthly and yearly financial subtotals...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      
      {/* ── Top Navigation & Back Link ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Link
          href="/registrar/financials"
          style={{ textDecoration: 'none', color: '#1E293B', fontWeight: 700, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          ← Back to Financials Hub
        </Link>
        <button
          onClick={() => window.print()}
          style={{
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: 8,
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          🖨️ Print Subtotals Report
        </button>
      </div>

      {/* ── Main Tab Switcher ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
        <button
          onClick={() => { setActiveTab('dues'); setExpandedMonth(null); }}
          style={{
            flex: 1,
            padding: '16px 20px',
            borderRadius: 14,
            border: activeTab === 'dues' ? '2px solid var(--gold, #C9A84C)' : '1px solid #E2E8F0',
            background: activeTab === 'dues' ? '#0F172A' : '#FFFFFF',
            color: activeTab === 'dues' ? '#FFFFFF' : '#1E293B',
            cursor: 'pointer',
            boxShadow: activeTab === 'dues' ? '0 8px 24px rgba(15, 23, 42, 0.2)' : 'none',
            textAlign: 'left',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 900, color: activeTab === 'dues' ? '#FDE047' : '#0F172A' }}>
            📑 Annual Dues Assessments & Collections
          </div>
          <div style={{ fontSize: 12, marginTop: 4, color: activeTab === 'dues' ? '#94A3B8' : '#64748B' }}>
            Yearly obligations, monthly collection velocity & recovery rates
          </div>
        </button>

        <button
          onClick={() => { setActiveTab('welfare'); setExpandedMonth(null); }}
          style={{
            flex: 1,
            padding: '16px 20px',
            borderRadius: 14,
            border: activeTab === 'welfare' ? '2px solid #8B5CF6' : '1px solid #E2E8F0',
            background: activeTab === 'welfare' ? '#1E1B4B' : '#FFFFFF',
            color: activeTab === 'welfare' ? '#FFFFFF' : '#1E293B',
            cursor: 'pointer',
            boxShadow: activeTab === 'welfare' ? '0 8px 24px rgba(30, 27, 75, 0.2)' : 'none',
            textAlign: 'left',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 900, color: activeTab === 'welfare' ? '#C084FC' : '#0F172A' }}>
            🤝 Welfare Fund Monthly & Yearly Subtotals
          </div>
          <div style={{ fontSize: 12, marginTop: 4, color: activeTab === 'welfare' ? '#C7D2FE' : '#64748B' }}>
            Monthly subscriber contributions, benefit disbursements & net growth
          </div>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 1: ANNUAL DUES ASSESSMENTS & MONTHLY COLLECTIONS ───────── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'dues' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          
          {/* Yearly Subtotals Table */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 16,
            padding: 24,
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, color: '#0F172A', fontWeight: 800 }}>
                  Annual Dues Yearly Subtotals ({availableDuesYears.length} Years on Record)
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>
                  Macro multi-year comparison of assessments billed, arrears brought forward, and total receipts.
                </p>
              </div>
            </div>

            <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 800, color: '#0F172A' }}>Year</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: '#64748B' }}>Brothers Billed</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', color: '#64748B' }}>Annual Billed</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', color: '#64748B' }}>Arrears B/F</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>Total Obligation</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#166534' }}>Dues Collected</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: '#64748B' }}>Recovery Rate</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#991B1B' }}>Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {duesYearlyStats.map(stat => (
                    <tr
                      key={stat.year}
                      onClick={() => setSelectedYear(stat.year)}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        cursor: 'pointer',
                        background: selectedYear === stat.year ? 'rgba(201, 168, 76, 0.08)' : '#FFFFFF',
                        transition: 'background 0.15s'
                      }}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 900, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {stat.year === selectedYear && <span style={{ color: 'var(--gold, #C9A84C)' }}>▶</span>}
                        {stat.year}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>{stat.assessedCount}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace' }}>{currency(stat.totalAnnual)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', color: stat.totalArrearsBf < 0 ? '#10B981' : stat.totalArrearsBf > 0 ? '#F59E0B' : '#64748B' }}>
                        {currency(stat.totalArrearsBf)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800 }}>
                        {currency(stat.totalObligation)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#166534' }}>
                        {currency(stat.totalCollected)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          background: stat.collectionRate >= 75 ? '#DCFCE7' : stat.collectionRate >= 50 ? '#FEF3C7' : '#FEE2E2',
                          color: stat.collectionRate >= 75 ? '#166534' : stat.collectionRate >= 50 ? '#854D0E' : '#991B1B',
                          padding: '3px 10px',
                          borderRadius: 20,
                          fontWeight: 800,
                          fontSize: 12
                        }}>
                          {stat.collectionRate.toFixed(1)}%
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: stat.balance > 0 ? '#991B1B' : '#166534' }}>
                        {currency(Math.max(0, stat.balance))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Monthly Subtotals Table for Selected Year */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 16,
            padding: 24,
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, color: '#0F172A', fontWeight: 800 }}>
                  📅 {selectedYear} Monthly Collections Subtotals
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>
                  Total Dues Collected in {selectedYear}: <strong style={{ color: '#166534' }}>{currency(duesMonthlyBreakdown.total)}</strong>
                </p>
              </div>

              {/* Year Selector Pills */}
              <div style={{ display: 'flex', gap: 8 }}>
                {availableDuesYears.map(yr => (
                  <button
                    key={yr}
                    onClick={() => { setSelectedYear(yr); setExpandedMonth(null); }}
                    style={{
                      background: selectedYear === yr ? '#0F172A' : '#F1F5F9',
                      color: selectedYear === yr ? '#FFFFFF' : '#475569',
                      border: 'none',
                      padding: '6px 14px',
                      borderRadius: 20,
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer'
                    }}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px', width: 140 }}>Month</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Collected Subtotal</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Payments Count</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Contributing Brothers</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Share of Year</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Drilldown</th>
                  </tr>
                </thead>
                <tbody>
                  {duesMonthlyBreakdown.months.map(m => {
                    const isExpanded = expandedMonth === m.monthNum;
                    return (
                      <React.Fragment key={m.monthNum}>
                        <tr
                          onClick={() => setExpandedMonth(isExpanded ? null : m.monthNum)}
                          style={{
                            borderBottom: '1px solid #F1F5F9',
                            cursor: m.count > 0 ? 'pointer' : 'default',
                            background: isExpanded ? '#F8FAFC' : '#FFFFFF'
                          }}
                        >
                          <td style={{ padding: '12px 16px', fontWeight: 800, color: '#0F172A' }}>
                            {m.monthName}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: m.total > 0 ? '#166534' : '#94A3B8' }}>
                            {currency(m.total)}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            {m.count > 0 ? <span style={{ fontWeight: 700 }}>{m.count}</span> : '—'}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            {m.contributors > 0 ? <span style={{ fontWeight: 700 }}>{m.contributors}</span> : '—'}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                              <div style={{ width: 60, height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: `${m.percent}%`, height: '100%', background: '#166534', borderRadius: 3 }} />
                              </div>
                              <span style={{ fontSize: 11, color: '#64748B', width: 35, textAlign: 'right' }}>{m.percent.toFixed(1)}%</span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            {m.count > 0 ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); setExpandedMonth(isExpanded ? null : m.monthNum); }}
                                style={{
                                  background: isExpanded ? '#0F172A' : '#F1F5F9',
                                  color: isExpanded ? '#FFFFFF' : '#0F172A',
                                  border: 'none',
                                  borderRadius: 6,
                                  padding: '4px 10px',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                {isExpanded ? 'Hide ▲' : 'View ▼'}
                              </button>
                            ) : (
                              <span style={{ color: '#CBD5E1' }}>—</span>
                            )}
                          </td>
                        </tr>

                        {/* Drilldown Itemized List */}
                        {isExpanded && (
                          <tr style={{ background: '#F8FAFC' }}>
                            <td colSpan={6} style={{ padding: '16px 20px' }}>
                              <div style={{ fontWeight: 800, color: '#0F172A', marginBottom: 10 }}>
                                📋 Itemized Collections for {m.monthName} {selectedYear} ({m.payments.length} Payments):
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                                {m.payments.map((p: any) => {
                                  const member = membersMap.get(p.member_id);
                                  const name = member ? `${formatMemberTitle(member.title)} ${member.first_name} ${member.surname}` : 'Brother on File';
                                  const dateStr = p.payment_date ? new Date(p.payment_date).toLocaleDateString() : '';
                                  return (
                                    <div
                                      key={p.id}
                                      style={{
                                        background: '#FFFFFF',
                                        border: '1px solid #E2E8F0',
                                        borderRadius: 8,
                                        padding: '10px 14px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                      }}
                                    >
                                      <div>
                                        <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 13 }}>{name}</div>
                                        <div style={{ fontSize: 11, color: '#64748B' }}>{dateStr} {p.month ? `• ${p.month}` : ''}</div>
                                      </div>
                                      <div style={{ fontWeight: 800, fontFamily: 'monospace', color: '#166534', fontSize: 14 }}>
                                        {currency(p.amount)}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 2: WELFARE FUND MONTHLY & YEARLY SUB-TOTALS ────────────── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'welfare' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          
          {/* Yearly Welfare Performance Table */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 16,
            padding: 24,
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, color: '#1E1B4B', fontWeight: 800 }}>
                  Welfare Fund Yearly Subtotals ({availableWelfareYears.length} Years on Record)
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>
                  Annual collections vs constitutional benefit disbursements & operational expenses.
                </p>
              </div>
            </div>

            <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 800, color: '#0F172A' }}>Year</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: '#64748B' }}>Active Contributors</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: '#64748B' }}>Transactions</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#8B5CF6' }}>Total Collected</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#EF4444' }}>Total Disbursed</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800 }}>Net Fund Growth</th>
                  </tr>
                </thead>
                <tbody>
                  {welfareYearlyStats.map(stat => (
                    <tr
                      key={stat.year}
                      onClick={() => setSelectedYear(stat.year)}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        cursor: 'pointer',
                        background: selectedYear === stat.year ? 'rgba(139, 92, 246, 0.08)' : '#FFFFFF',
                        transition: 'background 0.15s'
                      }}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 900, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {stat.year === selectedYear && <span style={{ color: '#8B5CF6' }}>▶</span>}
                        {stat.year}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700 }}>{stat.contributors} brothers</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#64748B' }}>{stat.transactionCount}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#8B5CF6' }}>
                        {currency(stat.totalCollected)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#EF4444' }}>
                        {currency(stat.totalDisbursed)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, color: stat.netGrowth >= 0 ? '#10B981' : '#EF4444' }}>
                        {stat.netGrowth >= 0 ? `+${currency(stat.netGrowth)}` : currency(stat.netGrowth)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Monthly Welfare Subtotals for Selected Year */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 16,
            padding: 24,
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, color: '#1E1B4B', fontWeight: 800 }}>
                  📅 {selectedYear} Welfare Monthly Subtotals
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>
                  Collected: <strong style={{ color: '#8B5CF6' }}>{currency(welfareMonthlyBreakdown.totalCollected)}</strong> • Disbursed: <strong style={{ color: '#EF4444' }}>{currency(welfareMonthlyBreakdown.totalDisbursed)}</strong> • Net: <strong style={{ color: welfareMonthlyBreakdown.netTotal >= 0 ? '#10B981' : '#EF4444' }}>{currency(welfareMonthlyBreakdown.netTotal)}</strong>
                </p>
              </div>

              {/* Year Selector Pills */}
              <div style={{ display: 'flex', gap: 8 }}>
                {availableWelfareYears.map(yr => (
                  <button
                    key={yr}
                    onClick={() => setSelectedYear(yr)}
                    style={{
                      background: selectedYear === yr ? '#1E1B4B' : '#F1F5F9',
                      color: selectedYear === yr ? '#FFFFFF' : '#475569',
                      border: 'none',
                      padding: '6px 14px',
                      borderRadius: 20,
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer'
                    }}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px', width: 140 }}>Month</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Active Contributors</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#8B5CF6' }}>Collections</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#EF4444' }}>Disbursements</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 900 }}>Net Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {welfareMonthlyBreakdown.months.map(m => (
                    <tr key={m.monthNum} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 800, color: '#0F172A' }}>
                        {m.monthName}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        {m.contributors > 0 ? (
                          <span style={{ background: '#EDE9FE', color: '#6D28D9', padding: '2px 8px', borderRadius: 12, fontWeight: 700, fontSize: 11 }}>
                            {m.contributors} members
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: m.collected > 0 ? '#8B5CF6' : '#94A3B8' }}>
                        {currency(m.collected)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: m.disbursed > 0 ? '#EF4444' : '#94A3B8' }}>
                        {m.disbursed > 0 ? currency(m.disbursed) : 'GH¢ 0.00'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, color: m.net >= 0 ? '#10B981' : '#EF4444' }}>
                        {m.net >= 0 ? `+${currency(m.net)}` : currency(m.net)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
