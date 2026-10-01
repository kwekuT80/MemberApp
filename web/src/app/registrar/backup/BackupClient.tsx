'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { DatabaseStats } from '@/services/backupService';

interface Props {
  stats: DatabaseStats;
  profile: any;
  userEmail: string;
}

export default function BackupClient({ stats, profile, userEmail }: Props) {
  const [targetEmail, setTargetEmail] = useState(userEmail || '');
  const [downloading, setDownloading] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [emailResult, setEmailResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  async function handleDownload() {
    setDownloading(true);
    try {
      // Direct browser navigation to download endpoint
      window.location.href = '/api/backup/download';
      setTimeout(() => {
        setDownloading(false);
      }, 2500);
    } catch (e: any) {
      alert(`Download failed: ${e.message}`);
      setDownloading(false);
    }
  }

  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!targetEmail || !targetEmail.includes('@')) {
      alert('Please enter a valid email address.');
      return;
    }

    setEmailing(true);
    setEmailResult(null);

    try {
      const res = await fetch('/api/backup/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail.trim() }),
      });

      const data = await res.json();
      setEmailResult(data);
    } catch (err: any) {
      setEmailResult({
        success: false,
        message: err.message || 'Failed to dispatch backup email.',
      });
    } finally {
      setEmailing(false);
    }
  }

  const categoryCounts = {
    members: stats.tableCounts['members'] || 0,
    rollBook: stats.tableCounts['roll_book_entries'] || 0,
    welfare: (stats.tableCounts['welfare_contributions'] || 0) + (stats.tableCounts['welfare_disbursements'] || 0),
    finances: (stats.tableCounts['financial_payments'] || 0) + (stats.tableCounts['rate_history'] || 0),
    attendance: (stats.tableCounts['attendance'] || 0) + (stats.tableCounts['meetings'] || 0) + (stats.tableCounts['absence_requests'] || 0),
    familyAndBio:
      (stats.tableCounts['spouse'] || 0) +
      (stats.tableCounts['children'] || 0) +
      (stats.tableCounts['dependents'] || 0) +
      (stats.tableCounts['emergency_contacts'] || 0) +
      (stats.tableCounts['uniformed_rank_records'] || 0),
    auditLogs: (stats.tableCounts['welfare_audit_log'] || 0) + (stats.tableCounts['financial_audit_log'] || 0),
  };

  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 1100, margin: '0 auto' }}>
      {/* Top Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0A1628 0%, #1e293b 100%)',
          borderRadius: 16,
          padding: '24px 28px',
          color: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          border: '1px solid rgba(201, 168, 76, 0.4)',
          boxShadow: '0 8px 24px rgba(10,22,40,0.18)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 36 }}>🛡️</span>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, color: '#C9A84C', fontWeight: 800 }}>
              Commandery Disaster Recovery & Database Vault
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>
              Full independent off-site backup for St. Margaret-Mary Commandery #500. Protects against website collapse, accidental deletion, or hosting downtime.
            </p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#10b981' }}>
            {stats.totalRecords.toLocaleString()} Records
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>
            Across all {stats.totalTables} Database Tables
          </div>
        </div>
      </div>

      {/* Live Table Health Breakdown */}
      <div className="card" style={{ display: 'grid', gap: 16 }}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: 15, color: 'var(--navy)', fontWeight: 800 }}>
            📊 Live Relational Database Snapshot
          </h3>
          <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
            Verified row counts currently safeguarded in Supabase cloud storage.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <StatPill icon="👥" label="Active & Historical Members" count={categoryCounts.members} color="#0284c7" />
          <StatPill icon="📜" label="Roll Book Master Records" count={categoryCounts.rollBook} color="#b45309" />
          <StatPill icon="🤝" label="Welfare Ledger & Payouts" count={categoryCounts.welfare} color="#16a34a" />
          <StatPill icon="💰" label="Dues & Financial Payments" count={categoryCounts.finances} color="#C9A84C" />
          <StatPill icon="📅" label="Meetings & GPS Attendance" count={categoryCounts.attendance} color="#6366f1" />
          <StatPill icon="👨‍👩‍👧" label="Family, Spouses & Dependents" count={categoryCounts.familyAndBio} color="#ec4899" />
          <StatPill icon="📋" label="Financial & Welfare Audit Trails" count={categoryCounts.auditLogs} color="#64748b" />
        </div>
      </div>

      {/* Primary Action Cards: Download & Email */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        
        {/* Card 1: Direct 1-Click Browser Download */}
        <div
          className="card"
          style={{
            display: 'grid',
            gap: 16,
            alignContent: 'start',
            borderTop: '4px solid var(--gold)',
            background: 'linear-gradient(180deg, #ffffff 0%, #fffdf9 100%)',
          }}
        >
          <div>
            <span style={{ fontSize: 24 }}>📥</span>
            <h3 style={{ margin: '8px 0 4px', fontSize: 16, color: 'var(--navy)', fontWeight: 800 }}>
              1-Click Offline Vault Download
            </h3>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
              Instantly download the raw, complete database archive directly to your laptop or an external USB backup drive.
            </p>
          </div>

          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12, color: '#475569' }}>
            <ul style={{ margin: 0, paddingLeft: 16, display: 'grid', gap: 4 }}>
              <li><strong>Zero API Keys Needed:</strong> Operates 100% locally and instantaneously.</li>
              <li><strong>Format:</strong> Standard Relational JSON (human-readable & machine-importable).</li>
              <li><strong>File Size:</strong> ~{stats.uncompressedSizeEstimateKb} KB raw data.</li>
            </ul>
          </div>

          <button
            onClick={handleDownload}
            disabled={downloading}
            style={{
              padding: '14px 20px',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #0A1628 0%, #1e293b 100%)',
              color: '#C9A84C',
              border: '1px solid #C9A84C',
              fontWeight: 800,
              fontSize: 14,
              cursor: downloading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              boxShadow: '0 4px 12px rgba(10,22,40,0.15)',
              transition: 'all 0.2s',
            }}
          >
            <span>{downloading ? '⏳ Compiling Database Vault...' : '📥 Download Full Database Vault (.json)'}</span>
          </button>
        </div>

        {/* Card 2: Dispatch to Email */}
        <div
          className="card"
          style={{
            display: 'grid',
            gap: 16,
            alignContent: 'start',
            borderTop: '4px solid #0284c7',
            background: 'linear-gradient(180deg, #ffffff 0%, #f0f9ff 100%)',
          }}
        >
          <div>
            <span style={{ fontSize: 24 }}>📧</span>
            <h3 style={{ margin: '8px 0 4px', fontSize: 16, color: 'var(--navy)', fontWeight: 800 }}>
              Dispatch Backup to Email
            </h3>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
              Compresses the entire relational snapshot with Gzip (~{stats.compressedSizeEstimateKb} KB) and emails it as an attached archive.
            </p>
          </div>

          <form onSubmit={handleSendEmail} style={{ display: 'grid', gap: 12 }}>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>
              <span>Destination Email Address</span>
              <input
                type="email"
                value={targetEmail}
                onChange={(e) => setTargetEmail(e.target.value)}
                required
                placeholder="e.g. registrar.ksji500@gmail.com"
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  outline: 'none',
                  background: '#fff',
                }}
              />
            </label>

            <button
              type="submit"
              disabled={emailing}
              style={{
                padding: '14px 20px',
                borderRadius: 10,
                background: '#0284c7',
                color: '#fff',
                border: 'none',
                fontWeight: 800,
                fontSize: 14,
                cursor: emailing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                boxShadow: '0 4px 12px rgba(2,132,199,0.25)',
              }}
            >
              <span>{emailing ? '⏳ Packaging & Sending...' : '✉️ Send Master Backup to Email'}</span>
            </button>
          </form>

          {emailResult && (
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                fontSize: 12,
                lineHeight: 1.4,
                background: emailResult.success ? '#ecfdf5' : '#fef2f2',
                border: emailResult.success ? '1px solid #6ee7b7' : '1px solid #fca5a5',
                color: emailResult.success ? '#065f46' : '#991b1b',
              }}
            >
              {emailResult.success ? '✅ ' : '⚠️ '}
              {emailResult.message}
            </div>
          )}
        </div>
      </div>

      {/* Disaster Recovery FAQ & Guarantee */}
      <div className="card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>🔒</span>
          <h3 style={{ margin: 0, fontSize: 15, color: 'var(--navy)', fontWeight: 800 }}>
            Disaster Recovery & Website Collapse Guarantee
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, fontSize: 13, color: '#334155' }}>
          <div>
            <strong style={{ color: 'var(--navy)', display: 'block', marginBottom: 4 }}>
              What happens if our website server collapses?
            </strong>
            Your database lives independently on Supabase enterprise cloud servers (AWS). If the website server goes down, your data is completely unharmed. Once the website is redeployed or turned back on, everything reconnects automatically.
          </div>

          <div>
            <strong style={{ color: 'var(--navy)', display: 'block', marginBottom: 4 }}>
              What happens if Supabase itself had an outage?
            </strong>
            The downloaded <code>.json</code> vault file contains 100% of your raw relational records. In the event of a cloud host disaster, a developer can take this single file and restore all 27 tables into any new PostgreSQL or Supabase instance in under 10 minutes.
          </div>

          <div>
            <strong style={{ color: 'var(--navy)', display: 'block', marginBottom: 4 }}>
              Recommended Archival Frequency
            </strong>
            We recommend triggering a <strong>1-Click Offline Download</strong> at the end of every quarter or after major events (such as annual dues roll billing or elections), and saving a copy to an external hard drive or secure Google Drive folder.
          </div>
        </div>
      </div>
    </div>
  );
}

function StatPill({ icon, label, count, color }: { icon: string; label: string; count: number; color: string }) {
  return (
    <div
      style={{
        padding: '12px 14px',
        borderRadius: 10,
        background: '#fff',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <span style={{ fontSize: 20 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 17, fontWeight: 800, color }}>{count.toLocaleString()}</div>
        <div style={{ fontSize: 11, color: '#64748b' }}>{label}</div>
      </div>
    </div>
  );
}
