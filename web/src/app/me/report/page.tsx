import React from 'react';
import Link from 'next/link';
import MemberShell from '@/components/layout/MemberShell';
import EmptyState from '@/components/shared/EmptyState';
import { requireUser } from '@/lib/auth/requireUser';
import { getMyMember, getMemberPersonalReport } from '@/services/memberService';
import PrintReportButton from '@/components/reports/PrintReportButton';
import DuesBenchmarkTracker from '@/components/financials/DuesBenchmarkTracker';
import AttendanceLogAccordion from '@/components/reports/AttendanceLogAccordion';
import { formatDisplayDate } from '@/lib/utils/ksji-logic';

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

  const { member, standing, standingReason, financialStanding, welfareStanding, financial, welfare, attendance } = report;
  const isGoodStanding = standing === 'In Good Standing';
  const isFinancialGood = financialStanding === 'In Good Standing';
  const isWelfareGood = welfareStanding === 'In Good Standing';

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
          background: (member.is_deceased || member.status === 'Deceased')
            ? 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)'
            : isGoodStanding 
            ? 'linear-gradient(135deg, #064E3B 0%, #047857 100%)' 
            : 'linear-gradient(135deg, #78350F 0%, #B45309 100%)',
          borderRadius: 20,
          padding: '32px 36px',
          color: 'white',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
          marginBottom: 32,
          border: (member.is_deceased || member.status === 'Deceased') ? '1px solid #6366F1' : 'none'
        }}>
          <div style={{ color: (member.is_deceased || member.status === 'Deceased') ? '#FDE047' : '#FCD34D', fontSize: 12, fontWeight: 900, letterSpacing: 1.5, textTransform: 'uppercase' }}>
            KNIGHTS OF ST. JOHN INTERNATIONAL • {(member.is_deceased || member.status === 'Deceased') ? 'ROLL OF HONOR ARCHIVAL RECORD' : 'STANDING REPORT'}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20, marginTop: 12 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>
                {member.title ? `${member.title} ` : ''}{member.first_name} {member.surname}
              </h1>
              <div style={{ fontSize: 14, opacity: 0.9, marginTop: 4 }}>
                Member Status: <span style={{ fontWeight: 800 }}>{(member.is_deceased || member.status === 'Deceased') ? 'Deceased (Roll of Honor)' : member.status}</span>
              </div>
            </div>

            {/* Standing Badges Stack */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
              {/* Overall Standing Badge */}
              <div style={{
                background: (member.is_deceased || member.status === 'Deceased') ? '#312E81' : isGoodStanding ? '#10B981' : '#F59E0B',
                color: (member.is_deceased || member.status === 'Deceased') ? '#FDE047' : isGoodStanding ? '#064E3B' : '#78350F',
                border: (member.is_deceased || member.status === 'Deceased') ? '1px solid #6366F1' : 'none',
                padding: '10px 22px',
                borderRadius: 50,
                fontSize: 15,
                fontWeight: 900,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
              }}>
                <span>{(member.is_deceased || member.status === 'Deceased') ? '🕯️' : isGoodStanding ? '✓' : '⚠️'}</span>
                <span>{(member.is_deceased || member.status === 'Deceased') ? 'Exempt (Roll of Honor)' : `Overall: ${standing}`}</span>
              </div>

              {/* Breakdown Pills */}
              {!(member.is_deceased || member.status === 'Deceased') && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{
                    background: 'rgba(255,255,255,0.18)',
                    padding: '4px 12px',
                    borderRadius: 100,
                    fontSize: 12,
                    fontWeight: 800,
                    border: `1px solid ${isFinancialGood ? 'rgba(52,211,153,0.5)' : 'rgba(251,191,36,0.5)'}`,
                    color: isFinancialGood ? '#A7F3D0' : '#FDE68A'
                  }}>
                    Dues: {financialStanding}
                  </span>
                  <span style={{
                    background: 'rgba(255,255,255,0.18)',
                    padding: '4px 12px',
                    borderRadius: 100,
                    fontSize: 12,
                    fontWeight: 800,
                    border: `1px solid ${isWelfareGood ? 'rgba(52,211,153,0.5)' : 'rgba(251,191,36,0.5)'}`,
                    color: isWelfareGood ? '#A7F3D0' : '#FDE68A'
                  }}>
                    Welfare: {welfareStanding}
                  </span>
                </div>
              )}
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

        {/* Visual Benchmark Standing Tracker (ACTIVE MEMBERS ONLY) */}
        {!(member.is_deceased || member.status === 'Deceased') && (
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
        )}

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
            🤝 Commandery Welfare Scheme Statement ({financial.currentYear})
          </h2>

          {/* Monthly Billing & Outstanding Month Notice Banner */}
          {(() => {
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            const currentMonthIdx = new Date().getMonth(); // 0-11
            const currentMonthName = monthNames[currentMonthIdx];
            const monthlyRate = welfare.monthlyRate || 25.00;
            const monthsPaid = Math.floor((welfare.contributionsThisYear || 0) / monthlyRate);
            
            const overdueMonths: string[] = [];
            for (let m = monthsPaid; m < currentMonthIdx; m++) {
              overdueMonths.push(monthNames[m]);
            }
            const isCurrentMonthDue = monthsPaid <= currentMonthIdx;

            return (
              <div style={{ 
                background: overdueMonths.length > 0 ? '#FFFBEB' : '#F0FDF4', 
                border: `1px solid ${overdueMonths.length > 0 ? '#FCD34D' : '#86EFAC'}`, 
                borderRadius: 12, 
                padding: '16px 20px', 
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                flexWrap: 'wrap'
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: overdueMonths.length > 0 ? '#92400E' : '#166534' }}>
                    🗓️ Monthly Welfare Schedule: Paid {monthsPaid} of {currentMonthIdx + 1} months to date
                  </div>
                  <div style={{ fontSize: 13, color: overdueMonths.length > 0 ? '#78350F' : '#15803D', marginTop: 4 }}>
                    {overdueMonths.length > 0 ? (
                      <>
                        ⚠️ <strong style={{ color: '#B45309' }}>{overdueMonths.join(', ')} {financial.currentYear}</strong> contribution ({formatCurrency(overdueMonths.length * monthlyRate)}) is <strong>outstanding</strong>.
                        {isCurrentMonthDue && <> 🔔 <strong>{currentMonthName} {financial.currentYear}</strong> ({formatCurrency(monthlyRate)}) is now <strong>due</strong>.</>}
                      </>
                    ) : (
                      <>
                        ✓ All welfare dues up to {monthNames[Math.max(0, monthsPaid - 1)]} {financial.currentYear} are fully paid.
                        {isCurrentMonthDue && <> 🔔 <strong>{currentMonthName} {financial.currentYear}</strong> ({formatCurrency(monthlyRate)}) is now due.</>}
                      </>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, background: overdueMonths.length > 0 ? '#FEF3C7' : '#DCFCE7', color: overdueMonths.length > 0 ? '#92400E' : '#166534', padding: '6px 14px', borderRadius: 20 }}>
                  {overdueMonths.length > 0 ? `${overdueMonths.length} Month Outstanding` : 'Current & Up To Date'}
                </div>
              </div>
            );
          })()}

          {/* 5-Card Welfare Metric Grid */}
          {(() => {
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            const currentMonthIdx = new Date().getMonth(); // 0-11
            const currentMonthName = monthNames[currentMonthIdx];
            const monthlyRate = welfare.monthlyRate || 25.00;
            const monthsPaid = Math.floor((welfare.contributionsThisYear || 0) / monthlyRate);
            
            const overdueMonthsList = monthNames.slice(monthsPaid, currentMonthIdx);
            const overdueCount = overdueMonthsList.length;
            const outstandingArrears = overdueCount * monthlyRate;

            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
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
                    {formatCurrency(monthlyRate)}/mo × 12 months
                  </div>
                </div>

                <div style={metricCardStyle}>
                  <div style={metricLabelStyle}>CONTRIBUTIONS THIS YEAR</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#10B981', fontFamily: 'monospace' }}>
                    {formatCurrency(welfare.contributionsThisYear)}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>Paid Received ({monthsPaid} mos)</div>
                </div>

                {/* Card 4: Outstanding Contributions / Arrears */}
                <div style={{
                  ...metricCardStyle,
                  background: outstandingArrears > 0 ? '#FEF2F2' : '#F0FDF4',
                  borderColor: outstandingArrears > 0 ? '#FECACA' : '#BBF7D0'
                }}>
                  <div style={{
                    ...metricLabelStyle,
                    color: outstandingArrears > 0 ? '#991B1B' : '#166534'
                  }}>
                    OUTSTANDING ARREARS
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: outstandingArrears > 0 ? '#DC2626' : '#166534', fontFamily: 'monospace' }}>
                    {formatCurrency(outstandingArrears)}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: outstandingArrears > 0 ? '#B45309' : '#15803D', marginTop: 4 }}>
                    {overdueCount > 0 ? `⚠️ ${overdueMonthsList.join(', ')} Overdue` : '✓ All Up To Date'}
                  </div>
                </div>

                {/* Card 5: Current Month Due */}
                <div style={{
                  ...metricCardStyle,
                  background: '#FFFBEB',
                  borderColor: '#FCD34D'
                }}>
                  <div style={{ ...metricLabelStyle, color: '#92400E' }}>
                    CURRENT MONTH DUE
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#B45309', fontFamily: 'monospace' }}>
                    {formatCurrency(monthlyRate)}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#92400E', marginTop: 4 }}>
                    🔔 {currentMonthName} {financial.currentYear} Dues
                  </div>
                </div>
              </div>
            );
          })()}

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
                        {formatDisplayDate(d.disbursement_date)}
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

        {/* Section 3: Voluntary Relief & Special Appeals Log */}
        <div style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0F172A', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            ❤️ Voluntary Member Relief & Special Appeals Log
          </h2>

          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: '#0F172A' }}>
                  Voluntary Contributions Logged
                </h3>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  Special donations & emergency relief appeals (separate from mandatory annual dues)
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 900, color: '#7C3AED', background: '#F3E8FF', padding: '6px 16px', borderRadius: 20 }}>
                Total Contributed: {formatCurrency(financial.totalVoluntaryContributed || 0)}
              </div>
            </div>

            {(!financial.voluntaryPayments || financial.voluntaryPayments.length === 0) ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
                No voluntary relief or special appeal contributions recorded for your profile.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#F1F5F9', color: '#475569', textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px' }}>Date</th>
                    <th style={{ padding: '12px 16px' }}>Contribution Purpose / Category</th>
                    <th style={{ padding: '12px 16px' }}>Year Reference</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Amount Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {financial.voluntaryPayments.map((p: any) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 16px', color: '#64748B' }}>
                        {formatDisplayDate(p.payment_date)}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 800, color: '#6D28D9' }}>
                        ❤️ {p.month || 'Voluntary Relief Donation'}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#64748B' }}>{p.assessment_year}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 900, color: '#6D28D9', fontFamily: 'monospace' }}>
                        {formatCurrency(Number(p.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Section 4: Meeting Attendance Record & Compliance */}
        <div style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0F172A', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            📊 Meeting Attendance Record & Compliance
          </h2>

          {/* 4 Metric Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div style={metricCardStyle}>
              <div style={metricLabelStyle}>TOTAL MEETINGS SCHEDULED</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', fontFamily: 'monospace' }}>
                {attendance?.totalMeetings || 0}
              </div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>Commandery Roll</div>
            </div>

            <div style={metricCardStyle}>
              <div style={metricLabelStyle}>MEETINGS ATTENDED</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#10B981', fontFamily: 'monospace' }}>
                {attendance?.attendedCount || 0}
              </div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>Verified Check-Ins</div>
            </div>

            <div style={metricCardStyle}>
              <div style={metricLabelStyle}>EXCUSED ABSENCES</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#2563EB', fontFamily: 'monospace' }}>
                {attendance?.excusedCount || 0}
              </div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>Approved Excuses</div>
            </div>

            <div style={{
              ...metricCardStyle,
              background: (attendance?.complianceRate ?? 100) >= 70 ? '#F0FDF4' : '#FEF2F2',
              borderColor: (attendance?.complianceRate ?? 100) >= 70 ? '#BBF7D0' : '#FECACA'
            }}>
              <div style={{
                ...metricLabelStyle,
                color: (attendance?.complianceRate ?? 100) >= 70 ? '#166534' : '#991B1B'
              }}>
                ATTENDANCE COMPLIANCE
              </div>
              <div style={{
                fontSize: 22,
                fontWeight: 900,
                color: (attendance?.complianceRate ?? 100) >= 70 ? '#166534' : '#DC2626',
                fontFamily: 'monospace'
              }}>
                {attendance?.complianceRate ?? 100}%
              </div>
              <div style={{
                fontSize: 11,
                fontWeight: 800,
                color: (attendance?.complianceRate ?? 100) >= 70 ? '#166534' : '#991B1B',
                marginTop: 4
              }}>
                {(attendance?.complianceRate ?? 100) >= 70 ? '✓ Satisfactory Roll' : '⚠️ Below 70% Benchmark'}
              </div>
            </div>
          </div>

          {/* Collapsible Attendance History Table */}
          <AttendanceLogAccordion records={attendance?.records || []} />
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
