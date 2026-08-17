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
    `GH\u20B5 ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Derive all years from both assessments and payments
  const availableYears = useMemo(() => {
    const yearSet = new Set<number>();
    allAssessments.forEach(a => yearSet.add(a.year));
    allPayments.forEach(p => yearSet.add(Number(p.assessment_year)));
    const sorted = Array.from(yearSet).sort((a, b) => b - a);
    return sorted;
  }, [allAssessments, allPayments]);

  // Year-by-year summaries
  const yearSummaries = useMemo(() => {
    return availableYears.map(yr => {
      const ass = allAssessments.find(a => a.year === yr);
      const yearPayments = allPayments.filter(p => Number(p.assessment_year) === yr);
      const arrears = ass ? Number(ass.arrears_brought_forward || 0) : 0;
      const annual = ass ? Number(ass.annual_assessment || 0) : 0;
      const totalAssessed = arrears + annual;
      const totalPaid = yearPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const balance = totalAssessed - totalPaid;
      return { year: yr, arrears, annual, totalAssessed, totalPaid, balance, paymentCount: yearPayments.length };
    });
  }, [availableYears, allAssessments, allPayments]);

  // Filtered payments for the selected view
  const displayPayments = useMemo(() => {
    if (selectedYear === 'ALL') {
      return [...allPayments].sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
    }
    return allPayments
      .filter(p => Number(p.assessment_year) === selectedYear)
      .sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());
  }, [allPayments, selectedYear]);

  // Current year assessment for the summary header
  const currentYear = new Date().getFullYear();
  const currentAssessment = allAssessments.find(a => a.year === currentYear);
  const currentYearPayments = allPayments.filter(p => Number(p.assessment_year) === currentYear);

  const arrears = currentAssessment ? Number(currentAssessment.arrears_brought_forward || 0) : 0;
  const annual = currentAssessment ? Number(currentAssessment.annual_assessment || 0) : 0;
  const totalAssessment = arrears + annual;
  const totalPaid = currentYearPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const outstanding = totalAssessment - totalPaid;

  // Lifetime totals
  const lifetimePaid = allPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

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
    <MemberShell title="Financial Ledger" subtitle="Your complete dues and payment records">
      <div style={{ display: 'grid', gap: 18, fontFamily: 'Inter, sans-serif', color: '#1E293B' }}>
        <Link href='/me' className="no-print" style={{ textDecoration: 'none', color: '#10233f', fontWeight: 700 }}>
          ← Back to Overview
        </Link>

        {/* Current Year Summary Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%)',
          borderRadius: 20,
          padding: '28px 32px',
          color: 'white',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.2)',
        }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: '#F59E0B', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            {currentYear} Commandery Dues Summary
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
              <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 800 }}>PAID THIS YEAR</div>
              <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'monospace', color: '#34D399' }}>
                {currencyFormat(totalPaid)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 800 }}>OUTSTANDING</div>
              <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'monospace', color: outstanding > 0 ? '#F87171' : '#34D399' }}>
                {currencyFormat(Math.max(0, outstanding))}
              </div>
            </div>
          </div>

          {/* Lifetime totals */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', marginTop: 20, paddingTop: 16, display: 'flex', flexWrap: 'wrap', gap: 32 }}>
            <div>
              <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 800 }}>LIFETIME TOTAL PAID</div>
              <div style={{ fontSize: 20, fontWeight: 900, fontFamily: 'monospace', color: '#10B981' }}>
                {currencyFormat(lifetimePaid)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 800 }}>YEARS ON RECORD</div>
              <div style={{ fontSize: 20, fontWeight: 900, fontFamily: 'monospace', color: '#FDE68A' }}>
                {availableYears.length} year{availableYears.length !== 1 ? 's' : ''}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 800 }}>TOTAL PAYMENTS</div>
              <div style={{ fontSize: 20, fontWeight: 900, fontFamily: 'monospace', color: '#FDE68A' }}>
                {allPayments.length} record{allPayments.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Year-by-Year Summary Table */}
        {availableYears.length > 0 && (
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ padding: '16px 24px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>📊 Year-by-Year Summary</h2>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Year</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Arrears B/F</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Assessment</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Total Due</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Total Paid</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Balance</th>
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

        {/* Year Filter Tabs */}
        <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#64748B', marginRight: 8 }}>View Payments:</span>
          <button style={pillBtn(selectedYear === 'ALL')} onClick={() => setSelectedYear('ALL')}>
            All Years
          </button>
          {availableYears.map(yr => (
            <button key={yr} style={pillBtn(selectedYear === yr)} onClick={() => setSelectedYear(yr)}>
              {yr}
            </button>
          ))}
        </div>

        {/* Detailed Payment Records Table */}
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ padding: '16px 24px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
              💳 Payment Records {selectedYear !== 'ALL' ? `(${selectedYear})` : '(All Years)'}
            </h2>
            <div style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>
              {displayPayments.length} record{displayPayments.length !== 1 ? 's' : ''}
              {' • '}
              Total: <strong style={{ color: '#166534' }}>{currencyFormat(displayPayments.reduce((s, p) => s + Number(p.amount || 0), 0))}</strong>
            </div>
          </div>

          {displayPayments.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#94A3B8' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>No payment records found {selectedYear !== 'ALL' ? `for ${selectedYear}` : ''}.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>#</th>
                    {selectedYear === 'ALL' && <th style={thStyle}>Year</th>}
                    <th style={thStyle}>Month / Category</th>
                    <th style={thStyle}>Payment Date</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {displayPayments.map((pay, idx) => {
                    const isVoluntary = (() => {
                      const m = String(pay.month || '').toLowerCase();
                      const t = String(pay.payment_type || pay.payment_category || '').toLowerCase();
                      return m.includes('voluntary') || m.includes('appeal') || m.includes('relief') || m.includes('donation') ||
                             t.includes('voluntary') || t.includes('appeal') || t.includes('relief') || t.includes('donation');
                    })();
                    return (
                      <tr key={pay.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ ...tdStyle, color: '#94A3B8', fontWeight: 600, width: 40 }}>
                          {selectedYear === 'ALL' ? displayPayments.length - idx : idx + 1}
                        </td>
                        {selectedYear === 'ALL' && (
                          <td style={{ ...tdStyle, fontWeight: 800, color: '#0F172A' }}>{pay.assessment_year}</td>
                        )}
                        <td style={{ ...tdStyle, fontWeight: 700, color: '#0F172A' }}>
                          {pay.month}
                          {isVoluntary && (
                            <span style={{ marginLeft: 8, fontSize: 10, background: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                              VOLUNTARY
                            </span>
                          )}
                        </td>
                        <td style={{ ...tdStyle, color: '#64748B' }}>
                          {formatDisplayDate(pay.payment_date)}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#166534' }}>
                          {currencyFormat(Number(pay.amount || 0))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#F0FDF4', borderTop: '2px solid #BBF7D0' }}>
                    <td colSpan={selectedYear === 'ALL' ? 4 : 3} style={{ ...tdStyle, fontWeight: 900, color: '#166534', textAlign: 'right' }}>
                      Total
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, color: '#166534', fontSize: 15 }}>
                      {currencyFormat(displayPayments.reduce((s, p) => s + Number(p.amount || 0), 0))}
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
