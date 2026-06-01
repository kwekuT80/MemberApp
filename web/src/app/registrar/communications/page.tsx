export const dynamic = 'force-dynamic';

import React from 'react';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { requireRegistrar } from '@/lib/auth/requireRegistrar';
import { getAllCommunications } from '@/services/communicationService';

// Calculate summary statistics
function calculateStats(communications: any[]) {
  if (!communications) return null;

  const emailCount = communications.filter((c: any) => c.type === 'email').length;
  const smsCount = communications.filter((c: any) => c.type === 'sms').length;
  const deliveredCount = communications.filter(
    (c: any) => c.status === 'delivered' || c.status === 'sent'
  ).length;
  const failedCount = communications.filter(
    (c: any) => c.status === 'failed'
  ).length;

  return {
    total: communications.length,
    emailCount,
    smsCount,
    deliveredCount,
    failedCount,
  };
}

export default async function CommunicationsHubPage() {
  await requireRegistrar();

  let stats = null;
  let recentCommunications: any[] = [];

  try {
    recentCommunications = await getAllCommunications({ dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] });
    stats = calculateStats(recentCommunications);
  } catch (err) {
    // Communications table may not exist yet — show setup prompt instead of crashing
  }

  return (
    <RegistrarShell title="Member Communication" subtitle="Email and SMS messaging hub">

      {/* Database setup required banner */}
      {!stats && (
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
            The Communication tracking tables have not been set up yet in Supabase.
            Please open your <strong>Supabase SQL Editor</strong> and run the master setup script
            located at <code>setup_financial_ledger_complete.sql</code> in the project root.
          </p>
        </div>
      )}

      {/* Stats Summary */}
      {stats && (
        <div className="grid-cols-5" style={{ marginBottom: 32 }}>
          <StatCard label="Total Sent" value={String(stats.total)} icon="📨" color="var(--navy)" />
          <StatCard label="Emails" value={String(stats.emailCount)} icon="📧" color="#1d4ed8" />
          <StatCard label="SMS" value={String(stats.smsCount)} icon="💬" color="#059669" />
          <StatCard label="Delivered" value={String(stats.deliveredCount)} icon="✅" color="#16a34a" />
          <StatCard label="Failed" value={String(stats.failedCount)} icon="❌" color="#dc2626" />
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid-cols-2" style={{ marginBottom: 32 }}>
        <ActionCard href="/registrar/communications/send" icon="✉️" title="Send Communication" description="Compose and send a new email or SMS message to one or more members." buttonText="Start Message →" buttonBg="var(--navy)" textColor="var(--gold)" borderColor="var(--gold)" />
        <ActionCard href="/registrar/communications/history" icon="📋" title="View Communication History" description="Browse all previously sent communications with delivery status and filtering." buttonText="View History →" buttonBg="#059669" textColor="white" borderColor="#059669" />
      </div>

      {/* Recent Communications */}
      {stats && recentCommunications.length > 0 && (
        <div className="card">
          <h3 style={{ margin: '0 0 16px', color: 'var(--navy)', fontWeight: 800, fontSize: 16 }}>
            📬 Recent Communications
          </h3>
          <table className="member-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Member</th>
                <th>Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentCommunications.slice(0, 10).map((comm: any) => (
                <tr key={comm.id}>
                  <td>{new Date(comm.created_at).toLocaleDateString()}</td>
                  <td>{`${comm.members?.first_name || ''} ${comm.members?.surname || ''}`}</td>
                  <td><span className={`badge-${comm.type === 'email' ? 'blue' : 'green'}`}>{comm.type.toUpperCase()}</span></td>
                  <td><span className={comm.status === 'delivered' ? 'badge-green' : comm.status === 'failed' ? 'badge-red' : 'badge-yellow'}>{comm.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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

function ActionCard({ href, icon, title, description, buttonText, buttonBg, textColor, borderColor }: {
  href: string;
  icon: string;
  title: string;
  description: string;
  buttonText: string;
  buttonBg: string;
  textColor: string;
  borderColor: string;
}) {
  return (
    <div className="card" style={{ borderLeftWidth: 4, borderLeftStyle: 'solid', borderLeftColor: borderColor }}>
      <h3 style={{ margin: '0 0 8px', fontWeight: 700 }}>{icon} {title}</h3>
      <p style={{ color: '#6b7280', marginBottom: 16, lineHeight: 1.5 }}>{description}</p>
      <a href={href} className="inline-block px-4 py-2 rounded-lg font-semibold text-sm" style={{ background: buttonBg, color: textColor }}>
        {buttonText}
      </a>
    </div>
  );
}
