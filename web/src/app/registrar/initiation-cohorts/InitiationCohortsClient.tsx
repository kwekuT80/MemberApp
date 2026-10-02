'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';

export interface CohortMemberItem {
  id: string;
  memberId: string | null;
  rollBookId: string | null;
  entryNo: string | null;
  title: string;
  firstName: string;
  surname: string;
  otherNames: string;
  fullName: string;
  dateOfInitiation: string | null;
  cohortYear: string;
  status: string;
  isDeceased: boolean;
  transferTo: string | null;
  transferDate: string | null;
  transferFrom: string | null;
  dateOfDeath: string | null;
  burialPlace: string | null;
  dateOfDismissal: string | null;
  occupation: string | null;
  residence: string | null;
  ageAtInitiation: string | null;
  notes: string | null;
  source: string;
  photoUrl: string | null;
  rank: string | null;
  memberNumber: string | null;
  highestDegree?: string | null;
  isChevalier?: boolean;
  isNoble?: boolean;
  isPastPresident?: boolean;
}

interface CohortGroup {
  dateKey: string;
  formattedDate: string;
  shortDate: string;
  year: string;
  cohortIndexInYear: number;
  totalCohortsInYear: number;
  members: CohortMemberItem[];
  activeCount: number;
  deceasedCount: number;
  transferCount: number;
  dismissedCount: number;
  archivedCount: number;
  chevalierCount: number;
  nobleCount: number;
  presidentCount: number;
}

interface YearGroup {
  year: string;
  cohorts: CohortGroup[];
  totalMembers: number;
  hasMultipleCohorts: boolean;
}

// Ordinal date formatter (e.g., 2007-06-09 -> "Saturday, 9th June 2007")
function formatCohortDate(dateStr: string): { full: string; short: string } {
  if (!dateStr || dateStr.length < 10) {
    return { full: dateStr || 'Date Unknown', short: dateStr || 'Unknown' };
  }
  try {
    const parts = dateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);

    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const nth = (n: number) => {
      if (n > 3 && n < 21) return 'th';
      switch (n % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    };

    const weekday = weekdays[d.getDay()];
    const monthName = months[month];
    const shortMonth = shortMonths[month];
    const dayWithNth = `${day}${nth(day)}`;

    return {
      full: `${weekday}, ${dayWithNth} ${monthName} ${year}`,
      short: `${dayWithNth} ${shortMonth} ${year}`
    };
  } catch (e) {
    return { full: dateStr, short: dateStr };
  }
}

