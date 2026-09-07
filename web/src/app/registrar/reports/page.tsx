'use client';

import React, { useState, useEffect, useMemo } from 'react';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { createClient } from '@/lib/supabase/client';
import { formatDisplayDate, isSystemMember } from '@/lib/utils/ksji-logic';
import Link from 'next/link';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);
  const supabase = createClient();

  // Active Main Hub Tab: 'birthdays' | 'degrees' | 'rosters' | 'custom'
  const [activeTab, setActiveTab] = useState<'birthdays' | 'degrees' | 'rosters' | 'custom'>('birthdays');

  // Sub-selections
  const currentMonthIdx = new Date().getMonth();
  const [selectedBirthMonth, setSelectedBirthMonth] = useState<number | 'missing'>(currentMonthIdx);
  const [selectedDegreeReport, setSelectedDegreeReport] = useState<'el_2nd_3rd' | 'el_4th' | 'el_5th'>('el_2nd_3rd');
  const [selectedRosterReport, setSelectedRosterReport] = useState<'master' | 'final' | 'suspended' | 'dismissed'>('master');

  // Custom Query Studio Filters
  const [customStatus, setCustomStatus] = useState<string>('Active');
  const [customMonth, setCustomMonth] = useState<string>('all');
  const [customDegree, setCustomDegree] = useState<string>('all');
  const [customTenure, setCustomTenure] = useState<string>('all');
  const [customSearch, setCustomSearch] = useState<string>('');

  // Fetch all members once on mount with related degrees & military
  useEffect(() => {
    async function loadAllMembers() {
      setLoading(true);
      const { data, error } = await supabase
        .from('members')
        .select('*, degrees(*), military(*)')
        .order('surname');

      if (!error && data) {
        const valid = (data as any[]).filter(m => !isSystemMember(m));
        setMembers(valid);
      }
      setLoading(false);
    }
    loadAllMembers();
  }, []);

  // ── Birthday Tally Calculations (Active Members) ──
  const activeMembers = useMemo(() => {
    return members.filter(m => m.status === 'Active');
  }, [members]);

  const birthdayTallies = useMemo(() => {
    const counts = Array(12).fill(0);
    let missingCount = 0;

    activeMembers.forEach(m => {
      if (!m.date_of_birth) {
        missingCount++;
        return;
      }
      const dob = new Date(m.date_of_birth);
      if (!isNaN(dob.getTime())) {
        counts[dob.getMonth()]++;
      } else {
        missingCount++;
      }
    });

    return { counts, missingCount, totalRecorded: activeMembers.length - missingCount };
  }, [activeMembers]);

  // Birthday list filtered by selected month or missing
  const birthdayMembers = useMemo(() => {
    if (selectedBirthMonth === 'missing') {
      return activeMembers.filter(m => !m.date_of_birth);
    }
    return activeMembers
      .filter(m => {
        if (!m.date_of_birth) return false;
        const dob = new Date(m.date_of_birth);
        return !isNaN(dob.getTime()) && dob.getMonth() === selectedBirthMonth;
      })
      .sort((a, b) => {
        const da = new Date(a.date_of_birth).getDate();
        const db = new Date(b.date_of_birth).getDate();
        return da - db;
      });
  }, [activeMembers, selectedBirthMonth]);

  // ── Degree Eligibility Calculations ──
  const degreeReportsData = useMemo(() => {
    const now = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(now.getFullYear() - 1);
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(now.getFullYear() - 3);
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(now.getFullYear() - 10);
    const fifteenYearsAgo = new Date();
    fifteenYearsAgo.setFullYear(now.getFullYear() - 15);

    const el_2nd_3rd = activeMembers.filter(member => {
      const degrees = member.degrees || [];
      const has2nd = degrees.some((d: any) => d.degree_type?.toLowerCase().includes('2nd') || d.degree_type?.toLowerCase().includes('second'));
      const has3rd = degrees.some((d: any) => d.degree_type?.toLowerCase().includes('3rd') || d.degree_type?.toLowerCase().includes('third'));
      const firstDegreeObj = degrees.find((d: any) => d.degree_type?.toLowerCase().includes('1st') || d.degree_type?.toLowerCase().includes('first'));
      const firstDegreeDate = firstDegreeObj?.degree_date ? new Date(firstDegreeObj.degree_date) : null;
      return !has2nd && !has3rd && firstDegreeDate && firstDegreeDate <= oneYearAgo;
    });

    const el_4th = activeMembers.filter(member => {
      const degrees = member.degrees || [];
      const military = Array.isArray(member.military) ? member.military[0] : member.military;
      const has4th = degrees.some((d: any) => d.degree_type?.toLowerCase().includes('4th') || d.degree_type?.toLowerCase().includes('fourth'));
      const uniformDate = military?.first_uniform_use_date ? new Date(military.first_uniform_use_date) : null;
      return !has4th && uniformDate && uniformDate <= threeYearsAgo;
    });

    const el_5th = activeMembers.filter(member => {
      const degrees = member.degrees || [];
      const military = Array.isArray(member.military) ? member.military[0] : member.military;
      const has5th = degrees.some((d: any) => d.degree_type?.toLowerCase().includes('5th') || d.degree_type?.toLowerCase().includes('fifth'));
      const titleUpper = (member.title || '').toUpperCase();
      const alreadyNoble = titleUpper.includes('N/B') || titleUpper.includes('NOBLE');
      const uniformDate = military?.first_uniform_use_date ? new Date(military.first_uniform_use_date) : null;
      const joinedDate = member.date_joined ? new Date(member.date_joined) : null;
      return !has5th && !alreadyNoble && ((uniformDate && uniformDate <= tenYearsAgo) || (joinedDate && joinedDate <= fifteenYearsAgo));
    });

    return { el_2nd_3rd, el_4th, el_5th };
  }, [activeMembers]);

  // ── Roster Reports Data ──
  const rosterReportsData = useMemo(() => {
    const master = activeMembers;
    const final = members.filter(m => m.status === 'Deceased' || m.is_deceased === true)
      .sort((a, b) => new Date(b.date_of_death || 0).getTime() - new Date(a.date_of_death || 0).getTime());
    const suspended = members.filter(m => m.status === 'Suspended');
    const dismissed = members.filter(m => m.status === 'Dismissed');
    return { master, final, suspended, dismissed };
  }, [members, activeMembers]);

  // ── Custom Query Studio Filtered Data ──
  const customQueryData = useMemo(() => {
    const now = new Date();

    return members.filter(m => {
      // Status filter
      if (customStatus !== 'all' && m.status !== customStatus) {
        if (customStatus === 'Deceased' && (m.status === 'Deceased' || m.is_deceased === true)) {
          // match deceased
        } else {
          return false;
        }
      }

      // Month filter
      if (customMonth !== 'all') {
        if (customMonth === 'missing') {
          if (m.date_of_birth) return false;
        } else {
          if (!m.date_of_birth) return false;
          const dob = new Date(m.date_of_birth);
          if (isNaN(dob.getTime()) || dob.getMonth() !== parseInt(customMonth, 10)) return false;
        }
      }

      // Highest Degree filter
      if (customDegree !== 'all') {
        const degrees = m.degrees || [];
        const hasDeg = degrees.some((d: any) => (d.degree_type || '').toLowerCase().includes(customDegree.toLowerCase()));
        if (!hasDeg) return false;
      }

      // Tenure filter
      if (customTenure !== 'all') {
        if (!m.date_joined) return false;
        const joined = new Date(m.date_joined);
        const yearsTenure = (now.getTime() - joined.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        if (customTenure === '1' && yearsTenure > 1) return false;
        if (customTenure === '3+' && yearsTenure < 3) return false;
        if (customTenure === '5+' && yearsTenure < 5) return false;
        if (customTenure === '10+' && yearsTenure < 10) return false;
      }

      // Search keyword
      if (customSearch.trim()) {
        const q = customSearch.toLowerCase();
        const fullName = `${m.title || ''} ${m.first_name || ''} ${m.surname || ''}`.toLowerCase();
        const occ = (m.occupation || '').toLowerCase();
        const phone = (m.phone || m.mobile || '').toLowerCase();
        if (!fullName.includes(q) && !occ.includes(q) && !phone.includes(q)) return false;
      }

      return true;
    });
  }, [members, customStatus, customMonth, customDegree, customTenure, customSearch]);

  // Determine current active table dataset and title for printing/export
  const currentView = useMemo(() => {
    if (activeTab === 'birthdays') {
      const monthLabel = selectedBirthMonth === 'missing' ? 'Pending Date of Birth' : `${MONTH_NAMES[selectedBirthMonth]} Birthdays`;
      return {
        title: monthLabel,
        type: 'birthdays',
        list: birthdayMembers
      };
    }
    if (activeTab === 'degrees') {
      const map = {
        el_2nd_3rd: { title: 'Eligible for 2nd & 3rd Degree', list: degreeReportsData.el_2nd_3rd },
        el_4th: { title: 'Eligible for 4th Degree (Uniform & 3 Yrs)', list: degreeReportsData.el_4th },
        el_5th: { title: 'Eligible for 5th Degree (Noble / 10+ Yrs)', list: degreeReportsData.el_5th }
      };
      return { ...map[selectedDegreeReport], type: selectedDegreeReport };
    }
    if (activeTab === 'rosters') {
      const map = {
        master: { title: 'Master Active Roll', list: rosterReportsData.master },
        final: { title: 'Final Roll (Deceased Members)', list: rosterReportsData.final },
        suspended: { title: 'Suspended Members Register', list: rosterReportsData.suspended },
        dismissed: { title: 'Dismissed Members Register', list: rosterReportsData.dismissed }
      };
      return { ...map[selectedRosterReport], type: selectedRosterReport };
    }
    // custom
    return {
      title: `Custom Query (${customQueryData.length} Results)`,
      type: 'custom',
      list: customQueryData
    };
  }, [
    activeTab,
    selectedBirthMonth,
    birthdayMembers,
    selectedDegreeReport,
    degreeReportsData,
    selectedRosterReport,
    rosterReportsData,
    customQueryData
  ]);

  // ── CSV Download ──
  const downloadCSV = () => {
    if (!currentView.list.length) return;

    let headers = ['Title', 'First Name', 'Surname', 'Status', 'Occupation', 'Phone', 'Mobile', 'Email'];
    if (currentView.type === 'birthdays') {
      headers = ['Title', 'First Name', 'Surname', 'Date of Birth', 'Day of Month', 'Phone', 'Mobile', 'Email'];
    } else if (currentView.type === 'final') {
      headers = ['Title', 'First Name', 'Surname', 'Date of Death', 'Burial Date', 'Burial Place'];
    }

    const rows = currentView.list.map((m: any) => {
      if (currentView.type === 'birthdays') {
        const dob = m.date_of_birth ? new Date(m.date_of_birth) : null;
        const dayStr = dob ? dob.getDate() : '';
        return [m.title, m.first_name, m.surname, m.date_of_birth, dayStr, m.phone, m.mobile, m.email];
      }
      if (currentView.type === 'final') {
        return [m.title, m.first_name, m.surname, m.date_of_death, m.burial_date, m.burial_place];
      }
      return [m.title, m.first_name, m.surname, m.status, m.occupation, m.phone, m.mobile, m.email];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row: any[]) => row.map((val: any) => `"${val || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${currentView.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Print Official PDF ──
  const handlePrint = () => {
    const reportHtml = document.getElementById('report-content')?.innerHTML;
    if (!reportHtml) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>KSJI Official Report - ${currentView.title}</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #10233f; }
            .report-header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #C9A84C; padding-bottom: 20px; }
            .report-header img { width: 70px; height: 70px; margin-bottom: 10px; object-fit: contain; }
            .report-header h1 { text-transform: uppercase; letter-spacing: 2px; margin: 0; font-size: 22px; color: #10233F; }
            .report-header p { color: #C9A84C; font-weight: 700; margin: 5px 0 0 0; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; padding: 10px 12px; border-bottom: 2px solid #10233f; font-size: 13px; text-transform: uppercase; background: #F8FAFC; }
            td { padding: 10px 12px; border-bottom: 1px solid #E2E8F0; font-size: 13px; }
            .no-print { display: none !important; }
            @page { margin: 1.5cm; }
          </style>
        </head>
        <body onload="window.print(); window.onafterprint = function() { window.close(); }">
          <div class="report-header">
            <img src="/logo.png" alt="KSJI Logo" />
            <h1>Knight St. John International</h1>
            <p>${currentView.title.toUpperCase()} — Total: ${currentView.list.length} Members | ${formatDisplayDate(new Date().toISOString())}</p>
          </div>
          ${reportHtml}
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <RegistrarShell title="Reporting Hub" subtitle="Executive registers, demographic tallies, and exemplification audits">
      {/* ── Top Hero Action Cards ── */}
      <div style={{
        background: 'linear-gradient(135deg, #064E3B 0%, #047857 100%)',
        borderRadius: 16,
        padding: '24px 28px',
        color: 'white',
        marginBottom: 20,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16,
        boxShadow: '0 10px 25px rgba(6,78,59,0.15)',
        border: '1px solid #059669'
      }} className="no-print">
        <div>
          <div style={{ color: '#A7F3D0', fontSize: 11, fontWeight: 900, letterSpacing: 1.2, textTransform: 'uppercase' }}>
            SUPER ADMIN & OFFICER TOOLKIT • AUDIT & CONVENTION CERTIFICATES
          </div>
          <h2 style={{ margin: '6px 0 4px', fontSize: 20, fontWeight: 900, color: 'white' }}>
            🎖️ Personal Good Standing Reports & Batch Generator
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: '#E2E8F0', maxWidth: 620 }}>
            Generate official Good Standing statements for individual members of choice, or batch-generate and print verified standing certificates for conventions, delegates, and financial audits.
          </p>
        </div>
        <Link
          href="/registrar/reports/good-standing"
          style={{
            background: '#FFFFFF',
            color: '#064E3B',
            textDecoration: 'none',
            padding: '12px 24px',
            borderRadius: 10,
            fontWeight: 900,
            fontSize: 14,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}
        >
          <span>📜 Open Good Standing Studio</span>
        </Link>
      </div>

      <div style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        borderRadius: 16,
        padding: '24px 28px',
        color: 'white',
        marginBottom: 24,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16,
        boxShadow: '0 10px 25px rgba(15,23,42,0.15)',
        border: '1px solid #334155'
      }} className="no-print">
        <div>
          <div style={{ color: '#FCD34D', fontSize: 11, fontWeight: 900, letterSpacing: 1.2, textTransform: 'uppercase' }}>
            BATCH CARD GENERATOR • 6 CARDS PER A4 PAGE
          </div>
          <h2 style={{ margin: '6px 0 4px', fontSize: 20, fontWeight: 900, color: 'white' }}>
            🪪 Batch Print Member ID Cards
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: '#94A3B8', maxWidth: 600 }}>
            Generate and print pre-formatted ID cards for all active members. Optimized at 6 cards per A4 page for fast event check-in and QR verification.
          </p>
        </div>
        <Link
          href="/registrar/members/id-cards"
          style={{
            background: '#D4AF37',
            color: '#0F172A',
            textDecoration: 'none',
            padding: '12px 24px',
            borderRadius: 10,
            fontWeight: 900,
            fontSize: 14,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 12px rgba(212,175,55,0.3)'
          }}
        >
          <span>🖨️ Open Batch Card Studio</span>
        </Link>
      </div>

      {/* ── Main Reporting Hub Structure ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Hub Category Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '2px solid #E2E8F0',
          background: '#F8FAFC',
          padding: '12px 20px 0',
          gap: 10,
          flexWrap: 'wrap'
        }} className="no-print">
          {[
            { id: 'birthdays', label: '🎂 Birth Month Tally & Celebrations', badge: `${birthdayTallies.totalRecorded} active` },
            { id: 'degrees', label: '🎖️ Degree Exemplification', badge: `${degreeReportsData.el_2nd_3rd.length + degreeReportsData.el_4th.length + degreeReportsData.el_5th.length} eligible` },
            { id: 'rosters', label: '📋 Official Rolls & Registers', badge: `${activeMembers.length} active` },
            { id: 'custom', label: '🔍 Smart Query Studio', badge: 'Dynamic' }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: '12px 18px',
                  background: isActive ? '#FFFFFF' : 'transparent',
                  color: isActive ? '#0F172A' : '#64748B',
                  fontWeight: isActive ? 800 : 600,
                  fontSize: 14,
                  borderTop: isActive ? '3px solid #D4AF37' : '3px solid transparent',
                  borderLeft: isActive ? '1px solid #E2E8F0' : 'none',
                  borderRight: isActive ? '1px solid #E2E8F0' : 'none',
                  borderBottom: isActive ? '2px solid #FFFFFF' : 'none',
                  borderRadius: '8px 8px 0 0',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: -2,
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 100,
                  background: isActive ? '#FEF3C7' : '#E2E8F0',
                  color: isActive ? '#B45309' : '#475569',
                  fontWeight: 700
                }}>
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Tab Content Sub-Bars ── */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', background: '#FFFFFF' }} className="no-print">
          {/* 1. BIRTH MONTH TALLY AT-A-GLANCE */}
          {activeTab === 'birthdays' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, color: '#0F172A', fontWeight: 800 }}>
                    12-Month Birthday Distribution at a Glance
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748B' }}>
                    Click any month card to view celebrants, check birth dates, and send direct WhatsApp greetings.
                  </p>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', background: '#DCFCE7', padding: '4px 10px', borderRadius: 100 }}>
                  🎂 {birthdayTallies.totalRecorded} active members with recorded DOB
                </div>
              </div>

              {/* 12-Month Tally Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                gap: 8,
                marginTop: 10
              }}>
                {MONTH_SHORT.map((mName, idx) => {
                  const count = birthdayTallies.counts[idx];
                  const isCurrent = idx === currentMonthIdx;
                  const isSelected = selectedBirthMonth === idx;

                  return (
                    <button
                      key={mName}
                      onClick={() => setSelectedBirthMonth(idx)}
                      style={{
                        padding: '10px 6px',
                        borderRadius: 10,
                        textAlign: 'center',
                        border: isSelected
                          ? '2px solid #D4AF37'
                          : isCurrent
                          ? '2px solid #3B82F6'
                          : '1px solid #E2E8F0',
                        background: isSelected
                          ? '#0F172A'
                          : isCurrent
                          ? '#EFF6FF'
                          : count > 0
                          ? '#F8FAFC'
                          : '#FAFAFA',
                        color: isSelected
                          ? '#FFFFFF'
                          : '#0F172A',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 4px 12px rgba(15,23,42,0.15)' : 'none',
                        position: 'relative'
                      }}
                    >
                      {isCurrent && (
                        <span style={{
                          position: 'absolute',
                          top: -6,
                          right: -4,
                          background: '#3B82F6',
                          color: 'white',
                          fontSize: 9,
                          fontWeight: 900,
                          padding: '1px 5px',
                          borderRadius: 6,
                          textTransform: 'uppercase'
                        }}>
                          Now
                        </span>
                      )}
                      <div style={{ fontSize: 12, fontWeight: 700, opacity: isSelected ? 0.9 : 0.7 }}>
                        {mName}
                      </div>
                      <div style={{
                        fontSize: 18,
                        fontWeight: 900,
                        color: isSelected ? '#FCD34D' : count > 0 ? '#0F172A' : '#94A3B8',
                        marginTop: 2
                      }}>
                        {count}
                      </div>
                    </button>
                  );
                })}

                {/* Missing DOB Tally Pill */}
                <button
                  onClick={() => setSelectedBirthMonth('missing')}
                  style={{
                    padding: '10px 8px',
                    borderRadius: 10,
                    textAlign: 'center',
                    border: selectedBirthMonth === 'missing' ? '2px solid #DC2626' : '1px dashed #CBD5E1',
                    background: selectedBirthMonth === 'missing' ? '#FEF2F2' : '#FAFAFA',
                    color: selectedBirthMonth === 'missing' ? '#991B1B' : '#64748B',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  title="Click to view active members missing birth date"
                >
                  <div style={{ fontSize: 11, fontWeight: 700 }}>Pending</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: birthdayTallies.missingCount > 0 ? '#DC2626' : '#64748B', marginTop: 2 }}>
                    {birthdayTallies.missingCount}
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* 2. DEGREE EXEMPLIFICATION SELECTOR */}
          {activeTab === 'degrees' && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#64748B', marginRight: 6 }}>
                Exemplification Categories:
              </div>
              {[
                { id: 'el_2nd_3rd', label: 'Eligible for 2nd & 3rd Degree', count: degreeReportsData.el_2nd_3rd.length },
                { id: 'el_4th', label: 'Eligible for 4th Degree', count: degreeReportsData.el_4th.length },
                { id: 'el_5th', label: 'Eligible for 5th Degree', count: degreeReportsData.el_5th.length },
              ].map(deg => (
                <button
                  key={deg.id}
                  onClick={() => setSelectedDegreeReport(deg.id as any)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 100,
                    border: selectedDegreeReport === deg.id ? '2px solid #0F172A' : '1px solid #CBD5E1',
                    background: selectedDegreeReport === deg.id ? '#0F172A' : '#FFFFFF',
                    color: selectedDegreeReport === deg.id ? '#FCD34D' : '#334155',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <span>{deg.label}</span>
                  <span style={{
                    background: selectedDegreeReport === deg.id ? '#FCD34D' : '#F1F5F9',
                    color: selectedDegreeReport === deg.id ? '#0F172A' : '#475569',
                    padding: '2px 8px',
                    borderRadius: 100,
                    fontSize: 11,
                    fontWeight: 800
                  }}>
                    {deg.count}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* 3. ROSTERS SELECTOR */}
          {activeTab === 'rosters' && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#64748B', marginRight: 6 }}>
                Official Roster Lists:
              </div>
              {[
                { id: 'master', label: 'Master Active Roll', count: rosterReportsData.master.length },
                { id: 'final', label: 'Final Roll (Deceased)', count: rosterReportsData.final.length },
                { id: 'suspended', label: 'Suspended List', count: rosterReportsData.suspended.length },
                { id: 'dismissed', label: 'Dismissed List', count: rosterReportsData.dismissed.length },
              ].map(rst => (
                <button
                  key={rst.id}
                  onClick={() => setSelectedRosterReport(rst.id as any)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 100,
                    border: selectedRosterReport === rst.id ? '2px solid #0F172A' : '1px solid #CBD5E1',
                    background: selectedRosterReport === rst.id ? '#0F172A' : '#FFFFFF',
                    color: selectedRosterReport === rst.id ? '#FCD34D' : '#334155',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <span>{rst.label}</span>
                  <span style={{
                    background: selectedRosterReport === rst.id ? '#FCD34D' : '#F1F5F9',
                    color: selectedRosterReport === rst.id ? '#0F172A' : '#475569',
                    padding: '2px 8px',
                    borderRadius: 100,
                    fontSize: 11,
                    fontWeight: 800
                  }}>
                    {rst.count}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* 4. SMART QUERY STUDIO (For undefined ad-hoc queries) */}
          {activeTab === 'custom' && (
            <div>
              <div style={{ marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 15, color: '#0F172A', fontWeight: 800 }}>
                  🔍 Dynamic Query Builder
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748B' }}>
                  Combine any criteria to generate tailored registers on the fly without waiting for code updates.
                </p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 12
              }}>
                <div>
                  <label className="label">Status</label>
                  <select
                    className="input select"
                    value={customStatus}
                    onChange={e => setCustomStatus(e.target.value)}
                  >
                    <option value="all">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Dismissed">Dismissed</option>
                    <option value="Deceased">Deceased</option>
                  </select>
                </div>

                <div>
                  <label className="label">Birth Month</label>
                  <select
                    className="input select"
                    value={customMonth}
                    onChange={e => setCustomMonth(e.target.value)}
                  >
                    <option value="all">Any Month</option>
                    {MONTH_NAMES.map((m, idx) => (
                      <option key={m} value={idx.toString()}>{m}</option>
                    ))}
                    <option value="missing">Pending Birth Date</option>
                  </select>
                </div>

                <div>
                  <label className="label">Holds Degree</label>
                  <select
                    className="input select"
                    value={customDegree}
                    onChange={e => setCustomDegree(e.target.value)}
                  >
                    <option value="all">Any Degree Level</option>
                    <option value="1st">1st Degree</option>
                    <option value="2nd">2nd Degree</option>
                    <option value="3rd">3rd Degree</option>
                    <option value="4th">4th Degree</option>
                    <option value="5th">5th Degree (Noble)</option>
                  </select>
                </div>

                <div>
                  <label className="label">Tenure / Years Joined</label>
                  <select
                    className="input select"
                    value={customTenure}
                    onChange={e => setCustomTenure(e.target.value)}
                  >
                    <option value="all">All Tenure Lengths</option>
                    <option value="1">Joined in Past 1 Year</option>
                    <option value="3+">3+ Years Tenure</option>
                    <option value="5+">5+ Years Tenure</option>
                    <option value="10+">10+ Years Tenure</option>
                  </select>
                </div>

                <div>
                  <label className="label">Quick Text Search</label>
                  <input
                    className="input"
                    placeholder="Search name, phone, occupation..."
                    value={customSearch}
                    onChange={e => setCustomSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Table Action Header & Export Buttons ── */}
        <div style={{
          padding: '16px 24px',
          background: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }} className="no-print">
          <div>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
              {currentView.title}
            </span>
            <span style={{ marginLeft: 10, fontSize: 13, color: '#64748B', fontWeight: 600 }}>
              ({currentView.list.length} records found)
            </span>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={downloadCSV}
              disabled={!currentView.list.length}
              style={{
                background: '#FFFFFF',
                color: '#0F172A',
                border: '1px solid #CBD5E1',
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: currentView.list.length ? 'pointer' : 'not-allowed',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              📥 Download CSV
            </button>
            <button
              onClick={handlePrint}
              disabled={!currentView.list.length}
              style={{
                background: '#D4AF37',
                color: '#0F172A',
                border: 'none',
                padding: '8px 18px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 800,
                cursor: currentView.list.length ? 'pointer' : 'not-allowed',
                boxShadow: '0 4px 12px rgba(212, 175, 55, 0.25)'
              }}
            >
              🖨️ Print Official PDF
            </button>
          </div>
        </div>

        {/* ── Data Table Preview ── */}
        <div style={{ padding: '0 24px 24px' }}>
          {loading ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#64748B' }}>
              Loading member data and computing tallies...
            </div>
          ) : currentView.list.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#64748B' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>
                No records match this report criteria
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 13 }}>
                Select another month or adjust filters to view members.
              </p>
            </div>
          ) : (
            <div id="report-content" style={{ overflowX: 'auto', marginTop: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #0F172A' }}>
                    <th style={{ textAlign: 'left', padding: '12px 10px', fontSize: 13, textTransform: 'uppercase', color: '#0F172A' }}>
                      Member Name
                    </th>
                    {currentView.type === 'final' ? (
                      <>
                        <th style={{ textAlign: 'left', padding: '12px 10px', fontSize: 13, textTransform: 'uppercase', color: '#0F172A' }}>Date of Death</th>
                        <th style={{ textAlign: 'left', padding: '12px 10px', fontSize: 13, textTransform: 'uppercase', color: '#0F172A' }}>Burial Date</th>
                        <th style={{ textAlign: 'left', padding: '12px 10px', fontSize: 13, textTransform: 'uppercase', color: '#0F172A' }}>Burial Place</th>
                      </>
                    ) : currentView.type === 'birthdays' ? (
                      <>
                        <th style={{ textAlign: 'left', padding: '12px 10px', fontSize: 13, textTransform: 'uppercase', color: '#0F172A' }}>Date of Birth</th>
                        <th style={{ textAlign: 'left', padding: '12px 10px', fontSize: 13, textTransform: 'uppercase', color: '#0F172A' }}>Celebration Day</th>
                        <th style={{ textAlign: 'left', padding: '12px 10px', fontSize: 13, textTransform: 'uppercase', color: '#0F172A' }}>Phone / Mobile</th>
                        <th style={{ textAlign: 'right', padding: '12px 10px', fontSize: 13, textTransform: 'uppercase', color: '#0F172A' }} className="no-print">Greetings</th>
                      </>
                    ) : (
                      <>
                        <th style={{ textAlign: 'left', padding: '12px 10px', fontSize: 13, textTransform: 'uppercase', color: '#0F172A' }}>Status</th>
                        <th style={{ textAlign: 'left', padding: '12px 10px', fontSize: 13, textTransform: 'uppercase', color: '#0F172A' }}>Occupation</th>
                        <th style={{ textAlign: 'left', padding: '12px 10px', fontSize: 13, textTransform: 'uppercase', color: '#0F172A' }}>Phone / Mobile</th>
                        <th style={{ textAlign: 'right', padding: '12px 10px', fontSize: 13, textTransform: 'uppercase', color: '#0F172A' }} className="no-print">Profile</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {currentView.list.map((m: any) => {
                    const dob = m.date_of_birth ? new Date(m.date_of_birth) : null;
                    const isToday = dob && dob.getMonth() === new Date().getMonth() && dob.getDate() === new Date().getDate();
                    const phoneClean = (m.phone || m.mobile || '').replace(/\D/g, '');

                    return (
                      <tr key={m.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 10px', fontWeight: 700, color: '#0F172A' }}>
                          <Link
                            href={`/registrar/members/${m.id}`}
                            style={{ color: '#0F172A', textDecoration: 'none' }}
                          >
                            {m.title || 'Bro.'} {m.first_name} {m.surname}
                          </Link>
                        </td>

                        {currentView.type === 'final' ? (
                          <>
                            <td style={{ padding: '12px 10px', color: '#475569' }}>{formatDisplayDate(m.date_of_death)}</td>
                            <td style={{ padding: '12px 10px', color: '#475569' }}>{formatDisplayDate(m.burial_date)}</td>
                            <td style={{ padding: '12px 10px', color: '#475569' }}>{m.burial_place || '---'}</td>
                          </>
                        ) : currentView.type === 'birthdays' ? (
                          <>
                            <td style={{ padding: '12px 10px', color: '#1E293B' }}>
                              {m.date_of_birth ? formatDisplayDate(m.date_of_birth) : (
                                <span style={{ color: '#DC2626', fontWeight: 600 }}>Missing DOB</span>
                              )}
                            </td>
                            <td style={{ padding: '12px 10px' }}>
                              {dob ? (
                                <span style={{ fontWeight: 800, color: '#0F172A' }}>
                                  {dob.getDate()} {MONTH_SHORT[dob.getMonth()]}
                                </span>
                              ) : (
                                '---'
                              )}
                              {isToday && (
                                <span style={{
                                  marginLeft: 8,
                                  background: '#EF4444',
                                  color: 'white',
                                  padding: '2px 8px',
                                  borderRadius: 100,
                                  fontSize: 11,
                                  fontWeight: 800
                                }}>
                                  🎉 TODAY!
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '12px 10px', color: '#475569' }}>
                              {m.phone || m.mobile || '---'}
                            </td>
                            <td style={{ padding: '12px 10px', textAlign: 'right' }} className="no-print">
                              {phoneClean ? (
                                <a
                                  href={`https://wa.me/${phoneClean}?text=Happy Birthday, Brother ${m.surname}! Wishing you God's abundant blessings on your special day. 🎉`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    background: '#22C55E',
                                    color: 'white',
                                    padding: '5px 12px',
                                    borderRadius: 8,
                                    fontSize: 12,
                                    textDecoration: 'none',
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    boxShadow: '0 2px 4px rgba(34,197,94,0.2)'
                                  }}
                                  title="Send Fraternal WhatsApp Greeting"
                                >
                                  <span>💬 Wish</span>
                                </a>
                              ) : (
                                <span style={{ fontSize: 12, color: '#94A3B8' }}>No phone</span>
                              )}
                            </td>
                          </>
                        ) : (
                          <>
                            <td style={{ padding: '12px 10px' }}>
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: 100,
                                fontSize: 11,
                                fontWeight: 700,
                                background: m.status === 'Active' ? '#DCFCE7' : m.status === 'Suspended' ? '#FEF3C7' : m.status === 'Dismissed' ? '#FEE2E2' : '#F1F5F9',
                                color: m.status === 'Active' ? '#166534' : m.status === 'Suspended' ? '#92400E' : m.status === 'Dismissed' ? '#991B1B' : '#475569'
                              }}>
                                {m.status}
                              </span>
                            </td>
                            <td style={{ padding: '12px 10px', color: '#475569' }}>
                              {m.occupation || '---'}
                            </td>
                            <td style={{ padding: '12px 10px', color: '#475569' }}>
                              {m.phone || m.mobile || '---'}
                            </td>
                            <td style={{ padding: '12px 10px', textAlign: 'right' }} className="no-print">
                              <Link
                                href={`/registrar/members/${m.id}`}
                                style={{
                                  color: '#2563EB',
                                  fontSize: 12,
                                  fontWeight: 700,
                                  textDecoration: 'underline'
                                }}
                              >
                                View Dossier ↗
                              </Link>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </RegistrarShell>
  );
}
