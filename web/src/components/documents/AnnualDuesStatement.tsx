'use client';

import React from 'react';
import Link from 'next/link';
import { PersonalReportData } from '@/services/memberService';
import { 
  formatMemberTitle, 
  getOfficialDegreeDetail, 
  formatDisplayDate 
} from '@/lib/utils/ksji-logic';

interface AnnualDuesStatementProps {
  report: PersonalReportData;
  payments: any[];
  backHref?: string;
  hideNav?: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function formatMethod(method?: string | null): string {
  if (!method) return 'Direct / Bank';
  const m = String(method).toLowerCase();
  if (m === 'mobile_money' || m === 'momo') return 'Mobile Money (MoMo)';
  if (m === 'bank_transfer') return 'Bank Transfer';
  if (m === 'cash') return 'Cash';
  if (m === 'cheque') return 'Cheque';
  return method;
}

export default function AnnualDuesStatement({
  report,
  payments = [],
  backHref = '/me/financials',
  hideNav = false
}: AnnualDuesStatementProps) {
  const { member, financial, welfare, financialStanding, welfareStanding } = report;

  const title = formatMemberTitle(member.title, member.degrees);
  const degreeDetail = getOfficialDegreeDetail(member.degrees);

  const fullName = [title, member.first_name, member.other_names, member.surname]
    .filter(Boolean)
    .join(' ');

  const currentYear = financial.currentYear || new Date().getFullYear();

  // Helper to distinguish voluntary/appeal payments from standard annual dues
  const isVoluntary = (p: any) => {
    const m = String(p.month || '').toLowerCase();
    const type = String(p.payment_type || p.payment_category || '').toLowerCase();
    const notes = String(p.notes || '').toLowerCase();
    return m.includes('voluntary') || m.includes('appeal') || m.includes('relief') || m.includes('donation') ||
           type.includes('voluntary') || type.includes('appeal') || type.includes('relief') || type.includes('donation') ||
           notes.includes('voluntary') || notes.includes('appeal') || notes.includes('relief') || notes.includes('donation');
  };

  // 1. STATUTORY ANNUAL DUES PAYMENTS
  const duesPayments = payments.filter(
    (p: any) => Number(p.assessment_year) === currentYear && !isVoluntary(p)
  );

  // 2. VOLUNTARY CONTRIBUTIONS & RELIEF APPEALS
  const voluntaryPayments = payments.filter(
    (p: any) => isVoluntary(p) && (Number(p.assessment_year) === currentYear || new Date(p.payment_date).getFullYear() === currentYear)
  );

  // 3. WELFARE SCHEME CONTRIBUTIONS
  const welfarePayments = (welfare?.contributions || []).filter(
    (c: any) => Number(c.period_year) === currentYear || new Date(c.payment_date).getFullYear() === currentYear
  );

  // Totals calculations
  const totalDuesPaid = duesPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalVoluntaryPaid = voluntaryPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalWelfarePaid = welfarePayments.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const grandTotalOutflows = totalDuesPaid + totalVoluntaryPaid + totalWelfarePaid;

  const today = new Date();
  const statementDateFormatted = today.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const statementRef = `STMT-500-${currentYear}-${(member.id || '0000').slice(0, 8).toUpperCase()}`;

  const formatCurrency = (val: number) =>
    `GH₵ ${(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const isDuesGood = financialStanding === 'In Good Standing';
  const isWelfareGood = welfareStanding === 'In Good Standing';

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: hideNav ? '0' : '16px' }}>
      {/* ACTION BAR (Hidden on Print) */}
      {!hideNav && (
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
                background: '#10233F',
                color: '#ffffff',
                border: 'none',
                padding: '9px 20px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 2px 8px rgba(16, 35, 63, 0.25)'
              }}
            >
              <span>🖨️</span> Print / Download Statement (PDF)
            </button>
          </div>
        </div>
      )}

      {/* FORMAL STATEMENT DOCUMENT (A4 PORTRAIT) */}
      <div 
        className="statement-print-area"
        style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: '36px 44px',
          border: '1px solid #CBD5E1',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          fontFamily: "'Segoe UI', Arial, sans-serif",
          color: '#0F172A',
          lineHeight: 1.5,
          marginBottom: 30
        }}
      >
        {/* OFFICIAL COMMANDERY LETTERHEAD */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '3px solid #10233F',
          paddingBottom: 18,
          marginBottom: 20
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 22 }}>⚔️</span>
              <span style={{ 
                fontSize: 11, 
                fontWeight: 900, 
                letterSpacing: '1.5px', 
                color: '#D4AF37', 
                textTransform: 'uppercase' 
              }}>
                Knights of St. John International
              </span>
            </div>
            <h1 style={{ 
              margin: '0 0 4px', 
              fontSize: 22, 
              fontWeight: 900, 
              color: '#10233F' 
            }}>
              St. Margaret-Mary Commandery #500
            </h1>
            <div style={{ fontSize: 12, color: '#475569' }}>
              Dansoman, Accra • Under the Jurisdiction of Accra West Grand Commandery
            </div>
            <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
              Office of the Financial Registrar & Treasury Secretariat
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ 
              display: 'inline-block', 
              background: '#F1F5F9', 
              padding: '6px 12px', 
              borderRadius: 6,
              border: '1px solid #CBD5E1',
              fontSize: 11,
              fontFamily: 'monospace',
              fontWeight: 700,
              color: '#10233F'
            }}>
              {statementRef}
            </div>
            <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 6 }}>
              Date: <strong style={{ color: '#0F172A' }}>{statementDateFormatted}</strong>
            </div>
            <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
              Statement Year: <strong style={{ color: '#0F172A' }}>{currentYear}</strong>
            </div>
          </div>
        </div>

        {/* DOCUMENT TITLE */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <h2 style={{ 
            margin: '0 0 4px', 
            fontSize: 18, 
            fontWeight: 800, 
            color: '#10233F', 
            textTransform: 'uppercase', 
            letterSpacing: '0.8px' 
          }}>
            Official Annual Fraternal Dues & Financial Statement
          </h2>
          <div style={{ fontSize: 12, color: '#64748B' }}>
            Comprehensive Record of Dues Assessments, Voluntary Relief, and Welfare Scheme Subscriptions
          </div>
        </div>

        {/* MEMBER DETAILS BOX */}
        <div style={{
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: 8,
          padding: '14px 18px',
          marginBottom: 20,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
          fontSize: 12.5
        }}>
          <div>
            <span style={{ color: '#64748B', display: 'block', fontSize: 11, textTransform: 'uppercase', fontWeight: 700 }}>
              Brother Name
            </span>
            <strong style={{ fontSize: 14, color: '#10233F' }}>{fullName}</strong>
          </div>

          <div>
            <span style={{ color: '#64748B', display: 'block', fontSize: 11, textTransform: 'uppercase', fontWeight: 700 }}>
              Commandery Intake / Seniority
            </span>
            <span style={{ color: '#0F172A', fontWeight: 600 }}>{formatDisplayDate(member.date_joined)}</span>
          </div>

          <div>
            <span style={{ color: '#64748B', display: 'block', fontSize: 11, textTransform: 'uppercase', fontWeight: 700 }}>
              Degree & Rank
            </span>
            <span style={{ color: '#0F172A', fontWeight: 600 }}>
              {degreeDetail.icon} {degreeDetail.badgeLabel}
            </span>
          </div>

          <div>
            <span style={{ color: '#64748B', display: 'block', fontSize: 11, textTransform: 'uppercase', fontWeight: 700 }}>
              Compliance Standing
            </span>
            <span style={{ 
              fontWeight: 800, 
              color: isDuesGood && isWelfareGood ? '#15803D' : '#991B1B' 
            }}>
              {isDuesGood && isWelfareGood ? '✓ Fully in Good Standing' : `${financialStanding} (Dues) • ${welfareStanding} (Welfare)`}
            </span>
          </div>
        </div>

        {/* FINANCIAL SUMMARY RECONCILIATION EQUATION */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ 
            fontSize: 12, 
            fontWeight: 800, 
            color: '#10233F', 
            textTransform: 'uppercase', 
            letterSpacing: '0.5px',
            marginBottom: 8
          }}>
            Annual Dues Reconciliation ({currentYear})
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 10
          }}>
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: 8,
              padding: '10px 14px'
            }}>
              <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Arrears Brought Forward</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
                {formatCurrency(financial.lastYearArrears)}
              </div>
              <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }}>Starting Balance (Jan 1)</div>
            </div>

            <div style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: 8,
              padding: '10px 14px'
            }}>
              <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Annual Assessment</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
                {formatCurrency(financial.currentAssessment)}
              </div>
              <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }}>{currentYear} Commandery Dues</div>
            </div>

            <div style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: 8,
              padding: '10px 14px'
            }}>
              <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Total Assessed</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#1E3A8A', marginTop: 2 }}>
                {formatCurrency(financial.totalAssessed)}
              </div>
              <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }}>Arrears + Current Dues</div>
            </div>

            <div style={{
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: 8,
              padding: '10px 14px'
            }}>
              <div style={{ fontSize: 11, color: '#166534', fontWeight: 600 }}>Annual Dues Paid</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#15803D', marginTop: 2 }}>
                {formatCurrency(totalDuesPaid)}
              </div>
              <div style={{ fontSize: 10, color: '#166534', marginTop: 1 }}>Applied to Assessment</div>
            </div>

            <div style={{
              background: financial.outstandingThisYear > 0 ? '#FEF2F2' : '#F0FDF4',
              border: `1px solid ${financial.outstandingThisYear > 0 ? '#FECACA' : '#BBF7D0'}`,
              borderRadius: 8,
              padding: '10px 14px'
            }}>
              <div style={{ 
                fontSize: 11, 
                color: financial.outstandingThisYear > 0 ? '#991B1B' : '#166534', 
                fontWeight: 600 
              }}>
                Net Dues Standing
              </div>
              <div style={{ 
                fontSize: 15, 
                fontWeight: 900, 
                color: financial.outstandingThisYear > 0 ? '#DC2626' : '#15803D', 
                marginTop: 2 
              }}>
                {financial.outstandingThisYear > 0 
                  ? `${formatCurrency(financial.outstandingThisYear)} (Owed)`
                  : financial.creditBalance > 0
                  ? `${formatCurrency(financial.creditBalance)} (Credit)`
                  : 'GH₵ 0.00 (Fully Settled)'}
              </div>
              <div style={{ 
                fontSize: 10, 
                color: financial.outstandingThisYear > 0 ? '#991B1B' : '#166534', 
                marginTop: 1 
              }}>
                {financial.yearStatus}
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {/* TABLE 1: STATUTORY ANNUAL DUES ASSESSMENT PAYMENTS */}
        {/* ══════════════════════════════════════════════════════════════════════════ */}
        <div style={{ marginBottom: 28, pageBreakInside: 'avoid' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: 8 
          }}>
            <div>
              <div style={{ 
                fontSize: 13, 
                fontWeight: 900, 
                color: '#10233F', 
                textTransform: 'uppercase', 
                letterSpacing: '0.5px' 
              }}>
                1. Statutory Annual Dues Assessment Payments ({currentYear})
              </div>
              <div style={{ fontSize: 11, color: '#64748B' }}>
                Verified payments applied strictly against annual dues assessment and arrears.
              </div>
            </div>
            <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>
              {duesPayments.length} installment{duesPayments.length === 1 ? '' : 's'}
            </div>
          </div>

          {duesPayments.length === 0 ? (
            <div style={{ 
              padding: '14px', 
              textAlign: 'center', 
              color: '#64748B', 
              background: '#F8FAFC', 
              borderRadius: 8, 
              border: '1px dashed #CBD5E1',
              fontSize: 12 
            }}>
              No payments recorded towards statutory annual dues for the {currentYear} period.
            </div>
          ) : (
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse', 
              fontSize: 12, 
              textAlign: 'left' 
            }}>
              <thead>
                <tr style={{ background: '#10233F', color: '#ffffff' }}>
                  <th style={{ padding: '8px 10px', borderRadius: '6px 0 0 0' }}>Date</th>
                  <th style={{ padding: '8px 10px' }}>Receipt #</th>
                  <th style={{ padding: '8px 10px' }}>Channel / Mode</th>
                  <th style={{ padding: '8px 10px' }}>Assessment Allocation</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', borderRadius: '0 6px 0 0' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {duesPayments.map((p: any, idx: number) => (
                  <tr 
                    key={p.id || idx}
                    style={{ 
                      borderBottom: '1px solid #E2E8F0',
                      background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'
                    }}
                  >
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>
                      {formatDisplayDate(p.payment_date)}
                    </td>
                    <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: '#64748B' }}>
                      {p.receipt_no || p.reference_no || '—'}
                    </td>
                    <td style={{ padding: '8px 10px', color: '#475569' }}>
                      {formatMethod(p.payment_method || p.channel)}
                    </td>
                    <td style={{ padding: '8px 10px', color: '#334155' }}>
                      {p.month || p.payment_type || 'Annual Assessment'}
                      {p.notes ? ` (${p.notes})` : ''}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#15803D' }}>
                      {formatCurrency(Number(p.amount || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#F1F5F9', borderTop: '2px solid #10233F', fontWeight: 800 }}>
                  <td colSpan={4} style={{ padding: '8px 10px', textAlign: 'right', textTransform: 'uppercase', fontSize: 11 }}>
                    Total Annual Dues Assessment Paid:
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: '#15803D', fontSize: 13 }}>
                    {formatCurrency(totalDuesPaid)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {/* TABLE 2: VOLUNTARY FRATERNAL CONTRIBUTIONS & RELIEF APPEALS */}
        {/* ══════════════════════════════════════════════════════════════════════════ */}
        <div style={{ marginBottom: 28, pageBreakInside: 'avoid' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: 8 
          }}>
            <div>
              <div style={{ 
                fontSize: 13, 
                fontWeight: 900, 
                color: '#800020', 
                textTransform: 'uppercase', 
                letterSpacing: '0.5px' 
              }}>
                2. Voluntary Fraternal Contributions & Relief Appeals ({currentYear})
              </div>
              <div style={{ fontSize: 11, color: '#64748B' }}>
                Benevolent offerings, convention levies, building funds, and emergency relief donations.
              </div>
            </div>
            <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>
              {voluntaryPayments.length} contribution{voluntaryPayments.length === 1 ? '' : 's'}
            </div>
          </div>

          {voluntaryPayments.length === 0 ? (
            <div style={{ 
              padding: '14px', 
              textAlign: 'center', 
              color: '#64748B', 
              background: '#FDFBF7', 
              borderRadius: 8, 
              border: '1px dashed #E2E8F0',
              fontSize: 12 
            }}>
              No voluntary appeal or relief contributions recorded for the {currentYear} fraternal year.
            </div>
          ) : (
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse', 
              fontSize: 12, 
              textAlign: 'left' 
            }}>
              <thead>
                <tr style={{ background: '#800020', color: '#ffffff' }}>
                  <th style={{ padding: '8px 10px', borderRadius: '6px 0 0 0' }}>Date</th>
                  <th style={{ padding: '8px 10px' }}>Receipt #</th>
                  <th style={{ padding: '8px 10px' }}>Channel / Mode</th>
                  <th style={{ padding: '8px 10px' }}>Appeal / Purpose</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', borderRadius: '0 6px 0 0' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {voluntaryPayments.map((p: any, idx: number) => (
                  <tr 
                    key={p.id || idx}
                    style={{ 
                      borderBottom: '1px solid #E2E8F0',
                      background: idx % 2 === 0 ? '#FFFFFF' : '#FFFDFD'
                    }}
                  >
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>
                      {formatDisplayDate(p.payment_date)}
                    </td>
                    <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: '#64748B' }}>
                      {p.receipt_no || p.reference_no || '—'}
                    </td>
                    <td style={{ padding: '8px 10px', color: '#475569' }}>
                      {formatMethod(p.payment_method || p.channel)}
                    </td>
                    <td style={{ padding: '8px 10px', color: '#334155' }}>
                      {p.notes || p.month || p.payment_type || 'Voluntary Relief Appeal'}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#800020' }}>
                      {formatCurrency(Number(p.amount || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#FFF1F2', borderTop: '2px solid #800020', fontWeight: 800 }}>
                  <td colSpan={4} style={{ padding: '8px 10px', textAlign: 'right', textTransform: 'uppercase', fontSize: 11 }}>
                    Total Voluntary Contributions:
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: '#800020', fontSize: 13 }}>
                    {formatCurrency(totalVoluntaryPaid)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {/* TABLE 3: COMMANDERY WELFARE SCHEME SUBSCRIPTIONS */}
        {/* ══════════════════════════════════════════════════════════════════════════ */}
        <div style={{ marginBottom: 28, pageBreakInside: 'avoid' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: 8 
          }}>
            <div>
              <div style={{ 
                fontSize: 13, 
                fontWeight: 900, 
                color: '#6D28D9', 
                textTransform: 'uppercase', 
                letterSpacing: '0.5px' 
              }}>
                3. Commandery Welfare Scheme Subscriptions ({currentYear})
              </div>
              <div style={{ fontSize: 11, color: '#64748B' }}>
                Monthly fraternal welfare dues (Rate: {formatCurrency(welfare?.monthlyRate || 25)}/month) for member & family benefits.
              </div>
            </div>
            <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>
              {welfarePayments.length} subscription payment{welfarePayments.length === 1 ? '' : 's'}
            </div>
          </div>

          {welfarePayments.length === 0 ? (
            <div style={{ 
              padding: '14px', 
              textAlign: 'center', 
              color: '#64748B', 
              background: '#FAF5FF', 
              borderRadius: 8, 
              border: '1px dashed #E9D5FF',
              fontSize: 12 
            }}>
              No welfare scheme subscriptions recorded for the {currentYear} period.
            </div>
          ) : (
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse', 
              fontSize: 12, 
              textAlign: 'left' 
            }}>
              <thead>
                <tr style={{ background: '#6D28D9', color: '#ffffff' }}>
                  <th style={{ padding: '8px 10px', borderRadius: '6px 0 0 0' }}>Date</th>
                  <th style={{ padding: '8px 10px' }}>Receipt / Ref #</th>
                  <th style={{ padding: '8px 10px' }}>Payment Mode</th>
                  <th style={{ padding: '8px 10px' }}>Period Covered / Month</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', borderRadius: '0 6px 0 0' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {welfarePayments.map((c: any, idx: number) => {
                  const mName = c.period_month && c.period_month >= 1 && c.period_month <= 12
                    ? MONTH_NAMES[c.period_month - 1]
                    : 'Annual Period';
                  return (
                    <tr 
                      key={c.id || idx}
                      style={{ 
                        borderBottom: '1px solid #E2E8F0',
                        background: idx % 2 === 0 ? '#FFFFFF' : '#FAF5FF'
                      }}
                    >
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>
                        {formatDisplayDate(c.payment_date)}
                      </td>
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: '#64748B' }}>
                        {c.reference_no || c.receipt_no || '—'}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#475569' }}>
                        {formatMethod(c.payment_method)}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#334155' }}>
                        {mName} {c.period_year || currentYear}
                        {c.notes ? ` (${c.notes})` : ''}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#6D28D9' }}>
                        {formatCurrency(Number(c.amount || 0))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#F5F3FF', borderTop: '2px solid #6D28D9', fontWeight: 800 }}>
                  <td colSpan={4} style={{ padding: '8px 10px', textAlign: 'right', textTransform: 'uppercase', fontSize: 11 }}>
                    Total Welfare Scheme Contributions Paid:
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: '#6D28D9', fontSize: 13 }}>
                    {formatCurrency(totalWelfarePaid)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {/* CONSOLIDATED FRATERNAL FINANCIAL OUTFLOWS SUMMARY */}
        {/* ══════════════════════════════════════════════════════════════════════════ */}
        <div style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          borderRadius: 10,
          padding: '16px 20px',
          color: '#ffffff',
          marginBottom: 24,
          pageBreakInside: 'avoid'
        }}>
          <div style={{ 
            fontSize: 11, 
            fontWeight: 800, 
            letterSpacing: '1px', 
            color: '#D4AF37', 
            textTransform: 'uppercase',
            marginBottom: 8
          }}>
            Consolidated Financial Summary ({currentYear})
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 14,
            fontSize: 12.5
          }}>
            <div>
              <span style={{ color: '#94A3B8', fontSize: 11, display: 'block' }}>1. Statutory Dues Paid</span>
              <strong style={{ fontSize: 16, color: '#34D399' }}>{formatCurrency(totalDuesPaid)}</strong>
            </div>

            <div>
              <span style={{ color: '#94A3B8', fontSize: 11, display: 'block' }}>2. Voluntary Relief Appeals</span>
              <strong style={{ fontSize: 16, color: '#F472B6' }}>{formatCurrency(totalVoluntaryPaid)}</strong>
            </div>

            <div>
              <span style={{ color: '#94A3B8', fontSize: 11, display: 'block' }}>3. Welfare Subscriptions</span>
              <strong style={{ fontSize: 16, color: '#C084FC' }}>{formatCurrency(totalWelfarePaid)}</strong>
            </div>

            <div style={{ borderLeft: '1px solid #334155', paddingLeft: 14 }}>
              <span style={{ color: '#FCD34D', fontSize: 11, display: 'block', fontWeight: 800 }}>COMBINED FRATERNAL OUTFLOW</span>
              <strong style={{ fontSize: 18, color: '#FFFFFF' }}>{formatCurrency(grandTotalOutflows)}</strong>
            </div>
          </div>
        </div>

        {/* AUDIT POLICY BENCHMARK NOTICE */}
        <div style={{
          background: '#FDFBF7',
          border: '1px solid #FDE68A',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 26,
          fontSize: 11.5,
          color: '#78350F',
          lineHeight: 1.5,
          pageBreakInside: 'avoid'
        }}>
          <strong>Audit Benchmark Notice:</strong> {financial.benchmarkName}. Threshold required for good standing at this point in the fraternal year is <strong>{formatCurrency(financial.requiredDuesThreshold)}</strong>.
        </div>

        {/* CERTIFICATION SIGNATURE BLOCK */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 30,
          marginTop: 28,
          paddingTop: 16,
          borderTop: '1px dashed #CBD5E1',
          pageBreakInside: 'avoid'
        }}>
          <div>
            <div style={{ borderBottom: '1px solid #0F172A', width: '75%', marginBottom: 6 }} />
            <div style={{ fontSize: 12, fontWeight: 800, color: '#10233F' }}>
              Financial Secretary / Registrar
            </div>
            <div style={{ fontSize: 11, color: '#64748B' }}>
              St. Margaret-Mary Commandery #500
            </div>
            <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>
              Certified Official Financial Statement
            </div>
          </div>

          <div style={{ textAlign: 'right', fontSize: 11, color: '#64748B' }}>
            <div>Document Ref: <strong style={{ color: '#10233F', fontFamily: 'monospace' }}>{statementRef}</strong></div>
            <div style={{ marginTop: 2 }}>Certified as of: <strong>{statementDateFormatted}</strong></div>
            <div style={{ marginTop: 4, fontSize: 10, color: '#94A3B8' }}>
              Ghana Data Protection Act (Act 843) Protected
            </div>
          </div>
        </div>
      </div>

      {/* PRINT STYLES */}
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
          .statement-print-area {
            box-shadow: none !important;
            border: none !important;
            padding: 16px 20px !important;
            margin: 0 !important;
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