export default function InitiationCohortsClient({
  initialMembers
}: {
  initialMembers: CohortMemberItem[];
}) {
  const [members] = useState<CohortMemberItem[]>(initialMembers);
  const [search, setSearch] = useState('');
  const [selectedEra, setSelectedEra] = useState<'ALL' | 'PRE_2000' | '2000s' | '2010s' | '2020s'>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [onlyMultipleCohorts, setOnlyMultipleCohorts] = useState<boolean>(false);
  const [onlyElevatedCohorts, setOnlyElevatedCohorts] = useState<boolean>(false);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [viewMode, setViewMode] = useState<'grouped' | 'timeline' | 'table'>('grouped');
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());

  // 1. Group all members by unique dateOfInitiation
  const allCohortsMap = useMemo(() => {
    const map = new Map<string, CohortMemberItem[]>();
    members.forEach(m => {
      const d = m.dateOfInitiation || 'UNKNOWN_DATE';
      if (!map.has(d)) {
        map.set(d, []);
      }
      map.get(d)!.push(m);
    });
    return map;
  }, [members]);

  // 2. Identify years with multiple cohorts across all data
  const multiCohortYearsSet = useMemo(() => {
    const yearDates = new Map<string, Set<string>>();
    allCohortsMap.forEach((_, dateKey) => {
      if (dateKey === 'UNKNOWN_DATE') return;
      const yr = dateKey.substring(0, 4);
      if (!yearDates.has(yr)) yearDates.set(yr, new Set());
      yearDates.get(yr)!.add(dateKey);
    });

    const multiSet = new Set<string>();
    yearDates.forEach((dates, yr) => {
      if (dates.size > 1) {
        multiSet.add(yr);
      }
    });
    return multiSet;
  }, [allCohortsMap]);

  // 3. Filter members based on search, era, year, and status
  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      // Era filter
      if (selectedEra !== 'ALL') {
        const y = parseInt(m.cohortYear, 10);
        if (isNaN(y)) return false;
        if (selectedEra === 'PRE_2000' && y >= 2000) return false;
        if (selectedEra === '2000s' && (y < 2000 || y > 2009)) return false;
        if (selectedEra === '2010s' && (y < 2010 || y > 2019)) return false;
        if (selectedEra === '2020s' && y < 2020) return false;
      }

      // Status filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'Active' && m.status !== 'Active') return false;
        if (statusFilter === 'Deceased' && (m.status === 'Dismissed' || m.status === 'Transfer-Out' || (!m.isDeceased && m.status !== 'Deceased'))) return false;
        if (statusFilter === 'Transfer-Out' && m.status !== 'Transfer-Out') return false;
        if (statusFilter === 'Dismissed' && m.status !== 'Dismissed') return false;
        if (statusFilter === 'Archived' && m.status !== 'Archived Roll') return false;
      }

      // Year filter
      if (selectedYear !== 'ALL') {
        if (m.cohortYear !== selectedYear) return false;
      }

      // Only multiple cohort years filter
      if (onlyMultipleCohorts) {
        if (!multiCohortYearsSet.has(m.cohortYear)) return false;
      }

      // Only elevated cohorts filter (Nobles / Chevaliers / Presidents)
      if (onlyElevatedCohorts) {
        if (!m.isPastPresident && !m.isNoble && !m.isChevalier) return false;
      }

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const full = m.fullName.toLowerCase();
        const notes = (m.notes || '').toLowerCase();
        const occ = (m.occupation || '').toLowerCase();
        const res = (m.residence || '').toLowerCase();
        const dest = (m.transferTo || '').toLowerCase();
        const entry = (m.entryNo || '').toLowerCase();
        const dateStr = (m.dateOfInitiation || '').toLowerCase();

        if (
          !full.includes(q) &&
          !notes.includes(q) &&
          !occ.includes(q) &&
          !res.includes(q) &&
          !dest.includes(q) &&
          !entry.includes(q) &&
          !dateStr.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [members, statusFilter, selectedEra, selectedYear, onlyMultipleCohorts, onlyElevatedCohorts, search, multiCohortYearsSet]);

  // 4. Group filtered members by Cohort Date and Year
  const yearGroups = useMemo(() => {
    // First group by dateKey
    const cohortsMap = new Map<string, CohortMemberItem[]>();
    filteredMembers.forEach(m => {
      const d = m.dateOfInitiation || 'UNKNOWN_DATE';
      if (!cohortsMap.has(d)) cohortsMap.set(d, []);
      cohortsMap.get(d)!.push(m);
    });

    // Group dates by year
    const yearMap = new Map<string, { dateKey: string; members: CohortMemberItem[] }[]>();
    cohortsMap.forEach((mList, dateKey) => {
      const yr = dateKey === 'UNKNOWN_DATE' ? 'Unknown' : dateKey.substring(0, 4);
      if (!yearMap.has(yr)) yearMap.set(yr, []);
      yearMap.get(yr)!.push({ dateKey, members: mList });
    });

    const result: YearGroup[] = [];

    yearMap.forEach((dateItems, yr) => {
      // Sort cohort dates within the year ascending
      dateItems.sort((a, b) => a.dateKey.localeCompare(b.dateKey));

      const totalCohortsInYear = dateItems.length;

      const cohortGroups: CohortGroup[] = dateItems.map((item, idx) => {
        const { full, short } = formatCohortDate(item.dateKey);

        // Sort members within cohort: by entryNo numerically, then by surname
        const sortedMembers = [...item.members].sort((a, b) => {
          const na = a.entryNo ? parseInt(a.entryNo, 10) : 9999;
          const nb = b.entryNo ? parseInt(b.entryNo, 10) : 9999;
          if (na !== 9999 && nb !== 9999 && na !== nb) return na - nb;
          return a.surname.localeCompare(b.surname);
        });

        const activeCount = sortedMembers.filter(m => m.status === 'Active').length;
        const deceasedCount = sortedMembers.filter(m => (m.status === 'Deceased' || m.isDeceased) && m.status !== 'Dismissed' && m.status !== 'Transfer-Out').length;
        const transferCount = sortedMembers.filter(m => m.status === 'Transfer-Out').length;
        const dismissedCount = sortedMembers.filter(m => m.status === 'Dismissed').length;
        const archivedCount = sortedMembers.filter(m => m.status === 'Archived Roll').length;
        const chevalierCount = sortedMembers.filter(m => m.isChevalier).length;
        const nobleCount = sortedMembers.filter(m => m.isNoble).length;
        const presidentCount = sortedMembers.filter(m => m.isPastPresident).length;

        return {
          dateKey: item.dateKey,
          formattedDate: full,
          shortDate: short,
          year: yr,
          cohortIndexInYear: idx + 1,
          totalCohortsInYear,
          members: sortedMembers,
          activeCount,
          deceasedCount,
          transferCount,
          dismissedCount,
          archivedCount,
          chevalierCount,
          nobleCount,
          presidentCount
        };
      });

      const totalMembers = cohortGroups.reduce((acc, c) => acc + c.members.length, 0);

      result.push({
        year: yr,
        cohorts: cohortGroups,
        totalMembers,
        hasMultipleCohorts: totalCohortsInYear > 1
      });
    });

    // Sort years
    result.sort((a, b) => {
      if (a.year === 'Unknown') return 1;
      if (b.year === 'Unknown') return -1;
      return sortOrder === 'desc'
        ? b.year.localeCompare(a.year)
        : a.year.localeCompare(b.year);
    });

    return result;
  }, [filteredMembers, sortOrder]);

  // Initialize expanded years to all years on first load
  React.useEffect(() => {
    if (yearGroups.length > 0 && expandedYears.size === 0) {
      setExpandedYears(new Set(yearGroups.map(yg => yg.year)));
    }
  }, [yearGroups]);

  // Flat list of all cohorts (for timeline & table views)
  const flatCohorts = useMemo(() => {
    const list: CohortGroup[] = [];
    yearGroups.forEach(yg => {
      yg.cohorts.forEach(c => list.push(c));
    });
    return list;
  }, [yearGroups]);

  // Overall Stats
  const stats = useMemo(() => {
    let totalBrothers = members.length;
    let totalActive = members.filter(m => m.status === 'Active').length;
    let totalDeceased = members.filter(m => (m.status === 'Deceased' || m.isDeceased) && m.status !== 'Dismissed' && m.status !== 'Transfer-Out').length;
    let totalTransfers = members.filter(m => m.status === 'Transfer-Out').length;
    let totalDismissed = members.filter(m => m.status === 'Dismissed').length;
    let totalDismissedDeceased = members.filter(m => m.status === 'Dismissed' && m.isDeceased).length;
    let totalArchived = members.filter(m => m.status === 'Archived Roll').length;
    let totalCohorts = allCohortsMap.size;
    let multiYearsCount = multiCohortYearsSet.size;
    let totalChevaliers = members.filter(m => m.isChevalier).length;
    let totalNobles = members.filter(m => m.isNoble).length;
    let totalPresidents = members.filter(m => m.isPastPresident).length;

    return {
      totalBrothers,
      totalActive,
      totalDeceased,
      totalTransfers,
      totalDismissed,
      totalDismissedDeceased,
      totalArchived,
      totalCohorts,
      multiYearsCount,
      totalChevaliers,
      totalNobles,
      totalPresidents
    };
  }, [members, allCohortsMap, multiCohortYearsSet]);

  // Era brother counts
  const pre2000Count = useMemo(() => members.filter(m => {
    const y = parseInt(m.cohortYear, 10);
    return !isNaN(y) && y < 2000;
  }).length, [members]);

  const era2000sCount = useMemo(() => members.filter(m => {
    const y = parseInt(m.cohortYear, 10);
    return !isNaN(y) && y >= 2000 && y <= 2009;
  }).length, [members]);

  const era2010sCount = useMemo(() => members.filter(m => {
    const y = parseInt(m.cohortYear, 10);
    return !isNaN(y) && y >= 2010 && y <= 2019;
  }).length, [members]);

  const era2020sCount = useMemo(() => members.filter(m => {
    const y = parseInt(m.cohortYear, 10);
    return !isNaN(y) && y >= 2020;
  }).length, [members]);

  // List of all distinct years for the dropdown (scoped to active era if selected)
  const availableYears = useMemo(() => {
    const set = new Set<string>();
    members.forEach(m => {
      if (m.cohortYear && m.cohortYear !== 'Unknown') {
        const y = parseInt(m.cohortYear, 10);
        if (selectedEra === 'PRE_2000' && (!isNaN(y) && y >= 2000)) return;
        if (selectedEra === '2000s' && (!isNaN(y) && (y < 2000 || y > 2009))) return;
        if (selectedEra === '2010s' && (!isNaN(y) && (y < 2010 || y > 2019))) return;
        if (selectedEra === '2020s' && (!isNaN(y) && y < 2020)) return;
        set.add(m.cohortYear);
      }
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [members, selectedEra]);

  const toggleYear = (yr: string) => {
    const next = new Set(expandedYears);
    if (next.has(yr)) {
      next.delete(yr);
    } else {
      next.add(yr);
    }
    setExpandedYears(next);
  };

  const expandAll = () => {
    setExpandedYears(new Set(yearGroups.map(yg => yg.year)));
  };

  const collapseAll = () => {
    setExpandedYears(new Set());
  };

  // Export Cohort Roster to CSV
  const handleExportCsv = () => {
    const headers = [
      'Year',
      'Cohort Date',
      'Cohort # in Year',
      'Roll Entry #',
      'Title',
      'First Name',
      'Surname',
      'Full Name',
      'Status',
      'Is Deceased',
      'Occupation',
      'Residence',
      'Age at Initiation',
      'Transfer To',
      'Transfer Date',
      'Source',
      'Notes'
    ];

    const rows: string[][] = [];

    yearGroups.forEach(yg => {
      yg.cohorts.forEach(c => {
        c.members.forEach(m => {
          rows.push([
            yg.year,
            c.dateKey,
            String(c.cohortIndexInYear),
            m.entryNo || 'N/A',
            m.title,
            m.firstName,
            m.surname,
            m.fullName,
            m.status,
            m.isDeceased ? 'Yes' : 'No',
            m.occupation || '',
            m.residence || '',
            m.ageAtInitiation || '',
            m.transferTo || '',
            m.transferDate || '',
            m.source,
            (m.notes || '').replace(/[\r\n]+/g, '; ')
          ]);
        });
      });
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `KSJI_Initiation_Cohorts_Register_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Roster
  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '16px 20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* SISTER SUITE NAVIGATION BAR */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '6px 12px',
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginRight: '6px' }}>
            Historical Suite:
          </span>
          <Link
            href="/registrar/historical-members"
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
              color: '#475569',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>📜</span> Roll Book & Archives
          </Link>
          <Link
            href="/registrar/transfers"
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
              color: '#475569',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🔄</span> Member Transfers Out
          </Link>
          <span
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 700,
              color: '#800020',
              background: '#fdf2f2',
              border: '1px solid #fecaca',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🏛️</span> Initiation Cohorts
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleExportCsv}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              color: '#1e293b',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <span>📥</span> Export CSV
          </button>
          <button
            onClick={handlePrint}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#800020',
              border: 'none',
              color: '#ffffff',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(128,0,32,0.2)'
            }}
          >
            <span>🖨️</span> Print Cohort Roster
          </button>
        </div>
      </div>

      {/* HEADER HERO CARD */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #31101e 100%)',
        color: '#fff',
        padding: '24px 28px',
        borderRadius: '12px',
        marginBottom: '20px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '26px' }}>🏛️</span>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.3px' }}>
                Commandery Initiation Cohorts Directory
              </h1>
              <span style={{
                background: 'rgba(217, 119, 6, 0.25)',
                color: '#fef08a',
                border: '1px solid rgba(217, 119, 6, 0.5)',
                borderRadius: '999px',
                padding: '2px 10px',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase'
              }}>
                Master Annals
              </span>
            </div>
            <p style={{ margin: 0, color: '#cbd5e1', fontSize: '13.5px', lineHeight: '1.6', maxWidth: '850px' }}>
              Complete record of all initiation classes in our Commandery. Shows every brother initiated together in each cohort—regardless of whether they are active, transferred to daughter Commanderies, dismissed, or entered into the eternal Roll of Honour.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              padding: '10px 16px',
              textAlign: 'center',
              minWidth: '95px'
            }}>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#38bdf8' }}>{stats.totalCohorts}</div>
              <div style={{ fontSize: '10.5px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Cohorts</div>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              padding: '10px 16px',
              textAlign: 'center',
              minWidth: '95px'
            }}>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#fbbf24' }}>{stats.totalBrothers}</div>
              <div style={{ fontSize: '10.5px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Brothers</div>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              padding: '10px 16px',
              textAlign: 'center',
              minWidth: '95px'
            }}>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#4ade80' }}>{stats.multiYearsCount}</div>
              <div style={{ fontSize: '10.5px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Multi-Cohort Yrs</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI BREAKDOWN CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        marginBottom: '20px'
      }}>
        <div style={{ background: '#fff', borderRadius: '8px', padding: '14px 16px', border: '1px solid #bbf7d0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.4px' }}>🟢 Active Members</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>{stats.totalActive}</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Current active brotherhood</div>
        </div>

        <div style={{ background: '#fff', borderRadius: '8px', padding: '14px 16px', border: '1px solid #fed7aa', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#9a3412', textTransform: 'uppercase', letterSpacing: '0.4px' }}>🕊️ Roll of Honour</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#c2410c', marginTop: '2px' }}>{stats.totalDeceased}</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Died in good standing</div>
        </div>

        <div style={{ background: '#fff', borderRadius: '8px', padding: '14px 16px', border: '1px solid #bae6fd', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.4px' }}>🔄 Transferred Out</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#0284c7', marginTop: '2px' }}>{stats.totalTransfers}</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>To daughter Commanderies</div>
        </div>

        <div style={{ background: '#fff', borderRadius: '8px', padding: '14px 16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.4px' }}>🚫 Dismissed</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#64748b', marginTop: '2px' }}>{stats.totalDismissed}</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            {stats.totalDismissedDeceased > 0 ? `Separated (${stats.totalDismissedDeceased} deceased)` : 'Separated membership'}
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '8px', padding: '14px 16px', border: '1px solid #fef08a', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#854d0e', textTransform: 'uppercase', letterSpacing: '0.4px' }}>📜 Historical Roll Book</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#a16207', marginTop: '2px' }}>{stats.totalArchived}</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Unassigned register records</div>
        </div>
      </div>

      {/* COHORT ELEVATIONS & LEADERSHIP BAR */}
      <div style={{
        background: 'linear-gradient(135deg, #10233f 0%, #1e3a5f 100%)',
        borderRadius: '10px',
        padding: '14px 20px',
        color: '#ffffff',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(16,35,63,0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>🎖️</span>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#d4af37', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Fraternal Elevations & Leadership Output
            </div>
            <div style={{ fontSize: '13.5px', color: '#e2e8f0', marginTop: '2px' }}>
              Lifetime honors and leadership ranks achieved across all initiation cohorts
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(254,240,138,0.4)',
            borderRadius: '8px',
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '18px' }}>👑</span>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#fef08a' }}>{stats.totalPresidents}</div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase' }}>Worthy Presidents</div>
            </div>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(253,211,77,0.4)',
            borderRadius: '8px',
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '18px' }}>👑</span>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#fde047' }}>{stats.totalNobles}</div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase' }}>Nobles (5th Deg)</div>
            </div>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(147,197,253,0.4)',
            borderRadius: '8px',
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '18px' }}>🏅</span>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#93c5fd' }}>{stats.totalChevaliers}</div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase' }}>Chevaliers (4th Deg)</div>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER & CONTROL TOOLBAR */}
      <div style={{
        background: '#fff',
        borderRadius: '10px',
        padding: '16px 20px',
        border: '1px solid #e2e8f0',
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        {/* Era / Decade Quick Selector Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', alignSelf: 'center', marginRight: '4px' }}>
            Historical Era:
          </span>
          {[
            { id: 'ALL', label: 'All Eras (1964–Present)', count: members.length },
            { id: 'PRE_2000', label: '🏛️ Charter & Foundation Era (1964–1999)', count: pre2000Count },
            { id: '2000s', label: '2000–2009', count: era2000sCount },
            { id: '2010s', label: '2010–2019', count: era2010sCount },
            { id: '2020s', label: '2020–Present', count: era2020sCount },
          ].map(era => {
            const isSel = selectedEra === era.id;
            return (
              <button
                key={era.id}
                onClick={() => {
                  setSelectedEra(era.id as any);
                  setSelectedYear('ALL');
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  fontWeight: isSel ? 700 : 600,
                  cursor: 'pointer',
                  border: isSel ? '1px solid #800020' : '1px solid #e2e8f0',
                  background: isSel ? '#800020' : '#f8fafc',
                  color: isSel ? '#ffffff' : '#475569',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{era.label}</span>
                <span style={{
                  background: isSel ? 'rgba(255,255,255,0.22)' : '#e2e8f0',
                  color: isSel ? '#ffffff' : '#64748b',
                  borderRadius: '999px',
                  padding: '1px 6px',
                  fontSize: '11px',
                  fontWeight: 700
                }}>
                  {era.count}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'space-between' }}>
          
          {/* Search Box */}
          <div style={{ flex: '1 1 280px', minWidth: '240px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
              🔍
            </span>
            <input
              type="text"
              placeholder="Search brother, cohort date, roll #, occupation, residence..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '13.5px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Year Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Year:</span>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '13px',
                background: '#fff',
                fontWeight: 600,
                color: '#1e293b',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Years ({availableYears.length})</option>
              {availableYears.map(yr => (
                <option key={yr} value={yr}>
                  {yr} {multiCohortYearsSet.has(yr) ? '⚡ (Multiple Cohorts)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '13px',
                background: '#fff',
                fontWeight: 600,
                color: '#1e293b',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Standings</option>
              <option value="Active">🟢 Active Only</option>
              <option value="Deceased">🕊️ Roll of Honour (Died in Good Standing)</option>
              <option value="Transfer-Out">🔄 Transferred Out</option>
              <option value="Dismissed">🚫 Dismissed</option>
              <option value="Archived">📜 Roll Book Archive</option>
            </select>
          </div>

          {/* Multiple Cohorts Toggle */}
          <button
            onClick={() => setOnlyMultipleCohorts(!onlyMultipleCohorts)}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              border: onlyMultipleCohorts ? '1px solid #b45309' : '1px solid #cbd5e1',
              background: onlyMultipleCohorts ? '#fef3c7' : '#f8fafc',
              color: onlyMultipleCohorts ? '#92400e' : '#475569',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>⚡</span>
            <span>Multi-Cohort Years Only ({stats.multiYearsCount})</span>
          </button>

          {/* Elevated Brothers Toggle */}
          <button
            onClick={() => setOnlyElevatedCohorts(!onlyElevatedCohorts)}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              border: onlyElevatedCohorts ? '1px solid #d4af37' : '1px solid #cbd5e1',
              background: onlyElevatedCohorts ? '#fefce8' : '#f8fafc',
              color: onlyElevatedCohorts ? '#854d0e' : '#475569',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🎖️</span>
            <span>Elevated Brothers Only</span>
          </button>

          {/* View Mode Toggle */}
          <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
            <button
              onClick={() => setViewMode('grouped')}
              title="Grouped by Year & Cohort"
              style={{
                padding: '8px 12px',
                border: 'none',
                background: viewMode === 'grouped' ? '#0f172a' : '#fff',
                color: viewMode === 'grouped' ? '#fff' : '#475569',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              📁 By Year
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              title="Chronological Cohort Stream"
              style={{
                padding: '8px 12px',
                border: 'none',
                borderLeft: '1px solid #cbd5e1',
                background: viewMode === 'timeline' ? '#0f172a' : '#fff',
                color: viewMode === 'timeline' ? '#fff' : '#475569',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              ⏱️ Timeline
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="All-in-one Master Table"
              style={{
                padding: '8px 12px',
                border: 'none',
                borderLeft: '1px solid #cbd5e1',
                background: viewMode === 'table' ? '#0f172a' : '#fff',
                color: viewMode === 'table' ? '#fff' : '#475569',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              📋 Master Table
            </button>
          </div>

          {/* Sort Order Toggle */}
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            style={{
              padding: '8px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              background: '#fff',
              fontSize: '12px',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            {sortOrder === 'desc' ? '⬇️ Newest First' : '⬆️ Oldest First'}
          </button>
        </div>

        {/* Quick Accordion Controls & Active Filter Notice */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            Showing <strong>{filteredMembers.length}</strong> brothers across <strong>{flatCohorts.length}</strong> cohorts in <strong>{yearGroups.length}</strong> years
            {(search || selectedYear !== 'ALL' || statusFilter !== 'ALL' || onlyMultipleCohorts) && (
              <button
                onClick={() => {
                  setSearch('');
                  setSelectedYear('ALL');
                  setStatusFilter('ALL');
                  setOnlyMultipleCohorts(false);
                }}
                style={{
                  marginLeft: '10px',
                  background: 'none',
                  border: 'none',
                  color: '#b91c1c',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Clear all filters
              </button>
            )}
          </div>

          {viewMode === 'grouped' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={expandAll}
                style={{ background: 'none', border: 'none', color: '#0369a1', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Expand All Years
              </button>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <button
                onClick={collapseAll}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Collapse All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* PRE-2000 HISTORICAL BANNER IF PRE-2000 FILTER ACTIVE */}
      {selectedEra === 'PRE_2000' && (
        <div style={{
          background: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: '8px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px'
        }}>
          <span style={{ fontSize: '26px' }}>🏛️</span>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#0369a1' }}>
              Historical Charter & Foundation Era (1964–1999) — {pre2000Count} Brothers Recorded
            </div>
            <div style={{ fontSize: '13px', color: '#0c4a6e', marginTop: '4px', lineHeight: '1.55' }}>
              <strong>St. Margaret-Mary Commandery #500 received its charter and came into being on 30th December 1995.</strong> All members with initiation dates predating this charter date (1964–1993) were initiated in mother commanderies and transferred into Commandery #500 on Charter Inauguration Day as its founding brothers. All entries from the Foundation Roll Book register (Page 1) and registered member profiles have been captured into the digital register. Local initiation cohorts commenced on Charter Day (30th Dec 1995) and continued through 1997, 1998, and 1999.
            </div>
          </div>
        </div>
      )}

      {/* MULTI-COHORT YEARS NOTIFICATION BADGE IF FILTER APPLIED */}
      {onlyMultipleCohorts && (
        <div style={{
          background: '#fffbeb',
          border: '1px solid #fcd34d',
          borderRadius: '8px',
          padding: '12px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '20px' }}>⚡</span>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#92400e' }}>
              Displaying Only Years with Multiple Initiation Cohorts ({stats.multiYearsCount} Years)
            </div>
            <div style={{ fontSize: '12.5px', color: '#b45309' }}>
              These years held two or more distinct initiation classes: 1997, 1999, 2000, 2002, 2004, 2005, 2006, 2010, 2011, 2012, 2014, and 2015.
            </div>
          </div>
        </div>
      )}

      {/* VIEW 1: GROUPED BY YEAR (DEFAULT) */}
      {viewMode === 'grouped' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {yearGroups.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: '10px', padding: '48px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
              <div style={{ fontSize: '17px', fontWeight: 700, color: '#1e293b' }}>No initiation cohorts matched your search.</div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Try resetting your search query or filters.</div>
            </div>
          ) : (
            yearGroups.map(yg => {
              const isExpanded = expandedYears.has(yg.year);

              return (
                <div
                  key={yg.year}
                  style={{
                    background: '#fff',
                    borderRadius: '12px',
                    border: yg.hasMultipleCohorts ? '1px solid #fed7aa' : '1px solid #e2e8f0',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                    overflow: 'hidden'
                  }}
                >
                  {/* Year Header Card */}
                  <div
                    onClick={() => toggleYear(yg.year)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 20px',
                      background: yg.hasMultipleCohorts
                        ? 'linear-gradient(90deg, #fff7ed 0%, #ffffff 100%)'
                        : '#f8fafc',
                      borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '16px', color: '#64748b' }}>
                        {isExpanded ? '▼' : '►'}
                      </span>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                        {yg.year === 'Unknown' ? 'Archived / Undated Initiations' : `Year ${yg.year}`}
                      </div>

                      {yg.hasMultipleCohorts ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: '#ffedd5',
                          color: '#c2410c',
                          border: '1px solid #fdba74',
                          borderRadius: '999px',
                          padding: '3px 12px',
                          fontSize: '12px',
                          fontWeight: 700
                        }}>
                          <span>⚡</span> {yg.cohorts.length} Cohorts Initiated in {yg.year}
                        </span>
                      ) : (
                        <span style={{
                          background: '#f1f5f9',
                          color: '#475569',
                          borderRadius: '999px',
                          padding: '3px 10px',
                          fontSize: '12px',
                          fontWeight: 600
                        }}>
                          1 Cohort Class
                        </span>
                      )}

                      <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 600 }}>
                        ({yg.totalMembers} Brother{yg.totalMembers === 1 ? '' : 's'} Total)
                      </span>

                      {yg.year !== 'Unknown' && parseInt(yg.year) < 1995 && (
                        <span style={{
                          background: '#fef3c7',
                          color: '#92400e',
                          border: '1px solid #fde68a',
                          borderRadius: '999px',
                          padding: '3px 10px',
                          fontSize: '11.5px',
                          fontWeight: 700
                        }}>
                          🏛️ Pre-Charter Foundation (Charter Day Transferees)
                        </span>
                      )}
                      {yg.year === '1995' && (
                        <span style={{
                          background: '#dcfce7',
                          color: '#15803d',
                          border: '1px solid #86efac',
                          borderRadius: '999px',
                          padding: '3px 10px',
                          fontSize: '11.5px',
                          fontWeight: 700
                        }}>
                          🎉 Commandery #500 Chartered (30th Dec 1995)
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>
                      {isExpanded ? 'Click to collapse' : 'Click to expand'}
                    </div>
                  </div>

                  {/* Year's Cohorts Content */}
                  {isExpanded && (
                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {yg.cohorts.map(cohort => (
                        <CohortCard key={cohort.dateKey} cohort={cohort} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW 2: TIMELINE STREAM VIEW */}
      {viewMode === 'timeline' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {flatCohorts.map(cohort => (
            <CohortCard key={cohort.dateKey} cohort={cohort} />
          ))}
        </div>
      )}

      {/* VIEW 3: MASTER TABULAR VIEW (PRINT & AUDIT READY) */}
      {viewMode === 'table' && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
          <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>Commandery Master Initiation Roll</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Complete linear register of all brothers initiated in Commandery #500</div>
            </div>
            <button
              onClick={handlePrint}
              style={{
                background: '#0f172a',
                color: '#fff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Print Master Table
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', color: '#334155', fontWeight: 700, fontSize: '12px' }}>
                  <th style={{ padding: '10px 14px' }}>Year</th>
                  <th style={{ padding: '10px 14px' }}>Cohort Date</th>
                  <th style={{ padding: '10px 14px' }}>Entry #</th>
                  <th style={{ padding: '10px 14px' }}>Full Name</th>
                  <th style={{ padding: '10px 14px' }}>Standing / Status</th>
                  <th style={{ padding: '10px 14px' }}>Occupation</th>
                  <th style={{ padding: '10px 14px' }}>Residence</th>
                  <th style={{ padding: '10px 14px' }}>Age</th>
                  <th style={{ padding: '10px 14px' }}>Archival Notes & Destination</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((m, idx) => (
                  <tr
                    key={m.id + idx}
                    style={{
                      borderBottom: '1px solid #e2e8f0',
                      background: idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                    }}
                  >
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>{m.cohortYear}</td>
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: '#475569' }}>
                      {formatCohortDate(m.dateOfInitiation || '').short}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {m.entryNo ? (
                        <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, fontSize: '11px', color: '#334155' }}>
                          #{m.entryNo}
                        </span>
                      ) : (
                        <span style={{ color: '#cbd5e1' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>
                        {m.memberId ? (
                          <Link href={`/registrar/members/${m.memberId}`} style={{ color: '#0f172a', textDecoration: 'none' }}>
                            {m.fullName}
                          </Link>
                        ) : (
                          m.fullName
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{m.source}</div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <StatusBadge status={m.status} isDeceased={m.isDeceased} transferTo={m.transferTo} />
                    </td>
                    <td style={{ padding: '10px 14px', color: '#475569' }}>{m.occupation || '—'}</td>
                    <td style={{ padding: '10px 14px', color: '#475569' }}>{m.residence || '—'}</td>
                    <td style={{ padding: '10px 14px', color: '#475569' }}>{m.ageAtInitiation || '—'}</td>
                    <td style={{ padding: '10px 14px', color: '#64748b', fontSize: '12px', maxWidth: '280px' }}>
                      {m.transferTo && (
                        <div style={{ color: '#0369a1', fontWeight: 600 }}>
                          Transferred to: {m.transferTo} {m.transferDate ? `(${m.transferDate})` : ''}
                        </div>
                      )}
                      {m.status === 'Dismissed' && m.isDeceased && (
                        <div style={{ color: '#475569', fontWeight: 600 }}>
                          ✝ Passed into eternity {m.dateOfDeath ? `(${m.dateOfDeath})` : ''} · Dismissed
                        </div>
                      )}
                      {m.status !== 'Dismissed' && (m.status === 'Deceased' || m.isDeceased) && (
                        <div style={{ color: '#c2410c', fontWeight: 600 }}>
                          🕊️ Roll of Honour {m.dateOfDeath ? `(${m.dateOfDeath})` : ''}
                        </div>
                      )}
                      {m.notes || (!m.transferTo && !m.isDeceased ? '—' : '')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PRINT-ONLY OFFICIAL HEADER AND FOOTER */}
      <style jsx global>{`
        @media print {
          body {
            background: #fff !important;
            color: #000 !important;
            font-size: 11pt !important;
          }
          nav, header, footer, button, select, input, .no-print {
            display: none !important;
          }
          .print-header {
            display: block !important;
            text-align: center;
            margin-bottom: 24px;
            border-bottom: 2px double #000;
            padding-bottom: 12px;
          }
          .cohort-card-print {
            page-break-inside: avoid;
            margin-bottom: 20px !important;
            border: 1px solid #ccc !important;
          }
        }
        @media screen {
          .print-header {
            display: none;
          }
        }
      `}</style>

      <div className="print-header">
        <h2 style={{ margin: 0, fontSize: '18pt', fontWeight: 'bold' }}>
          KNIGHTS OF ST. JOHN INTERNATIONAL
        </h2>
        <h3 style={{ margin: '4px 0', fontSize: '14pt', fontWeight: 'bold' }}>
          ST. MARGARET - MARY COMMANDERY NO. 500, DANSOMAN
        </h3>
        <h4 style={{ margin: '4px 0', fontSize: '12pt', textDecoration: 'underline' }}>
          OFFICIAL INITIATION COHORTS REGISTER & ROLL OF BROTHERHOOD
        </h4>
        <p style={{ margin: '6px 0', fontSize: '10pt', color: '#444' }}>
          Archival Ledger Generated on {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

    </div>
  );
}

// ==========================================
// COMPONENT: COHORT CARD
// ==========================================
function CohortCard({ cohort }: { cohort: CohortGroup }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      className="cohort-card-print"
      style={{
        background: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
        overflow: 'hidden'
      }}
    >
      {/* Cohort Header Bar */}
      <div style={{
        background: 'linear-gradient(90deg, #f8fafc 0%, #ffffff 100%)',
        padding: '16px 20px',
        borderBottom: isCollapsed ? 'none' : '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '18px' }}>⚔️</span>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
              Cohort of {cohort.formattedDate}
            </h3>

            {cohort.dateKey < '1995-12-30' && (
              <span style={{
                background: '#fef3c7',
                color: '#92400e',
                border: '1px solid #fde68a',
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '11.5px',
                fontWeight: 700
              }}>
                🏛️ Charter Transferees (Pre-1995 Mother Commandery)
              </span>
            )}
            {cohort.dateKey === '1995-12-30' && (
              <span style={{
                background: '#dcfce7',
                color: '#15803d',
                border: '1px solid #86efac',
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '11.5px',
                fontWeight: 700
              }}>
                🎉 Commandery #500 Charter Day Class (30-12-1995)
              </span>
            )}

            {cohort.totalCohortsInYear > 1 && (
              <span style={{
                background: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '11.5px',
                fontWeight: 700
              }}>
                Cohort {cohort.cohortIndexInYear} of {cohort.totalCohortsInYear} in {cohort.year}
              </span>
            )}

            <span style={{
              background: '#f1f5f9',
              color: '#334155',
              borderRadius: '999px',
              padding: '2px 10px',
              fontSize: '12px',
              fontWeight: 700
            }}>
              {cohort.members.length} Brother{cohort.members.length === 1 ? '' : 's'} Initiated Together
            </span>
          </div>

          {/* Quick status summary */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '12px', color: '#64748b', flexWrap: 'wrap' }}>
            {cohort.activeCount > 0 && (
              <span style={{ color: '#16a34a', fontWeight: 600 }}>🟢 {cohort.activeCount} Active</span>
            )}
            {cohort.deceasedCount > 0 && (
              <span style={{ color: '#c2410c', fontWeight: 600 }}>🕊️ {cohort.deceasedCount} Roll of Honour</span>
            )}
            {cohort.transferCount > 0 && (
              <span style={{ color: '#0284c7', fontWeight: 600 }}>🔄 {cohort.transferCount} Transferred</span>
            )}
            {cohort.dismissedCount > 0 && (
              <span style={{ color: '#64748b', fontWeight: 600 }}>
                🚫 {cohort.dismissedCount} Dismissed
                {cohort.members.filter(m => m.status === 'Dismissed' && m.isDeceased).length > 0 && ` (${cohort.members.filter(m => m.status === 'Dismissed' && m.isDeceased).length} deceased)`}
              </span>
            )}
            {cohort.archivedCount > 0 && (
              <span style={{ color: '#b45309', fontWeight: 600 }}>📜 {cohort.archivedCount} Roll Book</span>
            )}
          </div>

          {/* Elevation Badges */}
          {(cohort.presidentCount > 0 || cohort.nobleCount > 0 || cohort.chevalierCount > 0) && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '11.5px', flexWrap: 'wrap' }}>
              {cohort.presidentCount > 0 && (
                <span style={{ background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047', borderRadius: '4px', padding: '2px 8px', fontWeight: 800 }}>
                  👑 {cohort.presidentCount} Worthy President{cohort.presidentCount === 1 ? '' : 's'}
                </span>
              )}
              {cohort.nobleCount > 0 && (
                <span style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fcd34d', borderRadius: '4px', padding: '2px 8px', fontWeight: 800 }}>
                  👑 {cohort.nobleCount} Noble{cohort.nobleCount === 1 ? '' : 's'} (5th Deg)
                </span>
              )}
              {cohort.chevalierCount > 0 && (
                <span style={{ background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '2px 8px', fontWeight: 800 }}>
                  🏅 {cohort.chevalierCount} Chevalier{cohort.chevalierCount === 1 ? '' : 's'} (4th Deg)
                </span>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="no-print"
          style={{
            background: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            padding: '5px 12px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#475569',
            cursor: 'pointer'
          }}
        >
          {isCollapsed ? 'Show Roster (▼)' : 'Hide Roster (▲)'}
        </button>
      </div>

      {/* Cohort Roster Table */}
      {!isCollapsed && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                <th style={{ padding: '10px 16px', width: '50px' }}>Entry</th>
                <th style={{ padding: '10px 16px' }}>Brother Full Name</th>
                <th style={{ padding: '10px 16px' }}>Standing / Status</th>
                <th style={{ padding: '10px 16px' }}>Age at Init.</th>
                <th style={{ padding: '10px 16px' }}>Occupation</th>
                <th style={{ padding: '10px 16px' }}>Residence</th>
                <th style={{ padding: '10px 16px' }}>Archival Notes & Details</th>
                <th style={{ padding: '10px 16px', textAlign: 'right' }} className="no-print">Action</th>
              </tr>
            </thead>
            <tbody>
              {cohort.members.map((m, idx) => (
                <tr
                  key={m.id}
                  style={{
                    borderBottom: idx === cohort.members.length - 1 ? 'none' : '1px solid #f1f5f9',
                    background: idx % 2 === 0 ? '#ffffff' : '#fcfcfd'
                  }}
                >
                  {/* Entry Number */}
                  <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                    {m.entryNo ? (
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        background: '#fef3c7',
                        border: '1px solid #fde68a',
                        color: '#92400e',
                        borderRadius: '6px',
                        fontWeight: 800,
                        fontSize: '11.5px'
                      }}>
                        #{m.entryNo}
                      </span>
                    ) : (
                      <span style={{ color: '#cbd5e1', fontSize: '11px' }}>—</span>
                    )}
                  </td>

                  {/* Name & Title */}
                  <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {/* Avatar / Portrait thumbnail */}
                      {m.photoUrl ? (
                        <img
                          src={m.photoUrl}
                          alt={m.fullName}
                          style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                        />
                      ) : (
                        <div style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          background: '#f1f5f9',
                          color: '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 700,
                          border: '1px solid #e2e8f0'
                        }}>
                          {(m.firstName?.[0] || '') + (m.surname?.[0] || 'B')}
                        </div>
                      )}

                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span>{m.fullName}</span>
                          {m.isPastPresident && (
                            <span style={{ background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047', borderRadius: '4px', padding: '1px 6px', fontSize: '10.5px', fontWeight: 800 }}>
                              👑 Past President
                            </span>
                          )}
                          {m.isNoble && (
                            <span style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fcd34d', borderRadius: '4px', padding: '1px 6px', fontSize: '10.5px', fontWeight: 800 }}>
                              👑 Noble (5th Deg)
                            </span>
                          )}
                          {m.isChevalier && !m.isNoble && (
                            <span style={{ background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '1px 6px', fontSize: '10.5px', fontWeight: 800 }}>
                              🏅 Chevalier (4th Deg)
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          {m.source}
                          {m.memberNumber ? ` • ID: ${m.memberNumber}` : ''}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                    <StatusBadge status={m.status} isDeceased={m.isDeceased} transferTo={m.transferTo} />
                  </td>

                  {/* Age at Initiation */}
                  <td style={{ padding: '12px 16px', verticalAlign: 'middle', color: '#475569' }}>
                    {m.ageAtInitiation ? (
                      <span style={{ fontWeight: 600 }}>{m.ageAtInitiation} yrs</span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>—</span>
                    )}
                  </td>

                  {/* Occupation */}
                  <td style={{ padding: '12px 16px', verticalAlign: 'middle', color: '#475569' }}>
                    {m.occupation || <span style={{ color: '#94a3b8' }}>—</span>}
                  </td>

                  {/* Residence */}
                  <td style={{ padding: '12px 16px', verticalAlign: 'middle', color: '#475569' }}>
                    {m.residence || <span style={{ color: '#94a3b8' }}>—</span>}
                  </td>

                  {/* Notes / Remarks */}
                  <td style={{ padding: '12px 16px', verticalAlign: 'middle', maxWidth: '280px' }}>
                    {cohort.dateKey < '1995-12-30' && (
                      <div style={{ color: '#92400e', fontSize: '11.5px', fontWeight: 700, marginBottom: '3px' }}>
                        🏛️ Charter Transferee (Pre-1995 Initiate)
                      </div>
                    )}
                    {cohort.dateKey === '1995-12-30' && (
                      <div style={{ color: '#15803d', fontSize: '11.5px', fontWeight: 700, marginBottom: '3px' }}>
                        🎉 Charter Day Inauguration Class
                      </div>
                    )}
                    {m.transferTo && (
                      <div style={{ color: '#0369a1', fontSize: '12px', fontWeight: 600, marginBottom: '2px' }}>
                        🔄 Transferred to {m.transferTo} {m.transferDate ? `(${m.transferDate})` : ''}
                      </div>
                    )}
                    {m.status === 'Dismissed' && m.isDeceased && (
                      <div style={{ color: '#475569', fontSize: '12px', fontWeight: 600, marginBottom: '2px' }}>
                        ✝ Passed into eternity {m.dateOfDeath ? `(${m.dateOfDeath})` : ''} · Dismissed member {m.burialPlace ? `· ${m.burialPlace}` : ''}
                      </div>
                    )}
                    {m.status !== 'Dismissed' && (m.status === 'Deceased' || m.isDeceased) && (
                      <div style={{ color: '#c2410c', fontSize: '12px', fontWeight: 600, marginBottom: '2px' }}>
                        🕊️ Rest in Peace {m.dateOfDeath ? `(${m.dateOfDeath})` : ''} {m.burialPlace ? `· ${m.burialPlace}` : ''}
                      </div>
                    )}
                    {m.notes ? (
                      <div style={{ fontSize: '11.5px', color: '#64748b', lineHeight: '1.4' }}>
                        {m.notes}
                      </div>
                    ) : (
                      !m.transferTo && !m.isDeceased && cohort.dateKey >= '1995-12-30' && <span style={{ color: '#94a3b8' }}>—</span>
                    )}
                  </td>

                  {/* Action Link */}
                  <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'right' }} className="no-print">
                    {m.memberId ? (
                      <Link
                        href={`/registrar/members/${m.memberId}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          color: '#0f172a',
                          padding: '4px 10px',
                          borderRadius: '5px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          textDecoration: 'none'
                        }}
                      >
                        <span>👤</span> Dossier
                      </Link>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>Roll Archive</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ==========================================
// COMPONENT: STATUS BADGE
// ==========================================
function StatusBadge({
  status,
  isDeceased,
  transferTo
}: {
  status: string;
  isDeceased: boolean;
  transferTo?: string | null;
}) {
  if (status === 'Dismissed') {
    if (isDeceased) {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          background: '#f8fafc',
          border: '1px solid #cbd5e1',
          color: '#475569',
          padding: '3px 8px',
          borderRadius: '6px',
          fontSize: '11.5px',
          fontWeight: 700
        }} title="Dismissed member who has passed into eternity. Not listed on Commandery Roll of Honour.">
          <span>✝</span> Dismissed (Deceased)
        </span>
      );
    }
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: '#f8fafc',
        border: '1px solid #cbd5e1',
        color: '#475569',
        padding: '3px 8px',
        borderRadius: '6px',
        fontSize: '11.5px',
        fontWeight: 700
      }}>
        <span>🚫</span> Dismissed
      </span>
    );
  }

  if (status === 'Transfer-Out') {
    if (isDeceased) {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          background: '#f0f9ff',
          border: '1px solid #bae6fd',
          color: '#0369a1',
          padding: '3px 8px',
          borderRadius: '6px',
          fontSize: '11.5px',
          fontWeight: 700
        }} title="Transferred member who has passed into eternity.">
          <span>✝</span> Transferred Out (Deceased)
        </span>
      );
    }
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: '#f0f9ff',
        border: '1px solid #bae6fd',
        color: '#0284c7',
        padding: '3px 8px',
        borderRadius: '6px',
        fontSize: '11.5px',
        fontWeight: 700
      }}>
        <span>🔄</span> Transferred Out
      </span>
    );
  }

  if (status === 'Deceased' || isDeceased) {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: '#fff7ed',
        border: '1px solid #fed7aa',
        color: '#c2410c',
        padding: '3px 8px',
        borderRadius: '6px',
        fontSize: '11.5px',
        fontWeight: 700
      }} title="Passed into eternity while in good standing in Commandery No. 500">
        <span>🕊️</span> Roll of Honour
      </span>
    );
  }

  if (status === 'Active') {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: '#f0fdf4',
        border: '1px solid #bbf7d0',
        color: '#15803d',
        padding: '3px 8px',
        borderRadius: '6px',
        fontSize: '11.5px',
        fontWeight: 700
      }}>
        <span>🟢</span> Active
      </span>
    );
  }

  // Historical Roll Book
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      background: '#fefce8',
      border: '1px solid #fef08a',
      color: '#854d0e',
      padding: '3px 8px',
      borderRadius: '6px',
      fontSize: '11.5px',
      fontWeight: 700
    }}>
      <span>📜</span> Roll Book Record
    </span>
  );
}
