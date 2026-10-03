'use client';

import React, { useState, useMemo } from 'react';
import { saveDegrees } from '@/services/degreesService';
import { DegreeRecord } from '@/types/degree';
import { formatDisplayDate } from '@/lib/utils/ksji-logic';

interface Props {
  memberId: string;
  initialDegrees: DegreeRecord[];
  degreeTypes: string[];
  member?: any;
}

const toInputDate = (value?: string | null) => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const mdy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const [, mm, dd, yyyy] = mdy;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  const dmy = value.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmy) {
    const [, dd, mm, yyyy] = dmy;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  return '';
};

const fromInputDate = (value?: string | null) => {
  if (!value) return '';
  return value;
};

// Standard Place Presets for easy 1-click input
const KNOWN_PLACE_PRESETS = [
  'St. Margaret-Mary Catholic Church, Dansoman',
  'Archbishop William Porter Chapter of Chevaliers',
  'Accra West Nobles’ Temple',
  'St. Paul’s Catholic Church, Kpehe',
  'St. Margaret-Mary Commandery Meeting Room',
  'Holy Spirit Cathedral, Accra',
];

interface DegreeMeta {
  level: number;
  badgeLabel: string;
  rankName: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
  affiliation: string;
  description: string;
}

function getDegreeMeta(degreeType?: string | null): DegreeMeta {
  const dt = String(degreeType || '').toLowerCase();
  if (dt.includes('5th') || dt.includes('fifth') || dt.includes('noble')) {
    return {
      level: 5,
      badgeLabel: '5th Degree • Noble Brother Elevation',
      rankName: 'Noble Brother (N/B)',
      icon: '👑',
      color: '#C9A84C',
      bgColor: 'linear-gradient(135deg, rgba(201, 168, 76, 0.15) 0%, rgba(128, 0, 32, 0.08) 100%)',
      borderColor: '#C9A84C',
      glowColor: 'rgba(201, 168, 76, 0.3)',
      affiliation: 'Accra West Nobles’ Temple',
      description: 'Conferred with the Highest Ceremonial Honors of the Order. Invested with the dignity and solemn responsibilities of a Noble Brother.',
    };
  }
  if (dt.includes('4th') || dt.includes('fourth') || dt.includes('chevalier')) {
    return {
      level: 4,
      badgeLabel: '4th Degree • Chevalier Elevation',
      rankName: 'Chevalier (Archbishop William Porter Chapter)',
      icon: '🏅',
      color: '#3b82f6',
      bgColor: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(10, 22, 40, 0.06) 100%)',
      borderColor: '#3b82f6',
      glowColor: 'rgba(59, 130, 246, 0.25)',
      affiliation: 'Archbishop William Porter Chapter of Chevaliers',
      description: 'Solemnly exemplified into the Fourth Degree of the Order, inducted as a Chevalier and member of the Archbishop William Porter Chapter.',
    };
  }
  if (dt.includes('2nd') || dt.includes('second') || dt.includes('3rd') || dt.includes('third')) {
    return {
      level: 2,
      badgeLabel: '2nd & 3rd Degrees • Knighthood Advancement',
      rankName: 'Advanced Knight',
      icon: '🛡️',
      color: '#6366f1',
      bgColor: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(248, 250, 252, 0.6) 100%)',
      borderColor: '#818cf8',
      glowColor: 'rgba(99, 102, 241, 0.2)',
      affiliation: 'St. Margaret-Mary Commandery #500',
      description: 'Consecrated advancement in the cardinal fraternal virtues of Faith, Hope, Charity, and loyal Knighthood.',
    };
  }
  return {
    level: 1,
    badgeLabel: '1st Degree • Order Initiation',
    rankName: 'Brother Knight',
    icon: '⚔️',
    color: '#0A1628',
    bgColor: 'linear-gradient(135deg, rgba(10, 22, 40, 0.06) 0%, rgba(201, 168, 76, 0.08) 100%)',
    borderColor: '#cbd5e1',
    glowColor: 'rgba(10, 22, 40, 0.15)',
    affiliation: 'St. Margaret-Mary Commandery #500',
    description: 'Solemn initiation and exemplification into the sacred brotherhood and chivalric discipline of the Knights of St. John International.',
  };
}

