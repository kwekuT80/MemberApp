export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { requireFinancialRegistrar } from '@/lib/auth/requireFinancialRegistrar';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { getAssessmentsForYear, getPaymentsForYear } from '@/services/financialService';

export default async function FinancialsHubPage() {
  await requireFinancialRegistrar();
  const currentYear = new Date().getFullYear();

  const [assessments, payments] = await Promise.all([
    getAssessmentsForYear(currentYear),
    getPaymentsForYear(currentYear),
  ]);

  const totalAssessed = assessments.reduce(
    (sum: number, a: any) => sum + parseFloat(a.arrears_brought_forward || 0) + parseFloat(a.annual_assessment || 0), 0
  );
  const totalCollected = payments.reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0);
  const totalOutstanding = totalAssessed - totalCollected;

  const fmt = (n: number) =>
    `GH¢ ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <RegistrarShell title="Financial Ledger" subtitle={`${currentYear} Assessment & Collections Management`}>
      {/* Stats Summary */}
      <div className="grid-cols-3" style={{ marginBottom: 32 }}>
        <StatCard label="Members Billed" value={String(assessments.length)} icon="📋" color="var(--navy)" />
        <StatCard label="Total Assessed" value={fmt(totalAssessed)} icon="📊" color="var(--navy)" />
        <StatCard label="Total Collected" value={fmt(totalCollected)} icon="✅" color="#166534" />
        <StatCard
          label="Outstanding Balance"
          value={fmt(totalOutstanding)}
          icon={totalOutstanding > 0 ? '⚠️' : '🎉'}
          color={totalOutstanding > 0 ? '#991B1B' : '#166534'}
        />
      </div>

      {/* Action Cards */}
      <div className="grid-cols-2" style={{ marginBottom: 32 }}>
        <Link href="/registrar/financials/rates" style={{ textDecoration: 'none' }}>
          <div className="card" style={{
            cursor: 'pointer',
            borderLeft: '5px solid var(--gold)',
            transition: 'transform 0.15s, box-shadow 0.15s',
            padding: 28,
          }}
            onMouseEnter={(e: any) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(10,22,40,0.12)'; }}
            onMouseLeave={(e: any) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚙️</div>
            <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--navy)', marginBottom: 8 }}>
              Set Rates & Generate Bills
            </div>
            <div style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.6 }}>
              Configure yearly assessment rates for Regular, Social, and Student members. 
              Generate annual bills with automatic age-based discounts and arrears rollover.
            </div>
            <div style={{
              marginTop: 16, display: 'inline-block',
              background: 'var(--navy)', color: 'var(--gold)',
              padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 800,
            }}>
              Manage Rates →
            </div>
          </div>
        </Link>

        <Link href="/registrar/financials/payments" style={{ textDecoration: 'none' }}>
          <div className="card" style={{
            cursor: 'pointer',
            borderLeft: '5px solid #16a34a',
            transition: 'transform 0.15s, box-shadow 0.15s',
            padding: 28,
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>💳</div>
            <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--navy)', marginBottom: 8 }}>
              Record Monthly Payments
            </div>
            <div style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.6 }}>
              Log payment receipts for individual members by month and amount. 
              Members instantly see their updated financial standing upon login.
            </div>
            <div style={{
              marginTop: 16, display: 'inline-block',
              background: '#16a34a', color: 'white',
              padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 800,
            }}>
              Log Payments →
            </div>
          </div>
        </Link>
      </div>

      {/* Discount Reference Card */}
      <div className="card">
        <h3 style={{ margin: '0 0 16px', color: 'var(--navy)', fontWeight: 800, fontSize: 16 }}>
          📖 Graduated Age Discount Schedule
        </h3>
        <table className="member-table">
          <thead>
            <tr>
              <th>Age Bracket</th>
              <th>Discount</th>
              <th style={{ textAlign: 'right' }}>Example (Regular @ GH¢ 1,050)</th>
            </tr>
          </thead>
          <tbody>
            {[
              { bracket: 'Over 80 years', discount: '100%', example: 'GH¢ 0.00' },
              { bracket: '75 – 80 years', discount: '50%', example: 'GH¢ 525.00' },
              { bracket: '70 – 75 years', discount: '25%', example: 'GH¢ 787.50' },
              { bracket: 'Under 70 years', discount: '0% (Full Rate)', example: 'GH¢ 1,050.00' },
            ].map(row => (
              <tr key={row.bracket}>
                <td style={{ fontWeight: 700 }}>{row.bracket}</td>
                <td>
                  <span className={row.discount === '100%' ? 'badge-gold' : 'badge-blue'}>
                    {row.discount}
                  </span>
                </td>
                <td style={{ textAlign: 'right', color: 'var(--grey)' }}>{row.example}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </RegistrarShell>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <div className="summary-card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="label" style={{ marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
        </div>
        <div style={{ fontSize: 28 }}>{icon}</div>
      </div>
    </div>
  );
}
