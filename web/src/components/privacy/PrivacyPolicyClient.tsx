'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function PrivacyPolicyClient({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [activeSection, setActiveSection] = useState<'all' | 'controller' | 'basis' | 'archival' | 'security' | 'backups' | 'rights'>('all');

  const statutoryPillars = [
    {
      id: 'controller',
      badge: '🏛️ Act 843 §18',
      title: '1. Data Controller & Processing Scope',
      summary: 'Institutional boundaries and exclusive fraternal purpose of all collected member data.',
      content: (
        <div>
          <p style={{ lineHeight: 1.7, color: '#334155', margin: '0 0 12px' }}>
            <strong>Data Controller:</strong> St. Margaret-Mary Commandery No. 500, Knights of St. John International, P.O. Box DS 1234, Dansoman, Accra, Ghana.
          </p>
          <p style={{ lineHeight: 1.7, color: '#334155', margin: '0 0 12px' }}>
            <strong>Scope of Member Records Processed:</strong>
          </p>
          <ul style={{ lineHeight: 1.8, color: '#334155', paddingLeft: 22, margin: '0 0 14px' }}>
            <li><strong>Personal Identification:</strong> Fraternal titles, full legal names, photos, dates of birth, mobile telephone numbers, and email addresses.</li>
            <li><strong>Sacramental & Knighthood Progression:</strong> Initiation cohort dates, Uniform Exemplification, 4th Degree Chapter honors (Chevalier), and 5th Degree Temple elevations (Noble).</li>
            <li><strong>Governance & Leadership Records:</strong> Elective, appointive, and committee tenures across Commandery, Chapter, Temple, and Board of Trustees.</li>
            <li><strong>Welfare & Family Protection:</strong> Spouses, children, and designated next-of-kin for fraternal welfare scheme benefits and bereavement assistance.</li>
            <li><strong>Treasury & Financial Ledgers:</strong> Annual membership dues assessments, payment transaction receipts, and welfare contribution logs.</li>
          </ul>
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', padding: '14px 18px', borderRadius: 12, color: '#991B1B', fontSize: 13, fontWeight: 600 }}>
            🚫 <strong>Absolute Commercial Prohibition:</strong> Under no circumstances is member data, telephone directories, or financial records sold, leased, rented, shared, or monetized with any commercial, political, or marketing third party. All processing is solely for authentic fraternal administration.
          </div>
        </div>
      ),
    },
    {
      id: 'basis',
      badge: '⚖️ Lawful Ground',
      title: '2. Lawful Basis & Member Consent',
      summary: 'Legitimate Fraternal Interest under Ghana law and constitutional fraternal obligations.',
      content: (
        <div>
          <p style={{ lineHeight: 1.7, color: '#334155', margin: '0 0 12px' }}>
            Under <strong>Section 18 of the Ghana Data Protection Act, 2012 (Act 843)</strong>, data processing is grounded in <strong>Legitimate Fraternal Interest</strong> necessary for administering membership, voting rights, and constitutional duties under the Supreme Constitution of the Knights of St. John International.
          </p>
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '14px 18px', borderRadius: 12, marginTop: 12 }}>
            <div style={{ fontWeight: 800, color: '#0F172A', fontSize: 13, marginBottom: 6 }}>
              📣 Permitted Automated Communications:
            </div>
            <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
              Brothers consent to official fraternal SMS and email broadcasts exclusively for:
              official meeting notices, annual dues assessments, welfare benefit updates, emergency fraternity appeals, and bereavement announcements. Carrier-grade rate-limiting (3 SMS/min) is enforced to ensure spam-free, compliant message delivery.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'archival',
      badge: '🕯️ Fraternal Tradition',
      title: '3. Archival Retention Policy ("The Right to Fraternal History")',
      summary: 'Permanent preservation of deceased members paired with strict operational billing insulation.',
      content: (
        <div>
          <p style={{ lineHeight: 1.7, color: '#334155', margin: '0 0 12px' }}>
            The Commandery balances statutory privacy principles with sacred fraternal tradition:
          </p>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', padding: '14px 18px', borderRadius: 12 }}>
              <div style={{ fontWeight: 800, color: '#166534', fontSize: 14 }}>
                🕊️ Permanent Honor Roll & Historical Archival
              </div>
              <div style={{ fontSize: 13, color: '#15803D', marginTop: 4, lineHeight: 1.6 }}>
                Deceased members are <strong>never deleted from the database</strong>. Their names, initiation cohorts, exemplifications, offices held, and biographical narratives are permanently preserved in the Master Roll and Historical Archive to honor their lifelong service to God and Church.
              </div>
            </div>

            <div style={{ background: '#EFF6FF', border: '1px solid #93C5FD', padding: '14px 18px', borderRadius: 12 }}>
              <div style={{ fontWeight: 800, color: '#1E3A8A', fontSize: 14 }}>
                🛡️ Strict Operational & Billing Insulation
              </div>
              <div style={{ fontSize: 13, color: '#1D4ED8', marginTop: 4, lineHeight: 1.6 }}>
                Deceased, dismissed, and transferred members are <strong>strictly excluded</strong> from annual dues billing, delinquency collection trackers, automated SMS broadcasts, active welfare subscriber metrics, and active Board of Trustees rosters.
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'security',
      badge: '🔒 TLS 1.3 / AES-256',
      title: '4. Technical Infrastructure & Data Security',
      summary: 'Enterprise cloud hosting, cryptographic encryption, and Row-Level Security.',
      content: (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 14 }}>
            <div style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', padding: 14, borderRadius: 12 }}>
              <div style={{ fontSize: 20 }}>🌐</div>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#0F172A', marginTop: 6 }}>Encryption in Transit</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Enforced via modern TLS 1.3 cryptographic protocols with HSTS preloading.</div>
            </div>

            <div style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', padding: 14, borderRadius: 12 }}>
              <div style={{ fontSize: 20 }}>🔐</div>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#0F172A', marginTop: 6 }}>Encryption at Rest</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>All relational database volumes and storage snapshots encrypted with AES-256.</div>
            </div>

            <div style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', padding: 14, borderRadius: 12 }}>
              <div style={{ fontSize: 20 }}>🛡️</div>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#0F172A', marginTop: 6 }}>Row-Level Security (RLS)</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>PostgreSQL policies restrict brothers to strictly viewing their own record.</div>
            </div>

            <div style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', padding: 14, borderRadius: 12 }}>
              <div style={{ fontSize: 20 }}>🪪</div>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#0F172A', marginTop: 6 }}>Sanitized Public QR Verification</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Public verify links only show rank and good-standing seal; financials and contacts are hidden.</div>
            </div>
          </div>
          <p style={{ fontSize: 13, color: '#64748B', margin: 0, lineHeight: 1.6 }}>
            Our underlying database infrastructure is hosted on enterprise cloud data centers holding certified <strong>ISO/IEC 27001, SOC 2 Type II, and PCI DSS compliance</strong>.
          </p>
        </div>
      ),
    },
    {
      id: 'backups',
      badge: '💾 Automated Cron',
      title: '5. Automated Disaster Recovery & Backups',
      summary: 'Weekly scheduled cryptographic snapshots across all 27 relational database tables.',
      content: (
        <div>
          <p style={{ lineHeight: 1.7, color: '#334155', margin: '0 0 12px' }}>
            Data resiliency and long-term continuity are governed by an automated serverless cron engine:
          </p>
          <ul style={{ lineHeight: 1.8, color: '#334155', paddingLeft: 22, margin: '0 0 12px' }}>
            <li><strong>Automated Heartbeat:</strong> Triggers every Sunday at 00:00 UTC via secure cron to capture a full relational database dump.</li>
            <li><strong>Cryptographic Checksum:</strong> Every snapshot archive is verified with an immutable <strong>SHA-256</strong> hash to prevent silent corruption or tampering.</li>
            <li><strong>Gzip Compression & Encrypted Vault:</strong> Snapshots are encrypted and deposited in private storage vaults with time-limited signed URLs, accompanied by an encrypted email digest to the Commandery Registrar disaster recovery inbox.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'rights',
      badge: '👤 Member Rights',
      title: '6. Member Rights & Data Subject Access',
      summary: 'Transparency, self-service profile rectification, and portable good-standing records.',
      content: (
        <div>
          <p style={{ lineHeight: 1.7, color: '#334155', margin: '0 0 12px' }}>
            In compliance with Act 843 Section 26, every initiated brother in good standing retains the right to:
          </p>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#F8FAFC', padding: 12, borderRadius: 10, border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: 18 }}>👁️</span>
              <div>
                <strong style={{ fontSize: 13, color: '#0F172A' }}>Right to Access:</strong>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                  Directly inspect your personal profile, initiation cohort roster, dues ledger, and exemplification records 24/7 via the <code>/me</code> self-service portal.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#F8FAFC', padding: 12, borderRadius: 10, border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: 18 }}>✏️</span>
              <div>
                <strong style={{ fontSize: 13, color: '#0F172A' }}>Right to Rectification:</strong>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                  Submit immediate corrections to telephone numbers, residential addresses, occupation, and next-of-kin through the self-service record update form.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#F8FAFC', padding: 12, borderRadius: 10, border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: 18 }}>📄</span>
              <div>
                <strong style={{ fontSize: 13, color: '#0F172A' }}>Right to Portable Proof of Good Standing:</strong>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                  Generate and download tamper-evident digital ID cards, official good-standing certificates, and payment receipts with verifiable QR codes.
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const filteredPillars = activeSection === 'all'
    ? statutoryPillars
    : statutoryPillars.filter((p) => p.id === activeSection);

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 20px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* ── Top Header & Statutory Compliance Badges ──────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0A1628 0%, #1E1B4B 50%, #172554 100%)',
          borderRadius: 24,
          padding: '36px 40px',
          color: '#FFFFFF',
          marginBottom: 32,
          boxShadow: '0 20px 40px rgba(10, 22, 40, 0.35)',
          borderLeft: '8px solid #C9A84C',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <span
              style={{
                background: 'rgba(201, 168, 76, 0.15)',
                border: '1px solid rgba(201, 168, 76, 0.4)',
                color: '#FDE047',
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              🇬🇭 Statutory Data Governance Standard
            </span>
            <span
              style={{
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                color: '#93C5FD',
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Ghana Act 843 Compliant
            </span>
            <span
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#6EE7B7',
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              🔒 TLS 1.3 / AES-256
            </span>
          </div>

          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900, color: '#FFFFFF', letterSpacing: -0.6 }}>
            Institutional Privacy & Data Protection Policy
          </h1>
          <p style={{ margin: '10px 0 0', fontSize: 15, color: '#CBD5E1', maxWidth: 840, lineHeight: 1.6 }}>
            Knights of St. John International • St. Margaret-Mary Commandery No. 500, Dansoman.
            Governing the sacred collection, storage, operational insulation, and protection of member records in accordance with the <strong>Ghana Data Protection Act, 2012 (Act 843)</strong>.
          </p>

          <div style={{ display: 'flex', gap: 12, marginTop: 22, flexWrap: 'wrap' }}>
            <Link
              href={isAuthenticated ? '/me' : '/login'}
              style={{
                background: '#C9A84C',
                color: '#0A1628',
                padding: '10px 20px',
                borderRadius: 12,
                fontWeight: 800,
                fontSize: 13,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>← Back to {isAuthenticated ? 'My Member Portal' : 'Login'}</span>
            </Link>

            <button
              onClick={() => window.print()}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                padding: '10px 18px',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>🖨️ Print Policy Document</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Filter Tabs ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, background: '#F1F5F9', padding: 6, borderRadius: 16, border: '1px solid #E2E8F0', marginBottom: 28, flexWrap: 'wrap' }}>
        {[
          { id: 'all', label: 'All 6 Statutory Pillars' },
          { id: 'controller', label: '🏛️ Scope & Boundaries' },
          { id: 'basis', label: '⚖️ Lawful Ground' },
          { id: 'archival', label: '🕊️ Memorial Retention' },
          { id: 'security', label: '🔒 Technical Security' },
          { id: 'backups', label: '💾 Disaster Recovery' },
          { id: 'rights', label: '👤 Member Rights' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id as any)}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              border: 'none',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              background: activeSection === tab.id ? '#0A1628' : 'transparent',
              color: activeSection === tab.id ? '#FFFFFF' : '#475569',
              boxShadow: activeSection === tab.id ? '0 2px 8px rgba(10,22,40,0.2)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Statutory Sections Grid ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gap: 24 }}>
        {filteredPillars.map((p) => (
          <div
            key={p.id}
            style={{
              background: '#FFFFFF',
              borderRadius: 18,
              border: '1px solid #E2E8F0',
              padding: '28px 32px',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 12, borderBottom: '1px solid #F1F5F9', paddingBottom: 14 }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {p.badge}
                </span>
                <h2 style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 900, color: '#0F172A' }}>
                  {p.title}
                </h2>
              </div>
              <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>
                {p.summary}
              </span>
            </div>

            <div style={{ marginTop: 16 }}>
              {p.content}
            </div>
          </div>
        ))}
      </div>

      {/* ── Official Legal Stamp & Contact ──────────────────────────────── */}
      <div
        style={{
          marginTop: 36,
          background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
          border: '1.5px solid #BFDBFE',
          borderRadius: 18,
          padding: '24px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 20,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22 }}>🛡️</span>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#1E3A8A' }}>
              Commandery Data Protection & Privacy Oversight
            </div>
          </div>
          <div style={{ fontSize: 13, color: '#334155', marginTop: 4, lineHeight: 1.5 }}>
            Questions regarding data protection, record rectification, or privacy rights should be directed to the Commandery Registrar Desk or Worthy President.
          </div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
            Official Registry Address: St. Margaret-Mary Catholic Church, Dansoman, Accra, Ghana.
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Legal Status
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#047857', marginTop: 2 }}>
            ✅ Fully Certified & In Force
          </div>
          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
            Effective: February 2026 • Commandery #500
          </div>
        </div>
      </div>
    </div>
  );
}
