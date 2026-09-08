'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { OverallMeetingMetrics, MeetingMetricItem } from '@/services/attendanceService';
import { formatDisplayDate } from '@/lib/utils/ksji-logic';

interface Props {
  metrics: OverallMeetingMetrics;
}

export default function MeetingMetricsClient({ metrics }: Props) {
  // Navigation & Filter States
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [turnoutFilter, setTurnoutFilter] = useState<'all' | 'high' | 'moderate' | 'low'>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'turnout_desc' | 'turnout_asc' | 'attendees_desc'>('date_desc');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Expanded Meeting Drawer / Modal for Drill-down
  const [drillDownMeeting, setDrillDownMeeting] = useState<MeetingMetricItem | null>(null);
  const [rosterTab, setRosterTab] = useState<'present' | 'excused'>('present');

  // Filter & Sort meetings
  const filteredMeetings = useMemo(() => {
    return metrics.meetings.filter(m => {
      // 1. Year filter
      if (selectedYear !== 'all' && m.year !== selectedYear) return false;

      // 2. Search query (title, date)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const dateStr = formatDisplayDate(m.date).toLowerCase();
        const titleStr = (m.title || '').toLowerCase();
        if (!titleStr.includes(q) && !dateStr.includes(q) && !m.date.includes(q)) {
          return false;
        }
      }

      // 3. Turnout filter
      if (turnoutFilter === 'high' && m.turnoutRate < 40) return false;
      if (turnoutFilter === 'moderate' && (m.turnoutRate < 30 || m.turnoutRate >= 40)) return false;
      if (turnoutFilter === 'low' && m.turnoutRate >= 30) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === 'date_asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === 'turnout_desc') return b.turnoutRate - a.turnoutRate;
      if (sortBy === 'turnout_asc') return a.turnoutRate - b.turnoutRate;
      if (sortBy === 'attendees_desc') return b.presentCount - a.presentCount;
      return 0;
    });
  }, [metrics.meetings, selectedYear, searchQuery, turnoutFilter, sortBy]);

  // Year counts map
  const yearCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    metrics.meetings.forEach(m => {
      counts[m.year] = (counts[m.year] || 0) + 1;
    });
    return counts;
  }, [metrics.meetings]);

  // Download complete metrics summary as CSV
  const exportMetricsCSV = () => {
    const headers = [
      'Meeting Date',
      'Meeting Title',
      'Year',
      'Eligible Roll',
      'Total Present',
      'Turnout %',
      'QR Check-Ins',
      'GPS Check-Ins',
      'Manual Check-Ins',
      'Excused Count',
      'Absent Count',
    ];

    const rows = filteredMeetings.map(m => [
      formatDisplayDate(m.date),
      `"${(m.title || '').replace(/"/g, '""')}"`,
      m.year,
      m.totalRoll,
      m.presentCount,
      `${m.turnoutRate}%`,
      m.methods.qr,
      m.methods.gps,
      m.methods.manual,
      m.excusedCount,
      m.absentCount,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `meeting_metrics_${selectedYear === 'all' ? 'all_time' : selectedYear}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export single meeting roster CSV
  const exportMeetingRosterCSV = (meeting: MeetingMetricItem) => {
    const headers = ['Member Name', 'Phone', 'Status', 'Check-In Method', 'Check-In Timestamp', 'Excuse Reason'];
    const rows: string[][] = [];

    // Attendees
    meeting.attendees.forEach(a => {
      rows.push([
        `"${a.name.replace(/"/g, '""')}"`,
        a.phone || '',
        'Present',
        a.method,
        a.checkInTime ? new Date(a.checkInTime).toLocaleString('en-US') : '',
        '',
      ]);
    });

    // Excused
    meeting.excusedMembers.forEach(e => {
      rows.push([
        `"${e.name.replace(/"/g, '""')}"`,
        '',
        'Excused',
        'Official Excuse',
        '',
        `"${(e.reason || '').replace(/"/g, '""')}"`,
      ]);
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${meeting.title.replace(/\s+/g, '_')}_roster.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for turnout color and badge
  const getTurnoutBadge = (rate: number) => {
    if (rate >= 40) {
      return {
        label: 'Strong Turnout',
        bg: '#f0fdf4',
        text: '#166534',
        border: '#86efac',
        bar: '#16a34a',
      };
    }
    if (rate >= 30) {
      return {
        label: 'Average Turnout',
        bg: '#fffbeb',
        text: '#92400e',
        border: '#fde68a',
        bar: '#d97706',
      };
    }
    return {
      label: 'Low Turnout',
      bg: '#fef2f2',
      text: '#991b1b',
      border: '#fca5a5',
      bar: '#dc2626',
    };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── TOP ACTION BAR: BACK & GLOBAL EXPORT ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            href="/registrar/meetings"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#1e293b',
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            ← Back to Meetings Hub
          </Link>
          <span style={{ fontSize: 13, color: '#64748b' }}>
            Showing <strong>{filteredMeetings.length}</strong> of <strong>{metrics.totalMeetings}</strong> recorded sessions
          </span>
        </div>

        <button
          onClick={exportMetricsCSV}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '9px 18px',
            borderRadius: 8,
            background: 'linear-gradient(135deg, #0A1628 0%, #1e293b 100%)',
            color: '#C9A84C',
            border: '1px solid #C9A84C',
            fontSize: 13,
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(10, 22, 40, 0.2)',
          }}
        >
          📥 Export Metrics Summary (CSV)
        </button>
      </div>

      {/* ── KEY METRICS KPI BOARD (4 HIGH-LEVEL CARDS) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        {/* Card 1: Total Recorded Meetings */}
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #C9A84C', background: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: 0.5 }}>
              Total Meetings on Record
            </span>
            <span style={{ fontSize: 20 }}>📅</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#0A1628' }}>{metrics.totalMeetings}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Spanning {metrics.availableYears.join(', ')}
          </div>
        </div>

        {/* Card 2: Total Check-Ins */}
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #16a34a', background: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: 0.5 }}>
              Total Check-Ins Recorded
            </span>
            <span style={{ fontSize: 20 }}>✅</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#16a34a' }}>
            {metrics.totalCheckIns.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Avg ~{metrics.averagePresentPerMeeting} brothers per session
          </div>
        </div>

        {/* Card 3: Overall Average Turnout */}
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #3b82f6', background: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: 0.5 }}>
              Overall Avg Turnout
            </span>
            <span style={{ fontSize: 20 }}>📊</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#1e40af' }}>
            {metrics.averageTurnoutRate}%
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Active Roll: {metrics.activeRollCount} Brothers
          </div>
        </div>

        {/* Card 4: Best Attended Session */}
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #8b5cf6', background: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: 0.5 }}>
              Record High Turnout
            </span>
            <span style={{ fontSize: 20 }}>🏆</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#6b21a8' }}>
            {metrics.highestTurnoutMeeting ? `${metrics.highestTurnoutMeeting.rate}%` : 'N/A'}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {metrics.highestTurnoutMeeting ? `${metrics.highestTurnoutMeeting.present} attended (${formatDisplayDate(metrics.highestTurnoutMeeting.date)})` : 'No data'}
          </div>
        </div>
      </div>

      {/* ── INTUITIVE FILTER & SEARCH BAR (PREVENTS OVERWHELM) ── */}
      <div className="card" style={{ padding: 20, background: '#ffffff', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Row 1: Year Pill Tabs */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>
            Select Year:
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => setSelectedYear('all')}
              style={{
                padding: '8px 16px',
                borderRadius: 20,
                border: selectedYear === 'all' ? '2px solid #0A1628' : '1px solid #cbd5e1',
                background: selectedYear === 'all' ? '#0A1628' : '#f8fafc',
                color: selectedYear === 'all' ? '#ffffff' : '#475569',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              All Time ({metrics.totalMeetings})
            </button>

            {metrics.availableYears.map(year => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 20,
                  border: selectedYear === year ? '2px solid #C9A84C' : '1px solid #cbd5e1',
                  background: selectedYear === year ? '#fffdf7' : '#f8fafc',
                  color: selectedYear === year ? '#0A1628' : '#475569',
                  fontSize: 13,
                  fontWeight: selectedYear === year ? 800 : 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {year} ({yearCounts[year] || 0})
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Search, Turnout Filter, Sort, View Toggle */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search Box */}
          <div style={{ flex: '1 1 240px', position: 'relative' }}>
            <input
              type="text"
              placeholder="🔍 Search meeting title, date, month..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                outline: 'none',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: 16,
                  cursor: 'pointer',
                }}
              >
                &times;
              </button>
            )}
          </div>

          {/* Turnout Tier Filter */}
          <select
            value={turnoutFilter}
            onChange={e => setTurnoutFilter(e.target.value as any)}
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid #cbd5e1',
              fontSize: 13,
              fontWeight: 600,
              color: '#334155',
              background: '#ffffff',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Turnout Tiers</option>
            <option value="high">🌟 Strong Turnout (≥ 40%)</option>
            <option value="moderate">⚖️ Moderate Turnout (30-39%)</option>
            <option value="low">⚠️ Low Turnout (&lt; 30%)</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid #cbd5e1',
              fontSize: 13,
              fontWeight: 600,
              color: '#334155',
              background: '#ffffff',
              cursor: 'pointer',
            }}
          >
            <option value="date_desc">📅 Date: Newest First</option>
            <option value="date_asc">📅 Date: Oldest First</option>
            <option value="turnout_desc">📈 Turnout: Highest First</option>
            <option value="turnout_asc">📉 Turnout: Lowest First</option>
            <option value="attendees_desc">👥 Attendees: Most First</option>
          </select>

          {/* View Mode Switcher */}
          <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: 8, overflow: 'hidden' }}>
            <button
              onClick={() => setViewMode('cards')}
              title="Card Grid View"
              style={{
                padding: '8px 12px',
                border: 'none',
                background: viewMode === 'cards' ? '#0A1628' : '#ffffff',
                color: viewMode === 'cards' ? '#ffffff' : '#64748b',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              🗂️ Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="Detailed Table View"
              style={{
                padding: '8px 12px',
                border: 'none',
                background: viewMode === 'table' ? '#0A1628' : '#ffffff',
                color: viewMode === 'table' ? '#ffffff' : '#64748b',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              📋 Table
            </button>
          </div>
        </div>
      </div>

      {/* ── MEETING PRESENTATION: CARDS VIEW ── */}
      {viewMode === 'cards' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 20 }}>
          {filteredMeetings.length === 0 ? (
            <div className="card" style={{ gridColumn: '1 / -1', padding: 48, textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
              <h3 style={{ margin: '0 0 6px', color: '#0A1628' }}>No Meeting Records Found</h3>
              <p style={{ margin: 0, fontSize: 14 }}>Try adjusting your search query, year tab, or turnout filters.</p>
            </div>
          ) : (
            filteredMeetings.map(m => {
              const badge = getTurnoutBadge(m.turnoutRate);
              const mDateStr = formatDisplayDate(m.date);

              return (
                <div
                  key={m.id}
                  className="card"
                  style={{
                    padding: 20,
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                >
                  {/* Top: Title & Date */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                      <div>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: '#f1f5f9',
                            color: '#475569',
                            fontSize: 11,
                            fontWeight: 700,
                            marginBottom: 6,
                          }}
                        >
                          📅 {mDateStr}
                        </span>
                        <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: '#0A1628', lineHeight: 1.3 }}>
                          {m.title}
                        </h3>
                      </div>

                      {/* Turnout Pill */}
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 800,
                          background: badge.bg,
                          color: badge.text,
                          border: `1px solid ${badge.border}`,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {m.turnoutRate}%
                      </span>
                    </div>

                    {/* Turnout Progress Bar */}
                    <div style={{ margin: '14px 0 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 4, color: '#64748b' }}>
                        <span>TURNOUT RATE</span>
                        <span style={{ color: badge.text }}>{m.presentCount} of {m.totalRoll} Brothers</span>
                      </div>
                      <div style={{ height: 8, width: '100%', background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(m.turnoutRate, 100)}%`,
                            background: badge.bar,
                            borderRadius: 4,
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                    </div>

                    {/* Key Metrics Breakdown Badges */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
                      {/* Present */}
                      <div style={{ background: '#f8fafc', padding: '10px 8px', borderRadius: 8, textAlign: 'center', border: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#16a34a' }}>{m.presentCount}</div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Present</div>
                      </div>

                      {/* Excused */}
                      <div style={{ background: '#f8fafc', padding: '10px 8px', borderRadius: 8, textAlign: 'center', border: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#d97706' }}>{m.excusedCount}</div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Excused</div>
                      </div>

                      {/* Absent */}
                      <div style={{ background: '#f8fafc', padding: '10px 8px', borderRadius: 8, textAlign: 'center', border: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#dc2626' }}>{m.absentCount}</div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Absent</div>
                      </div>
                    </div>

                    {/* Method breakdown chips */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 11, color: '#475569', marginBottom: 12 }}>
                      <span title="Manual Registrar Check-ins" style={{ padding: '2px 6px', background: '#f1f5f9', borderRadius: 4 }}>
                        ✍️ Manual: {m.methods.manual}
                      </span>
                      <span title="QR Code Scan Check-ins" style={{ padding: '2px 6px', background: '#f1f5f9', borderRadius: 4 }}>
                        📱 QR: {m.methods.qr}
                      </span>
                      <span title="GPS Geofenced Check-ins" style={{ padding: '2px 6px', background: '#f1f5f9', borderRadius: 4 }}>
                        📍 GPS: {m.methods.gps}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Actions */}
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14, display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => {
                        setDrillDownMeeting(m);
                        setRosterTab('present');
                      }}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 8,
                        background: '#0A1628',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      🔍 View Attendees ({m.presentCount})
                    </button>

                    <button
                      onClick={() => exportMeetingRosterCSV(m)}
                      title="Download Roster CSV"
                      style={{
                        padding: '8px 12px',
                        borderRadius: 8,
                        background: '#f8fafc',
                        color: '#475569',
                        border: '1px solid #cbd5e1',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      📥 CSV
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* ── MEETING PRESENTATION: DETAILED TABLE VIEW ── */
        <div className="card" style={{ padding: 0, overflow: 'hidden', background: '#ffffff' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  <th style={{ padding: '12px 16px' }}>Meeting Session</th>
                  <th style={{ padding: '12px 16px' }}>Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Turnout %</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Present</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Check-In Methods</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Excused</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Absent</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMeetings.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>
                      No meeting metrics match the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredMeetings.map(m => {
                    const badge = getTurnoutBadge(m.turnoutRate);
                    return (
                      <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0A1628' }}>
                          {m.title}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#64748b' }}>
                          {formatDisplayDate(m.date)}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: 800,
                              background: badge.bg,
                              color: badge.text,
                              border: `1px solid ${badge.border}`,
                            }}
                          >
                            {m.turnoutRate}%
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800, color: '#16a34a' }}>
                          {m.presentCount}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 11, color: '#475569' }}>
                          ✍️ {m.methods.manual} • 📱 {m.methods.qr} • 📍 {m.methods.gps}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#d97706' }}>
                          {m.excusedCount}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#dc2626' }}>
                          {m.absentCount}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <button
                              onClick={() => {
                                setDrillDownMeeting(m);
                                setRosterTab('present');
                              }}
                              style={{
                                padding: '6px 10px',
                                borderRadius: 6,
                                background: '#0A1628',
                                color: '#ffffff',
                                border: 'none',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              🔍 Roster
                            </button>
                            <button
                              onClick={() => exportMeetingRosterCSV(m)}
                              title="Export CSV"
                              style={{
                                padding: '6px 8px',
                                borderRadius: 6,
                                background: '#f8fafc',
                                color: '#475569',
                                border: '1px solid #cbd5e1',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              📥
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── DRILL-DOWN ROSTER MODAL (DETAILED BROTHER ATTENDANCE & EXCUSES) ── */}
      {drillDownMeeting && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(10, 22, 40, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              maxWidth: 680,
              width: '100%',
              maxHeight: '90vh',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                background: 'linear-gradient(135deg, #0A1628 0%, #1e293b 100%)',
                color: '#ffffff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#C9A84C' }}>
                  {drillDownMeeting.title}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
                  📅 {formatDisplayDate(drillDownMeeting.date)} • Turnout: <strong>{drillDownMeeting.turnoutRate}%</strong> ({drillDownMeeting.presentCount} of {drillDownMeeting.totalRoll} brothers)
                </p>
              </div>
              <button
                onClick={() => setDrillDownMeeting(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: 24,
                  cursor: 'pointer',
                  padding: 4,
                  lineHeight: 1,
                }}
              >
                &times;
              </button>
            </div>

            {/* Roster Tabs: Present vs Excused */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', padding: '0 24px' }}>
              <button
                onClick={() => setRosterTab('present')}
                style={{
                  padding: '12px 16px',
                  border: 'none',
                  background: 'none',
                  borderBottom: rosterTab === 'present' ? '3px solid #16a34a' : '3px solid transparent',
                  color: rosterTab === 'present' ? '#16a34a' : '#64748b',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                ✅ Present Brothers ({drillDownMeeting.presentCount})
              </button>
              <button
                onClick={() => setRosterTab('excused')}
                style={{
                  padding: '12px 16px',
                  border: 'none',
                  background: 'none',
                  borderBottom: rosterTab === 'excused' ? '3px solid #d97706' : '3px solid transparent',
                  color: rosterTab === 'excused' ? '#d97706' : '#64748b',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                ✉️ Excused Permissions ({drillDownMeeting.excusedMembers.length})
              </button>
            </div>

            {/* Modal Body List */}
            <div style={{ padding: 20, overflowY: 'auto', flex: 1, maxHeight: 420 }}>
              {rosterTab === 'present' ? (
                drillDownMeeting.attendees.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#64748b', padding: 30 }}>No check-ins recorded for this session.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {drillDownMeeting.attendees.map((attendee, idx) => (
                      <div
                        key={attendee.id || idx}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 8,
                          background: '#f8fafc',
                          border: '1px solid #f1f5f9',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <strong style={{ color: '#0A1628', fontSize: 13 }}>{attendee.name}</strong>
                          {attendee.phone && (
                            <span style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>
                              ({attendee.phone})
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 11 }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 10,
                              background: attendee.method.includes('QR') ? '#eff6ff' : attendee.method.includes('GPS') ? '#f0fdf4' : '#f1f5f9',
                              color: attendee.method.includes('QR') ? '#1e40af' : attendee.method.includes('GPS') ? '#166534' : '#475569',
                              fontWeight: 700,
                            }}
                          >
                            {attendee.method}
                          </span>
                          {attendee.checkInTime && (
                            <span style={{ color: '#94a3b8' }}>
                              {new Date(attendee.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                drillDownMeeting.excusedMembers.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#64748b', padding: 30 }}>No official absence excuses granted for this session.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {drillDownMeeting.excusedMembers.map((excused, idx) => (
                      <div
                        key={excused.id || idx}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 8,
                          background: '#fffbeb',
                          border: '1px solid #fde68a',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <strong style={{ color: '#92400e', fontSize: 13 }}>{excused.name}</strong>
                          <span style={{ padding: '2px 8px', borderRadius: 10, background: '#fef3c7', color: '#92400e', fontSize: 10, fontWeight: 800 }}>
                            {excused.status.toUpperCase()}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: 12, color: '#78350f', fontStyle: 'italic' }}>
                          &ldquo;{excused.reason}&rdquo;
                        </p>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '14px 24px',
                borderTop: '1px solid #e2e8f0',
                background: '#f8fafc',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <button
                onClick={() => exportMeetingRosterCSV(drillDownMeeting)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                📥 Download Roster (CSV)
              </button>

              <button
                onClick={() => setDrillDownMeeting(null)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  background: '#0A1628',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
