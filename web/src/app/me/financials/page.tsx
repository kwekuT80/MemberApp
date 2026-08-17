'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import MemberShell from '@/components/layout/MemberShell';
import { formatDisplayDate } from '@/lib/utils/ksji-logic';

interface Assessment {
  id: string;
  year: number;
  annual_assessment: number;
  arrears_brought_forward: number;
  [key: string]: any;
}

interface Payment {
  id: string;
  assessment_year: number;
  month: string;
  amount: number;
  payment_date: string;
  payment_type?: string;
  payment_category?: string;
  [key: string]: any;
}

export default function FinancialsPage() {
  const supabase = createClient();
  const [allAssessments, setAllAssessments] = useState<Assessment[]>([]);
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number | 'ALL'>(new Date().getFullYear());

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('member_id')
        .eq('id', user.id)
        .maybeSingle();
        
      if (!profile || !profile.member_id) {
        setLoading(false);
        return;
      }

      const memberId = profile.member_id;

      // Fetch ALL assessments and ALL payments across all years
      const [assRes, payRes] = await Promise.all([
        supabase
          .from('financial_assessments')
          .select('*')
          .eq('member_id', memberId)
          .order('year', { ascending: false }),
        supabase
          .from('financial_payments')
          .select('*')
          .eq('member_id', memberId)
          .order('payment_date', { ascending: false })
      ]);

      if (assRes.data) setAllAssessments(assRes.data);
      if (payRes.data) setAllPayments(payRes.data);

      setLoading(false);
    }
    loadData();
  }, []);

  const currencyFormat = (num: number) =>
    `GH₵ ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Helper to distinguish voluntary relief / special appeals from regular dues assessments
  const isVoluntaryPayment = (p: Payment) => {
    const m = String(p.month || '').toLowerCase();
    const t = String(p.payment_type || p.payment_category || '').toLowerCase();
    return m.includes('voluntary') || m.includes('appeal') || m.includes('relief') || m.includes('donation') ||
           t.includes('voluntary') || t.includes('appeal') || t.includes('relief') || t.includes('donation');
  };

  // Strictly split payments: Assessment Dues vs Voluntary Relief
  const duesPayments = useMemo(() => allPayments.filter(p => !isVoluntaryPayment(p)), [allPayments]);
  const voluntaryPayments = useMemo(() => allPayments.filter(p => isVoluntaryPayment(p)), [allPayments]);

  // Derive all years from both assessments and dues payments
  const availableYears = useMemo(() => {
    const yearSet = new Set<number>();
    allAssessments.forEach(a => yearSet.add(a.year));
    duesPayments.forEach(p => yearSet.add(Number(p.assessment_year)));
    const sorted = Array.from(yearSet).sort((a, b) => b - a);
    return sorted;
  }, [allAssessments, duesPayments]);

  // Year-by-year summaries using assessment dues ONLY
  const yearSummaries = useMemo(() => {
    return availableYears.map(yr => {
      const ass = allAssessments.find(a => a.year === yr);
      const yearDuesPayments = duesPayments.filter(p => Number(p.assessment_year) === yr);
      const arrears = ass ? Number(ass.arrears_brought_forward || 0) : 0;
      const annual = ass ? Number(ass.annual_assessment || 0) : 0;
      const totalAssessed = arrears + annual;
      const totalPaid = yearDuesPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const balance = totalAssessed - totalPaid;
      return { year: yr, arrears, annual, totalAssessed, totalPaid, balance, paymentCount: yearDuesPayments.length };
    });
  }, [availableYears, allAssessments, duesPayments]);

  // Filtered dues payments for the selected view
  const displayDuesPayments = useMemo(() => {
    if (selectedYear === 'ALL') {
      return [...duesPayments].sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
    }
    return duesPayments
      .filter(p => Number(p.assessment_year) === selectedYear)
      .sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());
  }, [duesPayments, selectedYear]);

  // Current year assessment for the summary header
  const currentYear = new Date().getFullYear();
  const currentAssessment = allAssessments.find(a => a.year === currentYear);
  const currentYearDuesPayments = duesPayments.filter(p => Number(p.assessment_year) === currentYear);

  const arrears = currentAssessment ? Number(currentAssessment.arrears_brought_forward || 0) : 0;
  const annual = currentAssessment ? Number(currentAssessment.annual_assessment || 0) : 0;
  const totalAssessment = arrears + annual;
  const totalDuesPaidThisYear = currentYearDuesPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const outstanding = totalAssessment - totalDuesPaidThisYear;

  // Lifetime totals (separated)
  const lifetimeDuesPaid = duesPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalVoluntaryContributed = voluntaryPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  if (loading) {
    return (
      <MemberShell title="Financial Ledger" subtitle="Loading your financial records...">
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </MemberShell>
    );
  }

  const thStyle: React.CSSProperties = {
    padding: '10px 16px',
    fontSize: 11,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#64748B',
    textAlign: 'left',
    borderBottom: '2px solid #E2E8F0',
    background: '#F8FAFC',
  };
  const tdStyle: React.CSSProperties = {
    padding: '12px 16px',
    fontSize: 13,
    borderBottom: '1px solid #F1F5F9',
  };
  const pillBtn = (active: boolean): React.CSSProperties => ({
    padding: '8px 18px',
    borderRadius: 30,
    border: 'none',
    cursor: 'pointer',
    fontWeight: active ? 800 : 600,
    fontSize: 13,
    background: active ? '#0F172A' : '#F1F5F9',
    color: active ? '#FFFFFF' : '#475569',
    transition: 'all 0.2s',
  });

  return (
    <MemberShell title="Financial Ledger" subtitle="Your complete dues and voluntary contribution records">
      <div style={{ display: 'grid', gap: 24, fontFamily: 'Inter, sans-serif', color: '#1E293B' }}>
        <Link href='/me' className="no-print" style={{ textDecoration: 'none', color: '#10233f', fontWeight: 700 }}>
          ← Back to Overview
        </Link>

        {/* ── Current Year Dues Summary Banner ── */}
        <div style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%)',
          borderRadius: 20,
          padding: '28px 32px',
          color: 'white',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.2)',
        }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: '#F59E0B', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            {currentYear} Commandery Annual Dues Summary
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, marginTop: 20 }}>
            <div>
              <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 800 }}>ARREARS B/F</div>
              <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'monospace', color: '#FB923C' }}>
                {currencyFormat(arrears)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 800 }}>{currentYear} ASSESSMENT</div>
              <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'monospace', color: '#60A5FA' }}>
                {currencyFormat(annual)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 800 }}>DUES PAID THIS YEAR</div>
              <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'monospace', color: '#34D399' }}>
                {currencyFormat(totalDuesPaidThisYear)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 800 }}>OUTSTANDING DUES</div>
              <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'monospace', color: outstanding > 0 ? '#F87171' : '#34D399' }}>
                {currencyFormat(Math.max(0, outstanding))}
              </div>
            </div>
          </div>

          {/* Lifetime totals */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', marginTop: 20, paddingTop: 16, display: 'flex', flexWrap: 'wrap', gap: 32 }}>
            <div>
              <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 800 }}>LIFETIME DUES PAID</div>
              <div style={{ fontSize: 20, fontWeight: 900, fontFamily: 'monospace', color: '#10B981' }}>
                {currencyFormat(lifetimeDuesPaid)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 800 }}>VOLUNTARY RELIEF CONTRIB.</div>
              <div style={{ fontSize: 20, fontWeight: 900, fontFamily: 'monospace', color: '#C084FC' }}>
                {currencyFormat(totalVoluntaryContributed)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 800 }}>YEARS ON RECORD</div>
              <div style={{ fontSize: 20, fontWeight: 900, fontFamily: 'monospace', color: '#FDE68A' }}>
                {availableYears.length} year{availableYears.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>

        {/* ── Year-by-Year Dues Summary Table ── */}
        {availableYears.length > 0 && (
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ padding: '16px 24px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>📊 Annual Dues Assessment Summary by Year</h2>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                Reflects mandatory Commandery annual dues assessments and dues payments only (excluding voluntary donations).
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Year</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Arrears B/F</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Assessment</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Total Due</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Dues Paid</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Dues Balance</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Payments</th>
                  </tr>
                </thead>
                <tbody>
                  {yearSummaries.map(s => (
                    <tr
                      key={s.year}
                      onClick={() => setSelectedYear(s.year)}
                      style={{
                        cursor: 'pointer',
                        background: selectedYear === s.year ? '#EFF6FF' : 'transparent',
                        transition: 'background 0.15s',
                      }}
                    >
                      <td style={{ ...tdStyle, fontWeight: 900, color: '#0F172A' }}>
                        {s.year}
                        {s.year === currentYear && (
                          <span style={{ marginLeft: 8, fontSize: 10, background: '#DBEAFE', color: '#1D4ED8', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                            CURRENT
                          </span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', color: '#64748B' }}>{currencyFormat(s.arrears)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', color: '#0F172A', fontWeight: 700 }}>{currencyFormat(s.annual)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', color: '#0F172A', fontWeight: 800 }}>{currencyFormat(s.totalAssessed)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', color: '#166534', fontWeight: 800 }}>{currencyFormat(s.totalPaid)}</td>
                      <td style={{
                        ...tdStyle,
                        textAlign: 'right',
                        fontFamily: 'monospace',
                        fontWeight: 800,
                        color: s.balance > 0 ? '#DC2626' : s.balance < 0 ? '#166534' : '#64748B',
                      }}>
                        {s.balance > 0 ? currencyFormat(s.balance) + ' owed' : s.balance < 0 ? currencyFormat(Math.abs(s.balance)) + ' credit' : '— Settled'}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, color: '#64748B' }}>{s.paymentCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Dues Payment Records Table ── */}
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ padding: '16px 24px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
                💳 Commandery Dues Payment Records {selectedYear !== 'ALL' ? `(${selectedYear})` : '(All Years)'}
              </h2>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                Payments credited directly against your annual assessment dues.
              </div>
            </div>
            <div style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>
              {displayDuesPayments.length} record{displayDuesPayments.length !== 1 ? 's' : ''}
              {' • '}
              Total: <strong style={{ color: '#166534' }}>{currencyFormat(displayDuesPayments.reduce((s, p) => s + Number(p.amount || 0), 0))}</strong>
            </div>
          </div>

          {/* Year Filter Tabs */}
          <div className="no-print" style={{ padding: '12px 24px', background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B', marginRight: 4 }}>Filter Year:</span>
            <button style={pillBtn(selectedYear === 'ALL')} onClick={() => setSelectedYear('ALL')}>
              All Years
            </button>
            {availableYears.map(yr => (
              <button key={yr} style={pillBtn(selectedYear === yr)} onClick={() => setSelectedYear(yr)}>
                {yr}
              </button>
            ))}
          </div>

          {displayDuesPayments.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#94A3B8' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>No dues payment records found {selectedYear !== 'ALL' ? `for ${selectedYear}` : ''}.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>#</th>
                    {selectedYear === 'ALL' && <th style={thStyle}>Year</th>}
                    <th style={thStyle}>Period / Month</th>
                    <th style={thStyle}>Payment Date</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Amount Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {displayDuesPayments.map((pay, idx) => (
                    <tr key={pay.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ ...tdStyle, color: '#94A3B8', fontWeight: 600, width: 40 }}>
                        {selectedYear === 'ALL' ? displayDuesPayments.length - idx : idx + 1}
                      </td>
                      {selectedYear === 'ALL' && (
                        <td style={{ ...tdStyle, fontWeight: 800, color: '#0F172A' }}>{pay.assessment_year}</td>
                      )}
                      <td style={{ ...tdStyle, fontWeight: 700, color: '#0F172A' }}>
                        {pay.month || `${pay.assessment_year} Dues`}
                      </td>
                      <td style={{ ...tdStyle, color: '#64748B' }}>
                        {formatDisplayDate(pay.payment_date)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#166534' }}>
                        {currencyFormat(Number(pay.amount || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#F0FDF4', borderTop: '2px solid #BBF7D0' }}>
                    <td colSpan={selectedYear === 'ALL' ? 4 : 3} style={{ ...tdStyle, fontWeight: 900, color: '#166534', textAlign: 'right' }}>
                      Total Dues Paid
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, color: '#166534', fontSize: 15 }}>
                      {currencyFormat(displayDuesPayments.reduce((s, p) => s + Number(p.amount || 0), 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* ── Dedicated Section: Voluntary Relief & Special Appeals Record ── */}
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ padding: '16px 24px', background: '#FAF5FF', borderBottom: '1px solid #E9D5FF', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>🤝</span>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#581C87' }}>
                  Voluntary Relief & Special Appeals Record
                </h2>
              </div>
              <div style={{ fontSize: 12, color: '#7E22CE', marginTop: 2 }}>
                Independent charitable, disaster relief, and emergency donations recorded separately from assessment dues.
              </div>
            </div>
            <div style={{ background: '#F3E8FF', border: '1px solid #D8B4FE', padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 800, color: '#6B21A8' }}>
              All-Time Contributed: {currencyFormat(totalVoluntaryContributed)}
            </div>
          </div>

          {voluntaryPayments.length === 0 ? (
            <div style={{ padding: 36, textAlign: 'center', color: '#94A3B8' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🕊️</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>No voluntary relief or special appeal contributions on record.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, background: '#FAF5FF' }}>#</th>
                    <th style={{ ...thStyle, background: '#FAF5FF' }}>Appeal / Purpose</th>
                    <th style={{ ...thStyle, background: '#FAF5FF' }}>Recorded Year</th>
                    <th style={{ ...thStyle, background: '#FAF5FF' }}>Payment Date</th>
                    <th style={{ ...thStyle, background: '#FAF5FF', textAlign: 'right' }}>Donation Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {voluntaryPayments.map((vPay, idx) => (
                    <tr key={vPay.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ ...tdStyle, color: '#94A3B8', fontWeight: 600, width: 40 }}>
                        {idx + 1}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: '#581C87' }}>
                        {vPay.month || 'Voluntary Relief Donation'}
                      </td>
                      <td style={{ ...tdStyle, color: '#64748B' }}>
                        {vPay.assessment_year}
                      </td>
                      <td style={{ ...tdStyle, color: '#64748B' }}>
                        {formatDisplayDate(vPay.payment_date)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#7E22CE' }}>
                        {currencyFormat(Number(vPay.amount || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#FAF5FF', borderTop: '2px solid #E9D5FF' }}>
                    <td colSpan={4} style={{ ...tdStyle, fontWeight: 900, color: '#6B21A8', textAlign: 'right' }}>
                      Total Voluntary Relief Contributed
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, color: '#6B21A8', fontSize: 15 }}>
                      {currencyFormat(totalVoluntaryContributed)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

      </div>
    </MemberShell>
  );
}
