export const dynamic = 'force-dynamic';

import { requireFinancialRegistrar } from '@/lib/auth/requireFinancialRegistrar';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import DelinquencyPrintView from './DelinquencyPrintView';

interface DelinquencyMember {
  id: string;
  full_name: string;
  phone_number?: string;
  email?: string;
  outstanding_balance: number | string;
  payment_status: string;
  last_assessment_year?: number;
  total_assessed?: number | string;
}

interface DelinquencyBucket {
  key: string;
  label: string;
  members: DelinquencyMember[];
  totalOutstanding: number;
}

export default async function DelinquencyAgingPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; bucket?: string }>;
}) {
  await requireFinancialRegistrar();
  const params = await searchParams;
  const currentYear = parseInt(params.year || new Date().getFullYear().toString());

  // Fetch all members with financial summaries
  const supabase = await createClient();
  const { data: summaries }: any[] | any = await supabase
    .from('member_financial_summary')
    .select('*');

  if (!summaries) return (
    <RegistrarShell title="Delinquency Report" subtitle="">
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--grey)' }}>No data available</div>
    </RegistrarShell>
  );

  // Filter for active delinquent members only
  const filtered = (summaries as any[]).filter((m: any) => m.payment_status === 'delinquent');

  // Categorize into buckets based on outstanding balance ratio
  const bucketMap = new Map<string, DelinquencyMember[]>();
  const totalOutstandingByBucket = new Map<string, number>();

  for (const member of filtered) {
    const balance = parseFloat(member.outstanding_balance || '0');
    const assessed = parseFloat(member.total_assessed || '1') || 1;
    const ratio = balance / assessed;

    let bucket: string;
    if (ratio >= 0.8) bucket = '365_plus';
    else if (ratio >= 0.5) bucket = '180_days';
    else bucket = '90_days';

    const existing = bucketMap.get(bucket) || [];
    bucketMap.set(bucket, [...existing, member as DelinquencyMember]);
    totalOutstandingByBucket.set(bucket, (totalOutstandingByBucket.get(bucket) || 0) + balance);
  }

  const bucketConfig: Record<string, { key: string; label: string }> = {
    '90_days': { key: '90_days', label: 'Within 90 Days' },
    '180_days': { key: '180_days', label: '90–180 Days' },
    '365_plus': { key: '365_plus', label: '180+ Days (Severe)' },
  };

  const buckets: DelinquencyBucket[] = Object.values(bucketConfig)
    .map(config => ({
      ...config,
      members: bucketMap.get(config.key) || [],
      totalOutstanding: totalOutstandingByBucket.get(config.key) || 0,
    }))
    .filter(b => b.members.length > 0);

  // Sort by severity (most severe first)
  buckets.sort((a, b) => {
    const order = { '365_plus': 0, '180_days': 1, '90_days': 2 };
    return order[a.key as keyof typeof order] - order[b.key as keyof typeof order];
  });

  const totalMembers = buckets.reduce((sum, b) => sum + b.members.length, 0);
  const totalOutstanding = buckets.reduce((sum, b) => sum + b.totalOutstanding, 0);

  return (
    <RegistrarShell title="Delinquency Aging Report" subtitle={`${currentYear} | ${totalMembers} Members with Outstanding Balances`}>
      <div className="max-width-container">

        {/* ── PRINT & EXPORT PANEL ── */}
        <DelinquencyPrintView
          buckets={buckets}
          totalOutstanding={totalOutstanding}
          currentYear={currentYear}
        />

        {/* ── DELINQUENCY METRIC CARDS ── */}
        <div className="stats-grid" style={{ marginTop: 24 }}>
          {buckets.map((bucket) => (
            <Link
              key={bucket.key}
              href={`/registrar/financials/delinquency?bucket=${bucket.key}`}
              style={{ textDecoration: 'none' }}
              className="metric-card metric-card-white hover-lift"
            >
              <div>
                <p className="metric-label" style={{ color: 'var(--danger)' }}>{bucket.label}</p>
                <div className="metric-value" style={{ color: 'var(--danger)', fontSize: 24, marginTop: 4 }}>
                  {bucket.members.length} Brothers
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey)' }}>TOTAL OWED</span>
                <span className="badge badge-red" style={{ fontWeight: 900 }}>
                  ₵{bucket.totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* ── BUCKET FILTER TRAY ── */}
        <div className="filter-bar">
          <form method="GET" style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%' }}>
            <label htmlFor="bucket" className="filter-label" style={{ marginBottom: 0 }}>
              Filter by Severity Bucket:
            </label>
            <select
              id="bucket"
              name="bucket"
              defaultValue={params.bucket || ''}
              className="select"
              style={{ maxWidth: 280 }}
            >
              <option value="">All Severity Buckets</option>
              <option value="90_days">Within 90 Days</option>
              <option value="180_days">90–180 Days</option>
              <option value="365_plus">180+ Days (Severe)</option>
            </select>
            <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 12 }}>
              Apply Filter
            </button>
            {params.bucket && (
              <Link href="/registrar/financials/delinquency" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: 12 }}>
                Reset
              </Link>
            )}
          </form>
        </div>

        {/* ── BUCKET SECTIONS ── */}
        {buckets.map((bucket) => {
          const filteredMembers = params.bucket ? (params.bucket === bucket.key ? bucket.members : []) : bucket.members;

          if (filteredMembers.length === 0) return null;

          return (
            <div key={bucket.key} className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 32 }}>
              
              {/* Header section with gradient alert line */}
              <div style={{
                padding: '20px 24px',
                background: 'linear-gradient(90deg, rgba(244, 63, 94, 0.08) 0%, transparent 100%)',
                borderBottom: '1px solid rgba(244, 63, 94, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h3 className="section-header" style={{ margin: 0, color: 'var(--danger)', fontWeight: 900 }}>
                  {bucket.label} ({filteredMembers.length} Brothers)
                </h3>
                <span className="badge badge-red" style={{ fontWeight: 900, fontSize: 12 }}>
                  Total: ₵{bucket.totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="member-table-container">
                <table className="member-table">
                  <thead>
                    <tr>
                      <th>Brother's Name</th>
                      <th>Contact Information</th>
                      <th style={{ textAlign: 'right' }}>Outstanding Balance</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <Link href={`/registrar/members/${m.id}`} style={{ fontWeight: 800, color: 'var(--navy)', textDecoration: 'none' }}>
                            {m.full_name}
                          </Link>
                          <span style={{ display: 'block', fontSize: 10, color: 'var(--grey)', marginTop: 4 }}>
                            ID: {m.id.substring(0, 8).toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <span style={{ display: 'block', fontWeight: 600 }}>{m.phone_number || '—'}</span>
                          <span style={{ display: 'block', fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>{m.email || '—'}</span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 900, color: 'var(--danger)', fontSize: 15 }}>
                          ₵{Number(m.outstanding_balance || 0).toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <Link
                            href={`/registrar/members/${m.id}/dossier`}
                            className="btn btn-primary btn-action"
                          >
                            View Dossier
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

      </div>
    </RegistrarShell>
  );
}
