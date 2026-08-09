export const dynamic = 'force-dynamic';

import React from 'react';
import Link from 'next/link';
import MemberShell from '@/components/layout/MemberShell';
import { requireUser } from '@/lib/auth/requireUser';
import { createClient } from '@/lib/supabase/server';

export interface WorthyPresidentItem {
  no: number;
  title: string;
  name: string;
  tenure: string;
  duration: string;
  status: string;
  isDeceased: boolean;
  memberId?: string | null;
}

const WORTHY_PRESIDENTS: WorthyPresidentItem[] = [
  { no: 1,  title: 'N/B', name: 'Thomas Kwao Nyaku',        tenure: '1996–1997', duration: '2 years', status: 'Deceased', isDeceased: true,  memberId: '05ca54dc-0a41-49d2-9ec1-394d1a29bd0a' },
  { no: 2,  title: 'N/B', name: 'John Fifi Sackey',          tenure: '1998–2001', duration: '4 years', status: 'Active',   isDeceased: false, memberId: '74b2a9e9-496c-4070-b0b9-db017d2bf133' },
  { no: 3,  title: 'N/B', name: 'Paul Kwofie',              tenure: '2002–2003', duration: '2 years', status: 'Deceased', isDeceased: true,  memberId: '3af1481b-597a-4944-9359-d059981e5bb5' },
  { no: 4,  title: 'N/B', name: 'Oscar Bongne',             tenure: '2004–2005', duration: '2 years', status: 'Active',   isDeceased: false, memberId: '78ef4d82-49eb-407f-9c6a-ce61967567c9' },
  { no: 5,  title: 'N/B', name: 'Ben Hagan',                tenure: '2006–2007', duration: '2 years', status: 'Deceased', isDeceased: true,  memberId: '9248180a-bb6b-4106-8ac1-49c9fc1fc103' },
  { no: 6,  title: 'SK',  name: 'Philip Amanor',            tenure: '2008–2011', duration: '4 years', status: 'Active',   isDeceased: false, memberId: '0838bc6e-a052-45c2-a4e1-c2bf940aa075' },
  { no: 7,  title: 'N/B', name: 'John Cozy Clottey',        tenure: '2012–2013', duration: '2 years', status: 'Deceased', isDeceased: true,  memberId: '125ca3a2-3470-49d9-88d9-9b97dc7831f1' },
  { no: 8,  title: 'N/B', name: 'Paul Amati',               tenure: '2014–2015', duration: '2 years', status: 'Active',   isDeceased: false, memberId: '589fd6ed-503f-4d37-9826-22c2cb1e9975' },
  { no: 9,  title: 'N/B', name: 'Francis Ahiafor',          tenure: '2016–2017', duration: '2 years', status: 'Deceased', isDeceased: true,  memberId: 'fd3733e6-a58b-4734-b244-291ab819441b' },
  { no: 10, title: 'N/B', name: 'David Bondorin',           tenure: '2018–2019', duration: '2 years', status: 'Active',   isDeceased: false, memberId: '6b5e9719-51f6-43d2-9500-168c9cd5ab93' },
  { no: 11, title: 'Lt.', name: 'Jonathan Dizikunu',        tenure: '2020–2023', duration: '4 years', status: 'Active',   isDeceased: false, memberId: 'c88a6e44-91eb-4724-a8cd-edaa31350e29' },
  { no: 12, title: 'N/B', name: 'Theophilus Knox Prah',     tenure: '2024–2025', duration: '2 years', status: 'Active',   isDeceased: false, memberId: 'ef063a65-efea-4d13-8894-f7a3ca352146' },
  { no: 13, title: 'N/B', name: 'Nii Armah Tagoe',          tenure: '2026–Present', duration: 'Incumbent', status: 'Active', isDeceased: false, memberId: 'cc9f12ab-5881-4b11-bc15-96f620d6cf54' },
];

export default async function MemberWorthyPresidentsPage() {
  await requireUser();
  const supabase = await createClient();

  // Fetch details if needed
  const { data: dbMembers } = await supabase
    .from('members')
    .select('id, title, first_name, surname, status, is_deceased');

  const memberMap = new Map((dbMembers || []).map(m => [m.id, m]));

  return (
    <MemberShell 
      title="Roll of Worthy Presidents" 
      subtitle="St. Margaret-Mary Commandery No. 500 — Succession of Worthy Presidents (1996 – Present)"
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
                Official succession roll of the 13 Worthy Presidents who have presided over St. Margaret-Mary Commandery No. 500 since 1996.
              </p>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.08)', padding: '12px 18px', borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.12)', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#F59E0B', fontFamily: 'monospace' }}>13 Presidents</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#CBD5E1', marginTop: 2 }}>1996 – Present (30+ Years)</div>
            </div>
          </div>
        </div>

        {/* Presidents Succession Table Card */}
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
                {WORTHY_PRESIDENTS.map((item) => {
                  const dbMember = item.memberId ? memberMap.get(item.memberId) : null;
                  const isDeceased = dbMember ? (dbMember.is_deceased || dbMember.status === 'Deceased') : item.isDeceased;

                  return (
                    <tr 
                      key={item.no} 
                      style={{ 
                        borderBottom: '1px solid #F1F5F9',
                        background: item.no === 13 ? '#FEFCE8' : item.no % 2 === 0 ? '#FAFDFB' : '#FFFFFF'
                      }}
                    >
                      {/* Succession Number */}
                      <td style={{ padding: '16px 18px', textAlign: 'center', fontWeight: 900, color: '#0F172A', fontSize: 15 }}>
                        <span style={{ 
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', 
                          width: 28, height: 28, borderRadius: 99, 
                          background: item.no === 13 ? '#FEF3C7' : '#F1F5F9', 
                          color: item.no === 13 ? '#D97706' : '#475569',
                          fontSize: 12, fontWeight: 900
                        }}>
                          {item.no}
                        </span>
                      </td>

                      {/* Name & Honorific */}
                      <td style={{ padding: '16px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 18 }}>
                            {item.no === 13 ? '👑' : isDeceased ? '🕯️' : '🛡️'}
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
                            {item.no === 13 && (
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', marginTop: 1 }}>
                                ✨ Incumbent Worthy President (2026 – Present)
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
                        <span style={{ background: item.no === 13 ? '#FEF3C7' : '#F1F5F9', color: item.no === 13 ? '#92400E' : '#475569', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 800 }}>
                          ⏱️ {item.duration}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '16px 18px' }}>
                        {isDeceased ? (
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MemberShell>
  );
}
