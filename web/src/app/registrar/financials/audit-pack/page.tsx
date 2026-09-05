'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { createClient } from '@/lib/supabase/client';
import PrintReportButton from '@/components/reports/PrintReportButton';

export default function AuditPackPage() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Financial Metrics State
  const [year, setYear] = useState(new Date().getFullYear());
  const [membersCount, setMembersCount] = useState(0);
  const [duesAssessed, setDuesAssessed] = useState(0);
  const [duesCollected, setDuesCollected] = useState(0);
  const [welfareCollected, setWelfareCollected] = useState(0);
  const [voluntaryCollected, setVoluntaryCollected] = useState(0);
  const [welfarePayouts, setWelfarePayouts] = useState(0);
  const [delinquentCount, setDelinquentCount] = useState(0);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (prof) setRole(prof.role);
      }

      // Fetch active members count (excluding Deceased/Dismissed per business rules)
      const { count } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .not('status', 'in', '("Dismissed","Transfer-Out","Deceased","System")')
        .eq('is_deceased', false);

      setMembersCount(count || 0);

      // Fetch Dues Assessments for current year
      const { data: ass } = await supabase
        .from('financial_assessments')
        .select('annual_assessment, arrears_brought_forward')
        .eq('year', year);

      if (ass) {
        const total = ass.reduce((sum, a) => sum + Number(a.annual_assessment || 0) + Number(a.arrears_brought_forward || 0), 0);
        setDuesAssessed(total);
      }

      // Fetch All Financial Payments for current year
      const { data: pays } = await supabase
        .from('financial_payments')
        .select('*')
        .eq('assessment_year', year);

      if (pays) {
        const isVol = (p: any) => {
          const m = String(p.month || '').toLowerCase();
          return m.includes('voluntary') || m.includes('appeal') || m.includes('relief') || m.includes('donation');
        };

        const dues = pays.filter(p => !isVol(p)).reduce((sum, p) => sum + Number(p.amount || 0), 0);
        const vol = pays.filter(p => isVol(p)).reduce((sum, p) => sum + Number(p.amount || 0), 0);

        setDuesCollected(dues);
        setVoluntaryCollected(vol);
      }

      // Fetch Welfare Contributions for current year
      const { data: wContribs } = await supabase
        .from('welfare_contributions')
        .select('amount')
        .eq('period_year', year);

      if (wContribs) {
        const wTotal = wContribs.reduce((sum, c) => sum + Number(c.amount || 0), 0);
        setWelfareCollected(wTotal);
      }

      // Fetch Welfare Disbursements for current audit year
      const { data: wDisbs } = await supabase
        .from('welfare_disbursements')
        .select('amount, disbursement_date, category_name');

      if (wDisbs) {
        const yearDisbursements = wDisbs.filter((d: any) => {
          if (!d.disbursement_date) return false;
          const dYear = new Date(d.disbursement_date).getFullYear();
          if (dYear !== year) return false;

          // Exclude operational / administrative expenses
          const catName = (d.category_name || '').toLowerCase();
          const isExpense = catName.includes('operational') ||
            catName.includes('logistics') ||
            catName.includes('printing') ||
            catName.includes('stationery') ||
            catName.includes('bank') ||
            catName.includes('fee') ||
            catName.includes('charge');

          return !isExpense;
        });

        const pTotal = yearDisbursements.reduce((sum: number, d: any) => sum + Number(d.amount || 0), 0);
        setWelfarePayouts(pTotal);
      } else {
        setWelfarePayouts(0);
      }

      setLoading(false);
    }
    load();
  }, [year]);

  const formatCurrency = (val: number) =>
    `GH₵ ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const isFinancialRegistrar = role === 'financial_registrar' || role === 'super_admin';
  const isWelfareTreasurer = role === 'welfare_treasurer' || role === 'super_admin';
  const hasAccess = isFinancialRegistrar || isWelfareTreasurer;

  if (loading) {
    return (
      <RegistrarShell title="Executive Audit Pack" subtitle="Compiling financial statements">
        <div style={{ textAlign: 'center', padding: 48, color: '#64748B' }}>Preparing Audit Pack...</div>
      </RegistrarShell>
    );
  }

  if (!hasAccess) {
    return (
      <RegistrarShell title="Access Restricted" subtitle="Executive Audit Pack">
        <div style={{ padding: 40, textAlign: 'center', color: '#991B1B', background: '#FEE2E2', borderRadius: 16 }}>
          ⛔ Access Restricted: The Executive Audit Pack is reserved for <strong>Financial Secretary</strong>, <strong>Welfare Treasurer</strong>, and <strong>Super Admin</strong>.
        </div>
      </RegistrarShell>
    );
  }

  const netDuesBalance = Math.max(0, duesAssessed - duesCollected);
  const duesComplianceRate = duesAssessed > 0 ? Math.min(100, Math.round((duesCollected / duesAssessed) * 100)) : 100;
  const grandTotalCollected = duesCollected + welfareCollected + voluntaryCollected;

  return (
    <RegistrarShell title="Executive Financial Audit Pack" subtitle="Official Commandery Financial Reconciliation & Audit Statement">
      <div style={{ maxWidth: 960, margin: '0 auto', paddingBottom: 48, fontFamily: 'Inter, sans-serif' }}>
        
        {/* Navigation & Print Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }} className="no-print">
          <Link href="/registrar/financials" style={{ textDecoration: 'none', color: '#1E293B', fontWeight: 700, fontSize: 14 }}>
            ← Back to Financial Hub
          </Link>
          <PrintReportButton />
        </div>

        {/* PRINTABLE AUDIT PACK DOCUMENT */}
        <div id="dossier-print" style={{ background: 'white', padding: '40px 50px', borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          
          {/* Header Block */}
          <div style={{ textAlign: 'center', borderBottom: '2px solid #10233F', paddingBottom: 20, marginBottom: 32 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: '#D4AF37', letterSpacing: 2, textTransform: 'uppercase' }}>
              KNIGHTS OF ST. JOHN INTERNATIONAL • COMMANDERY FINANCIAL AUDIT PACK
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#10233F', margin: '8px 0 4px' }}>
              Executive Financial Statement & Reconciliation Report
            </h1>
            <div style={{ fontSize: 14, color: '#475569', fontWeight: 700 }}>
              Fiscal Year: {year} • Active Membership Roll: {membersCount} Members
            </div>
          </div>

          {/* Section I: Executive Collection Summary */}
          <section style={{ marginBottom: 36 }}>
            <h2 style={sectionLabelStyle}>I. Executive Funds Summary ({year})</h2>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={tableHeaderStyle}>Fund Category</th>
                  <th style={tableHeaderStyle}>Administering Officer</th>
                  <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Total Collections</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ ...tdStyle, fontWeight: 800, color: '#0F172A' }}>💳 Annual Assessment Dues</td>
                  <td style={tdStyle}>Financial Secretary</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 900, fontFamily: 'monospace', color: '#2563EB' }}>
                    {formatCurrency(duesCollected)}
                  </td>
                </tr>
                <tr>
                  <td style={{ ...tdStyle, fontWeight: 800, color: '#0F172A' }}>🤝 Commandery Welfare Fund</td>
                  <td style={tdStyle}>Welfare Treasurer</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 900, fontFamily: 'monospace', color: '#166534' }}>
                    {formatCurrency(welfareCollected)}
                  </td>
                </tr>
                <tr>
                  <td style={{ ...tdStyle, fontWeight: 800, color: '#0F172A' }}>❤️ Voluntary Member Relief & Special Appeals</td>
                  <td style={tdStyle}>Financial Secretary</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 900, fontFamily: 'monospace', color: '#6D28D9' }}>
                    {formatCurrency(voluntaryCollected)}
                  </td>
                </tr>
                <tr style={{ background: '#F8FAFC' }}>
                  <td colSpan={2} style={{ ...tdStyle, fontWeight: 900, textAlign: 'right', color: '#1E293B' }}>
                    GRAND TOTAL FUNDS COLLECTED ({year}):
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 900, fontFamily: 'monospace', fontSize: 16, color: '#10233F' }}>
                    {formatCurrency(grandTotalCollected)}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Section II: Assessment Dues Reconciliation */}
          <section style={{ marginBottom: 36 }}>
            <h2 style={sectionLabelStyle}>II. Assessment Dues Ledger Reconciliation</h2>
            <table style={tableStyle}>
              <tbody>
                <tr>
                  <th style={thStyle}>Total Billing Assessed</th>
                  <td style={{ ...tdStyle, fontWeight: 800 }}>{formatCurrency(duesAssessed)}</td>
                  <th style={thStyle}>Dues Collection Compliance Rate</th>
                  <td style={{ ...tdStyle, fontWeight: 900, color: duesComplianceRate >= 70 ? '#166534' : '#B91C1C' }}>
                    {duesComplianceRate}% Settlement
                  </td>
                </tr>
                <tr>
                  <th style={thStyle}>Assessment Dues Collected</th>
                  <td style={{ ...tdStyle, fontWeight: 800, color: '#166534' }}>{formatCurrency(duesCollected)}</td>
                  <th style={thStyle}>Net Outstanding Dues Balance</th>
                  <td style={{ ...tdStyle, fontWeight: 900, color: netDuesBalance > 0 ? '#B91C1C' : '#166534' }}>
                    {formatCurrency(netDuesBalance)}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Section III: Welfare Scheme Financial Statement */}
          <section style={{ marginBottom: 36 }}>
            <h2 style={sectionLabelStyle}>III. Welfare Scheme Financial Statement</h2>
            <table style={tableStyle}>
              <tbody>
                <tr>
                  <th style={thStyle}>Total Welfare Contributions</th>
                  <td style={{ ...tdStyle, fontWeight: 800, color: '#166534' }}>{formatCurrency(welfareCollected)}</td>
                  <th style={thStyle}>Total Disbursed Member Benefits</th>
                  <td style={{ ...tdStyle, fontWeight: 800, color: '#D97706' }}>{formatCurrency(welfarePayouts)}</td>
                </tr>
                <tr>
                  <th style={thStyle}>Net Welfare Reserve Position</th>
                  <td colSpan={3} style={{ ...tdStyle, fontWeight: 900, color: '#166534' }}>
                    {formatCurrency(Math.max(0, welfareCollected - welfarePayouts))}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Section IV: Official Audit Sign-Off Block */}
          <section style={{ marginTop: 50, paddingTop: 20, borderTop: '2px dashed #CBD5E1' }}>
            <h2 style={sectionLabelStyle}>IV. Official Commandery Audit Sign-Off</h2>
            <p style={{ fontSize: 12, color: '#64748B', marginBottom: 32 }}>
              We, the undersigned officers and appointed Auditor Trustee of the Commandery, hereby certify that the financial ledgers, welfare statement, and voluntary relief logs contained in this Audit Pack have been reconciled and verified against official bank records.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '40px 30px' }}>
              
              {/* Sign-off 1: Financial Secretary */}
              <div style={{ borderTop: '1px solid #0F172A', paddingTop: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: '#0F172A' }}>Financial Secretary</div>
                <div style={{ fontSize: 11, color: '#64748B' }}>Signature & Date (Assessment Dues & Voluntary Relief)</div>
              </div>

              {/* Sign-off 2: Welfare Treasurer */}
              <div style={{ borderTop: '1px solid #0F172A', paddingTop: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: '#0F172A' }}>Welfare Treasurer</div>
                <div style={{ fontSize: 11, color: '#64748B' }}>Signature & Date (Welfare Scheme Statement)</div>
              </div>

              {/* Sign-off 3: Commandery President */}
              <div style={{ borderTop: '1px solid #0F172A', paddingTop: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: '#0F172A' }}>Commandery President</div>
                <div style={{ fontSize: 11, color: '#64748B' }}>Signature & Date (Commandery Executive Approval)</div>
              </div>

              {/* Sign-off 4: Commandery Trustee / Auditor */}
              <div style={{ borderTop: '1px solid #0F172A', paddingTop: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: '#0F172A' }}>Commandery Trustee / Auditor</div>
                <div style={{ fontSize: 11, color: '#64748B' }}>Signature & Date (Audit & Board Verification)</div>
              </div>

            </div>
          </section>

          <div style={{ marginTop: 48, textAlign: 'center', color: '#94A3B8', fontSize: 11, fontStyle: 'italic' }}>
            Generated by KSJI Registrar Suite • {new Date().toLocaleString('en-GB')}
          </div>

        </div>
      </div>
    </RegistrarShell>
  );
}

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 15,
  color: '#10233F',
  fontWeight: 900,
  marginBottom: 12,
  borderLeft: '4px solid #D4AF37',
  paddingLeft: 10
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 13
};

const tableHeaderStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  background: '#10233F',
  color: 'white',
  border: '1px solid #10233F',
  fontWeight: 800
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  background: '#F8FAFC',
  border: '1px solid #E2E8F0',
  color: '#475569',
  width: '25%',
  fontWeight: 700
};

const tdStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  border: '1px solid #E2E8F0',
  color: '#1E293B'
};
