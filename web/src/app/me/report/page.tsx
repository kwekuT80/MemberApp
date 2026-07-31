import React from 'react';
import Link from 'next/link';
import MemberShell from '@/components/layout/MemberShell';
import EmptyState from '@/components/shared/EmptyState';
import { requireUser } from '@/lib/auth/requireUser';
import { getMyMember, getMemberPersonalReport } from '@/services/memberService';
import PrintReportButton from '@/components/reports/PrintReportButton';

export default async function PersonalReportPage() {
  await requireUser();
  const myMember = await getMyMember();

  if (!myMember) {
    return (
      <MemberShell title="Personal Standing Report" subtitle="Official Member Standing & Financial/Welfare Statement">
        <EmptyState message="Unable to locate your member profile." />
      </MemberShell>
    );
  }

  const report = await getMemberPersonalReport(myMember.id);

  if (!report) {
    return (
      <MemberShell title="Personal Standing Report" subtitle="Official Member Standing & Financial/Welfare Statement">
        <EmptyState message="Could not compile report data for your member record." />
      </MemberShell>
    );
  }

  const { member, standing, standingReason, financial, welfare } = report;
  const isGoodStanding = standing === 'In Good Standing';

  const formatCurrency = (val: number) =>
    `GH₵ ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <MemberShell
      title="Personal Standing & Financial Report"
      subtitle="Official statement of standing, annual dues, and welfare benefits"
    >
      <div style={{ maxWidth: 960, margin: '0 auto', paddingBottom: 48, fontFamily: 'Inter, sans-serif' }}>
        
        {/* Navigation Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Link href="/me" style={{ textDecoration: 'none', color: '#1E293B', fontWeight: 700, fontSize: 14 }}>
            ← Back to Overview
          </Link>
          <PrintReportButton />
        </div>

        {/* Hero Card: Standing in the Order */}
        <div style={{
          background: isGoodStanding 
            ? 'linear-gradient(135deg, #064E3B 0%, #047857 100%)' 
            : 'linear-gradient(135deg, #78350F 0%, #B45309 100%)',
          borderRadius: 20,
          padding: '32px 36px',
          color: 'white',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
          marginBottom: 32,
        }}>
          <div style={{ color: '#FCD34D', fontSize: 12, fontWeight: 900, letterSpacing: 1.5, textTransform: 'uppercase' }}>
            KNIGHTS OF ST. JOHN INTERNATIONAL • STANDING REPORT
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20, marginTop: 12 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>
                {member.title ? `${member.title} ` : ''}{member.first_name} {member.surname}
              </h1>
              <div style={{ fontSize: 14, opacity: 0.9, marginTop: 4 }}>
                Member Status: <span style={{ fontWeight: 800 }}>{member.status}</span> • Reg Year: {financial.currentYear}
              </div>
            </div>

            {/* Binary Standing Badge */}
            <div style={{
              background: isGoodStanding ? '#10B981' : '#F59E0B',
              color: isGoodStanding ? '#064E3B' : '#78350F',
              padding: '12px 24px',
              borderRadius: 50,
              fontSize: 16,
              fontWeight: 900,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}>
              <span>{isGoodStanding ? '✓' : '⚠️'}</span>
              <span>{standing}</span>
            </div>
          </div>

          <div style={{ 
            marginTop: 24, 
            paddingTop: 16, 
            borderTop: '1px solid rgba(255,255,255,0.2)',
            fontSize: 13,
            lineHeight: 1.5,
            opacity: 0.95
          }}>
            {standingReason}
          </div>
        </div>

        {/* Section 1: Financial Dues Breakdown */}
        <div style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0F172A', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            💳 Annual Financial Ledger ({financial.currentYear})
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div style={metricCardStyle}>
              <div style={metricLabelStyle}>ACCOUNT BALANCE (LAST YEAR)</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', fontFamily: 'monospace' }}>
                {formatCurrency(financial.lastYearArrears)}
              </div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>Arrears B/F</div>
            </div>

            <div style={metricCardStyle}>
              <div style={metricLabelStyle}>CURRENT YEAR ASSESSMENT</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#2563EB', fontFamily: 'monospace' }}>
                {formatCurrency(financial.currentAssessment)}
              </div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>{financial.currentYear} Dues</div>
            </div>

            <div style={metricCardStyle}>
              <div style={metricLabelStyle}>PAYMENTS THIS YEAR</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#10B981', fontFamily: 'monospace' }}>
                {formatCurrency(financial.paymentsThisYear)}
              </div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>Total Paid Received</div>
            </div>

            <div style={{
              ...metricCardStyle,
              background: financial.creditBalance > 0 ? '#EFF6FF' : (financial.outstandingThisYear > 0 ? '#FEF2F2' : '#F0FDF4'),
              borderColor: financial.creditBalance > 0 ? '#BFDBFE' : (financial.outstandingThisYear > 0 ? '#FECACA' : '#BBF7D0'),
            }}>
              <div style={{
                ...metricLabelStyle,
                color: financial.creditBalance > 0 ? '#1E40AF' : (financial.outstandingThisYear > 0 ? '#991B1B' : '#166534')
              }}>
                {financial.creditBalance > 0 ? '💳 CREDIT BALANCE' : 'ACCOUNT BALANCE'}
              </div>
              <div style={{
                fontSize: 22,
                fontWeight: 900,
                color: financial.creditBalance > 0 ? '#2563EB' : (financial.outstandingThisYear > 0 ? '#DC2626' : '#166534'),
                fontFamily: 'monospace'
              }}>
                {financial.creditBalance > 0 ? formatCurrency(financial.creditBalance) : formatCurrency(financial.outstandingThisYear)}
              </div>
              <div style={{
                fontSize: 11,
                fontWeight: 800,
                color: financial.creditBalance > 0 ? '#1E40AF' : (financial.outstandingThisYear > 0 ? '#991B1B' : '#166534'),
                marginTop: 4
              }}>
                {financial.creditBalance > 0 ? '✨ Advance Credit Available' : `Status: ${financial.yearStatus}`}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Welfare Scheme Statement */}
        <div style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0F172A', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            🤝 Commandery Welfare Scheme
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div style={metricCardStyle}>
              <div style={metricLabelStyle}>PREVIOUS YEAR WELFARE BALANCE</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', fontFamily: 'monospace' }}>
                {formatCurrency(welfare.lastYearBalance)}
              </div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>Unpaid Welfare B/F</div>
            </div>

            <div style={metricCardStyle}>
              <div style={metricLabelStyle}>CURRENT YEAR WELFARE DUES</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#2563EB', fontFamily: 'monospace' }}>
                {formatCurrency(welfare.currentAssessment)}
              </div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                {formatCurrency(welfare.monthlyRate)}/mo × 12 months
              </div>
            </div>

            <div style={metricCardStyle}>
              <div style={metricLabelStyle}>WELFARE CONTRIBUTIONS THIS YEAR</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#10B981', fontFamily: 'monospace' }}>
                {formatCurrency(welfare.contributionsThisYear)}
              </div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>Paid Received</div>
            </div>
          </div>

          {/* Received Benefits / Claims Table */}
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: '#0F172A' }}>
                🎁 Received Benefits & Claims History
              </h3>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#F59E0B' }}>
                Total Paid Payouts: {formatCurrency(welfare.totalBenefitsReceived)}
              </div>
            </div>

            {welfare.disbursements.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
                No welfare benefit claims or payouts received.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#F1F5F9', color: '#475569', textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px' }}>Category / Benefit</th>
                    <th style={{ padding: '12px 16px' }}>Disbursement Date</th>
                    <th style={{ padding: '12px 16px' }}>Notes / Reference</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Amount Received</th>
                  </tr>
                </thead>
                <tbody>
                  {welfare.disbursements.map((d: any) => (
                    <tr key={d.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 800, color: '#0F172A' }}>{d.category_name}</td>
                      <td style={{ padding: '14px 16px', color: '#64748B' }}>
                        {new Date(d.disbursement_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#64748B' }}>{d.notes || 'Standard Payout'}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 900, color: '#D97706', fontFamily: 'monospace' }}>
                        {formatCurrency(Number(d.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </MemberShell>
  );
}

const metricCardStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: 16,
  border: '1px solid #E2E8F0',
  padding: 20,
  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
};

const metricLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  color: '#64748B',
  letterSpacing: 0.8,
  marginBottom: 6,
};
