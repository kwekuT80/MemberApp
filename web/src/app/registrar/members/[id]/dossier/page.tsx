'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { createClient } from '@/lib/supabase/client';
import { formatMemberTitle, formatExemplification, formatDisplayDate } from '@/lib/utils/ksji-logic';
import { getMemberPersonalReport, PersonalReportData } from '@/services/memberService';

export default function MemberDossierPage() {
  const { id } = useParams();
  const router = useRouter();
  const [member, setMember] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [reportData, setReportData] = useState<PersonalReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (prof) setRole(prof.role);
      }

      const { data, error } = await supabase
        .from('members')
        .select('*, spouse(*), children(*), positions(*), degrees(*), military(*), uniformed_rank_records(*)')
        .eq('id', id)
        .single();
      
      if (data) setMember(data);

      if (id) {
        try {
          const report = await getMemberPersonalReport(id as string);
          if (report) setReportData(report);
        } catch (e) {
          console.error('Failed to load report data for dossier:', e);
        }
      }

      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <RegistrarShell title="Loading Dossier..." subtitle="Preparing full record."><div style={center}>Preparing Member Dossier...</div></RegistrarShell>;
  if (!member) return <RegistrarShell title="Error" subtitle="Member not found."><div>Record not found.</div></RegistrarShell>;

  const displayTitle = formatMemberTitle(member.title);
  const firstName = String(member.first_name || '').trim();
  const otherNames = String(member.other_names || '').trim();
  const surname = String(member.surname || '').trim();

  // Cast Iron Array Handling
  const safeDegrees = Array.isArray(member.degrees) ? [...member.degrees] : [];
  const safePositions = Array.isArray(member.positions) ? [...member.positions] : [];
  const safeSpouse = Array.isArray(member.spouse) ? member.spouse : (member.spouse ? [member.spouse] : []);
  const safeChildren = Array.isArray(member.children) ? member.children : [];
  const safeMilitary = Array.isArray(member.military) ? member.military : [];
  const safeRanks = Array.isArray(member.uniformed_rank_records) ? member.uniformed_rank_records : [];

  const sortedDegrees = safeDegrees.sort((a, b) => {
    const da = a.degree_date ? new Date(a.degree_date).getTime() : 0;
    const db = b.degree_date ? new Date(b.degree_date).getTime() : 0;
    return (isNaN(da) ? 0 : da) - (isNaN(db) ? 0 : db);
  });

  const sortedPositions = safePositions.sort((a, b) => {
    const da = a.date_from ? new Date(a.date_from).getTime() : 0;
    const db = b.date_from ? new Date(b.date_from).getTime() : 0;
    return (isNaN(da) ? 0 : da) - (isNaN(db) ? 0 : db);
  });

  const isSuperAdmin = role === 'super_admin';
  const isFinancialRegistrar = role === 'financial_registrar' || isSuperAdmin;
  const isWelfareTreasurer = role === 'welfare_treasurer' || isSuperAdmin;

  return (
    <RegistrarShell title="Master Member Record" subtitle={`Full Dossier for ${displayTitle} ${surname}`}>
      <div style={container}>
        {/* ACTIONS */}
        <div className="no-print" style={actions}>
          <button onClick={() => window.print()} style={printBtn}>Print Master Record</button>
          <button onClick={() => router.back()} style={backBtn}>Back</button>
        </div>

        {/* THE DOSSIER */}
        <div id="dossier-print" style={paper}>
          <div style={header}>
            <div style={topLogo}>KSJI REGISTRAR SUITE</div>
            <h1 style={title}>OFFICIAL MASTER RECORD</h1>
            <p style={subtitle}>Personal & Service Dossier</p>
          </div>

          {/* PERSONAL INFO */}
          <section style={section}>
            <h2 style={sectionLabel}>I. Personal Information</h2>
            <table style={table} className="dossier-table">
              <tbody>
                <tr>
                  <th style={th}>Full Name</th>
                  <td style={td} colSpan={3}>{displayTitle} {firstName} {otherNames} {surname}</td>
                </tr>
                <tr>
                  <th style={th}>Date of Birth</th>
                  <td style={td}>{formatDisplayDate(member.date_of_birth)}</td>
                  <th style={th}>Place of Birth</th>
                  <td style={td}>{member.birth_town || 'N/A'} {member.birth_region ? `(${member.birth_region})` : ''}</td>
                </tr>
                <tr>
                  <th style={th}>Nationality</th>
                  <td style={td}>{member.nationality || 'N/A'}</td>
                  <th style={th}>Home Town / Region</th>
                  <td style={td}>{member.home_town || 'N/A'} {member.home_region ? `(${member.home_region})` : ''}</td>
                </tr>
                <tr>
                  <th style={th}>Postal Address</th>
                  <td style={td} colSpan={3}>{member.postal_address || 'N/A'}</td>
                </tr>
                <tr>
                  <th style={th}>Father's Name</th>
                  <td style={td}>{member.fathers_name || 'N/A'}</td>
                  <th style={th}>Mother's Name</th>
                  <td style={td}>{member.mothers_name || 'N/A'}</td>
                </tr>
                <tr>
                  <th style={th}>Email</th>
                  <td style={td}>{member.email || 'N/A'}</td>
                  <th style={th}>Phone / Mobile</th>
                  <td style={td}>{member.phone || member.mobile || 'N/A'}</td>
                </tr>
                <tr>
                  <th style={th}>Residential Address</th>
                  <td colSpan={3} style={td}>{member.residential_address || 'N/A'}</td>
                </tr>
                <tr>
                  <th style={th}>Occupation</th>
                  <td style={td}>{member.occupation || 'N/A'}</td>
                  <th style={th}>Workplace</th>
                  <td style={td}>{member.workplace || 'N/A'}</td>
                </tr>
                <tr>
                  <th style={th}>Employment Status</th>
                  <td style={td}>{member.emp_status || 'N/A'}</td>
                  <th style={th}>Job Role / Status</th>
                  <td style={td}>{member.job_status || 'N/A'}</td>
                </tr>
                <tr>
                  <th style={th}>Work Address</th>
                  <td colSpan={3} style={td}>{member.work_address || 'N/A'}</td>
                </tr>
                <tr>
                  <th style={th}>Marital Status</th>
                  <td colSpan={3} style={td}>{member.marital_status || 'N/A'}</td>
                </tr>
                {(member.status === 'Deceased' || member.is_deceased) && (
                  <>
                    <tr>
                      <th style={{ ...th, background: '#fff5f5' }}>Date of Death</th>
                      <td style={td}>{formatDisplayDate(member.date_of_death)}</td>
                      <th style={{ ...th, background: '#fff5f5' }}>Burial Date</th>
                      <td style={td}>{formatDisplayDate(member.burial_date)}</td>
                    </tr>
                    <tr>
                      <th style={{ ...th, background: '#fff5f5' }}>Place of Burial</th>
                      <td colSpan={3} style={td}>{member.burial_place || 'N/A'}</td>
                    </tr>
                  </>
                )}
                {(member.transfer_from || member.transfer_to) && (
                  <>
                    <tr>
                      <th style={{ ...th, background: '#f0fff4' }}>Transfer From</th>
                      <td style={td}>{member.transfer_from || 'N/A'}</td>
                      <th style={{ ...th, background: '#f0fff4' }}>Transfer To</th>
                      <td style={td}>{member.transfer_to || 'N/A'}</td>
                    </tr>
                    <tr>
                      <th style={{ ...th, background: '#f0fff4' }}>Transfer Date</th>
                      <td colSpan={3} style={td}>{formatDisplayDate(member.transfer_date)}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </section>

          {/* FAMILY INFO */}
          <section style={section}>
            <h2 style={sectionLabel}>II. Family & Next of Kin</h2>
            <table style={table}>
              <thead>
                <tr>
                  <th style={tableH}>Relationship</th>
                  <th style={tableH}>Name</th>
                  <th style={tableH}>Details</th>
                </tr>
              </thead>
              <tbody>
                {safeSpouse.map((s: any, idx: number) => (
                  <tr key={idx}>
                    <td style={td}>Spouse</td>
                    <td style={td}>{s.spouse_name || 'N/A'}</td>
                    <td style={td}>{s.spouse_parish ? `Parish: ${s.spouse_parish}` : 'N/A'}</td>
                  </tr>
                ))}
                {safeChildren.map((c: any, idx: number) => (
                  <tr key={idx}>
                    <td style={td}>Child</td>
                    <td style={td}>{c.child_name || 'N/A'}</td>
                    <td style={td}>{c.birth_date ? `Born: ${formatDisplayDate(c.birth_date)}` : 'N/A'}</td>
                  </tr>
                ))}
                {safeSpouse.length === 0 && safeChildren.length === 0 && (
                  <tr><td colSpan={3} style={{ ...td, textAlign: 'center', color: '#718096' }}>No family records on file.</td></tr>
                )}
              </tbody>
            </table>
          </section>

          {/* EXEMPLIFICATION HISTORY */}
          <section style={section}>
            <h2 style={sectionLabel}>III. Exemplification History</h2>
            <table style={table}>
              <thead>
                <tr>
                  <th style={tableH}>Date</th>
                  <th style={tableH}>Degree / Milestone</th>
                  <th style={tableH}>Location</th>
                </tr>
              </thead>
              <tbody>
                {sortedDegrees.map((d: any, idx: number) => (
                  <tr key={idx}>
                    <td style={td}>{formatDisplayDate(d.degree_date)}</td>
                    <td style={td}>{d.degree_type || 'N/A'}</td>
                    <td style={td}>{d.degree_place || 'N/A'}</td>
                  </tr>
                ))}
                {sortedDegrees.length === 0 && (
                  <tr><td colSpan={3} style={{ ...td, textAlign: 'center', color: '#718096' }}>No exemplification history records on file.</td></tr>
                )}
              </tbody>
            </table>
          </section>

          {/* SERVICE HISTORY */}
          <section style={section}>
            <h2 style={sectionLabel}>IV. Record of Service & Positions</h2>
            <table style={table}>
              <thead>
                <tr>
                  <th style={tableH}>Period</th>
                  <th style={tableH}>Position Title</th>
                  <th style={tableH}>Level</th>
                  <th style={tableH}>Rank / Uniformed Position</th>
                </tr>
              </thead>
              <tbody>
                {sortedPositions.map((p: any, idx: number) => (
                  <tr key={idx}>
                    <td style={td}>{formatDisplayDate(p.date_from)} - {p.date_to ? formatDisplayDate(p.date_to) : 'Present'}</td>
                    <td style={td}>{p.position_title || 'N/A'}</td>
                    <td style={td}>{p.level || 'Local'}</td>
                    <td style={td}>{p.rank || 'N/A'}</td>
                  </tr>
                ))}
                {sortedPositions.length === 0 && (
                  <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: '#718096' }}>{member.uniform_positions ? `Uniformed Position: ${member.uniform_positions}` : 'No position records on file.'}</td></tr>
                )}
              </tbody>
            </table>
          </section>

          {/* MILITARY & RANKS */}
          {(safeMilitary.length > 0 || safeRanks.length > 0) && (
            <section style={section}>
              <h2 style={sectionLabel}>V. Military & Uniformed Rank Records</h2>
              {safeMilitary.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: 14, color: '#53657d', marginBottom: 8 }}>Military Service</h3>
                  <table style={table}>
                    <thead>
                      <tr>
                        <th style={tableH}>Service Branch</th>
                        <th style={tableH}>Service Number</th>
                        <th style={tableH}>Rank</th>
                      </tr>
                    </thead>
                    <tbody>
                      {safeMilitary.map((m: any, idx: number) => (
                        <tr key={idx}>
                          <td style={td}>{m.branch || 'N/A'}</td>
                          <td style={td}>{m.service_number || 'N/A'}</td>
                          <td style={td}>{m.rank || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {safeRanks.length > 0 && (
                <div>
                  <h3 style={{ fontSize: 14, color: '#53657d', marginBottom: 8 }}>KSJI Uniformed Ranks</h3>
                  <table style={table}>
                    <thead>
                      <tr>
                        <th style={tableH}>Date</th>
                        <th style={tableH}>Rank Title</th>
                        <th style={tableH}>Commission Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {safeRanks.map((r: any, idx: number) => (
                        <tr key={idx}>
                          <td style={td}>{formatDisplayDate(r.rank_date)}</td>
                          <td style={td}>{r.rank_title || 'N/A'}</td>
                          <td style={td}>{r.commission_type || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* ARCHIVAL MEMORIAL BANNER FOR DECEASED MEMBERS */}
          {(member.is_deceased || member.status === 'Deceased') && (
            <section style={section}>
              <div style={{
                background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)',
                borderRadius: 12,
                padding: '24px 28px',
                color: 'white',
                border: '1px solid #6366F1',
                boxShadow: '0 8px 24px rgba(49, 46, 129, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: 20
              }}>
                <div style={{ fontSize: 40 }}>🕯️</div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#FDE047', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                    Master Roll of Honor — Archival Memorial Record
                  </span>
                  <h3 style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 900, color: '#FFFFFF' }}>
                    Deceased Member Record
                  </h3>
                  <p style={{ margin: '6px 0 0', fontSize: 13, color: '#C7D2FE', lineHeight: 1.6 }}>
                    This record is permanently archived on the Commandery Roll of Honor for historical, biographical, and service roll purposes. Active annual dues assessments, welfare contribution obligations, and standing compliance evaluations are automatically exempt and disengaged.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* SECTION VI: SUPER ADMIN GOOD STANDING & ISSUES ANALYSIS (ACTIVE MEMBERS ONLY) */}
          {isSuperAdmin && reportData && !member.is_deceased && member.status === 'Active' && (
            <section style={section}>
              <h2 style={sectionLabel}>VI. Standing & Compliance Audit (Super Admin)</h2>
              <div style={{
                padding: '20px',
                borderRadius: '8px',
                background: reportData.standing === 'In Good Standing' ? '#f0fdf4' : '#fff5f5',
                border: reportData.standing === 'In Good Standing' ? '1px solid #bbf7d0' : '1px solid #fecaca',
                marginBottom: 16
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Overall Standing Status</span>
                    <h3 style={{
                      fontSize: 22,
                      margin: '4px 0 0',
                      color: reportData.standing === 'In Good Standing' ? '#15803d' : '#b91c1c',
                      fontWeight: 900
                    }}>
                      {reportData.standing === 'In Good Standing' ? '✅ IN GOOD STANDING' : '⚠️ NOT IN GOOD STANDING'}
                    </h3>
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: 12,
                      fontWeight: 800,
                      background: reportData.financialStanding === 'In Good Standing' ? '#dcfce7' : '#fee2e2',
                      color: reportData.financialStanding === 'In Good Standing' ? '#166534' : '#991b1b'
                    }}>
                      Dues: {reportData.financialStanding}
                    </span>
                    <span style={{
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: 12,
                      fontWeight: 800,
                      background: reportData.welfareStanding === 'In Good Standing' ? '#dcfce7' : '#fee2e2',
                      color: reportData.welfareStanding === 'In Good Standing' ? '#166534' : '#991b1b'
                    }}>
                      Welfare: {reportData.welfareStanding}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: 16, borderTop: '1px dashed #cbd5e1', paddingTop: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: 12 }}>
                    <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', textTransform: 'uppercase' }}>Active Evaluation Benchmark</span>
                      <strong style={{ fontSize: 13, color: '#1e293b' }}>{reportData.financial.benchmarkName}</strong>
                    </div>
                    <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', textTransform: 'uppercase' }}>Required Payment for Standing</span>
                      <strong style={{ fontSize: 14, color: reportData.financialStanding === 'In Good Standing' ? '#15803d' : '#b91c1c' }}>
                        GH₵ {reportData.financial.requiredDuesThreshold.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                    Compliance Audit & Non-Standing Issues:
                  </div>
                  <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, background: '#ffffff', padding: '12px 16px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    {reportData.standingReason}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* SECTION VII: FINANCIAL DUES SUMMARY (ACTIVE MEMBERS ONLY) */}
          {isFinancialRegistrar && reportData && !member.is_deceased && member.status === 'Active' && (
            <section style={section}>
              <h2 style={sectionLabel}>VII. Financial Dues Ledger Summary</h2>
              <table style={table}>
                <tbody>
                  <tr>
                    <th style={th}>Billing Year</th>
                    <td style={td}>{reportData.financial.currentYear}</td>
                    <th style={th}>Payment Status</th>
                    <td style={td}>
                      <span style={{
                        fontWeight: 800,
                        color: reportData.financial.yearStatus === 'Fully Paid' || reportData.financial.yearStatus === 'Credit Balance'
                          ? '#15803d'
                          : reportData.financial.yearStatus === 'Partially Paid' ? '#d97706' : '#b91c1c'
                      }}>
                        {reportData.financial.yearStatus}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <th style={th}>Arrears Brought Forward</th>
                    <td style={td}>GH₵ {reportData.financial.lastYearArrears.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <th style={th}>Current Year Assessment</th>
                    <td style={td}>GH₵ {reportData.financial.currentAssessment.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr>
                    <th style={th}>Total Assessed Dues</th>
                    <td style={{ ...td, fontWeight: 700 }}>GH₵ {reportData.financial.totalAssessed.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <th style={th}>Total Paid This Year</th>
                    <td style={{ ...td, fontWeight: 700, color: '#15803d' }}>GH₵ {reportData.financial.paymentsThisYear.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr>
                    <th style={th}>Standing Dues Benchmark</th>
                    <td style={td}>{reportData.financial.benchmarkName}</td>
                    <th style={th}>Standing Target Required</th>
                    <td style={{ ...td, fontWeight: 800, color: reportData.financialStanding === 'In Good Standing' ? '#15803d' : '#b91c1c' }}>
                      GH₵ {reportData.financial.requiredDuesThreshold.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr>
                    <th style={th}>Net Outstanding Balance</th>
                    <td colSpan={3} style={{ ...td, fontWeight: 900, color: reportData.financial.outstandingThisYear > 0 ? '#b91c1c' : '#15803d' }}>
                      {reportData.financial.outstandingThisYear > 0
                        ? `GH₵ ${reportData.financial.outstandingThisYear.toLocaleString('en-US', { minimumFractionDigits: 2 })} (Owed)`
                        : reportData.financial.creditBalance > 0
                        ? `GH₵ ${reportData.financial.creditBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} (Credit)`
                        : 'GH₵ 0.00 (Fully Settled)'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>
          )}

          {/* SECTION VIII: WELFARE SCHEME SUMMARY (ACTIVE MEMBERS ONLY) */}
          {isWelfareTreasurer && reportData && !member.is_deceased && member.status === 'Active' && (
            <section style={section}>
              <h2 style={sectionLabel}>VIII. Welfare Scheme Summary</h2>
              <table style={table}>
                <tbody>
                  <tr>
                    <th style={th}>Monthly Rate</th>
                    <td style={td}>GH₵ {reportData.welfare.monthlyRate.toLocaleString('en-US', { minimumFractionDigits: 2 })} / month</td>
                    <th style={th}>Annual Assessment</th>
                    <td style={td}>GH₵ {reportData.welfare.currentAssessment.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr>
                    <th style={th}>Paid This Year</th>
                    <td style={{ ...td, fontWeight: 700, color: '#15803d' }}>GH₵ {reportData.welfare.contributionsThisYear.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <th style={th}>Total Contributed All-Time</th>
                    <td style={{ ...td, fontWeight: 700 }}>GH₵ {reportData.welfare.totalContributedAllTime.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr>
                    <th style={th}>Total Benefits Payouts</th>
                    <td style={td}>GH₵ {reportData.welfare.totalBenefitsReceived.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <th style={th}>Welfare Outstanding / Credit</th>
                    <td style={{ ...td, fontWeight: 900, color: reportData.welfare.welfareOutstanding > 0 ? '#b91c1c' : '#15803d' }}>
                      {reportData.welfare.welfareOutstanding > 0
                        ? `GH₵ ${reportData.welfare.welfareOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })} (Arrears)`
                        : reportData.welfare.welfareCredit > 0
                        ? `GH₵ ${reportData.welfare.welfareCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })} (Credit)`
                        : 'GH₵ 0.00 (Up to Date)'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>
          )}

          {/* SECTION IX: VOLUNTARY RELIEF & SPECIAL APPEALS */}
          {(isFinancialRegistrar || isWelfareTreasurer) && reportData && (
            <section style={section}>
              <h2 style={sectionLabel}>IX. Voluntary Relief & Special Appeals Record</h2>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={tableH}>Date</th>
                    <th style={tableH}>Purpose / Category</th>
                    <th style={tableH}>Year Ref</th>
                    <th style={tableH}>Amount Contributed</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.financial.voluntaryPayments && reportData.financial.voluntaryPayments.length > 0 ? (
                    reportData.financial.voluntaryPayments.map((p: any, idx: number) => (
                      <tr key={idx}>
                        <td style={td}>{formatDisplayDate(p.payment_date)}</td>
                        <td style={{ ...td, fontWeight: 700, color: '#6d28d9' }}>{p.month || 'Voluntary Relief Donation'}</td>
                        <td style={td}>{p.assessment_year}</td>
                        <td style={{ ...td, fontWeight: 800, color: '#6d28d9' }}>
                          GH₵ {Number(p.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ ...td, textAlign: 'center', color: '#718096' }}>
                        No voluntary relief or special appeal contributions recorded on file.
                      </td>
                    </tr>
                  )}
                  {reportData.financial.voluntaryPayments && reportData.financial.voluntaryPayments.length > 0 && (
                    <tr style={{ background: '#f8fafc' }}>
                      <td colSpan={3} style={{ ...td, fontWeight: 800, textAlign: 'right', color: '#1e293b' }}>
                        Total Voluntary Relief & Appeals Contributed All-Time:
                      </td>
                      <td style={{ ...td, fontWeight: 900, color: '#6d28d9' }}>
                        GH₵ {(reportData.financial.totalVoluntaryContributed || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          )}

          <div style={footer}>
            <p>End of Official Record</p>
            <p style={finePrint}>Generated by KSJI Registrar Suite • {new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>
    </RegistrarShell>
  );
}

const center: React.CSSProperties = { textAlign: 'center', padding: 40, fontSize: 18 };
const container: React.CSSProperties = { maxWidth: 1000, margin: '0 auto', paddingBottom: 60 };
const actions: React.CSSProperties = { display: 'flex', gap: 12, marginBottom: 24 };
const printBtn: React.CSSProperties = { background: '#10233f', color: '#fff', border: 0, padding: '12px 24px', borderRadius: 10, fontWeight: 700, cursor: 'pointer' };
const backBtn: React.CSSProperties = { background: '#fff', border: '1px solid #cfd8e3', padding: '12px 24px', borderRadius: 10, cursor: 'pointer' };

const paper: React.CSSProperties = { background: '#fff', padding: '40px 60px', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' };
const header: React.CSSProperties = { textAlign: 'center', marginBottom: 40, borderBottom: '2px solid #10233f', paddingBottom: 20 };
const topLogo: React.CSSProperties = { fontSize: 12, fontWeight: 800, color: '#d4af37', letterSpacing: '2px', marginBottom: 8 };
const title: React.CSSProperties = { fontSize: 28, margin: 0, color: '#10233f' };
const subtitle: React.CSSProperties = { fontSize: 14, color: '#53657d', margin: '4px 0 0' };

const section: React.CSSProperties = { marginBottom: 40 };
const sectionLabel: React.CSSProperties = { fontSize: 16, color: '#10233f', fontWeight: 800, marginBottom: 12, borderLeft: '4px solid #d4af37', paddingLeft: 12 };
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const th: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#53657d', width: '20%' };
const td: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', border: '1px solid #e2e8f0', color: '#1e293b' };
const tableH: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', background: '#10233f', color: '#fff', border: '1px solid #10233f', fontWeight: 700 };

const footer: React.CSSProperties = { marginTop: 60, textAlign: 'center', color: '#94a3b8', fontSize: 12 };
const finePrint: React.CSSProperties = { marginTop: 4, fontStyle: 'italic' };
