export const dynamic = 'force-dynamic';

import { requireFinancialRegistrar } from '@/lib/auth/requireFinancialRegistrar';
import RegistrarShell from '@/components/layout/RegistrarShell';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

interface DashboardMetric {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  description?: string;
}

export default async function CommanderyHealthPage() {
  await requireFinancialRegistrar();
  const currentYear = new Date().getFullYear();

  // Fetch all metrics in parallel
  const supabase = await createClient();

  // Total active members
  const { count: totalMembers } = await supabase
    .from('members')
    .select('*', { count: 'exact', head: true })
    .not('status', 'in', '("Dismissed","Transfer-Out","Deceased")');

  // Members with financial summaries (those who have been assessed)
  const { count: assessedCount } = await supabase
    .from('financial_assessments')
    .select('*', { count: 'exact' })
    .eq('year', currentYear);

  // Delinquent members count (exclude dismissed, transferred-out, or deceased)
  const { count: delinquentMembers } = await supabase
    .from('member_financial_summary')
    .select('*', { count: 'exact', head: true })
    .eq('payment_status', 'delinquent');

  // NOTE: member_financial_summary SQL view now filters these members server-side.
  // Keeping this query as-is since the view already handles exclusion.

  // Total payments this year
  const { data: payments } = await supabase
    .from('financial_payments')
    .select('amount')
    .eq('assessment_year', currentYear);

  const totalPaymentsSum =
    payments?.reduce(
      (total, row) => total + (Number(row.amount) || 0),
      0
    ) ?? 0;

  // Calculate metrics
  const paymentComplianceRate =
    assessedCount && assessedCount > 0
      ? (
          (
            assessedCount -
            (delinquentMembers || 0)
          ) /
          assessedCount *
          100
        ).toFixed(1)
      : '0.0';

  const totalRevenue = totalPaymentsSum;

  // Active vs inactive member ratio
  const activeMemberRatio = totalMembers ? `${((totalMembers as number) > 0 ? ((assessedCount || 0) / (totalMembers as number)) * 100 : 0).toFixed(1)}%` : 'N/A';

  const metrics: DashboardMetric[] = [
    {
      label: 'Active Brothers',
      value: totalMembers || 0,
      description: 'Total active registered roster',
    },
    {
      label: 'Assessed Members',
      value: assessedCount || 0,
      trend: 'neutral',
      description: `Members ledgered for ${currentYear}`,
    },
    {
      label: 'Payment Compliance',
      value: `${paymentComplianceRate}%`,
      trend: (parseFloat(paymentComplianceRate) > 80 ? 'up' : 'down'),
      description: 'Members current on dues obligations',
    },
    {
      label: 'Active Member Ratio',
      value: activeMemberRatio,
      trend: 'neutral',
      description: 'Assessed vs total registered members',
    },
    {
      label: 'Delinquent Members',
      value: delinquentMembers || 0,
      trend: (delinquentMembers || 0) > 5 ? 'down' : 'neutral',
      description: 'Zero payments registered this year',
    },
    {
      label: 'Total Revenue Collected',
      value: `₵${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      trend: 'up',
      description: `${currentYear} financial collections`,
    },
  ];

  return (
    <RegistrarShell title="Commandery Health Dashboard" subtitle="Aggregate metrics for chapter financial oversight and strategic planning">
      <div className="max-width-container">

        {/* ── KEY METRICS BOARD ── */}
        <div className="stats-grid">
          {metrics.map((metric) => {
            const isNavyCard = metric.label.includes('Revenue') || metric.label.includes('Compliance');
            return (
              <div key={metric.label} className={`metric-card ${isNavyCard ? 'metric-card-navy' : 'metric-card-white'}`}>
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <p className="metric-label" style={{ margin: 0 }}>{metric.label}</p>
                    {metric.trend && (
                      <span className={`badge ${
                        metric.trend === 'up' ? 'badge-green' :
                        metric.trend === 'down' ? 'badge-red' :
                        'badge-grey'
                      }`} style={{ fontSize: 9, padding: '3px 8px' }}>
                        {metric.trend === 'up' ? '▲ Improving' : metric.trend === 'down' ? '▼ Alert' : '● Stable'}
                      </span>
                    )}
                  </div>

                  <div className="metric-value" style={{ margin: 0 }}>
                    {metric.value}
                  </div>
                </div>

                <p className="metric-desc" style={{ marginTop: 12, marginBottom: 0 }}>{metric.description}</p>
              </div>
            );
          })}
        </div>

        {/* ── QUICK ACTIONS BOARD ── */}
        <div className="card">
          <h3 className="section-header" style={{ marginBottom: 20 }}>Financial Administrative Toolkit</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            
            <Link
              href="/registrar/financials/delinquency"
              style={{
                display: 'block',
                padding: '24px',
                background: 'rgba(244, 63, 94, 0.05)',
                border: '1.5px solid rgba(244, 63, 94, 0.15)',
                borderRadius: '12px',
                textDecoration: 'none',
                transition: 'all 0.2s'
              }}
              className="hover-card-rose"
            >
              <span style={{ fontWeight: 900, color: 'var(--danger)', display: 'block', fontSize: 16 }}>
                View Delinquency Report
              </span>
              <span style={{ display: 'block', fontSize: 13, color: 'var(--grey)', marginTop: 6 }}>
                Analyze outstanding member dues categorized by aging severity buckets.
              </span>
            </Link>

            <Link
              href="/registrar/financials/members"
              style={{
                display: 'block',
                padding: '24px',
                background: 'rgba(59, 130, 246, 0.05)',
                border: '1.5px solid rgba(59, 130, 246, 0.15)',
                borderRadius: '12px',
                textDecoration: 'none',
                transition: 'all 0.2s'
              }}
              className="hover-card-blue"
            >
              <span style={{ fontWeight: 900, color: '#1D4ED8', display: 'block', fontSize: 16 }}>
                Member Financial Overview
              </span>
              <span style={{ display: 'block', fontSize: 13, color: 'var(--grey)', marginTop: 6 }}>
                Access consolidated dues lists, payment ratios, and individual member ledgers.
              </span>
            </Link>

            <Link
              href="/registrar/financials/payments"
              style={{
                display: 'block',
                padding: '24px',
                background: 'rgba(16, 185, 129, 0.05)',
                border: '1.5px solid rgba(16, 185, 129, 0.15)',
                borderRadius: '12px',
                textDecoration: 'none',
                transition: 'all 0.2s'
              }}
              className="hover-card-green"
            >
              <span style={{ fontWeight: 900, color: 'var(--success)', display: 'block', fontSize: 16 }}>
                Record Dues Payments
              </span>
              <span style={{ display: 'block', fontSize: 13, color: 'var(--grey)', marginTop: 6 }}>
                Log monthly transaction receipts, adjust ledgers, and audit payment entries.
              </span>
            </Link>

          </div>
        </div>

      </div>
    </RegistrarShell>
  );
}
