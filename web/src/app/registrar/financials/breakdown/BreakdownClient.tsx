'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type TabMode = 'dues' | 'welfare' | 'donations';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Helper to identify voluntary donations / relief appeals
const isVoluntaryPayment = (p: any): boolean => {
  const m = (p.month || '').toLowerCase();
  const type = (p.payment_type || '').toLowerCase();
  return (
    m.includes('voluntary') ||
    m.includes('appeal') ||
    m.includes('relief') ||
    m.includes('donation') ||
    type.includes('voluntary') ||
    type.includes('appeal') ||
    type.includes('relief') ||
    type.includes('donation')
  );
};

// Helper to normalize month string or payment_date to integer 1-12
const normalizeMonth = (monthStr?: string | null, dateStr?: string | null): number => {
  if (monthStr) {
    const clean = monthStr.trim().toLowerCase();
    for (let i = 0; i < SHORT_MONTHS.length; i++) {
      if (clean.startsWith(SHORT_MONTHS[i].toLowerCase()) || clean.startsWith(MONTH_NAMES[i].toLowerCase())) {
        return i + 1;
      }
    }
    const parsedNum = parseInt(clean, 10);
    if (!isNaN(parsedNum) && parsedNum >= 1 && parsedNum <= 12) {
      return parsedNum;
    }
  }

  if (dateStr) {
    const dt = new Date(dateStr);
    if (!isNaN(dt.getTime())) {
      return dt.getMonth() + 1;
    }
  }

  return 1;
};

