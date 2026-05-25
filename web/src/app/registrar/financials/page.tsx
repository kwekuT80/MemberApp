export const dynamic = 'force-dynamic';

import { requireFinancialRegistrar } from '@/lib/auth/requireFinancialRegistrar';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { getAssessmentsForYear, getPaymentsForYear } from '@/services/financialService';
import ActionCard from '@/components/financials/ActionCard';

export default async function FinancialsHubPage() {
  await requireFinancialRegistrar();
  const currentYear = new Date().getFullYear();

  let assessments: any[] = [];
  let payments: any[] = [];
  let setupRequired = false;

  try {
    [assessments, payments] = await Promise.all([
      getAssessmentsForYear(currentYear),
      getPaymentsForYear(currentYear),
    ]);
  } catch (err: any) {
    // Tables likely don't exist yet — show setup prompt instead of crashing
    setupRequired = true;
  }

  const totalAssessed = assessments.reduce(
    (sum: number, a: any) => sum + parseFloat(a.arrears_brought_forward || 0) + parseFloat(a.annual_assessment || 0), 0
  );
  const totalCollected = payments.reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0);
  const totalOutstanding = totalAssessed - totalCollected;

  const fmt = (n: number) =>
    `GH¢ ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <RegistrarShell title="Financial Ledger" subtitle={`${currentYear} Assessment & Collections Management`}>

      {/* Database setup required banner */}
      {setupRequired && (
        <div className="card" style={{
          borderLeft: '5px solid #dc2626',
          padding: 28,
          marginBottom: 32,
          background: '#fff5f5',
        }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontWeight: 800, fontSize: 18, color: '#dc2626', marginBottom: 8 }}>
            Database Setup Required
          </div>
          <p style={{ color: '#7f1d1d', lineHeight: 1.7, marginBottom: 16 }}>
            The Financial Ledger database tables have not been set up yet in Supabase.
            Please open your <strong>Supabase SQL Editor</strong> and run the master setup script
            located at <code>setup_financial_ledger_complete.sql</code> in the project root.
          </p>
          <div style={{ fontSize: 13, color: '#991b1b', background: '#fee2e2', padding: '12px 16px', borderRadius: 8 }}>
            This script is safe to re-run. It creates the tables, updates role permissions,
            and promotes your account to <code>super_admin</code>.
          </div>
        </div>
      )}

      {/* Stats Summary + Action Cards (only when setup is complete) */}
      {!setupRequired && <>
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

      <div className="grid-cols-2" style={{ marginBottom: 32 }}>
        <ActionCard href="/registrar/financials/rates" icon="⚙️" title="Set Rates & Generate Bills" description="Configure yearly assessment rates for Regular, Social, and Student members. Generate annual bills with automatic age-based discounts and arrears rollover." buttonText="Manage Rates →" buttonBg="var(--navy)" textColor="var(--gold)" borderColor="var(--gold)" />
        <ActionCard href="/registrar/financials/payments" icon="💳" title="Record Monthly Payments" description="Log payment receipts for individual members by month and amount. Members instantly see their updated financial standing upon login." buttonText="Log Payments →" buttonBg="#16a34a" textColor="white" borderColor="#16a34a" />
      </div>
      </>}

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
