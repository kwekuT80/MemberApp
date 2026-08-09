'use client';

import React, { useEffect, useState } from 'react';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { createClient } from '@/lib/supabase/client';
import { fetchAllPaginated } from '@/lib/supabase/pagination';
import Link from 'next/link';

interface SubscriberItem {
  id: string;
  name: string;
  title: string;
  status: string;
  totalContributed: number;
  currentYearContrib: number;
  expectedCumulative: number;
  cumulativeArrears: number;
  isSubscriber: boolean;
}

export default function WelfareSubscribersPage() {
  const [subscribers, setSubscribers] = useState<SubscriberItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const supabase = createClient();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const fullYearsCount = Math.max(0, currentYear - 2022); // 4 full years (2022-2025 = 48 months × 25 = 1200)
  const expectedCumulative = (fullYearsCount * 12 * 25.00) + (currentMonth * 25.00);

  useEffect(() => {
    async function loadRoster() {
      setLoading(true);
      try {
        const membersData = await fetchAllPaginated((from, to) =>
          supabase
            .from('members')
            .select('id, first_name, surname, title, status, is_deceased')
            .range(from, to)
        );

        const allContribs = await fetchAllPaginated((from, to) =>
          supabase
            .from('welfare_contributions')
            .select('member_id, amount, period_year')
            .range(from, to)
        );

        const members = membersData || [];
        const contribs = allContribs || [];

        // Exclude deceased/dismissed members & system accounts per archival business rule
        const eligible = members.filter(m => {
          if (m.id === 'f0000000-0000-0000-0000-000000000000') return false;
          if (m.is_deceased) return false;
          const name = `${m.first_name || ''} ${m.surname || ''}`.toLowerCase();
          if (name.includes('welfare account') || name.includes('operational outflow')) return false;
          const s = String(m.status || '').trim().toLowerCase();
          return !['deceased', 'dismissed', 'transfer-out', 'system'].includes(s);
        });

        const list: SubscriberItem[] = eligible.map(m => {
          const mContribs = contribs.filter(c => c.member_id === m.id);
          const totalContributed = mContribs.reduce((acc, c) => acc + Number(c.amount || 0), 0);
          const currentYearContrib = mContribs
            .filter(c => c.period_year === currentYear)
            .reduce((acc, c) => acc + Number(c.amount || 0), 0);
          
          const cumulativeArrears = Math.max(0, expectedCumulative - totalContributed);
          const isSubscriber = cumulativeArrears <= 75.00;

          return {
            id: m.id,
            name: `${m.first_name} ${m.surname}`,
            title: m.title || 'Bro.',
            status: m.status || 'Active',
            totalContributed,
            currentYearContrib,
            expectedCumulative,
            cumulativeArrears,
            isSubscriber
          };
        });

        setSubscribers(list);
      } catch (err) {
        console.error('Failed to load welfare subscribers:', err);
      } finally {
        setLoading(false);
      }
    }

    loadRoster();
  }, []);

  const filtered = subscribers.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === 'active') return s.isSubscriber;
    if (filter === 'inactive') return !s.isSubscriber;
    return true;
  });

  const activeCount = subscribers.filter(s => s.isSubscriber).length;
  const inactiveCount = subscribers.length - activeCount;

  const exportToCSV = () => {
    const headers = ['Member Name', 'Title', 'Status', 'Total Contributed (GHc)', '2026 Paid (GHc)', 'Total Expected (GHc)', 'Cumulative Arrears (GHc)', 'Subscription Status'];
    const rows = filtered.map(s => [
      `"${s.name}"`,
      `"${s.title}"`,
      `"${s.status}"`,
      s.totalContributed.toFixed(2),
      s.currentYearContrib.toFixed(2),
      s.expectedCumulative.toFixed(2),
      s.cumulativeArrears.toFixed(2),
      s.isSubscriber ? 'Active Subscriber' : 'Inactive / Arrears'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Welfare_Subscribers_Roster_${filter}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <RegistrarShell title="Welfare Subscribers Roster" subtitle="Complete breakdown of active & inactive welfare subscribers for reporting">
      <div style={{ padding: '20px 0', fontFamily: 'Inter, sans-serif' }}>
        
        {/* Navigation & Actions Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
          <Link href="/registrar/welfare" style={{ color: '#F59E0B', textDecoration: 'none', fontWeight: 800, fontSize: 14 }}>
            ‹ Back to Welfare Dashboard
          </Link>
          <div style={{ display: 'flex', gap: 12 }}>
            <button 
              onClick={exportToCSV}
              style={{ background: '#10B981', color: 'white', border: 'none', padding: '10px 18px', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}
            >
              📥 Export CSV Report
            </button>
            <button 
              onClick={() => window.print()}
              style={{ background: '#0F172A', color: 'white', border: 'none', padding: '10px 18px', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}
            >
              🖨️ Print Roster Report
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <button 
            onClick={() => setFilter('all')}
            style={{ 
              padding: '8px 16px', borderRadius: 20, border: '1px solid #CBD5E1', 
              background: filter === 'all' ? '#0F172A' : 'white', 
              color: filter === 'all' ? 'white' : '#0F172A', fontWeight: 800, cursor: 'pointer' 
            }}
          >
            All Eligible ({subscribers.length})
          </button>
          <button 
            onClick={() => setFilter('active')}
            style={{ 
              padding: '8px 16px', borderRadius: 20, border: '1px solid #A7F3D0', 
              background: filter === 'active' ? '#10B981' : '#ECFDF5', 
              color: filter === 'active' ? 'white' : '#065F46', fontWeight: 800, cursor: 'pointer' 
            }}
          >
            Active Subscribers ({activeCount})
          </button>
          <button 
            onClick={() => setFilter('inactive')}
            style={{ 
              padding: '8px 16px', borderRadius: 20, border: '1px solid #FCA5A5', 
              background: filter === 'inactive' ? '#EF4444' : '#FEF2F2', 
              color: filter === 'inactive' ? 'white' : '#991B1B', fontWeight: 800, cursor: 'pointer' 
            }}
          >
            Inactive / Arrears ({inactiveCount})
          </button>

          <input 
            type="text" 
            placeholder="Search member name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #CBD5E1', marginLeft: 'auto', minWidth: 240 }}
          />
        </div>

        {/* Subscribers Table */}
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading subscriber roster...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', textAlign: 'left' }}>
                  <th style={{ padding: '14px 16px' }}>Member Name</th>
                  <th style={{ padding: '14px 16px' }}>Title</th>
                  <th style={{ padding: '14px 16px' }}>Total Paid (All-Time)</th>
                  <th style={{ padding: '14px 16px' }}>{currentYear} Paid</th>
                  <th style={{ padding: '14px 16px' }}>Expected (2022–{currentYear})</th>
                  <th style={{ padding: '14px 16px' }}>Cumulative Arrears</th>
                  <th style={{ padding: '14px 16px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0F172A' }}>
                      <Link href={`/registrar/members/${s.id}`} style={{ textDecoration: 'none', color: '#0F172A' }}>
                        {s.name}
                      </Link>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#64748B' }}>{s.title}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 800, color: '#10B981', fontFamily: 'monospace' }}>
                      GH₵ {s.totalContributed.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: '#2563EB', fontFamily: 'monospace' }}>
                      GH₵ {s.currentYearContrib.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: '#64748B', fontFamily: 'monospace' }}>
                      GH₵ {s.expectedCumulative.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 800, color: s.cumulativeArrears > 0 ? '#EF4444' : '#10B981', fontFamily: 'monospace' }}>
                      GH₵ {s.cumulativeArrears.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ 
                        padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 800,
                        background: s.isSubscriber ? '#D1FAE5' : '#FEE2E2',
                        color: s.isSubscriber ? '#065F46' : '#991B1B'
                      }}>
                        {s.isSubscriber ? '✓ Active Subscriber' : '⚠️ Inactive / Arrears'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </RegistrarShell>
  );
}