// Clean appeal description from month text
const cleanAppealName = (monthStr?: string | null): string => {
  if (!monthStr) return 'General Voluntary Relief';
  let cleaned = monthStr.trim();
  if (cleaned.toLowerCase().startsWith('voluntary relief:')) {
    cleaned = cleaned.substring('voluntary relief:'.length).trim();
  } else if (cleaned.toLowerCase().startsWith('voluntary relief')) {
    cleaned = cleaned.substring('voluntary relief'.length).trim();
  }
  return cleaned || 'General Voluntary Relief';
};

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
        (rawMembers || []).forEach(m => map.set(m.id, m));
        setMembersMap(map);

        setAssessments(rawAssessments || []);
        setPayments(rawPayments || []);
        setWelfareContributions(rawWelfare || []);
        setWelfareDisbursements(rawDisbursements || []);
      } catch (err) {
        console.error('Failed loading breakdown data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Filter separated payment streams
  const duesPaymentsList = useMemo(() => {
    return payments.filter(p => !isVoluntaryPayment(p));
  }, [payments]);

  const voluntaryPaymentsList = useMemo(() => {
    return payments.filter(p => isVoluntaryPayment(p));
  }, [payments]);

  // ── Available Years ──
  const availableDuesYears = useMemo(() => {
    const set = new Set<number>();
    assessments.forEach(a => { if (a.year) set.add(a.year); });
    duesPaymentsList.forEach(p => { if (p.assessment_year) set.add(p.assessment_year); });
    if (set.size === 0) set.add(new Date().getFullYear());
    return Array.from(set).sort((a, b) => b - a);
  }, [assessments, duesPaymentsList]);

  const availableWelfareYears = useMemo(() => {
    const set = new Set<number>();
    welfareContributions.forEach(w => { if (w.period_year) set.add(w.period_year); });
    welfareDisbursements.forEach(d => {
      if (d.disbursement_date) {
        const yr = new Date(d.disbursement_date).getFullYear();
        if (!isNaN(yr)) set.add(yr);
      }
    });
    if (set.size === 0) set.add(new Date().getFullYear());
    return Array.from(set).sort((a, b) => b - a);
  }, [welfareContributions, welfareDisbursements]);

  const availableDonationYears = useMemo(() => {
    const set = new Set<number>();
    voluntaryPaymentsList.forEach(p => {
      const yr = p.assessment_year || (p.payment_date ? new Date(p.payment_date).getFullYear() : null);
      if (yr) set.add(yr);
    });
    if (set.size === 0) set.add(new Date().getFullYear());
    return Array.from(set).sort((a, b) => b - a);
  }, [voluntaryPaymentsList]);

  // Sync selectedYear if tab switches and year not in list
  useEffect(() => {
    if (activeTab === 'dues' && !availableDuesYears.includes(selectedYear)) {
      setSelectedYear(availableDuesYears[0] || new Date().getFullYear());
    } else if (activeTab === 'welfare' && !availableWelfareYears.includes(selectedYear)) {
      setSelectedYear(availableWelfareYears[0] || new Date().getFullYear());
    } else if (activeTab === 'donations' && !availableDonationYears.includes(selectedYear)) {
      setSelectedYear(availableDonationYears[0] || new Date().getFullYear());
    }
  }, [activeTab, availableDuesYears, availableWelfareYears, availableDonationYears]);

  // ════════════════════════════════════════════════════════════
  // 1. DUES ASSESSMENTS & COLLECTIONS (STRICTLY NON-VOLUNTARY)
  // ════════════════════════════════════════════════════════════
  const duesYearlyStats = useMemo(() => {
    return availableDuesYears.map(yr => {
      const yrAssessments = assessments.filter(a => a.year === yr);
      const yrPayments = duesPaymentsList.filter(p => p.assessment_year === yr);

      const totalBilled = yrAssessments.reduce((sum, a) => {
        const annual = Number(a.annual_assessment || 0);
        const arrears = Number(a.arrears_brought_forward || 0);
        return sum + annual + arrears;
      }, 0);

      const totalCollected = yrPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const balance = totalBilled - totalCollected;
      const collectionRate = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;
      const contributingBrothers = new Set(yrPayments.map(p => p.member_id)).size;

      return {
        year: yr,
        totalBilled,
        totalCollected,
        balance,
        collectionRate,
        paymentCount: yrPayments.length,
        contributingBrothers
      };
    });
  }, [availableDuesYears, assessments, duesPaymentsList]);

  const duesMonthlyBreakdown = useMemo(() => {
    const yrPayments = duesPaymentsList.filter(p => p.assessment_year === selectedYear);
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
  }, [duesPaymentsList, selectedYear]);

  // ════════════════════════════════════════════════════════════
  // 2. WELFARE FUND PERFORMANCE
  // ════════════════════════════════════════════════════════════
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
        contributions: mContributions,
        disbursements: mDisbursements
      };
    });

    return { totalCollected: yrCollected, totalDisbursed: yrDisbursed, months: monthsData };
  }, [welfareContributions, welfareDisbursements, selectedYear]);

  // ════════════════════════════════════════════════════════════
  // 3. VOLUNTARY DONATIONS & SPECIAL RELIEF APPEALS
  // ════════════════════════════════════════════════════════════
  const donationsYearlyStats = useMemo(() => {
    return availableDonationYears.map(yr => {
      const yrDonations = voluntaryPaymentsList.filter(p => {
        const y = p.assessment_year || (p.payment_date ? new Date(p.payment_date).getFullYear() : null);
        return y === yr;
      });

      const totalRaised = yrDonations.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const contributingBrothers = new Set(yrDonations.map(p => p.member_id)).size;
      const avgDonation = contributingBrothers > 0 ? totalRaised / contributingBrothers : 0;

      // Group by distinct appeal causes
      const causesMap = new Map<string, { count: number; total: number }>();
      yrDonations.forEach(p => {
        const cause = cleanAppealName(p.month);
        const curr = causesMap.get(cause) || { count: 0, total: 0 };
        curr.count += 1;
        curr.total += Number(p.amount || 0);
        causesMap.set(cause, curr);
      });

      return {
        year: yr,
        totalRaised,
        contributingBrothers,
        donationCount: yrDonations.length,
        avgDonation,
        causes: Array.from(causesMap.entries()).map(([name, data]) => ({ name, ...data }))
      };
    });
  }, [availableDonationYears, voluntaryPaymentsList]);

  const donationsMonthlyBreakdown = useMemo(() => {
    const yrDonations = voluntaryPaymentsList.filter(p => {
      const y = p.assessment_year || (p.payment_date ? new Date(p.payment_date).getFullYear() : null);
      return y === selectedYear;
    });
    const yrTotal = yrDonations.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const monthsData = MONTH_NAMES.map((name, idx) => {
      const monthNum = idx + 1;
      const mDonations = yrDonations.filter(p => normalizeMonth(p.month, p.payment_date) === monthNum);
      const total = mDonations.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const percent = yrTotal > 0 ? (total / yrTotal) * 100 : 0;
      const contributors = new Set(mDonations.map(p => p.member_id)).size;

      return {
        monthNum,
        monthName: name,
        total,
        count: mDonations.length,
        contributors,
        percent,
        donations: mDonations
      };
    });

    // Extract all campaigns for the selected year
    const campaignsMap = new Map<string, { count: number; total: number; donors: Set<string> }>();
    yrDonations.forEach(p => {
      const cause = cleanAppealName(p.month);
      const curr = campaignsMap.get(cause) || { count: 0, total: 0, donors: new Set<string>() };
      curr.count += 1;
      curr.total += Number(p.amount || 0);
      if (p.member_id) curr.donors.add(p.member_id);
      campaignsMap.set(cause, curr);
    });

    const campaigns = Array.from(campaignsMap.entries()).map(([name, c]) => ({
      name,
      count: c.count,
      total: c.total,
      donorsCount: c.donors.size
    }));

    return { total: yrTotal, count: yrDonations.length, months: monthsData, campaigns };
  }, [voluntaryPaymentsList, selectedYear]);

  // Format currency helper
  const fmt = (num: number) => {
    return 'GH₵ ' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: '#64748B', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Compiling financial ledgers and periodic subtotals...</div>
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
          🖨️ Print Report
        </button>
      </div>

      {/* ── Tab Switcher ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '2px solid #E2E8F0', paddingBottom: 12, flexWrap: 'wrap' }}>
        <button
          onClick={() => { setActiveTab('dues'); setExpandedMonth(null); }}
          style={{
            ...tabButton,
            background: activeTab === 'dues' ? '#10233F' : '#F1F5F9',
            color: activeTab === 'dues' ? '#FFFFFF' : '#475569',
            borderColor: activeTab === 'dues' ? '#10233F' : '#CBD5E1',
          }}
        >
          📜 Annual Dues Assessments
        </button>
        <button
          onClick={() => { setActiveTab('welfare'); setExpandedMonth(null); }}
          style={{
            ...tabButton,
            background: activeTab === 'welfare' ? '#10233F' : '#F1F5F9',
            color: activeTab === 'welfare' ? '#FFFFFF' : '#475569',
            borderColor: activeTab === 'welfare' ? '#10233F' : '#CBD5E1',
          }}
        >
          🤝 Welfare Fund
        </button>
        <button
          onClick={() => { setActiveTab('donations'); setExpandedMonth(null); }}
          style={{
            ...tabButton,
            background: activeTab === 'donations' ? '#6D28D9' : '#F1F5F9',
            color: activeTab === 'donations' ? '#FFFFFF' : '#475569',
            borderColor: activeTab === 'donations' ? '#6D28D9' : '#CBD5E1',
          }}
        >
          ❤️ Voluntary Donations & Relief Appeals ({voluntaryPaymentsList.length})
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* TAB 1: ANNUAL DUES ASSESSMENTS & COLLECTIONS                 */}
      {/* ════════════════════════════════════════════════════════════ */}
      {activeTab === 'dues' && (
        <div>
          {/* Executive Overview Banner */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '18px 24px', marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, color: '#10233F', fontWeight: 800 }}>
                  Annual Dues Assessments & Collections Matrix
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>
                  Audited comparison of billed assessment obligations against actual member cash recoveries. <em>(Voluntary relief donations excluded)</em>
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>Selected Year:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => { setSelectedYear(Number(e.target.value)); setExpandedMonth(null); }}
                  style={selectStyle}
                >
                  {availableDuesYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 1: Yearly Comparison Table */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h4 style={{ margin: 0, fontSize: 15, color: '#10233F', fontWeight: 700 }}>
                📊 Annual Assessment Recovery Comparison
              </h4>
              <span style={{ fontSize: 12, color: '#64748B' }}>Multi-year performance summary</span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={{ background: '#F1F5F9', textAlign: 'left' }}>
                    <th style={thStyle}>Fiscal Year</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Total Billed</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Actual Collected</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Outstanding Dues</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Recovery Rate</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Contributing Brothers</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {duesYearlyStats.map(s => (
                    <tr
                      key={s.year}
                      style={{
                        background: s.year === selectedYear ? '#EFF6FF' : '#FFFFFF',
                        borderBottom: '1px solid #E2E8F0',
                        fontWeight: s.year === selectedYear ? 700 : 500
                      }}
                    >
                      <td style={tdStyle}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          {s.year}
                          {s.year === selectedYear && (
                            <span style={{ fontSize: 10, background: '#10233F', color: '#FFF', padding: '2px 6px', borderRadius: 4 }}>
                              ACTIVE
                            </span>
                          )}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: '#1E293B' }}>{fmt(s.totalBilled)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: '#166534', fontWeight: 700 }}>{fmt(s.totalCollected)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: s.balance > 0 ? '#991B1B' : '#166534' }}>
                        {fmt(s.balance)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: 12,
                          fontSize: 12,
                          fontWeight: 800,
                          background: s.collectionRate >= 75 ? '#DCFCE7' : (s.collectionRate >= 50 ? '#FEF3C7' : '#FEE2E2'),
                          color: s.collectionRate >= 75 ? '#166534' : (s.collectionRate >= 50 ? '#92400E' : '#991B1B')
                        }}>
                          {s.collectionRate.toFixed(1)}%
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        {s.contributingBrothers} brothers
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <button
                          onClick={() => { setSelectedYear(s.year); setExpandedMonth(null); }}
                          style={{
                            background: s.year === selectedYear ? '#10233F' : '#F1F5F9',
                            color: s.year === selectedYear ? '#FFF' : '#334155',
                            border: '1px solid #CBD5E1',
                            borderRadius: 6,
                            padding: '4px 10px',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          View Months
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Selected Year Monthly Breakdown Table */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h4 style={{ margin: 0, fontSize: 16, color: '#10233F', fontWeight: 800 }}>
                  📅 {selectedYear} Monthly Dues Subtotals & Collections
                </h4>
                <span style={{ fontSize: 13, color: '#64748B' }}>
                  Total Dues Collected in {selectedYear}: <strong style={{ color: '#166534' }}>{fmt(duesMonthlyBreakdown.total)}</strong>
                </span>
              </div>
              <span style={{ fontSize: 12, color: '#64748B', fontStyle: 'italic' }}>
                Click any row to expand itemized ledger
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={{ background: '#F1F5F9', textAlign: 'left' }}>
                    <th style={thStyle}>Month</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Dues Subtotal</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Transactions</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Contributing Brothers</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>% of Annual Total</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Itemized Ledger</th>
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
                            borderBottom: '1px solid #E2E8F0',
                            background: isExpanded ? '#EFF6FF' : (m.total > 0 ? '#FFFFFF' : '#FAFAFA'),
                            cursor: 'pointer',
                            transition: 'background 0.15s ease'
                          }}
                        >
                          <td style={{ ...tdStyle, fontWeight: 700, color: m.total > 0 ? '#0F172A' : '#94A3B8' }}>
                            {m.monthName}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: m.total > 0 ? '#166534' : '#94A3B8' }}>
                            {fmt(m.total)}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center', color: m.count > 0 ? '#334155' : '#94A3B8' }}>
                            {m.count}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center', color: m.contributors > 0 ? '#334155' : '#94A3B8' }}>
                            {m.contributors > 0 ? `${m.contributors} Brothers` : '—'}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 60, height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: `${Math.min(100, m.percent)}%`, height: '100%', background: '#166534' }} />
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', minWidth: 35 }}>
                                {m.percent.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>
                            <span style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: isExpanded ? '#1E40AF' : '#64748B',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}>
                              {isExpanded ? '▲ Hide Details' : (m.count > 0 ? `▼ View (${m.count})` : '—')}
                            </span>
                          </td>
                        </tr>

                        {/* Expanded Drilldown Ledger */}
                        {isExpanded && (
                          <tr style={{ background: '#F8FAFC' }}>
                            <td colSpan={6} style={{ padding: '16px 24px', borderBottom: '2px solid #CBD5E1' }}>
                              <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 13, fontWeight: 800, color: '#10233F' }}>
                                  Itemized Dues Ledger for {m.monthName} {selectedYear}
                                </span>
                                <span style={{ fontSize: 12, color: '#64748B' }}>
                                  {m.payments.length} payments logged • Subtotal: <strong>{fmt(m.total)}</strong>
                                </span>
                              </div>

                              {m.payments.length === 0 ? (
                                <div style={{ padding: 12, color: '#94A3B8', fontSize: 13, textAlign: 'center' }}>
                                  No dues payment transactions logged in this calendar month.
                                </div>
                              ) : (
                                <table style={{ ...tableStyle, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8 }}>
                                  <thead>
                                    <tr style={{ background: '#F1F5F9' }}>
                                      <th style={{ ...thStyle, fontSize: 11 }}>Date Paid</th>
                                      <th style={{ ...thStyle, fontSize: 11 }}>Brother Name</th>
                                      <th style={{ ...thStyle, fontSize: 11 }}>Receipt / Month Tag</th>
                                      <th style={{ ...thStyle, fontSize: 11, textAlign: 'right' }}>Amount Paid</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {m.payments.map((p, pIdx) => {
                                      const member = membersMap.get(p.member_id);
                                      const memberName = member ? `${member.title || 'Bro.'} ${member.first_name} ${member.surname}` : 'Unknown Brother';
                                      return (
                                        <tr key={p.id || pIdx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                          <td style={{ ...tdStyle, fontSize: 12 }}>{formatDate(p.payment_date)}</td>
                                          <td style={{ ...tdStyle, fontSize: 12, fontWeight: 700, color: '#10233F' }}>
                                            {memberName}
                                          </td>
                                          <td style={{ ...tdStyle, fontSize: 12, color: '#64748B' }}>
                                            {p.month || 'Dues Assessment'}
                                          </td>
                                          <td style={{ ...tdStyle, fontSize: 12, textAlign: 'right', fontWeight: 700, color: '#166534' }}>
                                            {fmt(Number(p.amount || 0))}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              )}
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

      {/* ════════════════════════════════════════════════════════════ */}
      {/* TAB 2: WELFARE FUND MONTHLY & YEARLY SUB-TOTALS              */}
      {/* ════════════════════════════════════════════════════════════ */}
      {activeTab === 'welfare' && (
        <div>
          {/* Executive Overview Banner */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '18px 24px', marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, color: '#10233F', fontWeight: 800 }}>
                  Welfare Fund Cashflow & Performance Matrix
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>
                  Audited breakdown of fraternal welfare dues inflows against fraternal claim disbursements and aid paid out.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>Selected Year:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => { setSelectedYear(Number(e.target.value)); setExpandedMonth(null); }}
                  style={selectStyle}
                >
                  {availableWelfareYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 1: Welfare Yearly Summary Table */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h4 style={{ margin: 0, fontSize: 15, color: '#10233F', fontWeight: 700 }}>
                📊 Annual Welfare Fund Performance
              </h4>
              <span style={{ fontSize: 12, color: '#64748B' }}>Multi-year balance growth</span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={{ background: '#F1F5F9', textAlign: 'left' }}>
                    <th style={thStyle}>Fiscal Year</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Total Contributions</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Total Disbursements</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Net Fund Growth</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Contributing Brothers</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {welfareYearlyStats.map(s => (
                    <tr
                      key={s.year}
                      style={{
                        background: s.year === selectedYear ? '#EFF6FF' : '#FFFFFF',
                        borderBottom: '1px solid #E2E8F0',
                        fontWeight: s.year === selectedYear ? 700 : 500
                      }}
                    >
                      <td style={tdStyle}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          {s.year}
                          {s.year === selectedYear && (
                            <span style={{ fontSize: 10, background: '#10233F', color: '#FFF', padding: '2px 6px', borderRadius: 4 }}>
                              ACTIVE
                            </span>
                          )}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: '#166534', fontWeight: 700 }}>{fmt(s.totalCollected)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: '#991B1B', fontWeight: 700 }}>{fmt(s.totalDisbursed)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: s.netGrowth >= 0 ? '#166534' : '#991B1B' }}>
                        {fmt(s.netGrowth)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        {s.contributors} brothers
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <button
                          onClick={() => { setSelectedYear(s.year); setExpandedMonth(null); }}
                          style={{
                            background: s.year === selectedYear ? '#10233F' : '#F1F5F9',
                            color: s.year === selectedYear ? '#FFF' : '#334155',
                            border: '1px solid #CBD5E1',
                            borderRadius: 6,
                            padding: '4px 10px',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          View Months
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Selected Year Welfare Monthly Breakdown */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h4 style={{ margin: 0, fontSize: 16, color: '#10233F', fontWeight: 800 }}>
                  📅 {selectedYear} Monthly Welfare Cashflow Matrix
                </h4>
                <span style={{ fontSize: 13, color: '#64748B' }}>
                  Total Collected: <strong style={{ color: '#166534' }}>{fmt(welfareMonthlyBreakdown.totalCollected)}</strong> • Total Disbursed: <strong style={{ color: '#991B1B' }}>{fmt(welfareMonthlyBreakdown.totalDisbursed)}</strong>
                </span>
              </div>
              <span style={{ fontSize: 12, color: '#64748B', fontStyle: 'italic' }}>
                Click row to view member contributions
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={{ background: '#F1F5F9', textAlign: 'left' }}>
                    <th style={thStyle}>Month</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Inflows (Collected)</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Outflows (Disbursed)</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Net Balance</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Active Subscribers</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Itemized Ledger</th>
                  </tr>
                </thead>
                <tbody>
                  {welfareMonthlyBreakdown.months.map(m => {
                    const isExpanded = expandedMonth === m.monthNum;
                    const hasActivity = m.collected > 0 || m.disbursed > 0;
                    return (
                      <React.Fragment key={m.monthNum}>
                        <tr
                          onClick={() => setExpandedMonth(isExpanded ? null : m.monthNum)}
                          style={{
                            borderBottom: '1px solid #E2E8F0',
                            background: isExpanded ? '#EFF6FF' : (hasActivity ? '#FFFFFF' : '#FAFAFA'),
                            cursor: 'pointer',
                            transition: 'background 0.15s ease'
                          }}
                        >
                          <td style={{ ...tdStyle, fontWeight: 700, color: hasActivity ? '#0F172A' : '#94A3B8' }}>
                            {m.monthName}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: m.collected > 0 ? '#166534' : '#94A3B8' }}>
                            {fmt(m.collected)}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: m.disbursed > 0 ? '#991B1B' : '#94A3B8' }}>
                            {fmt(m.disbursed)}
                          </td>
                          <td style={{
                            ...tdStyle,
                            textAlign: 'right',
                            fontWeight: 800,
                            color: m.net > 0 ? '#166534' : (m.net < 0 ? '#991B1B' : '#64748B')
                          }}>
                            {fmt(m.net)}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center', color: m.contributors > 0 ? '#334155' : '#94A3B8' }}>
                            {m.contributors > 0 ? `${m.contributors} Brothers` : '—'}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>
                            <span style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: isExpanded ? '#1E40AF' : '#64748B',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}>
                              {isExpanded ? '▲ Hide Details' : (m.contributions.length > 0 ? `▼ View (${m.contributions.length})` : '—')}
                            </span>
                          </td>
                        </tr>

                        {/* Expanded Welfare Ledger */}
                        {isExpanded && (
                          <tr style={{ background: '#F8FAFC' }}>
                            <td colSpan={6} style={{ padding: '16px 24px', borderBottom: '2px solid #CBD5E1' }}>
                              <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 13, fontWeight: 800, color: '#10233F' }}>
                                  Welfare Contributions & Disbursements for {m.monthName} {selectedYear}
                                </span>
                                <span style={{ fontSize: 12, color: '#64748B' }}>
                                  Net Inflow: <strong style={{ color: m.net >= 0 ? '#166534' : '#991B1B' }}>{fmt(m.net)}</strong>
                                </span>
                              </div>

                              {m.contributions.length === 0 && m.disbursements.length === 0 ? (
                                <div style={{ padding: 12, color: '#94A3B8', fontSize: 13, textAlign: 'center' }}>
                                  No welfare transactions recorded in this month.
                                </div>
                              ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
                                  {/* Contributions */}
                                  {m.contributions.length > 0 && (
                                    <div>
                                      <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginBottom: 6 }}>
                                        Member Dues Inflows ({m.contributions.length})
                                      </div>
                                      <table style={{ ...tableStyle, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8 }}>
                                        <thead>
                                          <tr style={{ background: '#F1F5F9' }}>
                                            <th style={{ ...thStyle, fontSize: 11 }}>Date</th>
                                            <th style={{ ...thStyle, fontSize: 11 }}>Brother Name</th>
                                            <th style={{ ...thStyle, fontSize: 11 }}>Method / Ref</th>
                                            <th style={{ ...thStyle, fontSize: 11, textAlign: 'right' }}>Amount</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {m.contributions.map((c, cIdx) => {
                                            const member = membersMap.get(c.member_id);
                                            const memberName = member ? `${member.title || 'Bro.'} ${member.first_name} ${member.surname}` : 'Unknown Brother';
                                            return (
                                              <tr key={c.id || cIdx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                                <td style={{ ...tdStyle, fontSize: 12 }}>{formatDate(c.payment_date)}</td>
                                                <td style={{ ...tdStyle, fontSize: 12, fontWeight: 700, color: '#10233F' }}>
                                                  {memberName}
                                                </td>
                                                <td style={{ ...tdStyle, fontSize: 12, color: '#64748B' }}>
                                                  {c.payment_method?.toUpperCase()} • {c.reference_no || '—'}
                                                </td>
                                                <td style={{ ...tdStyle, fontSize: 12, textAlign: 'right', fontWeight: 700, color: '#166534' }}>
                                                  {fmt(Number(c.amount || 0))}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}

                                  {/* Disbursements */}
                                  {m.disbursements.length > 0 && (
                                    <div>
                                      <div style={{ fontSize: 12, fontWeight: 700, color: '#991B1B', marginBottom: 6 }}>
                                        Benefit Payouts ({m.disbursements.length})
                                      </div>
                                      <table style={{ ...tableStyle, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8 }}>
                                        <thead>
                                          <tr style={{ background: '#F1F5F9' }}>
                                            <th style={{ ...thStyle, fontSize: 11 }}>Date</th>
                                            <th style={{ ...thStyle, fontSize: 11 }}>Benefit Category</th>
                                            <th style={{ ...thStyle, fontSize: 11 }}>Beneficiary / Notes</th>
                                            <th style={{ ...thStyle, fontSize: 11, textAlign: 'right' }}>Payout</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {m.disbursements.map((d, dIdx) => (
                                            <tr key={d.id || dIdx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                              <td style={{ ...tdStyle, fontSize: 12 }}>{formatDate(d.disbursement_date)}</td>
                                              <td style={{ ...tdStyle, fontSize: 12, fontWeight: 700, color: '#991B1B' }}>
                                                {d.welfare_categories?.name || 'Aid Disbursement'}
                                              </td>
                                              <td style={{ ...tdStyle, fontSize: 12, color: '#64748B' }}>
                                                {d.notes || 'Disbursed aid'}
                                              </td>
                                              <td style={{ ...tdStyle, fontSize: 12, textAlign: 'right', fontWeight: 700, color: '#991B1B' }}>
                                                {fmt(Number(d.amount || 0))}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              )}
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

      {/* ════════════════════════════════════════════════════════════ */}
      {/* TAB 3: VOLUNTARY DONATIONS & RELIEF APPEALS (NEW)            */}
      {/* ════════════════════════════════════════════════════════════ */}
      {activeTab === 'donations' && (
        <div>
          {/* Executive Overview Banner */}
          <div style={{ background: '#FAF5FF', border: '1px solid #E9D5FF', borderRadius: 12, padding: '18px 24px', marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, color: '#581C87', fontWeight: 800 }}>
                  ❤️ Voluntary Relief & Special Appeals Subtotals
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B21A8' }}>
                  Audited breakdown of fraternal goodwill donations, special disaster relief drives, and emergency benevolence appeals.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#581C87' }}>Selected Year:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => { setSelectedYear(Number(e.target.value)); setExpandedMonth(null); }}
                  style={{ ...selectStyle, borderColor: '#C084FC', color: '#581C87' }}
                >
                  {availableDonationYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div style={{ ...cardStyle, borderLeft: '4px solid #7C3AED', margin: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#6B21A8', textTransform: 'uppercase' }}>
                Total Relief Raised ({selectedYear})
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#581C87', marginTop: 4 }}>
                {fmt(donationsMonthlyBreakdown.total)}
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                Across {donationsMonthlyBreakdown.count} individual donations
              </div>
            </div>

            <div style={{ ...cardStyle, borderLeft: '4px solid #059669', margin: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#047857', textTransform: 'uppercase' }}>
                Contributing Brothers
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#065F46', marginTop: 4 }}>
                {new Set(voluntaryPaymentsList.filter(p => (p.assessment_year || new Date(p.payment_date).getFullYear()) === selectedYear).map(p => p.member_id)).size} Brothers
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                Active charitable donors in {selectedYear}
              </div>
            </div>

            <div style={{ ...cardStyle, borderLeft: '4px solid #2563EB', margin: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1D4ED8', textTransform: 'uppercase' }}>
                Active Relief Appeals
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#1E40AF', marginTop: 4 }}>
                {donationsMonthlyBreakdown.campaigns.length} Campaign{donationsMonthlyBreakdown.campaigns.length === 1 ? '' : 's'}
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                Initiatives mobilized this fiscal year
              </div>
            </div>
          </div>

          {/* Campaign Summary Breakdown Card */}
          {donationsMonthlyBreakdown.campaigns.length > 0 && (
            <div style={{ ...cardStyle, marginBottom: 24, background: '#FAF5FF', border: '1px solid #E9D5FF' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: 15, color: '#581C87', fontWeight: 800 }}>
                🎯 Mobilized Campaigns & Appeal Causes ({selectedYear})
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                {donationsMonthlyBreakdown.campaigns.map((c, cIdx) => (
                  <div key={cIdx} style={{ background: '#FFFFFF', border: '1px solid #DDD6FE', borderRadius: 8, padding: '12px 16px' }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: '#4C1D95' }}>{c.name}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 900, color: '#6D28D9' }}>{fmt(c.total)}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>
                        {c.donorsCount} Donors ({c.count} gifts)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 1: Yearly Voluntary Summary Table */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h4 style={{ margin: 0, fontSize: 15, color: '#10233F', fontWeight: 700 }}>
                📊 Multi-Year Voluntary Relief Performance
              </h4>
              <span style={{ fontSize: 12, color: '#64748B' }}>Charitable goodwill comparison</span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={{ background: '#F1F5F9', textAlign: 'left' }}>
                    <th style={thStyle}>Fiscal Year</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Total Raised</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Contributing Brothers</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Total Gifts</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Average Gift / Brother</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {donationsYearlyStats.map(s => (
                    <tr
                      key={s.year}
                      style={{
                        background: s.year === selectedYear ? '#FAF5FF' : '#FFFFFF',
                        borderBottom: '1px solid #E2E8F0',
                        fontWeight: s.year === selectedYear ? 700 : 500
                      }}
                    >
                      <td style={tdStyle}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          {s.year}
                          {s.year === selectedYear && (
                            <span style={{ fontSize: 10, background: '#6D28D9', color: '#FFF', padding: '2px 6px', borderRadius: 4 }}>
                              ACTIVE
                            </span>
                          )}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: '#6D28D9', fontWeight: 800 }}>{fmt(s.totalRaised)}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>{s.contributingBrothers} brothers</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>{s.donationCount}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: '#1E293B' }}>{fmt(s.avgDonation)}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <button
                          onClick={() => { setSelectedYear(s.year); setExpandedMonth(null); }}
                          style={{
                            background: s.year === selectedYear ? '#6D28D9' : '#F1F5F9',
                            color: s.year === selectedYear ? '#FFF' : '#334155',
                            border: '1px solid #CBD5E1',
                            borderRadius: 6,
                            padding: '4px 10px',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          View Months
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Selected Year Monthly Breakdown Table */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h4 style={{ margin: 0, fontSize: 16, color: '#10233F', fontWeight: 800 }}>
                  📅 {selectedYear} Monthly Voluntary Donation Subtotals
                </h4>
                <span style={{ fontSize: 13, color: '#64748B' }}>
                  Total Relief Inflows: <strong style={{ color: '#6D28D9' }}>{fmt(donationsMonthlyBreakdown.total)}</strong>
                </span>
              </div>
              <span style={{ fontSize: 12, color: '#64748B', fontStyle: 'italic' }}>
                Click row to view itemized donor roll
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={{ background: '#F1F5F9', textAlign: 'left' }}>
                    <th style={thStyle}>Month</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Voluntary Subtotal</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Donations</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Contributing Brothers</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>% of Annual Total</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Itemized Donor Roll</th>
                  </tr>
                </thead>
                <tbody>
                  {donationsMonthlyBreakdown.months.map(m => {
                    const isExpanded = expandedMonth === m.monthNum;
                    return (
                      <React.Fragment key={m.monthNum}>
                        <tr
                          onClick={() => setExpandedMonth(isExpanded ? null : m.monthNum)}
                          style={{
                            borderBottom: '1px solid #E2E8F0',
                            background: isExpanded ? '#FAF5FF' : (m.total > 0 ? '#FFFFFF' : '#FAFAFA'),
                            cursor: 'pointer',
                            transition: 'background 0.15s ease'
                          }}
                        >
                          <td style={{ ...tdStyle, fontWeight: 700, color: m.total > 0 ? '#0F172A' : '#94A3B8' }}>
                            {m.monthName}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: m.total > 0 ? '#6D28D9' : '#94A3B8' }}>
                            {fmt(m.total)}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center', color: m.count > 0 ? '#334155' : '#94A3B8' }}>
                            {m.count}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center', color: m.contributors > 0 ? '#334155' : '#94A3B8' }}>
                            {m.contributors > 0 ? `${m.contributors} Brothers` : '—'}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 60, height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: `${Math.min(100, m.percent)}%`, height: '100%', background: '#7C3AED' }} />
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', minWidth: 35 }}>
                                {m.percent.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>
                            <span style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: isExpanded ? '#6D28D9' : '#64748B',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}>
                              {isExpanded ? '▲ Hide Details' : (m.count > 0 ? `▼ View (${m.count})` : '—')}
                            </span>
                          </td>
                        </tr>

                        {/* Expanded Donor Roll */}
                        {isExpanded && (
                          <tr style={{ background: '#FAF5FF' }}>
                            <td colSpan={6} style={{ padding: '16px 24px', borderBottom: '2px solid #DDD6FE' }}>
                              <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 13, fontWeight: 800, color: '#581C87' }}>
                                  Itemized Donor Roll for {m.monthName} {selectedYear}
                                </span>
                                <span style={{ fontSize: 12, color: '#6B21A8' }}>
                                  {m.donations.length} gifts logged • Subtotal: <strong>{fmt(m.total)}</strong>
                                </span>
                              </div>

                              {m.donations.length === 0 ? (
                                <div style={{ padding: 12, color: '#94A3B8', fontSize: 13, textAlign: 'center' }}>
                                  No voluntary donations recorded in this calendar month.
                                </div>
                              ) : (
                                <table style={{ ...tableStyle, background: '#FFFFFF', border: '1px solid #DDD6FE', borderRadius: 8 }}>
                                  <thead>
                                    <tr style={{ background: '#F5F3FF' }}>
                                      <th style={{ ...thStyle, fontSize: 11 }}>Date Paid</th>
                                      <th style={{ ...thStyle, fontSize: 11 }}>Brother Name</th>
                                      <th style={{ ...thStyle, fontSize: 11 }}>Appeal / Campaign Cause</th>
                                      <th style={{ ...thStyle, fontSize: 11, textAlign: 'right' }}>Amount Donated</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {m.donations.map((p, pIdx) => {
                                      const member = membersMap.get(p.member_id);
                                      const memberName = member ? `${member.title || 'Bro.'} ${member.first_name} ${member.surname}` : 'Unknown Brother';
                                      return (
                                        <tr key={p.id || pIdx} style={{ borderBottom: '1px solid #F3E8FF' }}>
                                          <td style={{ ...tdStyle, fontSize: 12 }}>{formatDate(p.payment_date)}</td>
                                          <td style={{ ...tdStyle, fontSize: 12, fontWeight: 700, color: '#10233F' }}>
                                            {memberName}
                                          </td>
                                          <td style={{ ...tdStyle, fontSize: 12, color: '#6D28D9', fontWeight: 600 }}>
                                            {cleanAppealName(p.month)}
                                          </td>
                                          <td style={{ ...tdStyle, fontSize: 12, textAlign: 'right', fontWeight: 700, color: '#6D28D9' }}>
                                            {fmt(Number(p.amount || 0))}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              )}
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

    </div>
  );
}

// ── Styles ──
const cardStyle: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #E2E8F0',
  borderRadius: 12,
  padding: '24px',
  marginBottom: 24,
  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 13
};

const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontWeight: 700,
  color: '#334155',
  borderBottom: '1px solid #CBD5E1'
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  color: '#0F172A'
};

const tabButton: React.CSSProperties = {
  padding: '10px 18px',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  border: '1px solid transparent',
  transition: 'all 0.15s ease'
};

const selectStyle: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #CBD5E1',
  borderRadius: 6,
  padding: '6px 12px',
  fontSize: 13,
  fontWeight: 700,
  color: '#1E293B',
  cursor: 'pointer'
};
