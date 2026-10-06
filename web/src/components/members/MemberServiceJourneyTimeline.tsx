'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  formatDisplayDate, 
  getMemberInitiationRecord, 
  getFraternalJubileeMilestones,
  hasAchieved4thDegree,
  hasAchieved5thDegree,
  KSJI_COMMANDERY_CONSTANTS
} from '@/lib/utils/ksji-logic';

export interface JourneyEvent {
  id: string;
  category: 'initiation' | 'transfer' | 'degree' | 'rank' | 'office' | 'jubilee' | 'memorial';
  dateStr: string;
  formattedDate: string;
  title: string;
  subtitle?: string;
  description?: string;
  badge?: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  isMilestone?: boolean;
}

interface MemberServiceJourneyTimelineProps {
  member: any;
  degrees?: any[];
  positions?: any[];
  military?: any[];
  ranks?: any[];
  showTitle?: boolean;
  compact?: boolean;
}

function toSafeArray<T = any>(val: any): T[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'object') return [val as T];
  return [];
}

export default function MemberServiceJourneyTimeline({
  member,
  degrees = [],
  positions = [],
  military = [],
  ranks = [],
  showTitle = true,
  compact = false
}: MemberServiceJourneyTimelineProps) {
  const [filter, setFilter] = useState<'all' | 'degree' | 'office' | 'rank' | 'jubilee'>('all');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const initInfo = useMemo(() => getMemberInitiationRecord(member), [member]);

  // Build journey timeline events
  const timelineEvents = useMemo(() => {
    const events: JourneyEvent[] = [];

    // 1. INITIATION EVENT
    if (initInfo.initiationDate || member.date_joined) {
      const initDate = initInfo.initiationDate || member.date_joined;
      const isCharterDay = initDate.split('T')[0] === KSJI_COMMANDERY_CONSTANTS.CHARTER_DATE;
      const isPreCharter = initDate.split('T')[0] < KSJI_COMMANDERY_CONSTANTS.CHARTER_DATE;

      let badge = 'Order Initiation';
      let desc = 'Initiated into the sacred ranks of the Knights of St. John International.';
      if (isPreCharter) {
        badge = 'Pre-Charter Initiate';
        desc = `Initiated prior to the founding of Commandery #500${initInfo.initiationPlace ? ` at ${initInfo.initiationPlace}` : ''}.`;
      } else if (isCharterDay) {
        badge = 'Charter Day Class';
        desc = 'Foundational brother inducted on Charter Inauguration Day (30th Dec 1995).';
      }

      events.push({
        id: 'ev-initiation',
        category: 'initiation',
        dateStr: initDate,
        formattedDate: formatDisplayDate(initDate),
        title: '1st Degree Exemplification (Initiation into KSJI)',
        subtitle: initInfo.initiationPlace || 'St. Margaret-Mary Commandery #500',
        description: desc,
        badge,
        icon: '⚔️',
        color: '#10233f',
        bgColor: '#f0f4f8',
        borderColor: '#cbd5e1',
        isMilestone: true
      });
    }

    // 2. TRANSFER INTO COMMANDERY #500 (if transferee)
    if (member.transfer_from) {
      const tDate = member.transfer_date || member.date_joined;
      if (tDate) {
        events.push({
          id: 'ev-transfer-in',
          category: 'transfer',
          dateStr: tDate,
          formattedDate: formatDisplayDate(tDate),
          title: 'Transferred to St. Margaret-Mary Commandery #500',
          subtitle: `Transferred from ${member.transfer_from}`,
          description: `Formal fraternal affiliation into St. Margaret-Mary Commandery #500, Dansoman.`,
          badge: 'Commandery Intake',
          icon: '🔄',
          color: '#0369a1',
          bgColor: '#e0f2fe',
          borderColor: '#bae6fd',
          isMilestone: true
        });
      }
    }

    // 3. EXEMPLIFICATIONS / DEGREES
    const rawDegrees = Array.isArray(degrees) && degrees.length > 0 ? degrees : member?.degrees;
    const safeDegrees = toSafeArray<any>(rawDegrees);
    safeDegrees.forEach((d: any, idx: number) => {
      const dt = String(d.degree_type || '').toLowerCase();
      // Skip duplicate 1st degree if already placed by initiation
      if ((dt.includes('1st') || dt.includes('first')) && (initInfo.initiationDate || member.date_joined)) {
        return;
      }

      const dDate = d.degree_date || '9999-12-31';
      const is4th = dt.includes('4th') || dt.includes('fourth') || dt.includes('chevalier');
      const is5th = dt.includes('5th') || dt.includes('fifth') || dt.includes('noble');

      let icon = '📜';
      let color = '#334155';
      let bgColor = '#f8fafc';
      let borderColor = '#e2e8f0';
      let badge = 'Degree Exemplification';
      let subtitle = d.degree_place || 'Commandery Temple';
      let description = `Conferred with the solemn rites of the ${d.degree_type}.`;

      if (is5th) {
        icon = '👑';
        color = '#78350f';
        bgColor = '#fffbeb';
        borderColor = '#fde68a';
        badge = '5th Degree • Noble Elevation';
        subtitle = d.degree_place || "Accra West Nobles' Temple";
        description = 'Elevated to the Fifth Degree of the Order, bearing the title Noble Brother (N/B).';
      } else if (is4th) {
        icon = '🏅';
        color = '#1e3a8a';
        bgColor = '#eff6ff';
        borderColor = '#bfdbfe';
        badge = '4th Degree • Chevalier';
        subtitle = d.degree_place || 'Archbishop William Porter Chapter of Chevaliers';
        description = 'Exemplified into the Fourth Degree of the Order, joining the Chapter of Chevaliers.';
      }

      events.push({
        id: `ev-degree-${idx}`,
        category: 'degree',
        dateStr: dDate,
        formattedDate: d.degree_date ? formatDisplayDate(d.degree_date) : 'Date Unknown',
        title: d.degree_type || 'Degree Exemplification',
        subtitle,
        description,
        badge,
        icon,
        color,
        bgColor,
        borderColor,
        isMilestone: is4th || is5th
      });
    });

    // 4. UNIFORMED MILITARY RANKS / COMMISSIONS
    const rawMilitary = Array.isArray(military) && military.length > 0 ? military : member?.military;
    const safeMilitary = toSafeArray<any>(rawMilitary);
    safeMilitary.forEach((m: any, idx: number) => {
      // Strictly verify brother is in uniformed ranks and has a bona fide rank or commission date
      const rankTitle = m.current_rank || m.rank;
      const commissionDate = m.commission || m.date_promoted;
      const isUniformed = m.is_military === true;

      // If member is not uniformed and has no commissioned rank/date, do NOT generate any event
      if (!isUniformed && !rankTitle && !commissionDate) {
        return;
      }

      // If they are uniformed but have no officer rank or commission date, they are an uncommissioned uniformed knight (no officer commission event)
      if (!rankTitle && !commissionDate) {
        return;
      }

      const pDate = commissionDate || '9999-12-31';
      events.push({
        id: `ev-mil-${idx}`,
        category: 'rank',
        dateStr: pDate,
        formattedDate: commissionDate ? formatDisplayDate(commissionDate) : 'Commission Date Unrecorded',
        title: rankTitle ? `Commissioned as ${rankTitle}` : 'Military Officer Commission',
        subtitle: m.authority ? `Authority: ${m.authority}` : 'Uniformed Ranks Commission',
        description: m.notes || `Commissioned officer rank advancement in the military ranks of KSJI.`,
        badge: 'Military Commission',
        icon: '🎖️',
        color: '#15803d',
        bgColor: '#f0fdf4',
        borderColor: '#bbf7d0',
        isMilestone: true
      });
    });

    // 5. LEADERSHIP & OFFICES HELD
    const rawPositions = Array.isArray(positions) && positions.length > 0 ? positions : member?.positions;
    const safePositions = toSafeArray<any>(rawPositions);
    safePositions.forEach((pos: any, idx: number) => {
      const fDate = pos.date_from || '9999-12-31';
      const titleLower = String(pos.position_title || '').toLowerCase();
      const isPres = titleLower.includes('worthy president') || titleLower === 'president' || titleLower.includes('past worthy president');
      const isCurrent = !pos.date_to || String(pos.date_to).trim() === '';

      let icon = '🏛️';
      let color = '#0f172a';
      let bgColor = '#f8fafc';
      let borderColor = '#cbd5e1';
      let badge = `${pos.level || 'Commandery'} Office`;

      if (isPres) {
        icon = '👑';
        color = '#854d0e';
        bgColor = '#fefce8';
        borderColor = '#fef08a';
        badge = isCurrent ? 'Worthy President (Incumbent)' : 'Worthy President (Past)';
      }

      const tenure = isCurrent 
        ? `${pos.date_from ? formatDisplayDate(pos.date_from) : '—'} to Present` 
        : `${pos.date_from ? formatDisplayDate(pos.date_from) : '—'} to ${pos.date_to ? formatDisplayDate(pos.date_to) : '—'}`;

      events.push({
        id: `ev-pos-${idx}`,
        category: 'office',
        dateStr: fDate,
        formattedDate: pos.date_from ? formatDisplayDate(pos.date_from) : 'Tenure Start Unrecorded',
        title: pos.position_title || 'Commandery Officer',
        subtitle: `${pos.level || 'Local Commandery'} Level • ${tenure}`,
        description: isPres 
          ? 'Presided as Chief Executive and Spiritual Head of the Commandery.' 
          : `Faithful fraternal leadership and stewardship in the position of ${pos.position_title}.`,
        badge,
        icon,
        color,
        bgColor,
        borderColor,
        isMilestone: isPres
      });
    });

    // Uniformed rank records
    const rawRanks = Array.isArray(ranks) && ranks.length > 0 ? ranks : member?.uniformed_rank_records;
    const safeRanks = toSafeArray<any>(rawRanks);
    safeRanks.forEach((r: any, idx: number) => {
      if (!r || !r.rank_name) return;
      const rDate = r.effective_date || '9999-12-31';
      events.push({
        id: `ev-rank-rec-${idx}`,
        category: 'rank',
        dateStr: rDate,
        formattedDate: r.effective_date ? formatDisplayDate(r.effective_date) : 'Date Unknown',
        title: `Rank: ${r.rank_name}`,
        subtitle: r.rank_category || 'Uniformed Rank',
        description: r.notes || 'Official KSJI rank record.',
        badge: 'Rank Record',
        icon: '🎖️',
        color: '#15803d',
        bgColor: '#f0fdf4',
        borderColor: '#bbf7d0',
        isMilestone: true,
      });
    });

    // 6. FRATERNAL JUBILEE ANNIVERSARIES
    const initDateForJubilee = initInfo.initiationDate || member.date_joined;
    if (initDateForJubilee) {
      const jubilees = getFraternalJubileeMilestones(initDateForJubilee);
      (jubilees || []).forEach(j => {
        if (j.isReached) {
          events.push({
            id: `ev-jubilee-${j.years}`,
            category: 'jubilee',
            dateStr: j.anniversaryDate,
            formattedDate: formatDisplayDate(j.anniversaryDate),
            title: j.title,
            subtitle: `${j.years} Consecutive Years of Fraternal Service`,
            description: j.description,
            badge: j.badge,
            icon: j.icon,
            color: j.years >= 25 ? '#b45309' : '#0369a1',
            bgColor: j.years >= 25 ? '#fffbeb' : '#f0f9ff',
            borderColor: j.years >= 25 ? '#fcd34d' : '#bae6fd',
            isMilestone: true
          });
        }
      });
    }

    // 7. IN MEMORIAM / MEMORIAL ROLL (DECEASED BROTHERS)
    if (member.is_deceased || member.status === 'Deceased') {
      const dDate = member.date_of_death || '9999-12-31';
      events.push({
        id: 'ev-memorial',
        category: 'memorial',
        dateStr: dDate,
        formattedDate: member.date_of_death ? formatDisplayDate(member.date_of_death) : 'Passed into Eternity',
        title: 'Called to Eternal Rest • Roll of Honour',
        subtitle: member.burial_place ? `Resting at ${member.burial_place}` : 'Commandery #500 Memorial Roll',
        description: `Concluded his earthly pilgrimage and answered the final summons of the Supreme Grand Master. Permanently preserved on the Roll of Honour.`,
        badge: '🕊️ Roll of Honour',
        icon: '🕊️',
        color: '#991b1b',
        bgColor: '#fef2f2',
        borderColor: '#fecaca',
        isMilestone: true
      });
    }

    // Sort chronologically
    return events.sort((a, b) => {
      const cmp = a.dateStr.localeCompare(b.dateStr);
      return sortAsc ? cmp : -cmp;
    });
  }, [member, degrees, positions, military, ranks, initInfo, sortAsc]);

  // Filter events
  const filteredEvents = useMemo(() => {
    if (filter === 'all') return timelineEvents;
    return timelineEvents.filter(e => e.category === filter);
  }, [timelineEvents, filter]);

  const totalDegrees = timelineEvents.filter(e => e.category === 'degree' || e.category === 'initiation').length;
  const totalOffices = timelineEvents.filter(e => e.category === 'office').length;
  const totalRanks = timelineEvents.filter(e => e.category === 'rank').length;
  const totalJubilees = timelineEvents.filter(e => e.category === 'jubilee').length;

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      padding: compact ? '16px' : '24px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.04)'
    }}>
      {/* HEADER */}
      {showTitle && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 20,
          paddingBottom: 16,
          borderBottom: '1px solid #e2e8f0'
        }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, color: '#d4af37', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              <span>⚔️</span> Fraternal Life-Cycle
            </div>
            <h3 style={{ margin: '4px 0 0', fontSize: compact ? 18 : 20, fontWeight: 800, color: '#10233f' }}>
              Lifelong Fraternal Service Journey
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#64748b' }}>
              Chronological record of Initiation, Exemplifications, Uniformed Ranks, Leadership Offices & Jubilees.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => setSortAsc(!sortAsc)}
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}
              title="Toggle sort direction"
            >
              <span>{sortAsc ? '⏳ Oldest First' : '⌛ Newest First'}</span>
            </button>
          </div>
        </div>
      )}

      {/* FILTER PILLS */}
      <div className="no-print" style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 20
      }}>
        <button
          type="button"
          onClick={() => setFilter('all')}
          style={{
            padding: '5px 12px',
            borderRadius: '20px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            border: filter === 'all' ? '1px solid #10233f' : '1px solid #e2e8f0',
            background: filter === 'all' ? '#10233f' : '#f8fafc',
            color: filter === 'all' ? '#ffffff' : '#64748b',
            transition: 'all 0.15s ease'
          }}
        >
          All Milestones ({timelineEvents.length})
        </button>

        <button
          type="button"
          onClick={() => setFilter('degree')}
          style={{
            padding: '5px 12px',
            borderRadius: '20px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            border: filter === 'degree' ? '1px solid #1e3a8a' : '1px solid #e2e8f0',
            background: filter === 'degree' ? '#1e3a8a' : '#f8fafc',
            color: filter === 'degree' ? '#ffffff' : '#64748b'
          }}
        >
          Degrees & Exemplifications ({totalDegrees})
        </button>

        <button
          type="button"
          onClick={() => setFilter('office')}
          style={{
            padding: '5px 12px',
            borderRadius: '20px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            border: filter === 'office' ? '1px solid #854d0e' : '1px solid #e2e8f0',
            background: filter === 'office' ? '#854d0e' : '#f8fafc',
            color: filter === 'office' ? '#ffffff' : '#64748b'
          }}
        >
          Leadership Offices ({totalOffices})
        </button>

        {totalRanks > 0 && (
          <button
            type="button"
            onClick={() => setFilter('rank')}
            style={{
              padding: '5px 12px',
              borderRadius: '20px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              border: filter === 'rank' ? '1px solid #15803d' : '1px solid #e2e8f0',
              background: filter === 'rank' ? '#15803d' : '#f8fafc',
              color: filter === 'rank' ? '#ffffff' : '#64748b'
            }}
          >
            Military Commissions ({totalRanks})
          </button>
        )}

        {totalJubilees > 0 && (
          <button
            type="button"
            onClick={() => setFilter('jubilee')}
            style={{
              padding: '5px 12px',
              borderRadius: '20px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              border: filter === 'jubilee' ? '1px solid #b45309' : '1px solid #e2e8f0',
              background: filter === 'jubilee' ? '#b45309' : '#f8fafc',
              color: filter === 'jubilee' ? '#ffffff' : '#64748b'
            }}
          >
            Jubilees ({totalJubilees})
          </button>
        )}
      </div>

      {/* TIMELINE LIST */}
      {filteredEvents.length === 0 ? (
        <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
          No journey milestones recorded in this category.
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: 30 }}>
          {/* Vertical Track Line */}
          <div style={{
            position: 'absolute',
            left: 12,
            top: 10,
            bottom: 10,
            width: 3,
            background: 'linear-gradient(to bottom, #d4af37 0%, #10233f 50%, #94a3b8 100%)',
            borderRadius: 3
          }} />

          {filteredEvents.map((evt, idx) => (
            <div
              key={evt.id}
              style={{
                position: 'relative',
                marginBottom: idx === filteredEvents.length - 1 ? 0 : 20
              }}
            >
              {/* Milestone Marker Dot */}
              <div style={{
                position: 'absolute',
                left: -29,
                top: 4,
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: '#ffffff',
                border: `3px solid ${evt.color}`,
                boxShadow: '0 0 0 3px rgba(255,255,255,0.9), 0 2px 5px rgba(0,0,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                zIndex: 2
              }}>
                <span style={{ transform: 'scale(0.85)' }}>{evt.icon}</span>
              </div>

              {/* Event Card */}
              <div style={{
                background: evt.bgColor,
                border: `1px solid ${evt.borderColor}`,
                borderRadius: '10px',
                padding: '12px 16px',
                transition: 'box-shadow 0.15s ease',
                boxShadow: evt.isMilestone ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: 8,
                  marginBottom: 4
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: evt.color
                    }}>
                      {evt.title}
                    </span>
                    {evt.badge && (
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 12,
                        background: '#ffffff',
                        color: evt.color,
                        border: `1px solid ${evt.borderColor}`
                      }}>
                        {evt.badge}
                      </span>
                    )}
                  </div>

                  <span style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#64748b',
                    background: '#ffffff',
                    padding: '2px 8px',
                    borderRadius: 4,
                    border: '1px solid #e2e8f0',
                    fontFamily: 'monospace'
                  }}>
                    {evt.formattedDate}
                  </span>
                </div>

                {evt.subtitle && (
                  <div style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: '#475569',
                    marginBottom: 4
                  }}>
                    {evt.subtitle}
                  </div>
                )}

                {evt.description && (
                  <p style={{
                    margin: '4px 0 0',
                    fontSize: 12,
                    color: '#64748b',
                    lineHeight: 1.45
                  }}>
                    {evt.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