export default function DegreesEditor({ memberId, initialDegrees, degreeTypes, member }: Props) {
  const [degrees, setDegrees] = useState<DegreeRecord[]>(
    initialDegrees.length ? initialDegrees.map((d) => ({ ...d, degree_date: toInputDate(d.degree_date) })) : []
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Compute highest degree achieved
  const { highestMeta, sortedDegrees, stageLevels } = useMemo(() => {
    const list = [...degrees].sort((a, b) => {
      const dateA = a.degree_date || '0000-00-00';
      const dateB = b.degree_date || '0000-00-00';
      return dateB.localeCompare(dateA); // Newest first
    });

    let maxLevel = 0;
    let topMeta = getDegreeMeta('1st Degree');

    const achievedLevels = new Set<number>();

    degrees.forEach((d) => {
      const meta = getDegreeMeta(d.degree_type);
      achievedLevels.add(meta.level);
      if (meta.level > maxLevel) {
        maxLevel = meta.level;
        topMeta = meta;
      }
    });

    return {
      highestMeta: topMeta,
      sortedDegrees: list,
      stageLevels: achievedLevels,
    };
  }, [degrees]);

  function update(index: number, key: keyof DegreeRecord, value: string) {
    setDegrees((items) => items.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  }

  async function handleSave() {
    setBusy(true);
    setError(null);
    setMessage(null);
    const existingIds = initialDegrees.filter((d) => d.id).map((d) => d.id) as string[];
    const currentIds = degrees.filter((d) => d.id).map((d) => d.id) as string[];
    const toDelete = existingIds.filter((id) => !currentIds.includes(id));

    const formattedDegrees = degrees.map((d) => ({
      ...d,
      degree_date: fromInputDate(d.degree_date),
    }));

    const result = await saveDegrees(memberId, formattedDegrees, toDelete);
    if (!result.success) {
      setError(result.error || 'Failed to save exemplification records.');
      setBusy(false);
      return;
    }

    setMessage('Exemplification records updated successfully.');
    setBusy(false);
    setIsEditing(false);
    window.location.reload();
  }

  const memberDisplayName = member
    ? [member.title, member.first_name, member.surname].filter(Boolean).join(' ')
    : null;

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* 1. HERO DEGREE STATUS & PROGRESSION BANNER */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0A1628 0%, #172554 55%, #1e1b4b 100%)',
          color: '#ffffff',
          borderRadius: 20,
          padding: '28px 32px',
          boxShadow: '0 10px 30px -5px rgba(10, 22, 40, 0.35)',
          border: '1.5px solid rgba(201, 168, 76, 0.4)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background decorative Maltese crest watermark */}
        <div
          style={{
            position: 'absolute',
            right: '-20px',
            top: '-20px',
            fontSize: '180px',
            opacity: 0.05,
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          ⚔️
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', borderRadius: 20, background: 'rgba(201, 168, 76, 0.15)', border: '1px solid rgba(201, 168, 76, 0.4)', color: '#FCD34D', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
              <span>{highestMeta.icon}</span>
              <span>Conferred Knighthood Status</span>
            </div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: '#ffffff', letterSpacing: -0.5 }}>
              {memberDisplayName ? `${memberDisplayName}’s Exemplifications` : 'Exemplification Records'}
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: '#94a3b8', maxWidth: 620, lineHeight: 1.5 }}>
              Official record of ceremonial Knighthood degrees conferred within the Order of the Knights of St. John International.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                style={{
                  background: 'linear-gradient(135deg, #C9A84C 0%, #b3923b 100%)',
                  color: '#0A1628',
                  border: 'none',
                  padding: '12px 22px',
                  borderRadius: 12,
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 14px rgba(201, 168, 76, 0.3)',
                  transition: 'transform 0.15s ease',
                }}
              >
                <span>✏️</span>
                <span>Edit Exemplifications</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setDegrees((items) => [...items, { degree_type: '1st Degree', degree_date: '', degree_place: '' }])}
                style={{
                  background: '#22c55e',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: 12,
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
                }}
              >
                <span>+</span>
                <span>Add Conferred Degree</span>
              </button>
            )}
          </div>
        </div>

        {/* KNIGHTHOOD PROGRESSION LADDER */}
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid rgba(255, 255, 255, 0.12)', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
            Knighthood Progression Ladder
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {[
              { level: 1, title: '1st Degree', sub: 'Initiation into KSJI', icon: '⚔️' },
              { level: 2, title: '2nd & 3rd Degree', sub: 'Fraternal Advancement', icon: '🛡️' },
              { level: 4, title: '4th Degree', sub: 'Chevalier Elevation', icon: '🏅' },
              { level: 5, title: '5th Degree', sub: 'Noble Brother Elevation', icon: '👑' },
            ].map((step) => {
              const isAchieved = stageLevels.has(step.level);
              return (
                <div
                  key={step.level}
                  style={{
                    background: isAchieved ? 'rgba(201, 168, 76, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                    border: `1.5px solid ${isAchieved ? '#C9A84C' : 'rgba(255, 255, 255, 0.1)'}`,
                    borderRadius: 14,
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    boxShadow: isAchieved ? '0 0 15px rgba(201, 168, 76, 0.15)' : 'none',
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: isAchieved ? '#C9A84C' : 'rgba(255,255,255,0.08)',
                      color: isAchieved ? '#0A1628' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      flexShrink: 0,
                      fontWeight: 800,
                    }}
                  >
                    {isAchieved ? step.icon : '○'}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: isAchieved ? '#ffffff' : '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {step.title}
                    </div>
                    <div style={{ fontSize: 11, color: isAchieved ? '#FCD34D' : '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {isAchieved ? '✓ Conferred' : step.sub}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. ALERTS / FEEDBACK */}
      {message && (
        <div style={{ padding: '14px 18px', background: '#f0fdf4', border: '1.5px solid #22c55e', borderRadius: 12, color: '#166534', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>✅</span>
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div style={{ padding: '14px 18px', background: '#fef2f2', border: '1.5px solid #ef4444', borderRadius: 12, color: '#991b1b', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>❌</span>
          <span>{error}</span>
        </div>
      )}

      {/* 3. SHOWCASE ROSTER (VIEW MODE) */}
      {!isEditing && (
        <div style={{ display: 'grid', gap: 16 }}>
          {sortedDegrees.length === 0 ? (
            <div
              style={{
                background: '#ffffff',
                border: '1.5px dashed #cbd5e1',
                borderRadius: 16,
                padding: '40px 20px',
                textAlign: 'center',
                color: '#64748b',
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 10 }}>📜</div>
              <h3 style={{ margin: '0 0 6px', color: 'var(--navy)', fontWeight: 800 }}>No Exemplification Records Conferred Yet</h3>
              <p style={{ margin: '0 auto 16px', maxWidth: 420, fontSize: 13 }}>
                Click below to add a ceremonial degree conferral record (1st Degree, 2nd & 3rd, 4th Degree Chevalier, or 5th Degree Noble).
              </p>
              <button
                type="button"
                onClick={() => {
                  setDegrees([{ degree_type: '1st Degree', degree_date: '', degree_place: 'St. Margaret-Mary Commandery Meeting Room' }]);
                  setIsEditing(true);
                }}
                style={{
                  background: '#0A1628',
                  color: '#C9A84C',
                  border: '1px solid #C9A84C',
                  padding: '10px 20px',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                + Add First Exemplification
              </button>
            </div>
          ) : (
            sortedDegrees.map((degree, idx) => {
              const meta = getDegreeMeta(degree.degree_type);
              const formattedDate = degree.degree_date ? formatDisplayDate(degree.degree_date) : 'Conferral Date Unrecorded';
              const conferralYear = degree.degree_date ? new Date(degree.degree_date).getFullYear() : null;
              const seniorityYears = conferralYear ? new Date().getFullYear() - conferralYear : null;

              return (
                <div
                  key={degree.id || idx}
                  style={{
                    background: '#ffffff',
                    border: `1.5px solid ${meta.borderColor}`,
                    borderRadius: 16,
                    padding: '24px 28px',
                    boxShadow: `0 4px 16px ${meta.glowColor}`,
                    display: 'grid',
                    gap: 16,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Top Bar: Badge, Affiliation, Seniority */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          padding: '5px 14px',
                          borderRadius: 20,
                          background: meta.bgColor,
                          color: meta.level === 5 ? '#800020' : meta.color,
                          border: `1.5px solid ${meta.borderColor}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <span>{meta.icon}</span>
                        <span>{meta.badgeLabel}</span>
                      </span>

                      <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                        • {meta.affiliation}
                      </span>
                    </div>

                    {seniorityYears !== null && seniorityYears >= 0 && (
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          padding: '4px 10px',
                          borderRadius: 8,
                          background: '#f8fafc',
                          color: '#475569',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        ⏳ {seniorityYears === 0 ? 'Conferred This Year' : `${seniorityYears} Year${seniorityYears === 1 ? '' : 's'} in Degree`}
                      </span>
                    )}
                  </div>

                  {/* Body: Date, Sanctuary, Significance */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18, background: '#f8fafc', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: 0.5, marginBottom: 4 }}>
                        📅 Date of Conferral
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy)' }}>
                        {formattedDate}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: 0.5, marginBottom: 4 }}>
                        📍 Sacred Sanctuary / Temple
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
                        {degree.degree_place || 'Commandery Temple'}
                      </div>
                    </div>
                  </div>

                  {/* Ceremonial Significance Footer */}
                  <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>📜</span>
                    <span>{meta.description}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 4. INTERACTIVE EDIT MODE */}
      {isEditing && (
        <div style={{ display: 'grid', gap: 20 }}>
          <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: 16, padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ margin: '0 0 2px', fontSize: 16, color: 'var(--navy)', fontWeight: 800 }}>
                ✏️ Editing Exemplification Records
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                Update dates, temples, and conferred Knighthood degrees. Changes take effect upon clicking Save.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDegrees((items) => [...items, { degree_type: '1st Degree', degree_date: '', degree_place: '' }])}
              style={{
                background: '#0A1628',
                color: '#C9A84C',
                border: '1px solid #C9A84C',
                padding: '10px 18px',
                borderRadius: 10,
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              + Add Another Degree
            </button>
          </div>

          {degrees.map((degree, index) => {
            const meta = getDegreeMeta(degree.degree_type);
            return (
              <div
                key={degree.id || index}
                style={{
                  background: '#ffffff',
                  border: `2px solid ${meta.borderColor}`,
                  borderRadius: 16,
                  padding: 24,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                  display: 'grid',
                  gap: 16,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20 }}>{meta.icon}</span>
                    <strong style={{ fontSize: 15, color: 'var(--navy)' }}>Record #{index + 1}: {degree.degree_type || 'Unspecified Degree'}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDegrees((items) => items.filter((_, i) => i !== index))}
                    style={{
                      background: '#fee2e2',
                      color: '#b91c1c',
                      border: '1px solid #fecaca',
                      padding: '6px 12px',
                      borderRadius: 8,
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    🗑️ Remove Record
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                  {/* Degree Type Select */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--navy)', marginBottom: 6 }}>
                      Degree Type Conferred:
                    </label>
                    <select
                      value={degree.degree_type || ''}
                      onChange={(e) => update(index, 'degree_type', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '11px 12px',
                        borderRadius: 10,
                        border: '1.5px solid #cbd5e1',
                        fontSize: 14,
                        fontWeight: 700,
                        background: '#ffffff',
                      }}
                    >
                      <option value="">Select Degree…</option>
                      {['1st Degree', '2nd & 3rd Degree', '4th Degree', '5th Degree'].map((t) => (
                        <option key={t} value={t}>
                          {t} {t === '4th Degree' ? '(Chevalier)' : t === '5th Degree' ? '(Noble Brother)' : ''}
                        </option>
                      ))}
                      {degreeTypes
                        .filter((t) => !['1st Degree', '2nd & 3rd Degree', '4th Degree', '5th Degree'].includes(t))
                        .map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                  </div>

                  {/* Date Input */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--navy)', marginBottom: 6 }}>
                      Conferral Date:
                    </label>
                    <input
                      type="date"
                      value={degree.degree_date || ''}
                      onChange={(e) => update(index, 'degree_date', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: '1.5px solid #cbd5e1',
                        fontSize: 14,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Place / Sanctuary Input */}
                  <div style={{ gridColumn: 'span 1' }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--navy)', marginBottom: 6 }}>
                      Temple / Sanctuary / Parish:
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. St. Margaret-Mary Catholic Church, Dansoman"
                      value={degree.degree_place || ''}
                      onChange={(e) => update(index, 'degree_place', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '11px 12px',
                        borderRadius: 10,
                        border: '1.5px solid #cbd5e1',
                        fontSize: 14,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                {/* Quick Sanctuary Presets */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>Quick Temple Presets:</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {KNOWN_PLACE_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => update(index, 'degree_place', preset)}
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '4px 10px',
                          borderRadius: 6,
                          background: degree.degree_place === preset ? '#e0f2fe' : '#f1f5f9',
                          color: degree.degree_place === preset ? '#0369a1' : '#475569',
                          border: `1px solid ${degree.degree_place === preset ? '#7dd3fc' : '#cbd5e1'}`,
                          cursor: 'pointer',
                        }}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 10 }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={busy}
              style={{
                background: 'linear-gradient(135deg, #0A1628 0%, #1e293b 100%)',
                color: '#C9A84C',
                border: '1.5px solid #C9A84C',
                padding: '14px 28px',
                borderRadius: 12,
                fontWeight: 800,
                fontSize: 15,
                cursor: busy ? 'not-allowed' : 'pointer',
                opacity: busy ? 0.7 : 1,
                boxShadow: '0 4px 12px rgba(10, 22, 40, 0.25)',
              }}
            >
              {busy ? '⏳ Saving Exemplifications...' : '💾 Save Exemplification Records'}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setDegrees(
                  initialDegrees.length
                    ? initialDegrees.map((d) => ({ ...d, degree_date: toInputDate(d.degree_date) }))
                    : []
                );
              }}
              disabled={busy}
              style={{
                background: '#ffffff',
                color: '#475569',
                border: '1.5px solid #cbd5e1',
                padding: '14px 24px',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
