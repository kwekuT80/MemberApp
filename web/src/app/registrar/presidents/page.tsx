export const dynamic = 'force-dynamic';

import React from 'react';
import Link from 'next/link';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { createClient } from '@/lib/supabase/server';

export interface DynamicPresidentItem {
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

export default async function RollOfWorthyPresidentsPage() {
  const supabase = await createClient();

  // Dynamically query positions table for all Presidents of the Commandery
  const { data: dbPositions } = await supabase
    .from('positions')
    .select(`
      id,
      position_title,
      date_from,
      date_to,
      members!inner (
        id,
        title,
        first_name,
        surname,
        status,
        is_deceased
      )
    `)
    .in('position_title', ['President', 'Worthy President'])
    .order('date_from', { ascending: true });

  // Group contiguous/sequential terms for each president dynamically
  const presidentsList: DynamicPresidentItem[] = [];
  const rawList = dbPositions || [];

  let currentSeq = 1;

  for (let i = 0; i < rawList.length; i++) {
    const item = rawList[i];
    const m = item.members as any;
    if (!m) continue;

    const fromYear = item.date_from ? item.date_from.substring(0, 4) : '';
    let toYear = item.date_to ? item.date_to.substring(0, 4) : '';
    let endYearNum = toYear ? parseInt(toYear, 10) : new Date().getFullYear();

    // Check if next consecutive position is for the same member to combine terms (e.g. 2020-2021 & 2022-2023 -> 2020-2023)
    while (i + 1 < rawList.length && (rawList[i + 1].members as any)?.id === m.id) {
      i++;
      const nextTo = rawList[i].date_to ? rawList[i].date_to.substring(0, 4) : '';
      if (nextTo) {
        toYear = nextTo;
        endYearNum = parseInt(nextTo, 10);
      } else {
        toYear = '';
      }
    }

    const startYearNum = fromYear ? parseInt(fromYear, 10) : 1996;
    const isIncumbent = !toYear || endYearNum >= 2026;

    let tenure = '';
    let duration = '';

    if (isIncumbent) {
      tenure = `${fromYear || '2026'}–Present`;
      duration = 'Incumbent';
    } else {
      tenure = `${fromYear}–${toYear}`;
      const diff = Math.max(1, endYearNum - startYearNum + 1);
      duration = `${diff} year${diff > 1 ? 's' : ''}`;
    }

    const isDeceased = m.is_deceased || String(m.status).toLowerCase() === 'deceased';

    // Format title prefix according to app convention
    let formattedTitle = m.title || 'Bro.';
    if (formattedTitle === 'N Bro.' || formattedTitle === 'N Bro') {
      formattedTitle = 'N/B';
    }

    presidentsList.push({
      no: currentSeq++,
      memberId: m.id,
      title: formattedTitle,
      name: `${m.first_name || ''} ${m.surname || ''}`.trim(),
      tenure,
      duration,
      status: m.status || (isDeceased ? 'Deceased' : 'Active'),
      isDeceased,
      isIncumbent,
    });
  }

  const totalPresidents = presidentsList.length;

  return (
    <RegistrarShell 
      title="Roll of Worthy Presidents" 
      subtitle="St. Margaret-Mary Commandery No. 500 — Official Historical Succession of Worthy Presidents (Dynamic Database Registry)"
    >
      <div style={{ padding: '24px 0', color: '#0F172A', fontFamily: 'Inter, sans-serif' }}>
        
        {/* Header Banner */}
        <div style={{ 
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', 
          borderRadius: 20, 
          padding: '32px 36px', 
          color: 'white', 
          marginBottom: 32,
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.25)',
          borderLeft: '6px solid #F59E0B'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>
                👑 Dynamic Commandery Registry & Leadership Heritage
              </div>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: -0.5 }}>
                Roll of Worthy Presidents
              </h1>
              <p style={{ margin: '8px 0 0', fontSize: 14, color: '#94A3B8', maxWidth: 680 }}>
                Live chronological registry automatically compiled from official position records in the database.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(8px)', padding: '14px 20px', borderRadius: 14, border: '1px solid rgba(255, 255, 255, 0.12)', textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#F59E0B', fontFamily: 'monospace' }}>{totalPresidents}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#CBD5E1', marginTop: 2, textTransform: 'uppercase' }}>Worthy Presidents</div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(8px)', padding: '14px 20px', borderRadius: 14, border: '1px solid rgba(255, 255, 255, 0.12)', textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#10B981', fontFamily: 'monospace' }}>30+ Yrs</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#CBD5E1', marginTop: 2, textTransform: 'uppercase' }}>Leadership Tenure</div>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Table Card */}
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', marginBottom: 36 }}>
          <div style={{ padding: '20px 24px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
                📜 Dynamic Succession Roll (Live Database View)
              </h3>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                Automatically updated from member position records in order of presidential election
              </div>
            </div>
            <span style={{ background: '#DCFCE7', color: '#15803D', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800 }}>
              ⚡ Live Database Sync
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#F1F5F9', color: '#475569', textAlign: 'left' }}>
                  <th style={{ padding: '14px 18px', width: 60, textAlign: 'center' }}>No.</th>
                  <th style={{ padding: '14px 18px' }}>Worthy President</th>
                  <th style={{ padding: '14px 18px' }}>Tenure</th>
                  <th style={{ padding: '14px 18px' }}>Duration</th>
                  <th style={{ padding: '14px 18px' }}>Status</th>
                  <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {presidentsList.map((item) => (
                  <tr 
                    key={item.memberId + '-' + item.no} 
                    style={{ 
                      borderBottom: '1px solid #F1F5F9',
                      background: item.isIncumbent ? '#FEFCE8' : item.no % 2 === 0 ? '#FAFDFB' : '#FFFFFF'
                    }}
                  >
                    {/* Succession Number */}
                    <td style={{ padding: '16px 18px', textAlign: 'center', fontWeight: 900, color: '#0F172A', fontSize: 15 }}>
                      <span style={{ 
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', 
                        width: 28, height: 28, borderRadius: 99, 
                        background: item.isIncumbent ? '#FEF3C7' : '#F1F5F9', 
                        color: item.isIncumbent ? '#D97706' : '#475569',
                        fontSize: 12, fontWeight: 900
                      }}>
                        {item.no}
                      </span>
                    </td>

                    {/* Name & Honorific */}
                    <td style={{ padding: '16px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 18 }}>
                          {item.isIncumbent ? '👑' : item.isDeceased ? '🕯️' : '🛡️'}
                        </span>
                        <div>
                          <div style={{ fontWeight: 800, color: '#0F172A', fontSize: 15 }}>
                            {item.title} {item.name}
                          </div>
                          {item.no === 1 && (
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#D97706', marginTop: 1 }}>
                              🌟 Pioneer Charter Worthy President
                            </div>
                          )}
                          {item.isIncumbent && (
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', marginTop: 1 }}>
                              ✨ Incumbent Worthy President ({item.tenure})
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Tenure */}
                    <td style={{ padding: '16px 18px', fontWeight: 800, color: '#2563EB', fontFamily: 'monospace', fontSize: 15 }}>
                      {item.tenure}
                    </td>

                    {/* Duration */}
                    <td style={{ padding: '16px 18px', fontWeight: 700, color: '#475569' }}>
                      <span style={{ background: item.isIncumbent ? '#FEF3C7' : '#F1F5F9', color: item.isIncumbent ? '#92400E' : '#475569', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 800 }}>
                        ⏱️ {item.duration}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '16px 18px' }}>
                      {item.isDeceased ? (
                        <span style={{ background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 800 }}>
                          🕯️ Deceased (Roll of Honor)
                        </span>
                      ) : (
                        <span style={{ background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 800 }}>
                          🟢 Active
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '16px 18px', textAlign: 'right' }}>
                      <Link 
                        href={`/registrar/members/${item.memberId}/dossier`}
                        style={{ 
                          background: '#0F172A', color: 'white', 
                          padding: '6px 14px', borderRadius: 8, 
                          fontSize: 12, fontWeight: 800, textDecoration: 'none',
                          display: 'inline-flex', alignItems: 'center', gap: 6
                        }}
                      >
                        📂 View Dossier →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </RegistrarShell>
  );
}
