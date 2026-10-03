'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface VerificationData {
  id: string;
  shortCode: string;
  first_name: string;
  surname: string;
  other_names?: string | null;
  title: string;
  photo_url?: string | null;
  status: string;
  date_joined?: string | null;
  date_joined_formatted: string;
  commandery: string;
  commandery_code: string;
  commandery_location: string;
  degreeDetail: {
    degreeLevel: number;
    degreeName: string;
    fullTitle: string;
    badgeLabel: string;
    templeAffiliation: string | null;
    icon: string;
  };
  leadership: {
    activeOffice: string | null;
    isPastPresident: boolean;
    pastPresidentTitle: string | null;
    allOfficesHeld: string[];
  };
  standing: {
    code: string;
    label: string;
    description: string;
    color: string;
    isGoodStanding: boolean;
    isDeceased: boolean;
    isSeniorExempt: boolean;
  };
  verifiedAt: string;
}

export default function VerificationPage() {
  const { id } = useParams();
  const [data, setData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const res = await fetch(`/api/verify/${id}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          const errJson = await res.json().catch(() => ({}));
          setError(errJson.error || 'Membership credential could not be verified.');
        }
      } catch (err: any) {
        console.error('Failed to load member verification:', err);
        setError('Network error verifying credential.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={cardLoadingStyle}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🛡️</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#C9A84C' }}>
            VERIFYING KSJI CREDENTIAL...
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
            Connecting to Commandery #500 Master Registry
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={containerStyle}>
        <div style={{ ...cardBaseStyle, maxWidth: 440, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: '#dc2626', margin: 0 }}>
            UNVERIFIED CREDENTIAL
          </h2>
          <p style={{ fontSize: 13, color: '#475569', margin: '12px 0 24px', lineHeight: 1.5 }}>
            {error || 'This QR identifier does not match any confirmed record in the Commandery #500 database registry.'}
          </p>
          <Link
            href="/login"
            style={{
              display: 'inline-block',
              background: '#0A1628',
              color: '#C9A84C',
              padding: '10px 20px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Access Registrar Portal
          </Link>
        </div>
      </div>
    );
  }

  const { degreeDetail, leadership, standing } = data;
  const fullName = `${data.title} ${data.first_name} ${data.surname}`.trim();

  return (
    <div style={containerStyle}>
      <div style={cardBaseStyle}>
        {/* Top Official Seal & Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <span style={{ fontSize: 28 }}>🛡️</span>
            <div>
              <div style={brandTitleStyle}>KNIGHTS OF ST. JOHN INTERNATIONAL</div>
              <div style={brandSubtitleStyle}>Commandery #500 • Official Public Credential Registry</div>
            </div>
          </div>
        </div>

        {/* Member Portrait & Elevational Badges */}
        <div style={{ textAlign: 'center', padding: '24px 24px 16px' }}>
          <div style={avatarWrapStyle}>
            {data.photo_url ? (
              <img
                src={data.photo_url}
                alt={fullName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 54, background: '#f1f5f9', color: '#64748b' }}>
                👤
              </div>
            )}
            <div style={statusDotStyle(standing.color)} title={standing.label} />
          </div>

          <h1 style={nameStyle}>{fullName}</h1>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            <span style={shortCodePillStyle}>{data.shortCode}</span>
            <span style={degreePillStyle}>
              {degreeDetail.icon} {degreeDetail.fullTitle}
            </span>
            {degreeDetail.templeAffiliation && (
              <span style={templePillStyle}>🏛️ {degreeDetail.templeAffiliation}</span>
            )}
            {leadership.isPastPresident && (
              <span style={leadershipPillStyle}>👑 Past Worthy President</span>
            )}
            {leadership.activeOffice && (
              <span style={officePillStyle}>⚔️ {leadership.activeOffice}</span>
            )}
          </div>
        </div>

        {/* Fraternal Good Standing Certification Block */}
        <div style={{ padding: '0 24px 20px' }}>
          <div style={standingBlockStyle(standing.code, standing.color)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>
                {standing.isDeceased ? '🕊️' : standing.isSeniorExempt ? '⚜️' : standing.isGoodStanding ? '✅' : '⏳'}
              </span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  {standing.label}
                </div>
                <div style={{ fontSize: 11.5, opacity: 0.9, marginTop: 2 }}>
                  {standing.description}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fraternal Verification Details Grid */}
        <div style={{ padding: '0 24px 20px' }}>
          <div style={detailGridStyle}>
            <div style={detailItemStyle}>
              <div style={detailLabelStyle}>Commandery Unit</div>
              <div style={detailValueStyle}>{data.commandery} ({data.commandery_code})</div>
            </div>
            <div style={detailItemStyle}>
              <div style={detailLabelStyle}>Parish Jurisdiction</div>
              <div style={detailValueStyle}>{data.commandery_location}</div>
            </div>
            <div style={detailItemStyle}>
              <div style={detailLabelStyle}>Member Since</div>
              <div style={detailValueStyle}>{data.date_joined_formatted}</div>
            </div>
            <div style={detailItemStyle}>
              <div style={detailLabelStyle}>Highest Degree</div>
              <div style={detailValueStyle}>{degreeDetail.badgeLabel}</div>
            </div>
          </div>
        </div>

        {/* Official Footer Verification Stamp */}
        <div style={footerStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, fontSize: 11, color: '#64748b' }}>
            <span>Verified by Commandery Registrar Suite</span>
            <span>{new Date(data.verifiedAt).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Auxiliary Actions */}
      <div style={{ marginTop: 20, textAlign: 'center', display: 'flex', gap: 16 }}>
        <button
          onClick={() => window.print()}
          style={printButtonStyle}
        >
          🖨️ Print Credential
        </button>
        <Link
          href="/login"
          style={portalLinkStyle}
        >
          Officer Portal
        </Link>
      </div>

      <div style={{ marginTop: 16, fontSize: 11, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
        Knights of St. John International • St. Margaret-Mary Commandery No. 500
      </div>
    </div>
  );
}

// ─── STYLES ─────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #0A1628 0%, #0f172a 100%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '30px 16px',
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
};

const cardBaseStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: 20,
  maxWidth: 480,
  width: '100%',
  boxShadow: '0 24px 48px rgba(0,0,0,0.35)',
  border: '2px solid #C9A84C',
  overflow: 'hidden',
};

const cardLoadingStyle: React.CSSProperties = {
  ...cardBaseStyle,
  padding: '60px 24px',
  textAlign: 'center',
  maxWidth: 380,
};

const headerStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #0A1628 0%, #1e293b 100%)',
  padding: '18px 24px',
  textAlign: 'center',
  color: '#ffffff',
  borderBottom: '1px solid rgba(201, 168, 76, 0.4)',
};

const brandTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  color: '#C9A84C',
  letterSpacing: '1px',
};

const brandSubtitleStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#cbd5e1',
  marginTop: 2,
};

const avatarWrapStyle: React.CSSProperties = {
  width: 120,
  height: 120,
  borderRadius: '50%',
  border: '3px solid #C9A84C',
  margin: '0 auto 16px',
  overflow: 'hidden',
  boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
  position: 'relative',
};

const statusDotStyle = (color: string): React.CSSProperties => ({
  position: 'absolute',
  bottom: 6,
  right: 6,
  width: 16,
  height: 16,
  borderRadius: '50%',
  backgroundColor: color,
  border: '2px solid #ffffff',
  boxShadow: `0 0 8px ${color}`,
});

const nameStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 900,
  color: '#0A1628',
  margin: 0,
  letterSpacing: '-0.3px',
};

const shortCodePillStyle: React.CSSProperties = {
  fontSize: 11,
  fontFamily: 'monospace',
  fontWeight: 800,
  background: '#f1f5f9',
  color: '#334155',
  padding: '4px 8px',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
};

const degreePillStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  background: '#fefce8',
  color: '#854d0e',
  padding: '4px 10px',
  borderRadius: 999,
  border: '1px solid #fef08a',
};

const templePillStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  background: '#eff6ff',
  color: '#1e40af',
  padding: '4px 10px',
  borderRadius: 999,
  border: '1px solid #bfdbfe',
};

const leadershipPillStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  background: '#faf5ff',
  color: '#6b21a8',
  padding: '4px 10px',
  borderRadius: 999,
  border: '1px solid #e9d5ff',
};

const officePillStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  background: '#f0fdf4',
  color: '#166534',
  padding: '4px 10px',
  borderRadius: 999,
  border: '1px solid #bbf7d0',
};

const standingBlockStyle = (code: string, color: string): React.CSSProperties => {
  let bg = 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)';
  let textColor = '#ffffff';

  if (code === 'MEMORIAL_ROLL') {
    bg = 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)';
  } else if (code === 'SENIOR_EXEMPT') {
    bg = 'linear-gradient(135deg, #78350f 0%, #92400e 100%)';
  } else if (code === 'ASSESSMENT_PENDING') {
    bg = 'linear-gradient(135deg, #b45309 0%, #d97706 100%)';
  } else if (code === 'ARCHIVED_DISMISSED') {
    bg = 'linear-gradient(135deg, #991b1b 0%, #b91c1c 100%)';
  } else if (code === 'ARCHIVED_TRANSFERRED') {
    bg = 'linear-gradient(135deg, #334155 0%, #475569 100%)';
  }

  return {
    background: bg,
    color: textColor,
    padding: '14px 18px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.2)',
    boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
  };
};

const detailGridStyle: React.CSSProperties = {
  background: '#f8fafc',
  borderRadius: 12,
  padding: 16,
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 12,
  border: '1px solid #e2e8f0',
};

const detailItemStyle: React.CSSProperties = {
  display: 'grid',
  gap: 2,
};

const detailLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
};

const detailValueStyle: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 700,
  color: '#0f172a',
};

const footerStyle: React.CSSProperties = {
  background: '#f1f5f9',
  padding: '12px 24px',
  borderTop: '1px solid #e2e8f0',
};

const printButtonStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.1)',
  color: '#C9A84C',
  border: '1px solid rgba(201, 168, 76, 0.4)',
  padding: '8px 16px',
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
};

const portalLinkStyle: React.CSSProperties = {
  background: '#C9A84C',
  color: '#0A1628',
  padding: '8px 16px',
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 800,
  textDecoration: 'none',
};
