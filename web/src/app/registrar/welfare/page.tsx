import React from 'react';
import Link from 'next/link';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { 
  getWelfareSummary, 
  getWelfareContributions, 
  getWelfareDisbursements 
} from '@/services/welfareService';
import { formatDisplayDate } from '@/lib/utils/ksji-logic';

export default async function WelfareDashboardPage() {
  let summary = {
    totalContributions: 0,
    totalDisbursements: 0,
    netFundBalance: 0,
    contributionsThisYear: 0,
    disbursementsThisYear: 0,
    contributingMembersCount: 0,
    activeCategoriesCount: 0,
  };

  let recentContributions: any[] = [];
  let recentDisbursements: any[] = [];

  try {
    summary = await getWelfareSummary();
    recentContributions = await getWelfareContributions({ limit: 5 });
    recentDisbursements = await getWelfareDisbursements({ limit: 5 });
  } catch (err) {
    console.error('Failed to load welfare dashboard data:', err);
  }

  return (
    <RegistrarShell 
      title="Commandery Welfare Scheme" 
      subtitle="Fund oversight, contribution ledgers, benefit disbursements & audit logs"
    >
      <div style={{ padding: '24px 0', color: '#1E293B', fontFamily: 'Inter, sans-serif' }}>
        
        {/* Metric Cards Row */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
          gap: 20, 
          marginBottom: 32 
        }}>
          {/* Card 1: Fund Balance */}
          <div style={{ 
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', 
            borderRadius: 16, 
            padding: 24, 
            color: 'white',
            boxShadow: '0 10px 25px rgba(15, 23, 42, 0.25)',
            border: '1px solid #334155'
          }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1 }}>
              Net Welfare Fund Balance
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#F59E0B', marginTop: 8, fontFamily: 'monospace' }}>
              GH₵ {summary.netFundBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: 12, color: '#CBD5E1', marginTop: 8 }}>
              Cumulative Fund Reserves
            </div>
          </div>

          {/* Card 2: YTD Contributions */}
          <div style={{ 
            background: 'white', 
            borderRadius: 16, 
            padding: 24, 
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1 }}>
              Contributions (This Year)
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#10B981', marginTop: 8, fontFamily: 'monospace' }}>
              GH₵ {summary.contributionsThisYear.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 8 }}>
              Total All-Time: GH₵ {summary.totalContributions.toLocaleString()}
            </div>
          </div>

          {/* Card 3: YTD Disbursements */}
          <div style={{ 
            background: 'white', 
            borderRadius: 16, 
            padding: 24, 
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1 }}>
              Benefit Payouts (This Year)
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#EF4444', marginTop: 8, fontFamily: 'monospace' }}>
              GH₵ {summary.disbursementsThisYear.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 8 }}>
              Total All-Time: GH₵ {summary.totalDisbursements.toLocaleString()}
            </div>
          </div>

          {/* Card 4: Contributing Members */}
          <div style={{ 
            background: 'white', 
            borderRadius: 16, 
            padding: 24, 
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1 }}>
              Active Subscribers
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#3B82F6', marginTop: 8 }}>
              {summary.contributingMembersCount} Members
            </div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 8 }}>
              {summary.activeCategoriesCount} Active Benefit Categories
            </div>
          </div>
        </div>

        {/* Quick Action Navigation Grid */}
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16, color: '#0F172A' }}>
          ⚡ Welfare Operations & Tools
        </h2>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
          gap: 16, 
          marginBottom: 36 
        }}>
          <Link href="/registrar/welfare/contributions" style={actionCardStyle('#10B981')}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>💳</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#0F172A' }}>Record Contributions</div>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
              Collect and log member monthly or annual welfare subscriptions.
            </div>
            <div style={{ marginTop: 16, fontWeight: 800, color: '#10B981', fontSize: 13 }}>
              Open Contributions Ledger →
            </div>
          </Link>

          <Link href="/registrar/welfare/disbursements" style={actionCardStyle('#EF4444')}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>🎁</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#0F172A' }}>Log Benefit Payouts</div>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
              Record offline-approved benefit payouts (bereavement, medical, etc.).
            </div>
            <div style={{ marginTop: 16, fontWeight: 800, color: '#EF4444', fontSize: 13 }}>
              Open Benefit Disbursements →
            </div>
          </Link>

          <Link href="/registrar/welfare/categories" style={actionCardStyle('#3B82F6')}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>⚙️</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#0F172A' }}>Benefit Rules</div>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
              Configure welfare benefit types, entitlement rules, and standard payout amounts.
            </div>
            <div style={{ marginTop: 16, fontWeight: 800, color: '#3B82F6', fontSize: 13 }}>
              Manage Categories →
            </div>
          </Link>

          <Link href="/registrar/welfare/audit" style={actionCardStyle('#8B5CF6')}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>📋</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#0F172A' }}>Welfare Audit Trail</div>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
              Complete chronological audit trail tracking actions of Welfare Treasurer & Admins.
            </div>
            <div style={{ marginTop: 16, fontWeight: 800, color: '#8B5CF6', fontSize: 13 }}>
              View Audit Log →
            </div>
          </Link>
        </div>

        {/* Recent Activity Sections */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
          
          {/* Recent Contributions */}
          <div style={tableContainerStyle}>
            <div style={tableHeaderStyle}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Recent Member Contributions</h3>
              <Link href="/registrar/welfare/contributions" style={{ color: '#10B981', fontWeight: 800, fontSize: 13, textDecoration: 'none' }}>
                View All →
              </Link>
            </div>
            {recentContributions.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
                No contributions recorded yet.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', textAlign: 'left' }}>
                    <th style={{ padding: '10px 16px' }}>Member</th>
                    <th style={{ padding: '10px 16px' }}>Date</th>
                    <th style={{ padding: '10px 16px' }}>Method</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentContributions.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                        {c.members ? `${c.members.first_name} ${c.members.surname}` : 'Unknown'}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748B' }}>
                        {formatDisplayDate(c.payment_date)}
                      </td>
                      <td style={{ padding: '12px 16px', textTransform: 'capitalize', color: '#64748B' }}>
                        {c.payment_method?.replace('_', ' ')}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#10B981', fontFamily: 'monospace' }}>
                        GH₵ {Number(c.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Recent Disbursements */}
          <div style={tableContainerStyle}>
            <div style={tableHeaderStyle}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Recent Benefit Payouts</h3>
              <Link href="/registrar/welfare/disbursements" style={{ color: '#EF4444', fontWeight: 800, fontSize: 13, textDecoration: 'none' }}>
                View All →
              </Link>
            </div>
            {recentDisbursements.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
                No benefit disbursements logged yet.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', textAlign: 'left' }}>
                    <th style={{ padding: '10px 16px' }}>Member</th>
                    <th style={{ padding: '10px 16px' }}>Category</th>
                    <th style={{ padding: '10px 16px' }}>Date</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDisbursements.map((d) => (
                    <tr key={d.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                        {d.members ? `${d.members.first_name} ${d.members.surname}` : 'Unknown'}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748B' }}>
                        {d.category_name}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748B' }}>
                        {formatDisplayDate(d.disbursement_date)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#EF4444', fontFamily: 'monospace' }}>
                        GH₵ {Number(d.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>

      </div>
    </RegistrarShell>
  );
}

function actionCardStyle(accentColor: string): React.CSSProperties {
  return {
    background: 'white',
    borderRadius: 16,
    padding: 24,
    border: '1px solid #E2E8F0',
    borderTop: `4px solid ${accentColor}`,
    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
    textDecoration: 'none',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    transition: 'transform 0.2s ease',
  };
}

const tableContainerStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: 16,
  border: '1px solid #E2E8F0',
  overflow: 'hidden',
  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
};

const tableHeaderStyle: React.CSSProperties = {
  padding: '16px 20px',
  background: '#F8FAFC',
  borderBottom: '1px solid #E2E8F0',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};
