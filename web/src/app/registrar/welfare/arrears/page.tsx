'use client';

import React, { useEffect, useState } from 'react';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { getWelfareArrearsDetailedReport } from '@/services/welfareService';
import { WelfareArrearsReport, WelfareMemberArrearsItem } from '@/types/welfare';
import Link from 'next/link';

export default function WelfareArrearsPage() {
  const [report, setReport] = useState<WelfareArrearsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'delinquent' | 'current_year' | 'past_years' | 'exempt'>('all');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const data = await getWelfareArrearsDetailedReport();
      setReport(data);
    } catch (err) {
      console.error('Failed to load welfare arrears report:', err);
    } finally {
      setLoading(false);
    }
  }

  const downloadCSV = () => {
    if (!report || report.memberBreakdown.length === 0) return;
    const headers = [
      'Member Name',
      'Title',
      'Status',
      'Effective Start',
      'Past Years Expected (GHS)',
      'Past Years Paid (GHS)',
      'Past Years Arrears (GHS)',
      '2026 Expected (GHS)',
      '2026 Paid (GHS)',
      '2026 Arrears (GHS)',
      'Total Expected Cumulative (GHS)',
      'Total Paid Cumulative (GHS)',
      'Total Cumulative Arrears (GHS)',
      'Subscription Standing',
    ];

    const rows = report.memberBreakdown.map(m => [
      `"${m.name}"`,
      m.title,
      m.status,
      `"${m.joinLabel}"`,
      m.pastYearsExpected.toFixed(2),
      m.pastYearsPaid.toFixed(2),
      m.pastYearsArrears.toFixed(2),
      m.currentYearExpected.toFixed(2),
      m.currentYearPaid.toFixed(2),
      m.currentYearArrears.toFixed(2),
      m.totalExpected.toFixed(2),
      m.totalPaid.toFixed(2),
      m.cumulativeArrears.toFixed(2),
      m.isSeniorExempt ? 'Senior (80+ Exempt)' : m.isSubscriber ? 'Active Subscriber' : 'Inactive / In Arrears',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `welfare_arrears_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printReportPDF = () => {
    if (!report) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rowsHtml = report.memberBreakdown.map((m, idx) => `
      <tr style="border-bottom: 1px solid #E2E8F0; font-size: 11px;">
        <td style="padding: 8px;">${idx + 1}</td>
        <td style="padding: 8px; font-weight: bold;">${m.name}</td>
        <td style="padding: 8px; color: #64748B;">${m.joinLabel}</td>
        <td style="padding: 8px; text-align: right; font-family: monospace;">GH₵ ${m.pastYearsArrears.toFixed(2)}</td>
        <td style="padding: 8px; text-align: right; font-family: monospace;">GH₵ ${m.currentYearExpected.toFixed(2)}</td>
        <td style="padding: 8px; text-align: right; font-family: monospace; color: #166534;">GH₵ ${m.currentYearPaid.toFixed(2)}</td>
        <td style="padding: 8px; text-align: right; font-family: monospace; color: ${m.currentYearArrears > 0 ? '#DC2626' : '#166534'};">GH₵ ${m.currentYearArrears.toFixed(2)}</td>
        <td style="padding: 8px; text-align: right; font-family: monospace; font-weight: bold; color: ${m.cumulativeArrears > 0 ? '#DC2626' : '#166534'};">GH₵ ${m.cumulativeArrears.toFixed(2)}</td>
        <td style="padding: 8px; text-align: center;">
          <span style="padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; background: ${m.isSeniorExempt ? '#FEF3C7' : m.isSubscriber ? '#DCFCE7' : '#FEE2E2'}; color: ${m.isSeniorExempt ? '#92400E' : m.isSubscriber ? '#166534' : '#991B1B'};">
            ${m.isSeniorExempt ? 'Senior Exempt' : m.isSubscriber ? 'Active' : 'In Arrears'}
          </span>
        </td>
      </tr>
    `).join('');

    const yearlyRowsHtml = report.yearlyBreakdown.map(y => `
      <tr style="border-bottom: 1px solid #E2E8F0; font-size: 12px;">
        <td style="padding: 10px; font-weight: bold;">${y.year}</td>
        <td style="padding: 10px; text-align: right; font-family: monospace;">GH₵ ${y.monthlyRate.toFixed(2)}/mo</td>
        <td style="padding: 10px; text-align: right; font-family: monospace;">GH₵ ${y.expectedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 10px; text-align: right; font-family: monospace; color: #166534; font-weight: bold;">GH₵ ${y.collectedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 10px; text-align: right; font-family: monospace; color: ${y.arrearsTotal > 0 ? '#DC2626' : '#166534'}; font-weight: bold;">GH₵ ${y.arrearsTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 10px; text-align: right; font-weight: bold;">${y.complianceRate}%</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Commandery Welfare Arrears Report</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #10233F; }
            .header { text-align: center; border-bottom: 3px solid #C9A84C; padding-bottom: 16px; margin-bottom: 24px; }
            .header h1 { margin: 0; text-transform: uppercase; letter-spacing: 1px; font-size: 22px; }
            .header p { margin: 4px 0 0; color: #C9A84C; font-weight: bold; }
            .summary-box { display: flex; justify-content: space-around; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; margin-bottom: 24px; }
            .metric { text-align: center; }
            .metric-val { font-size: 18px; font-weight: 800; color: #10233F; font-family: monospace; }
            .metric-lbl { font-size: 11px; text-transform: uppercase; color: #64748B; font-weight: bold; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 14px; }
            th { text-align: left; padding: 10px 8px; background: #F1F5F9; border-bottom: 2px solid #10233F; font-size: 11px; text-transform: uppercase; }
            @page { size: landscape; margin: 1cm; }
          </style>
        </head>
        <body onload="window.print(); window.onafterprint = function() { window.close(); }">
          <div class="header">
            <h1>Knights of St. John International</h1>
            <p>Official Welfare Scheme Arrears & Yearly Collection Analysis</p>
            <div style="font-size: 12px; color: #64748B; margin-top: 6px;">Report Generated on: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          </div>

          <div class="summary-box">
            <div class="metric">
              <div class="metric-val" style="color: #DC2626;">GH₵ ${report.summary.totalCumulativeArrears.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              <div class="metric-lbl">Total Cumulative Arrears</div>
            </div>
            <div class="metric">
              <div class="metric-val" style="color: #EA580C;">GH₵ ${report.summary.currentYearArrears.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              <div class="metric-lbl">2026 Current Year Arrears</div>
            </div>
            <div class="metric">
              <div class="metric-val" style="color: #475569;">GH₵ ${report.summary.pastYearsArrears.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              <div class="metric-lbl">Past Years Rollover Arrears</div>
            </div>
            <div class="metric">
              <div class="metric-val" style="color: #166534;">GH₵ ${report.summary.totalPaidCumulative.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              <div class="metric-lbl">Total Collections (2022–Present)</div>
            </div>
            <div class="metric">
              <div class="metric-val">${report.summary.activeSubscribersCount} / ${report.summary.totalMembersCount}</div>
              <div class="metric-lbl">Active Subscribers</div>
            </div>
          </div>

          <h3 style="margin: 20px 0 8px; font-size: 14px; text-transform: uppercase;">1. Yearly Collection & Arrears Breakdown</h3>
          <table>
            <thead>
              <tr>
                <th>Year</th>
                <th style="text-align: right;">Rate</th>
                <th style="text-align: right;">Expected</th>
                <th style="text-align: right;">Collected</th>
                <th style="text-align: right;">Arrears</th>
                <th style="text-align: right;">Compliance</th>
              </tr>
            </thead>
            <tbody>
              ${yearlyRowsHtml}
            </tbody>
          </table>

          <h3 style="margin: 30px 0 8px; font-size: 14px; text-transform: uppercase;">2. Member Arrears Ledger</h3>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Member Name</th>
                <th>Effective Start</th>
                <th style="text-align: right;">Past Arrears (2022-25)</th>
                <th style="text-align: right;">2026 Expected</th>
                <th style="text-align: right;">2026 Paid</th>
                <th style="text-align: right;">2026 Arrears</th>
                <th style="text-align: right;">Cumulative Arrears</th>
                <th style="text-align: center;">Standing</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredMembers = (report?.memberBreakdown || []).filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.title.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (filterType === 'delinquent') return !m.isSeniorExempt && m.cumulativeArrears > 75.00;
    if (filterType === 'current_year') return !m.isSeniorExempt && m.currentYearArrears > 0;
    if (filterType === 'past_years') return !m.isSeniorExempt && m.pastYearsArrears > 0;
    if (filterType === 'exempt') return m.isSeniorExempt;
    return true;
  });

  return (
    <RegistrarShell
      title="Welfare Arrears & Delinquency Matrix"
      subtitle="Comprehensive breakdown of yearly arrears, current year obligations, and member delinquency aging"
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 60 }}>

        {/* Back Link */}
        <div style={{ marginBottom: 20 }}>
          <Link href="/registrar/welfare" style={{ color: '#0F172A', textDecoration: 'none', fontWeight: 700, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            ← Back to Welfare Hub
          </Link>
        </div>

        {/* Loading State */}
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', background: 'white', borderRadius: 16, border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: 24, marginBottom: 12 }}>⏳</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#334155' }}>Calculating yearly arrears and member balances...</div>
            <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>Applying cohort start dates and 80+ senior exemptions</div>
          </div>
        ) : !report ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#EF4444' }}>Failed to load arrears report.</div>
        ) : (
          <>
            {/* Top KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 28 }}>
              
              <div style={kpiCardStyle('#DC2626')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: '#DC2626', letterSpacing: '0.5px' }}>
                      Total Cumulative Arrears
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: '#0F172A', fontFamily: 'monospace', marginTop: 6 }}>
                      GH₵ {report.summary.totalCumulativeArrears.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <span style={{ fontSize: 24 }}>📉</span>
                </div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 10 }}>
                  Total unpaid welfare dues across all members (2022–present)
                </div>
              </div>

              <div style={kpiCardStyle('#EA580C')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: '#EA580C', letterSpacing: '0.5px' }}>
                      2026 Current Year Arrears
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: '#EA580C', fontFamily: 'monospace', marginTop: 6 }}>
                      GH₵ {report.summary.currentYearArrears.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <span style={{ fontSize: 24 }}>📅</span>
                </div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 10 }}>
                  Uncollected dues for the current 2026 calendar period
                </div>
              </div>

              <div style={kpiCardStyle('#475569')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.5px' }}>
                      Past Years Rollover Arrears
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: '#334155', fontFamily: 'monospace', marginTop: 6 }}>
                      GH₵ {report.summary.pastYearsArrears.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <span style={{ fontSize: 24 }}>🏛️</span>
                </div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 10 }}>
                  Unpaid dues carried forward from previous years (2022–2025)
                </div>
              </div>

              <div style={kpiCardStyle('#166534')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: '#166534', letterSpacing: '0.5px' }}>
                      Active Subscriber Health
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: '#166534', marginTop: 6 }}>
                      {report.summary.activeSubscribersCount} <span style={{ fontSize: 14, fontWeight: 600, color: '#64748B' }}>/ {report.summary.totalMembersCount}</span>
                    </div>
                  </div>
                  <span style={{ fontSize: 24 }}>🤝</span>
                </div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 10 }}>
                  {report.summary.delinquentCount} members currently in arrears (&gt; 3 months)
                </div>
              </div>

            </div>

            {/* Yearly Breakdown Table */}
            <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', padding: 24, marginBottom: 32, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    📊 Year-by-Year Welfare Collection & Arrears Matrix (2022 – 2026)
                  </h3>
                  <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
                    Annual billing obligations, amounts collected, and outstanding arrears per calendar year
                  </p>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#475569', textAlign: 'left' }}>
                      <th style={{ padding: '12px 16px' }}>Year</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Monthly Rate</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Expected Subscriptions</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Collected Subscriptions</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Outstanding Arrears</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Compliance Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.yearlyBreakdown.map(y => (
                      <tr key={y.year} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '14px 16px', fontWeight: 800, color: '#0F172A' }}>
                          {y.year} {y.year === new Date().getFullYear() ? <span style={{ fontSize: 11, background: '#DCFCE7', color: '#166534', padding: '2px 8px', borderRadius: 100, fontWeight: 700, marginLeft: 6 }}>Current Year</span> : null}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', color: '#64748B', fontFamily: 'monospace' }}>
                          GH₵ {y.monthlyRate.toFixed(2)}/mo
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>
                          GH₵ {y.expectedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 800, color: '#166534', fontFamily: 'monospace' }}>
                          GH₵ {y.collectedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 900, color: y.arrearsTotal > 0 ? '#DC2626' : '#166534', fontFamily: 'monospace' }}>
                          GH₵ {y.arrearsTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                            <div style={{ width: 60, height: 8, background: '#E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
                              <div style={{ width: `${y.complianceRate}%`, height: '100%', background: y.complianceRate >= 80 ? '#10B981' : y.complianceRate >= 50 ? '#F59E0B' : '#EF4444' }}></div>
                            </div>
                            <span style={{ fontWeight: 800, fontSize: 13, minWidth: 36, textAlign: 'right' }}>{y.complianceRate}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#F8FAFC', borderTop: '2px solid #CBD5E1', fontWeight: 900 }}>
                      <td style={{ padding: '14px 16px' }}>TOTAL CUMULATIVE</td>
                      <td style={{ padding: '14px 16px' }}></td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'monospace' }}>
                        GH₵ {report.summary.totalExpectedCumulative.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: '#166534', fontFamily: 'monospace' }}>
                        GH₵ {report.summary.totalPaidCumulative.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: '#DC2626', fontFamily: 'monospace' }}>
                        GH₵ {report.summary.totalCumulativeArrears.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: '#0F172A' }}>
                        {report.summary.totalExpectedCumulative > 0 ? Math.round((report.summary.totalPaidCumulative / report.summary.totalExpectedCumulative) * 100) : 100}%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Member Arrears Ledger */}
            <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              
              {/* Header & Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    👥 Member Arrears Breakdown Ledger
                  </h3>
                  <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
                    Individual member arrears split by Past Years (2022–2025) and 2026 Current Year obligations
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <button
                    onClick={downloadCSV}
                    style={{
                      background: 'white',
                      border: '1px solid #CBD5E1',
                      padding: '8px 16px',
                      borderRadius: 8,
                      fontWeight: 700,
                      color: '#334155',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 13,
                    }}
                  >
                    📥 Export CSV
                  </button>

                  <button
                    onClick={printReportPDF}
                    style={{
                      background: '#10233F',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: 8,
                      fontWeight: 700,
                      color: '#D4AF37',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 13,
                    }}
                  >
                    🖨️ Print Arrears Report
                  </button>
                </div>
              </div>

              {/* Filters & Search */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
                <div style={{ position: 'relative', width: 300 }}>
                  <input
                    type="text"
                    placeholder="Search member name or title..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 14px 8px 34px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                  <span style={{ position: 'absolute', left: 10, top: 8, color: '#94A3B8' }}>🔍</span>
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[
                    { key: 'all', label: `All Members (${report.memberBreakdown.length})` },
                    { key: 'delinquent', label: `In Arrears > 3 Mos (${report.summary.delinquentCount})` },
                    { key: 'past_years', label: 'Has Past Years Arrears' },
                    { key: 'current_year', label: '2026 Arrears Only' },
                    { key: 'exempt', label: `80+ Exempt (${report.summary.seniorExemptCount})` },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setFilterType(tab.key as any)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: '1px solid',
                        borderColor: filterType === tab.key ? '#0F172A' : '#E2E8F0',
                        background: filterType === tab.key ? '#0F172A' : '#F8FAFC',
                        color: filterType === tab.key ? 'white' : '#475569',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Members Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', textAlign: 'left' }}>
                      <th style={{ padding: '12px 14px' }}>Member</th>
                      <th style={{ padding: '12px 14px' }}>Effective Start</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right' }}>Past Arrears (2022-25)</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right' }}>2026 Expected</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right' }}>2026 Paid</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right' }}>2026 Arrears</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right' }}>Total Cumulative Arrears</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>Standing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>
                          No members match the selected filter.
                        </td>
                      </tr>
                    ) : (
                      filteredMembers.map(m => (
                        <tr key={m.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0F172A' }}>
                            {m.title} {m.name}
                          </td>
                          <td style={{ padding: '12px 14px', color: '#64748B', fontSize: 12 }}>
                            {m.joinLabel}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace', color: m.pastYearsArrears > 0 ? '#DC2626' : '#64748B' }}>
                            GH₵ {m.pastYearsArrears.toFixed(2)}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace', color: '#475569' }}>
                            GH₵ {m.currentYearExpected.toFixed(2)}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace', color: '#166534', fontWeight: 700 }}>
                            GH₵ {m.currentYearPaid.toFixed(2)}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: m.currentYearArrears > 0 ? '#EA580C' : '#166534' }}>
                            GH₵ {m.currentYearArrears.toFixed(2)}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, fontSize: 14, color: m.cumulativeArrears > 0 ? '#DC2626' : '#166534' }}>
                            GH₵ {m.cumulativeArrears.toFixed(2)}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 10px',
                              borderRadius: 100,
                              fontSize: 11,
                              fontWeight: 800,
                              background: m.isSeniorExempt ? '#FEF3C7' : m.isSubscriber ? '#DCFCE7' : '#FEE2E2',
                              color: m.isSeniorExempt ? '#92400E' : m.isSubscriber ? '#166534' : '#991B1B',
                            }}>
                              {m.isSeniorExempt ? '👴 80+ Exempt' : m.isSubscriber ? '✅ Active Subscriber' : '⚠️ In Arrears'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </>
        )}

      </div>
    </RegistrarShell>
  );
}

function kpiCardStyle(accentColor: string): React.CSSProperties {
  return {
    background: 'white',
    borderRadius: 16,
    padding: 20,
    border: '1px solid #E2E8F0',
    borderLeft: `5px solid ${accentColor}`,
    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
  };
}
