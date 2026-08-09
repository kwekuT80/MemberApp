'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export interface PresidentItem {
  no: number;
  memberId: string;
  title: string;
  name: string;
  tenure: string;
  duration: string;
  status: string;
  isDeceased: boolean;
  isIncumbent: boolean;
}

export default function RollOfWorthyPresidentsClient({
  presidentsList,
  isRegistrar = false,
}: {
  presidentsList: PresidentItem[];
  isRegistrar?: boolean;
}) {
  const [filter, setFilter] = useState<'all' | 'living' | 'deceased'>('all');

  const totalCount = presidentsList.length;
  const livingCount = presidentsList.filter((p) => !p.isDeceased).length;
  const deceasedCount = presidentsList.filter((p) => p.isDeceased).length;

  const filteredList = presidentsList.filter((p) => {
    if (filter === 'living') return !p.isDeceased;
    if (filter === 'deceased') return p.isDeceased;
    return true;
  });

  return (
    <div style={{ color: '#0F172A', fontFamily: 'Inter, sans-serif' }}>
      
      {/* ── Executive Hero Banner ────────────────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #1E293B 100%)',
          borderRadius: 24,
          padding: '36px 40px',
          color: 'white',
          marginBottom: 32,
          boxShadow: '0 20px 40px rgba(15, 23, 42, 0.3)',
          borderLeft: '8px solid #F59E0B',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle background crest accent */}
        <div
          style={{
            position: 'absolute', right: -20, bottom: -30, opacity: 0.05,
            fontSize: 180, pointerEvents: 'none', userSelect: 'none',
          }}
        >
          👑
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24, position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)', color: '#FDE047', padding: '6px 14px', borderRadius: 30, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 }}>
              ✨ Commandery No. 500 Leadership Heritage
            </div>
            <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900, letterSpacing: -0.8, color: '#FFFFFF' }}>
              Roll of Worthy Presidents
            </h1>
            <p style={{ margin: '10px 0 0', fontSize: 15, color: '#94A3B8', maxWidth: 640, lineHeight: 1.6 }}>
              Chronological roll of honor celebrating the Worthy Presidents who have presided over St. Margaret-Mary Commandery No. 500 from 1996 through present day.
            </p>
          </div>

          {/* Metric Badges */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.07)', backdropFilter: 'blur(12px)', padding: '16px 22px', borderRadius: 16, border: '1px solid rgba(255, 255, 255, 0.12)', textAlign: 'center', minWidth: 110 }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#F59E0B', fontFamily: 'monospace' }}>{totalCount}</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#CBD5E1', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Presidents</div>
            </div>

            <div style={{ background: 'rgba(16, 185, 129, 0.1)', backdropFilter: 'blur(12px)', padding: '16px 22px', borderRadius: 16, border: '1px solid rgba(52, 211, 153, 0.25)', textAlign: 'center', minWidth: 110 }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#34D399', fontFamily: 'monospace' }}>{livingCount}</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#A7F3D0', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Living</div>
            </div>

            <div style={{ background: 'rgba(129, 140, 248, 0.12)', backdropFilter: 'blur(12px)', padding: '16px 22px', borderRadius: 16, border: '1px solid rgba(165, 180, 252, 0.3)', textAlign: 'center', minWidth: 130 }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#C7D2FE', fontFamily: 'monospace' }}>🕯️ {deceasedCount}</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#E0E7FF', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Roll of Honor</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter & Search Toolbar ─────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        {/* Interactive Filter Pills */}
        <div style={{ display: 'flex', gap: 8, background: '#F1F5F9', padding: 5, borderRadius: 30, border: '1px solid #E2E8F0' }}>
          <button
            onClick={() => setFilter('all')}
            style={{
              padding: '8px 18px',
              borderRadius: 24,
              border: 'none',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: filter === 'all' ? '#0F172A' : 'transparent',
              color: filter === 'all' ? '#FFFFFF' : '#475569',
              boxShadow: filter === 'all' ? '0 2px 8px rgba(15,23,42,0.2)' : 'none',
            }}
          >
            All Presidents ({totalCount})
          </button>

          <button
            onClick={() => setFilter('living')}
            style={{
              padding: '8px 18px',
              borderRadius: 24,
              border: 'none',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: filter === 'living' ? '#065F46' : 'transparent',
              color: filter === 'living' ? '#FFFFFF' : '#047857',
              boxShadow: filter === 'living' ? '0 2px 8px rgba(6,95,70,0.2)' : 'none',
            }}
          >
            🟢 Living Past & Incumbent ({livingCount})
          </button>

          <button
            onClick={() => setFilter('deceased')}
            style={{
              padding: '8px 18px',
              borderRadius: 24,
              border: 'none',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: filter === 'deceased' ? 'linear-gradient(135deg, #312E81 0%, #1E1B4B 100%)' : 'transparent',
              color: filter === 'deceased' ? '#FDE047' : '#3730A3',
              boxShadow: filter === 'deceased' ? '0 2px 8px rgba(49,46,129,0.3)' : 'none',
            }}
          >
            🕯️ Roll of Honor ({deceasedCount})
          </button>
        </div>

        <div style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>
          Showing {filteredList.length} of {totalCount} records
        </div>
      </div>

      {/* ── Succession Table Card ───────────────────────────────────────── */}
      <div style={{ background: 'white', borderRadius: 20, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.04)', marginBottom: 40 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', color: '#475569', textAlign: 'left', borderBottom: '2px solid #E2E8F0' }}>
                <th style={{ padding: '16px 20px', width: 65, textAlign: 'center', fontSize: 12, fontWeight: 900, letterSpacing: 0.8, textTransform: 'uppercase' }}>NO.</th>
                <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 900, letterSpacing: 0.8, textTransform: 'uppercase' }}>WORTHY PRESIDENT</th>
                <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 900, letterSpacing: 0.8, textTransform: 'uppercase' }}>TENURE</th>
                <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 900, letterSpacing: 0.8, textTransform: 'uppercase' }}>DURATION</th>
                <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 900, letterSpacing: 0.8, textTransform: 'uppercase' }}>STATUS & RECOGNITION</th>
                {isRegistrar && (
                  <th style={{ padding: '16px 20px', textAlign: 'right', fontSize: 12, fontWeight: 900, letterSpacing: 0.8, textTransform: 'uppercase' }}>ACTION</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredList.map((item) => {
                const isDeceased = item.isDeceased;
                const isIncumbent = item.isIncumbent;

                return (
                  <tr
                    key={item.memberId + '-' + item.no}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      borderLeft: isIncumbent ? '5px solid #F59E0B' : isDeceased ? '5px solid #6366F1' : '5px solid #10B981',
                      background: isIncumbent
                        ? 'linear-gradient(90deg, rgba(254,243,199,0.4) 0%, rgba(255,255,255,0) 100%)'
                        : isDeceased
                        ? 'linear-gradient(90deg, rgba(99,102,241,0.03) 0%, rgba(255,255,255,0) 100%)'
                        : item.no % 2 === 0 ? '#FAFDFB' : '#FFFFFF',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    {/* Succession Number */}
                    <td style={{ padding: '18px 20px', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justify: 'center',
                          width: 32,
                          height: 32,
                          borderRadius: 99,
                          background: isIncumbent ? '#FEF3C7' : isDeceased ? '#EEF2FF' : '#F1F5F9',
                          color: isIncumbent ? '#D97706' : isDeceased ? '#4338CA' : '#475569',
                          fontSize: 13,
                          fontWeight: 900,
                          border: isIncumbent ? '1px solid #FCD34D' : isDeceased ? '1px solid #C7D2FE' : '1px solid #E2E8F0',
                        }}
                      >
                        {item.no}
                      </span>
                    </td>

                    {/* Name & Honorific */}
                    <td style={{ padding: '18px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {/* Icon Badge */}
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justify: 'center',
                            fontSize: 18,
                            background: isIncumbent ? '#FEF3C7' : isDeceased ? '#312E81' : '#E6F4EA',
                            color: isIncumbent ? '#D97706' : isDeceased ? '#FDE047' : '#166534',
                            border: isIncumbent ? '1.5px solid #F59E0B' : isDeceased ? '1.5px solid #6366F1' : '1.5px solid #34D399',
                            flexShrink: 0,
                            boxShadow: isDeceased ? '0 2px 8px rgba(49, 46, 129, 0.25)' : 'none',
                          }}
                        >
                          {isIncumbent ? '👑' : isDeceased ? '🕯️' : '🛡️'}
                        </div>

                        <div>
                          <div style={{ fontWeight: 800, color: isDeceased ? '#1E1B4B' : '#0F172A', fontSize: 16 }}>
                            {item.title} {item.name}
                          </div>

                          {item.no === 1 && (
                            <div style={{ fontSize: 11, fontWeight: 800, color: '#D97706', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                              🌟 Pioneer Charter Worthy President
                            </div>
                          )}

                          {isIncumbent && (
                            <div style={{ fontSize: 11, fontWeight: 800, color: '#15803D', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                              ✨ Incumbent Worthy President (2026 – Present)
                            </div>
                          )}

                          {isDeceased && (
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#4338CA', marginTop: 2, fontStyle: 'italic' }}>
                              🕊️ In Loving Memory & Eternal Honor
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Tenure */}
                    <td style={{ padding: '18px 20px', fontWeight: 900, color: isIncumbent ? '#D97706' : isDeceased ? '#3730A3' : '#2563EB', fontFamily: 'monospace', fontSize: 15 }}>
                      {item.tenure}
                    </td>

                    {/* Duration */}
                    <td style={{ padding: '18px 20px', fontWeight: 700, color: '#475569' }}>
                      <span
                        style={{
                          background: isIncumbent ? '#FEF3C7' : isDeceased ? '#EEF2FF' : '#F1F5F9',
                          color: isIncumbent ? '#92400E' : isDeceased ? '#3730A3' : '#475569',
                          border: isIncumbent ? '1px solid #FCD34D' : isDeceased ? '1px solid #C7D2FE' : '1px solid #E2E8F0',
                          padding: '5px 12px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        ⏱️ {item.duration}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: '18px 20px' }}>
                      {isIncumbent ? (
                        <span
                          style={{
                            background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
                            color: '#78350F',
                            border: '1px solid #F59E0B',
                            padding: '6px 14px',
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 900,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            boxShadow: '0 2px 6px rgba(245, 158, 11, 0.2)',
                          }}
                        >
                          👑 Incumbent
                        </span>
                      ) : isDeceased ? (
                        <span
                          style={{
                            background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)',
                            color: '#FDE047',
                            border: '1px solid #6366F1',
                            padding: '6px 14px',
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            boxShadow: '0 4px 12px rgba(49, 46, 129, 0.25)',
                          }}
                        >
                          🕯️ Roll of Honor
                        </span>
                      ) : (
                        <span
                          style={{
                            background: '#F0FDF4',
                            color: '#15803D',
                            border: '1px solid #86EFAC',
                            padding: '6px 14px',
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          🟢 Active Past President
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    {isRegistrar && (
                      <td style={{ padding: '18px 20px', textAlign: 'right' }}>
                        <Link
                          href={`/registrar/members/${item.memberId}/dossier`}
                          style={{
                            background: '#0F172A',
                            color: 'white',
                            padding: '7px 16px',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 800,
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          📂 Dossier →
                        </Link>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Dedicated Memorial Showcase Section for Deceased Roll of Honor ──────── */}
      {deceasedCount > 0 && filter !== 'living' && (
        <div
          style={{
            background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)',
            borderRadius: 24,
            padding: '32px 36px',
            color: 'white',
            border: '1px solid rgba(99, 102, 241, 0.4)',
            boxShadow: '0 16px 36px rgba(15, 23, 42, 0.35)',
            marginBottom: 32,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 28 }}>🕯️</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#FDE047' }}>
                Eternal Roll of Honor — Master Memorial Registry
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#C7D2FE' }}>
                Remembering with gratitude and deep reverence the 5 past Worthy Presidents who laid the foundation for St. Margaret-Mary Commandery No. 500.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginTop: 24 }}>
            {presidentsList.filter(p => p.isDeceased).map((p) => (
              <div
                key={p.memberId}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: 16,
                  padding: '20px 24px',
                  border: '1px solid rgba(165, 180, 252, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(253, 224, 71, 0.15)', border: '1px solid rgba(253, 224, 71, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  🕯️
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#FDE047', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    Tenure: {p.tenure} ({p.duration})
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#FFFFFF', marginTop: 2 }}>
                    {p.title} {p.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#A5B4FC', marginTop: 4, fontStyle: 'italic' }}>
                    🕊️ Eternal Rest Grant Unto Him, O Lord
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
