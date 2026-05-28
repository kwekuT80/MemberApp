export const dynamic = 'force-dynamic';

import { requireFinancialRegistrar } from '@/lib/auth/requireFinancialRegistrar';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { getAllMemberSummaries } from '@/services/financialService';
import Link from 'next/link';

interface SummaryFilters {
  status?: string;
  search?: string;
}

export default async function MemberSummaryPage({
  searchParams,
}: {
  searchParams: Promise<SummaryFilters>;
}) {
  await requireFinancialRegistrar();
  const filters = await searchParams;

  const summaries = await getAllMemberSummaries(filters);

  // Calculate aggregate statistics
  const totalAssessed = summaries.reduce((s, m) => s + parseFloat(m.total_assessed || 0), 0);
  const totalPaid = summaries.reduce((s, m) => s + parseFloat(m.total_paid || 0), 0);
  const totalOutstanding = totalAssessed - totalPaid;
  const delinquentCount = summaries.filter(m => m.payment_status === 'delinquent').length;
  
  const collectionRate = totalAssessed > 0 ? (totalPaid / totalAssessed) * 100 : 0;

  return (
    <RegistrarShell title="Member Financial Overview" subtitle="Consolidated real-time billing and payment summary for all members">
      <div className="max-width-container">
        
        {/* ── AGGREGATE STATS BOARD ── */}
        <div className="stats-grid">
          
          {/* Card 1: Assessed */}
          <div className="metric-card metric-card-navy">
            <div>
              <p className="metric-label">Total Assessed</p>
              <div className="metric-value">
                ₵{totalAssessed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <p className="metric-desc">Cumulative historical billing</p>
          </div>

          {/* Card 2: Collected */}
          <div className="metric-card metric-card-white">
            <div>
              <p className="metric-label" style={{ color: 'var(--success)' }}>Total Collected</p>
              <div className="metric-value" style={{ color: 'var(--success)' }}>
                ₵{totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="progress-bar-container">
              <div className="progress-bar-labels">
                <span style={{ color: 'var(--grey)', fontSize: 10 }}>COLLECTION RATE</span>
                <span style={{ color: 'var(--success)', fontWeight: 800 }}>{collectionRate.toFixed(1)}%</span>
              </div>
              <div className="progress-bar-bg">
                <div 
                  className="progress-bar-fill"
                  style={{ width: `${Math.min(collectionRate, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 3: Outstanding */}
          <div className="metric-card metric-card-white">
            <div>
              <p className="metric-label" style={{ color: 'var(--warning)' }}>Outstanding</p>
              <div className="metric-value" style={{ color: 'var(--warning)' }}>
                ₵{totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <p className="metric-desc">Pending dues balance</p>
          </div>

          {/* Card 4: Delinquent */}
          <div className="metric-card metric-card-white">
            <div>
              <p className="metric-label" style={{ color: 'var(--danger)' }}>Delinquent</p>
              <div className="metric-value" style={{ color: 'var(--danger)' }}>
                {delinquentCount} Brothers
              </div>
            </div>
            <p className="metric-desc">Zero payments recorded</p>
          </div>

        </div>

        {/* ── FILTER BAR ── */}
        <div className="filter-bar">
          <form method="GET" style={{ display: 'flex', width: '100%', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
            
            <div className="filter-group">
              <label htmlFor="search" className="filter-label">Search Members</label>
              <input
                id="search"
                type="text"
                name="search"
                defaultValue={filters.search || ''}
                placeholder="Search by brother's name, email..."
                className="input"
              />
            </div>

            <div className="filter-group" style={{ maxWidth: 260 }}>
              <label htmlFor="status" className="filter-label">Payment Status</label>
              <select
                id="status"
                name="status"
                defaultValue={filters.status || ''}
                className="select"
              >
                <option value="">All Statuses</option>
                <option value="paid">Fully Paid</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="delinquent">Delinquent</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" className="btn btn-gold">
                Apply Filter
              </button>
              <Link href="/registrar/financials/members" className="btn btn-secondary">
                Reset
              </Link>
            </div>

          </form>
        </div>

        {/* ── MEMBER TABLE ── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="member-table-container">
            <table className="member-table">
              <thead>
                <tr>
                  <th>Brother's Name</th>
                  <th>Contact Info</th>
                  <th style={{ textAlign: 'right' }}>Total Assessed</th>
                  <th style={{ textAlign: 'right' }}>Total Paid</th>
                  <th style={{ textAlign: 'right' }}>Outstanding</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {summaries.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--grey)' }}>
                      No member financial summaries match the current filters.
                    </td>
                  </tr>
                ) : (
                  summaries.map((m) => {
                    const balance = parseFloat(m.outstanding_balance || 0);
                    return (
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
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>
                          ₵{parseFloat(m.total_assessed || 0).toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>
                          ₵{parseFloat(m.total_paid || 0).toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 900, color: balance > 0 ? 'var(--warning)' : 'var(--success)' }}>
                          ₵{balance.toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${
                            m.payment_status === 'paid'
                              ? 'badge-green'
                              : m.payment_status === 'partially_paid'
                              ? 'badge-amber'
                              : 'badge-red'
                          }`}>
                            {m.payment_status === 'paid' ? 'Fully Paid' : m.payment_status === 'partially_paid' ? 'Partially Paid' : 'Delinquent'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <Link href={`/registrar/members/${m.id}/dossier`} className="btn btn-primary btn-action">
                            View Dossier
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </RegistrarShell>
  );
}
