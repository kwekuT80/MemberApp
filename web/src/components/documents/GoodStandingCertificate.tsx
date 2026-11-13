'use client';

import React from 'react';
import Link from 'next/link';
import { PersonalReportData } from '@/services/memberService';
import { 
  formatMemberTitle, 
  getOfficialDegreeDetail, 
  getLeadershipOfficeSummary, 
  formatDisplayDate 
} from '@/lib/utils/ksji-logic';

interface GoodStandingCertificateProps {
  report: PersonalReportData;
  backHref?: string;
  isRegistrarView?: boolean;
}

export default function GoodStandingCertificate({
  report,
  backHref = '/me',
  isRegistrarView = false
}: GoodStandingCertificateProps) {
  const { member, standing, standingReason, financialStanding, welfareStanding, attendance, financial } = report;

  const isGoodStanding = standing === 'In Good Standing';
  const isDeceased = member.is_deceased === true || String(member.status || '').toLowerCase() === 'deceased';
  const isDismissed = member.status === 'Dismissed';
  const isSuspended = member.status === 'Suspended';

  const title = formatMemberTitle(member.title, member.degrees);
  const degreeDetail = getOfficialDegreeDetail(member.degrees);
  const leadership = getLeadershipOfficeSummary(member.positions);

  const fullName = [title, member.first_name, member.other_names, member.surname]
    .filter(Boolean)
    .join(' ');

  const today = new Date();
  const issueDateFormatted = today.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 90);
  const expiryDateFormatted = expiryDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const certNumber = `CERT-500-${today.getFullYear()}-${(member.id || '0000').slice(0, 8).toUpperCase()}`;

  const verifyUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/verify/${member.id}`
    : `https://app.ksji500.org/verify/${member.id}`;

  const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(verifyUrl)}&size=200&margin=1&ecLevel=Q`;

  return (
    <div style={{ maxWidth: 940, margin: '0 auto', padding: '16px' }}>
      {/* ACTION BAR (Hidden on Print) */}
      <div 
        className="no-print" 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: 12, 
          marginBottom: 20,
          background: '#ffffff',
          padding: '14px 18px',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}
      >
        <Link 
          href={backHref}
          style={{
            textDecoration: 'none',
            color: '#10233F',
            fontWeight: 700,
            fontSize: 13,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <span>←</span> Back
        </Link>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => window.print()}
            style={{
              background: '#D4AF37',
              color: '#0F172A',
              border: 'none',
              padding: '9px 20px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 2px 8px rgba(212, 175, 55, 0.3)'
            }}
          >
            <span>🖨️</span> Print / Save PDF
          </button>
        </div>
      </div>

      {/* NOT IN GOOD STANDING ALERT (If member fails standing benchmarks) */}
      {!isGoodStanding && !isDeceased && (
        <div 
          className="no-print"
          style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderLeft: '5px solid #DC2626',
            borderRadius: 10,
            padding: '14px 18px',
            marginBottom: 20
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <strong style={{ color: '#991B1B', fontSize: 14 }}>
              Notice: Brother is currently {standing}
            </strong>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#7F1D1D', lineHeight: 1.5 }}>
            {standingReason || 'This member has outstanding annual dues, welfare scheme arrears, or constitutional compliance issues.'}
          </p>
          {isRegistrarView && (
            <p style={{ margin: '6px 0 0', fontSize: 12, color: '#991B1B', fontWeight: 600 }}>
              (Registrar Note: This certificate preview reflects current audit standing. Clearance of outstanding balances is required for full validation.)
            </p>
          )}
        </div>
      )}

      {/* DECEASED MEMORIAL NOTICE */}
      {isDeceased && (
        <div 
          className="no-print"
          style={{
            background: '#FDFBF7',
            border: '1px solid #FDE68A',
            borderLeft: '5px solid #D4AF37',
            borderRadius: 10,
            padding: '14px 18px',
            marginBottom: 20
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🕊️</span>
            <strong style={{ color: '#854D0E', fontSize: 14 }}>
              Memorial Roll of Honour
            </strong>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#78350F' }}>
            This brother is called to eternal rest and permanently preserved on the Roll of Honour of Commandery #500.
          </p>
        </div>
      )}

      {/* CEREMONIAL CERTIFICATE CONTAINER (A4 LANDSCAPE / PORTRAIT COMPATIBLE) */}
      <div 
        className="certificate-print-area"
        style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: '36px 44px',
          border: '10px solid #10233F',
          outline: '3px solid #D4AF37',
          outlineOffset: '-7px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
          position: 'relative',
          fontFamily: "'Times New Roman', Times, serif",
          color: '#0F172A',
          lineHeight: 1.6
        }}
      >
        {/* WATERMARK BACKGROUND EMBLEM */}
        <div 
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '260px',
            opacity: 0.035,
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: 0
          }}
        >
          ⚔️
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* HEADER */}
          <div style={{ textAlign: 'center', borderBottom: '2px solid #D4AF37', paddingBottom: 16, marginBottom: 20 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 26 }}>⚔️</span>
              <span style={{ 
                fontSize: 13, 
                fontWeight: 900, 
                letterSpacing: '2px', 
                color: '#10233F', 
                textTransform: 'uppercase',
                fontFamily: 'Inter, sans-serif'
              }}>
                Knights of St. John International
              </span>
              <span style={{ fontSize: 26 }}>🛡️</span>
            </div>

            <h1 style={{ 
              margin: '2px 0 4px', 
              fontSize: 26, 
              fontWeight: 900, 
              color: '#10233F', 
              letterSpacing: '1px' 
            }}>
              St. Margaret-Mary Commandery #500
            </h1>

            <div style={{ fontSize: 13, color: '#475569', fontStyle: 'italic', fontFamily: 'Inter, sans-serif' }}>
              Dansoman, Accra • Under the Jurisdiction of Accra West Grand Commandery
            </div>

            <div style={{ 
              fontSize: 12, 
              fontWeight: 800, 
              letterSpacing: '2px', 
              color: '#D4AF37', 
              textTransform: 'uppercase',
              marginTop: 6,
              fontFamily: 'Inter, sans-serif'
            }}>
              Pro Deo et Patria (For God and Country)
            </div>
          </div>

          {/* CERTIFICATE TITLE */}
          <div style={{ textAlign: 'center', margin: '22px 0 18px' }}>
            <div style={{
              display: 'inline-block',
              borderBottom: '2px double #D4AF37',
              paddingBottom: 6
            }}>
              <h2 style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 900,
                letterSpacing: '1.5px',
                color: '#800020',
                textTransform: 'uppercase'
              }}>
                Certificate of Fraternal Good Standing
              </h2>
            </div>
          </div>

          {/* FORMAL PREAMBLE & BROTHER RECOGNITION */}
          <div style={{ textAlign: 'center', fontSize: 15, margin: '14px 0 6px', color: '#334155' }}>
            Be it known to all Sir Knights, Grand Officers, and Sister Commanderies across the Order that:
          </div>

          <div style={{ 
            textAlign: 'center', 
            margin: '14px 0', 
            padding: '12px 20px', 
            background: '#F8FAFC',
            borderRadius: 8,
            border: '1px dashed #CBD5E1'
          }}>
            <div style={{ 
              fontSize: 24, 
              fontWeight: 900, 
              color: '#10233F', 
              letterSpacing: '0.5px' 
            }}>
              {fullName}
            </div>

            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: 12, 
              flexWrap: 'wrap',
              marginTop: 6,
              fontSize: 13,
              color: '#475569',
              fontFamily: 'Inter, sans-serif'
            }}>
              <span>Commandery ID: <strong style={{ color: '#0F172A' }}>KSJI-{member.id?.slice(0, 8).toUpperCase()}</strong></span>
              <span>•</span>
              <span>Intake Date: <strong style={{ color: '#0F172A' }}>{formatDisplayDate(member.date_joined)}</strong></span>
              <span>•</span>
              <span style={{ color: '#10233F', fontWeight: 700 }}>{degreeDetail.icon} {degreeDetail.badgeLabel}</span>
              {leadership.activeOffice && (
                <>
                  <span>•</span>
                  <span style={{ color: '#854D0E', fontWeight: 700 }}>🏛️ {leadership.activeOffice}</span>
                </>
              )}
            </div>
          </div>

          <div style={{ textAlign: 'center', fontSize: 14.5, color: '#334155', margin: '14px 0 20px', lineHeight: 1.6 }}>
            is an accredited and dutiful brother of St. Margaret-Mary Commandery #500, having complied with 
            the Constitution, Rituals, and Statutes of the Knights of St. John International.
          </div>

          {/* FOUR PILLARS OF STANDING */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            margin: '20px 0',
            fontFamily: 'Inter, sans-serif'
          }}>
            <div style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              padding: '10px 14px'
            }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                Annual Dues Assessment
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: financialStanding === 'In Good Standing' ? '#15803D' : '#991B1B', marginTop: 3 }}>
                {financialStanding === 'In Good Standing' ? '✓ Dues Benchmark Clear' : financialStanding}
              </div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                GH₵ {financial.paymentsThisYear.toFixed(2)} Paid ({financial.currentYear})
              </div>
            </div>

            <div style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              padding: '10px 14px'
            }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                Welfare Scheme
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: welfareStanding === 'In Good Standing' ? '#15803D' : '#991B1B', marginTop: 3 }}>
                {welfareStanding === 'In Good Standing' ? '✓ Active Subscriber' : welfareStanding}
              </div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                Fully Entitled to Benefits
              </div>
            </div>

            <div style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              padding: '10px 14px'
            }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                Meeting Attendance
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', marginTop: 3 }}>
                {attendance.complianceRate}% Active Presence
              </div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                {attendance.attendedCount} of {attendance.totalMeetings} Assemblies Attended
              </div>
            </div>

            <div style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              padding: '10px 14px'
            }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                Fraternal Discipline
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: isSuspended || isDismissed ? '#991B1B' : '#15803D', marginTop: 3 }}>
                {isSuspended ? '⚠️ Suspended' : isDismissed ? '🚫 Dismissed' : '✓ Unimpeached Standing'}
              </div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                Constitutional Fellowship
              </div>
            </div>
          </div>

          {/* VERIFICATION & QR METADATA BOX */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
            margin: '22px 0 24px',
            padding: '12px 18px',
            background: '#FDFBF7',
            border: '1px solid #FDE68A',
            borderRadius: 8,
            fontFamily: 'Inter, sans-serif'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <img 
                src={qrCodeUrl} 
                alt="Verification QR" 
                style={{ width: 68, height: 68, borderRadius: 6, border: '1px solid #CBD5E1' }} 
              />
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#854D0E', textTransform: 'uppercase' }}>
                  Live Cryptographic Verification
                </div>
                <div style={{ fontSize: 11.5, color: '#475569', marginTop: 2, maxWidth: 380, lineHeight: 1.4 }}>
                  Scan QR code or visit <strong style={{ color: '#10233F' }}>app.ksji500.org/verify</strong> to confirm authentic standing, active degree, and officer credentials in real time.
                </div>
              </div>
            </div>

            <div style={{ fontSize: 11.5, color: '#475569', textAlign: 'right' }}>
              <div>Certificate Serial: <strong style={{ color: '#10233F', fontFamily: 'monospace' }}>{certNumber}</strong></div>
              <div style={{ marginTop: 2 }}>Date Issued: <strong>{issueDateFormatted}</strong></div>
              <div style={{ marginTop: 2, color: '#B45309' }}>Valid Until: <strong>{expiryDateFormatted}</strong> (90 Days)</div>
            </div>
          </div>

          {/* SIGNATURE BLOCK */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 24,
            marginTop: 36,
            paddingTop: 16,
            textAlign: 'center',
            fontFamily: 'Inter, sans-serif'
          }}>
            <div>
              <div style={{ borderBottom: '1px solid #0F172A', width: '80%', margin: '0 auto 6px' }} />
              <div style={{ fontSize: 12, fontWeight: 800, color: '#10233F' }}>Worthy President</div>
              <div style={{ fontSize: 11, color: '#64748B' }}>Commandery #500</div>
            </div>

            <div>
              <div style={{ borderBottom: '1px solid #0F172A', width: '80%', margin: '0 auto 6px' }} />
              <div style={{ fontSize: 12, fontWeight: 800, color: '#10233F' }}>Recording & Corr. Secretary</div>
              <div style={{ fontSize: 11, color: '#64748B' }}>Secretariat</div>
            </div>

            <div>
              <div style={{ borderBottom: '1px solid #0F172A', width: '80%', margin: '0 auto 6px' }} />
              <div style={{ fontSize: 12, fontWeight: 800, color: '#10233F' }}>Financial Secretary</div>
              <div style={{ fontSize: 11, color: '#64748B' }}>Treasury & Accounts</div>
            </div>
          </div>

          {/* FOOTER STATUTORY NOTICE */}
          <div style={{
            marginTop: 24,
            textAlign: 'center',
            fontSize: 10,
            color: '#94A3B8',
            fontFamily: 'Inter, sans-serif'
          }}>
            Knights of St. John International • St. Margaret-Mary Commandery #500 • Issued in accordance with Constitutional Rules & Ghana Data Protection Act 2012 (Act 843).
          </div>
        </div>
      </div>

      {/* PRINT CSS STYLES */}
      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print, header, nav, footer {
            display: none !important;
          }
          .certificate-print-area {
            box-shadow: none !important;
            border-width: 6px !important;
            outline-width: 2px !important;
            padding: 24px 30px !important;
            margin: 0 !important;
            page-break-inside: avoid;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
}
