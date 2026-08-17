'use client';

import React from 'react';
import { PersonalReportData } from '@/services/memberService';
import { formatDisplayDate, formatMemberTitle } from '@/lib/utils/ksji-logic';
import DuesBenchmarkTracker from '@/components/financials/DuesBenchmarkTracker';

interface StandingCertificateCardProps {
  report: PersonalReportData;
  showBenchmarks?: boolean;
  showSignatureBlock?: boolean;
}

export default function StandingCertificateCard({
  report,
  showBenchmarks = true,
  showSignatureBlock = true,
}: StandingCertificateCardProps) {
  const { member, standing, standingReason, financialStanding, welfareStanding, financial, welfare, attendance } = report;

  const isGoodStanding = standing === 'In Good Standing';
  const isFinancialGood = financialStanding === 'In Good Standing';
  const isWelfareGood = welfareStanding === 'In Good Standing';
  const isDeceased = member.is_deceased === true || String(member.status || '').toLowerCase() === 'deceased';

  const formatCurrency = (val: number) =>
    `GH₵ ${(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const displayTitle = formatMemberTitle(member.title);

  return (
    <div
      className="standing-cert-page"
      style={{
        background: '#FFFFFF',
        borderRadius: 16,
        border: '1px solid #E2E8F0',
        padding: '36px 44px',
        marginBottom: 36,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
        pageBreakAfter: 'always',
        breakAfter: 'page',
        position: 'relative',
        color: '#0F172A',
        fontFamily: 'Inter, sans-serif'
      }}
    >
      {/* Official Header */}
      <div style={{ textAlign: 'center', borderBottom: '2px solid #0F172A', paddingBottom: 18, marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 900, color: '#D4AF37', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>
          Knights of St. John International
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>
          Official Statement of Good Standing
        </h2>
        <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
          St. Margaret-Mary Commandery No. 500 • Personal Standing & Financial Audit Record
        </div>
      </div>

      {/* Hero Header: Member Credentials & Standing Badge */}
      <div
        style={{
          background: isDeceased
            ? 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)'
            : isGoodStanding
            ? 'linear-gradient(135deg, #064E3B 0%, #047857 100%)'
            : 'linear-gradient(135deg, #78350F 0%, #B45309 100%)',
          borderRadius: 14,
          padding: '20px 24px',
          color: 'white',
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: isDeceased ? '#FDE047' : '#FCD34D', letterSpacing: 1, textTransform: 'uppercase' }}>
            Member Record
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: '2px 0 0', color: 'white', display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
            <span>{displayTitle} {member.first_name} {member.surname}</span>
            {member.occupation && (
              <span style={{ fontSize: '0.65em', fontWeight: 600, opacity: 0.95, color: isDeceased ? '#FDE047' : '#FEF08A' }}>
                ({member.occupation})
              </span>
            )}
          </h1>
          <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>
            Status: <strong style={{ color: 'white' }}>{isDeceased ? 'Deceased (Roll of Honor)' : member.status}</strong>
            {member.phone ? ` • ${member.phone}` : ''}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              background: isDeceased ? '#312E81' : isGoodStanding ? '#10B981' : '#F59E0B',
              color: isDeceased ? '#FDE047' : isGoodStanding ? '#064E3B' : '#78350F',
              padding: '8px 20px',
              borderRadius: 30,
              fontSize: 14,
              fontWeight: 900,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}
          >
            <span>{isDeceased ? '🕯️' : isGoodStanding ? '✓' : '⚠️'}</span>
            <span>{isDeceased ? 'Exempt (Roll of Honor)' : `Overall: ${standing}`}</span>
          </div>
          {!isDeceased && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'flex-end' }}>
              <span
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  padding: '3px 10px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 800,
                  color: isFinancialGood ? '#A7F3D0' : '#FDE68A'
                }}
              >
                Dues: {financialStanding}
              </span>
              <span
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  padding: '3px 10px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 800,
                  color: isWelfareGood ? '#A7F3D0' : '#FDE68A'
                }}
              >
                Welfare: {welfareStanding}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Standing Reason Summary Note */}
      <div
        style={{
          background: '#F8FAFC',
          borderLeft: `4px solid ${isDeceased ? '#6366F1' : isGoodStanding ? '#10B981' : '#F59E0B'}`,
          padding: '12px 16px',
          borderRadius: 8,
          fontSize: 12.5,
          color: '#334155',
          marginBottom: 24,
          lineHeight: 1.5
        }}
      >
        <strong>Standing Evaluation: </strong>
        {standingReason}
      </div>

      {/* Visual Benchmark Tracker (for Active Members) */}
      {showBenchmarks && !isDeceased && (
        <div style={{ marginBottom: 24 }}>
          <DuesBenchmarkTracker
            currentYear={financial.currentYear}
            currentMonth={financial.currentMonth}
            lastYearArrears={financial.lastYearArrears}
            currentAssessment={financial.currentAssessment}
            totalAssessed={financial.totalAssessed}
            paymentsThisYear={financial.paymentsThisYear}
            requiredDuesThreshold={financial.requiredDuesThreshold}
            standing={standing}
          />
        </div>
      )}

      {/* Section 1: Financial Annual Dues Breakdown */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 900, color: '#0F172A', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #E2E8F0', paddingBottom: 6, marginBottom: 12 }}>
          1. Annual Financial Dues ({financial.currentYear})
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <tbody>
            <tr style={{ background: '#F8FAFC' }}>
              <th style={{ ...thStyle, width: '25%' }}>Arrears Brought Forward</th>
              <td style={{ ...tdStyle, width: '25%', fontFamily: 'monospace', fontWeight: 700 }}>{formatCurrency(financial.lastYearArrears)}</td>
              <th style={{ ...thStyle, width: '25%' }}>Annual Assessment ({financial.currentYear})</th>
              <td style={{ ...tdStyle, width: '25%', fontFamily: 'monospace', fontWeight: 700 }}>{formatCurrency(financial.currentAssessment)}</td>
            </tr>
            <tr>
              <th style={thStyle}>Total Dues Assessed</th>
              <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 800 }}>{formatCurrency(financial.totalAssessed)}</td>
              <th style={thStyle}>Paid This Year</th>
              <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 800, color: '#16A34A' }}>{formatCurrency(financial.paymentsThisYear)}</td>
            </tr>
            <tr style={{ background: '#F8FAFC' }}>
              <th style={thStyle}>Year Standing Benchmark</th>
              <td style={{ ...tdStyle, fontWeight: 700, color: isFinancialGood ? '#16A34A' : '#D97706' }}>{financial.yearStatus}</td>
              <th style={thStyle}>Net Balance (Dues)</th>
              <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 900, color: financial.outstandingThisYear > 0 ? '#DC2626' : '#16A34A' }}>
                {financial.outstandingThisYear > 0
                  ? `${formatCurrency(financial.outstandingThisYear)} (Owed)`
                  : financial.creditBalance > 0
                  ? `${formatCurrency(financial.creditBalance)} (Credit)`
                  : 'GH₵ 0.00 (Settled)'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Section 2: Welfare Scheme Summary */}
      {!isDeceased && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 900, color: '#0F172A', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #E2E8F0', paddingBottom: 6, marginBottom: 12 }}>
            2. Welfare Scheme Summary ({financial.currentYear})
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <tbody>
              <tr style={{ background: '#F8FAFC' }}>
                <th style={{ ...thStyle, width: '25%' }}>Arrears Brought Forward (Prior)</th>
                <td style={{ ...tdStyle, width: '25%', fontFamily: 'monospace', fontWeight: 700 }}>{formatCurrency(welfare.lastYearBalance || 0)}</td>
                <th style={{ ...thStyle, width: '25%' }}>Annual Assessment ({financial.currentYear})</th>
                <td style={{ ...tdStyle, width: '25%', fontFamily: 'monospace', fontWeight: 700 }}>{formatCurrency(welfare.currentAssessment)} ({formatCurrency(welfare.monthlyRate)}/mo)</td>
              </tr>
              <tr>
                <th style={thStyle}>Total Welfare Assessed</th>
                <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 800 }}>{formatCurrency(welfare.totalWelfareAssessed)}</td>
                <th style={thStyle}>Paid This Year</th>
                <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 800, color: '#16A34A' }}>{formatCurrency(welfare.contributionsThisYear)}</td>
              </tr>
              <tr style={{ background: '#F8FAFC' }}>
                <th style={thStyle}>Total Contributed All-Time</th>
                <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 700 }}>{formatCurrency(welfare.totalContributedAllTime)}</td>
                <th style={thStyle}>Total Benefits Payouts</th>
                <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{formatCurrency(welfare.totalBenefitsReceived)}</td>
              </tr>
              <tr>
                <th style={thStyle}>Monthly Rate</th>
                <td style={tdStyle}>{formatCurrency(welfare.monthlyRate)} / month</td>
                <th style={thStyle}>Net Balance (Welfare)</th>
                <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 900, color: welfare.welfareOutstanding > 0 ? '#DC2626' : '#16A34A' }}>
                  {welfare.welfareOutstanding > 0
                    ? `${formatCurrency(welfare.welfareOutstanding)} (Arrears)`
                    : welfare.welfareCredit > 0
                    ? `${formatCurrency(welfare.welfareCredit)} (Credit)`
                    : 'GH₵ 0.00 (Up to Date)'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Section 3: Meeting Attendance Compliance */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 900, color: '#0F172A', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #E2E8F0', paddingBottom: 6, marginBottom: 12 }}>
          3. Meeting Attendance & Roll Compliance
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <div style={attBox}>
            <div style={attLabel}>TOTAL MEETINGS</div>
            <div style={attVal}>{attendance?.totalMeetings || 0}</div>
          </div>
          <div style={attBox}>
            <div style={attLabel}>ATTENDED</div>
            <div style={{ ...attVal, color: '#16A34A' }}>{attendance?.attendedCount || 0}</div>
          </div>
          <div style={attBox}>
            <div style={attLabel}>EXCUSED</div>
            <div style={{ ...attVal, color: '#2563EB' }}>{attendance?.excusedCount || 0}</div>
          </div>
          <div style={{ ...attBox, background: (attendance?.complianceRate ?? 100) >= 70 ? '#F0FDF4' : '#FEF2F2' }}>
            <div style={{ ...attLabel, color: (attendance?.complianceRate ?? 100) >= 70 ? '#166534' : '#991B1B' }}>COMPLIANCE RATE</div>
            <div style={{ ...attVal, color: (attendance?.complianceRate ?? 100) >= 70 ? '#166534' : '#DC2626' }}>
              {attendance?.complianceRate ?? 100}%
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Voluntary Relief Donations (if any) */}
      {financial.voluntaryPayments && financial.voluntaryPayments.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 900, color: '#0F172A', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #E2E8F0', paddingBottom: 6, marginBottom: 12 }}>
            4. Voluntary Member Relief & Special Appeals
          </h3>
          <div style={{ fontSize: 12, color: '#64748B', marginBottom: 8 }}>
            Total Voluntary Relief Contributions on Record: <strong style={{ color: '#7C3AED' }}>{formatCurrency(financial.totalVoluntaryContributed || 0)}</strong>
          </div>
        </div>
      )}

      {/* Official Endorsement & Attestation Block */}
      {showSignatureBlock && (
        <div style={{ marginTop: 32, paddingTop: 18, borderTop: '1px solid #CBD5E1' }}>
          <div style={{ fontSize: 11, color: '#64748B', fontStyle: 'italic', marginBottom: 18, textAlign: 'center' }}>
            "We hereby attest and endorse that this official statement accurately reflects the standing and records of the above-named member in accordance with the Constitution and regulations of the Order."
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
            <div>
              <div style={{ borderBottom: '1px solid #94A3B8', height: 36, marginBottom: 6 }}></div>
              <div style={{ fontSize: 11.5, fontWeight: 900, color: '#1E293B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Correspondence & Recording Secretary
              </div>
              <div style={{ fontSize: 10, color: '#64748B' }}>Signature & Date</div>
            </div>
            <div>
              <div style={{ borderBottom: '1px solid #94A3B8', height: 36, marginBottom: 6 }}></div>
              <div style={{ fontSize: 11.5, fontWeight: 900, color: '#1E293B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Worthy President
              </div>
              <div style={{ fontSize: 10, color: '#64748B' }}>Signature, Seal & Endorsement</div>
            </div>
          </div>
        </div>
      )}

      {/* Certificate Footer */}
      <div style={{ marginTop: 24, textAlign: 'center', fontSize: 10, color: '#94A3B8' }}>
        Issued via KSJI Registrar Suite • Official Verification Report Generated on {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px',
  border: '1px solid #E2E8F0',
  color: '#64748B',
  fontSize: 11.5,
  fontWeight: 700,
};

const tdStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px',
  border: '1px solid #E2E8F0',
  color: '#0F172A',
  fontSize: 12,
};

const attBox: React.CSSProperties = {
  background: '#F8FAFC',
  borderRadius: 10,
  border: '1px solid #E2E8F0',
  padding: '10px 14px',
  textAlign: 'center',
};

const attLabel: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  color: '#64748B',
  letterSpacing: 0.5,
  marginBottom: 2,
};

const attVal: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 900,
  color: '#0F172A',
  fontFamily: 'monospace',
};
