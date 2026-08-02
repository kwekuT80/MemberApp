import Link from 'next/link';
import RegistrarShell from '@/components/layout/RegistrarShell';
import MemberSummaryCard from '@/components/members/MemberSummaryCard';
import RegistrarMemberActions from '@/components/members/RegistrarMemberActions';
import { requireRegistrar } from '@/lib/auth/requireRegistrar';
import { getMemberById, getMemberPersonalReport } from '@/services/memberService';
import EmptyState from '@/components/shared/EmptyState';

export default async function RegistrarMemberDetailPage({ params }: { params: Promise<{ id: string }> }) { 
  const { profile } = await requireRegistrar(); 
  const { id } = await params; 
  const member = await getMemberById(id); 
  const reportData = member ? await getMemberPersonalReport(id) : null;
  const displayTitle = member?.title === 'N/B' ? 'Noble Brother' : member?.title; 

  const role = profile?.role;
  const isSuperAdmin = role === 'super_admin';
  const isFinancialRegistrar = role === 'financial_registrar' || isSuperAdmin;
  const isWelfareTreasurer = role === 'welfare_treasurer' || isSuperAdmin;

  return (
    <RegistrarShell title='Member Detail' subtitle='View and manage the selected member across all sections.'>
      <div style={{ display: 'grid', gap: 18 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', paddingTop: 12 }}>
          <Link href='/registrar/members' style={{ textDecoration: 'none', color: '#10233f', fontWeight: 700 }}>
            ← Back to members
          </Link>
          {member?.id ? (
            <>
              <Link href={`/registrar/members/${member.id}/edit`} style={{ textDecoration: 'none', color: '#10233f', fontWeight: 700 }}>
                ✏️ Edit main record
              </Link>
              <Link href={`/registrar/members/${member.id}/id-card`} style={{ textDecoration: 'none', color: '#10233f', fontWeight: 700 }}>
                🪪 ID Card
              </Link>
              <Link href={`/registrar/members/${member.id}/bio`} style={{ textDecoration: 'none', color: '#d4af37', fontWeight: 700 }}>
                📜 Service Bio
              </Link>
              <Link href={`/registrar/members/${member.id}/dossier`} style={{ textDecoration: 'none', color: '#10233f', fontWeight: 700 }}>
                📊 Master Record / Dossier
              </Link>
            </>
          ) : null}
        </div>

        {member ? (
          <>
            <MemberSummaryCard member={{ ...member, title: displayTitle }} editHref={`/registrar/members/${id}/edit`} showOwner />
            
            {/* SUPER ADMIN GOOD STANDING & ISSUES SUMMARY CARD */}
            {isSuperAdmin && reportData && (
              <div className="card" style={{
                borderLeft: `5px solid ${reportData.standing === 'In Good Standing' ? '#16a34a' : '#dc2626'}`,
                background: reportData.standing === 'In Good Standing' ? '#f0fdf4' : '#fff5f5'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Super Admin Audit • Good Standing Evaluation
                    </span>
                    <h3 style={{
                      margin: '4px 0 0',
                      fontSize: 20,
                      fontWeight: 900,
                      color: reportData.standing === 'In Good Standing' ? '#15803d' : '#b91c1c'
                    }}>
                      {reportData.standing === 'In Good Standing' ? '✅ Member In Good Standing' : '⚠️ Member Not In Good Standing'}
                    </h3>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span className={`badge ${reportData.financialStanding === 'In Good Standing' ? 'badge-green' : 'badge-red'}`}>
                      Dues: {reportData.financialStanding}
                    </span>
                    <span className={`badge ${reportData.welfareStanding === 'In Good Standing' ? 'badge-green' : 'badge-red'}`}>
                      Welfare: {reportData.welfareStanding}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  <span style={{ fontWeight: 800, fontSize: 13, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Standing & Compliance Issues:
                  </span>
                  <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                    {reportData.standingReason}
                  </p>
                </div>
              </div>
            )}

            {/* ELEVATED FINANCIAL & WELFARE SUMMARY CARDS */}
            {(isFinancialRegistrar || isWelfareTreasurer) && reportData && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                
                {/* Financial Registrar Summary */}
                {isFinancialRegistrar && (
                  <div className="card" style={{ borderTop: '4px solid var(--navy)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <h4 style={{ margin: 0, color: 'var(--navy)', fontWeight: 800, fontSize: 15 }}>
                        💰 Financial Dues Overview ({reportData.financial.currentYear})
                      </h4>
                      <span className={`badge ${
                        reportData.financial.yearStatus === 'Fully Paid' || reportData.financial.yearStatus === 'Credit Balance'
                          ? 'badge-green'
                          : reportData.financial.yearStatus === 'Partially Paid' ? 'badge-amber' : 'badge-red'
                      }`}>
                        {reportData.financial.yearStatus}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                      <div>
                        <span style={{ color: 'var(--grey)', fontSize: 11, display: 'block' }}>Total Assessed</span>
                        <strong style={{ fontSize: 15, color: 'var(--navy)' }}>GH₵ {reportData.financial.totalAssessed.toFixed(2)}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--grey)', fontSize: 11, display: 'block' }}>Total Paid</span>
                        <strong style={{ fontSize: 15, color: 'var(--success)' }}>GH₵ {reportData.financial.paymentsThisYear.toFixed(2)}</strong>
                      </div>
                      <div style={{ gridColumn: 'span 2', marginTop: 4, paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
                        <span style={{ color: 'var(--grey)', fontSize: 11, display: 'block' }}>Net Outstanding Dues</span>
                        <strong style={{
                          fontSize: 16,
                          fontWeight: 900,
                          color: reportData.financial.outstandingThisYear > 0 ? 'var(--danger)' : 'var(--success)'
                        }}>
                          {reportData.financial.outstandingThisYear > 0
                            ? `GH₵ ${reportData.financial.outstandingThisYear.toFixed(2)} (Owed)`
                            : reportData.financial.creditBalance > 0
                            ? `GH₵ ${reportData.financial.creditBalance.toFixed(2)} (Credit)`
                            : 'GH₵ 0.00 (Paid in Full)'}
                        </strong>
                      </div>
                      <div style={{ gridColumn: 'span 2', marginTop: 6, paddingTop: 8, borderTop: '1px dashed #cbd5e1', fontSize: 12 }}>
                        <span style={{ color: 'var(--grey)', display: 'block', fontWeight: 600 }}>Standing Policy Benchmark:</span>
                        <span style={{ color: '#334155', fontWeight: 700 }}>{reportData.financial.benchmarkName}</span>
                        <div style={{ marginTop: 2 }}>
                          Required Threshold: <strong style={{ color: reportData.financialStanding === 'In Good Standing' ? 'var(--success)' : 'var(--danger)' }}>GH₵ {reportData.financial.requiredDuesThreshold.toFixed(2)}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Welfare Treasurer Summary */}
                {isWelfareTreasurer && (
                  <div className="card" style={{ borderTop: '4px solid #7c3aed' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <h4 style={{ margin: 0, color: '#6d28d9', fontWeight: 800, fontSize: 15 }}>
                        🤝 Welfare Scheme Overview
                      </h4>
                      <span className={`badge ${reportData.welfareStanding === 'In Good Standing' ? 'badge-green' : 'badge-red'}`}>
                        {reportData.welfareStanding}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                      <div>
                        <span style={{ color: 'var(--grey)', fontSize: 11, display: 'block' }}>Monthly Rate</span>
                        <strong style={{ fontSize: 14 }}>GH₵ {reportData.welfare.monthlyRate.toFixed(2)}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--grey)', fontSize: 11, display: 'block' }}>Paid This Year</span>
                        <strong style={{ fontSize: 14, color: 'var(--success)' }}>GH₵ {reportData.welfare.contributionsThisYear.toFixed(2)}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--grey)', fontSize: 11, display: 'block' }}>All-Time Contributed</span>
                        <strong style={{ fontSize: 14 }}>GH₵ {reportData.welfare.totalContributedAllTime.toFixed(2)}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--grey)', fontSize: 11, display: 'block' }}>Benefits Received</span>
                        <strong style={{ fontSize: 14 }}>GH₵ {reportData.welfare.totalBenefitsReceived.toFixed(2)}</strong>
                      </div>
                      <div style={{ gridColumn: 'span 2', marginTop: 4, paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
                        <span style={{ color: 'var(--grey)', fontSize: 11, display: 'block' }}>Net Welfare Arrears / Credit</span>
                        <strong style={{
                          fontSize: 16,
                          fontWeight: 900,
                          color: reportData.welfare.welfareOutstanding > 0 ? 'var(--danger)' : 'var(--success)'
                        }}>
                          {reportData.welfare.welfareOutstanding > 0
                            ? `GH₵ ${reportData.welfare.welfareOutstanding.toFixed(2)} (Arrears)`
                            : reportData.welfare.welfareCredit > 0
                            ? `GH₵ ${reportData.welfare.welfareCredit.toFixed(2)} (Credit)`
                            : 'GH₵ 0.00 (Up to Date)'}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}

            <RegistrarMemberActions memberId={member.id!} />
          </>
        ) : (
          <EmptyState message='This member record could not be loaded.' />
        )}
      </div>
    </RegistrarShell>
  ); 
}

