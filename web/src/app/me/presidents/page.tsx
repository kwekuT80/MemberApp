export const dynamic = 'force-dynamic';

import React from 'react';
import Link from 'next/link';
import MemberShell from '@/components/layout/MemberShell';
import { requireUser } from '@/lib/auth/requireUser';
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

export default async function MemberWorthyPresidentsPage() {
  await requireUser();
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

    // Combine consecutive terms for the same member
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
    <MemberShell 
      title="Roll of Worthy Presidents" 
      subtitle="St. Margaret-Mary Commandery No. 500 — Succession of Worthy Presidents (Dynamic Database View)"
    >
      <div style={{ padding: '16px 0', color: '#0F172A', fontFamily: 'Inter, sans-serif' }}>
        
        {/* Banner */}
        <div style={{ 
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', 
          borderRadius: 20, 
          padding: '28px 32px', 
          color: 'white', 
          marginBottom: 28,
          boxShadow: '0 10px 25px rgba(15, 23, 42, 0.2)',
          borderLeft: '6px solid #F59E0B'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>
                👑 Commandery Heritage & Leadership Roll
              </div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>
                Roll of Worthy Presidents
              </h1>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: '#94A3B8', maxWidth: 640 }}>
                Official live succession roll of Worthy Presidents compiled directly from database records.
              </p>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.08)', padding: '12px 18px', borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.12)', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#F59E0B', fontFamily: 'monospace' }}>{totalPresidents} Presidents</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#CBD5E1', marginTop: 2 }}>1996 – Present</div>
            </div>
          </div>
        </div>

        {/* Dynamic Presidents Table Card */}
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#F1F5F9', color: '#475569', textAlign: 'left' }}>
                  <th style={{ padding: '14px 18px', width: 60, textAlign: 'center' }}>No.</th>
                  <th style={{ padding: '14px 18px' }}>Worthy President</th>
                  <th style={{ padding: '14px 18px' }}>Tenure</th>
                  <th style={{ padding: '14px 18px' }}>Duration</th>
                  <th style={{ padding: '14px 18px' }}>Status</th>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MemberShell>
  );
}
