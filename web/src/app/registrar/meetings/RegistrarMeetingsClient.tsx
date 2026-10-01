'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createMeeting, updateMeeting, checkInMember, getAbsenceRequests, reviewAbsenceRequest, getAttendanceReport, registrarGrantExcuse, deleteMeeting, rejectCheckIn } from '@/services/attendanceService';
import { formatDisplayDate, formatDisplayTime, formatDisplayDateTime, KSJI_MEETING_LOCATION, KSJI_VENUE_PRESETS, getMatchingVenuePreset, hasMistypedAccraLongitude } from '@/lib/utils/ksji-logic';
import MeetingNoticeModal from '@/components/meetings/MeetingNoticeModal';

interface Props {
  profile: any;
  initialMeetings: any[];
  members: any[];
}

export default function RegistrarMeetingsClient({ profile, initialMeetings, members }: Props) {
  const [meetings, setMeetings] = useState(initialMeetings);
  const [selectedMeeting, setSelectedMeeting] = useState<any | null>(initialMeetings[0] || null);
  
  // Attendance & Absence requests states
  const [attendanceReport, setAttendanceReport] = useState<any[]>([]);
  const [absenceRequests, setAbsenceRequests] = useState<any[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [rosterSortOrder, setRosterSortOrder] = useState<'status_priority' | 'name' | 'checkin_time'>('status_priority');

  // Search Query & Status Filter for sign-in auditing
  const [attendanceQuery, setAttendanceQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'excused' | 'absent'>('all');

  const getStatusPriority = (statusStr: string) => {
    if (statusStr.startsWith('Present')) return 1; // 1. Attended (Present)
    if (statusStr === 'Excused' || statusStr === 'Excuse Pending') return 2; // 2. Permission (Excused)
    return 3; // 3. Absent without permission
  };

  const sortedAttendanceReport = [...attendanceReport].sort((a: any, b: any) => {
    if (rosterSortOrder === 'status_priority') {
      const pA = getStatusPriority(a.status || '');
      const pB = getStatusPriority(b.status || '');
      if (pA !== pB) return pA - pB;
      return `${a.surname || ''} ${a.first_name || ''}`.localeCompare(`${b.surname || ''} ${b.first_name || ''}`);
    }
    if (rosterSortOrder === 'checkin_time') {
      const tA = a.checkInTime ? new Date(a.checkInTime).getTime() : 0;
      const tB = b.checkInTime ? new Date(b.checkInTime).getTime() : 0;
      return tB - tA;
    }
    return `${a.surname || ''} ${a.first_name || ''}`.localeCompare(`${b.surname || ''} ${b.first_name || ''}`);
  });

  const filteredAttendanceReport = sortedAttendanceReport.filter((m: any) => {
    // 1. Filter by Status Tab
    if (statusFilter === 'present' && !m.status.startsWith('Present')) return false;
    if (statusFilter === 'excused' && m.status !== 'Excused' && m.status !== 'Excuse Pending') return false;
    if (statusFilter === 'absent' && m.status !== 'Absent' && !m.status.includes('Absent')) return false;

    // 2. Filter by Search Query (Name, Phone, Email, Method)
    if (!attendanceQuery.trim()) return true;
    const term = attendanceQuery.toLowerCase().trim();
    const name = `${m.first_name || ''} ${m.surname || ''}`.toLowerCase();
    const email = (m.email || '').toLowerCase();
    const phone = (m.phone || '').toLowerCase();
    const status = (m.status || '').toLowerCase();

    return name.includes(term) || email.includes(term) || phone.includes(term) || status.includes(term);
  });

  // Stats for the selected meeting
  const totalRoster = attendanceReport.length;
  const presentCount = attendanceReport.filter((m: any) => m.status.startsWith('Present')).length;
  const excusedCount = attendanceReport.filter((m: any) => m.status === 'Excused').length;
  const absentCount = attendanceReport.filter((m: any) => m.status === 'Absent').length;
  
  const presentPct = totalRoster > 0 ? Math.round((presentCount / totalRoster) * 100) : 0;
  const excusedPct = totalRoster > 0 ? Math.round((excusedCount / totalRoster) * 100) : 0;
  const absentPct = totalRoster > 0 ? Math.round((absentCount / totalRoster) * 100) : 0;

  // New Meeting Form States - Pre-populated with canonical Commandery meeting venue (St. Bernadette Soubirous School)
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [radiusMeters, setRadiusMeters] = useState<number>(KSJI_MEETING_LOCATION.DEFAULT_RADIUS_METERS);
  const [latitude, setLatitude] = useState(KSJI_MEETING_LOCATION.LATITUDE.toString());
  const [longitude, setLongitude] = useState(KSJI_MEETING_LOCATION.LONGITUDE.toString());
  const [submittingMeeting, setSubmittingMeeting] = useState(false);

  // Edit Meeting Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editLatitude, setEditLatitude] = useState('');
  const [editLongitude, setEditLongitude] = useState('');
  const [editRadiusMeters, setEditRadiusMeters] = useState<number>(KSJI_MEETING_LOCATION.DEFAULT_RADIUS_METERS);
  const [savingEdit, setSavingEdit] = useState(false);

  function formatForDateTimeLocal(isoDateStr: string) {
    if (!isoDateStr) return '';
    const d = new Date(isoDateStr);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  function applyVenuePreset(preset: typeof KSJI_VENUE_PRESETS[number]) {
    setLatitude(preset.latitude.toString());
    setLongitude(preset.longitude.toString());
    setRadiusMeters(preset.default_radius_meters);
  }

  function applyEditVenuePreset(preset: typeof KSJI_VENUE_PRESETS[number]) {
    setEditLatitude(preset.latitude.toString());
    setEditLongitude(preset.longitude.toString());
    setEditRadiusMeters(preset.default_radius_meters);
  }
  function resetToCanonicalLocation() {
    setLatitude(KSJI_MEETING_LOCATION.LATITUDE.toString());
    setLongitude(KSJI_MEETING_LOCATION.LONGITUDE.toString());
    setRadiusMeters(KSJI_MEETING_LOCATION.DEFAULT_RADIUS_METERS);
  }

  function openEditModal(meeting: any) {
    if (!meeting) return;
    setEditingMeetingId(meeting.id);
    setEditTitle(meeting.title || '');
    setEditDate(formatForDateTimeLocal(meeting.date));
    setEditLatitude(meeting.latitude !== undefined && meeting.latitude !== null ? meeting.latitude.toString() : KSJI_MEETING_LOCATION.LATITUDE.toString());
    setEditLongitude(meeting.longitude !== undefined && meeting.longitude !== null ? meeting.longitude.toString() : KSJI_MEETING_LOCATION.LONGITUDE.toString());
    setEditRadiusMeters(meeting.radius_meters || KSJI_MEETING_LOCATION.DEFAULT_RADIUS_METERS);
    setIsEditModalOpen(true);
  }

  async function handleSaveEditMeeting(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMeetingId) return;
    setSavingEdit(true);
    try {
      const latNum = parseFloat(editLatitude);
      const lonNum = parseFloat(editLongitude);
      const updated = await updateMeeting(editingMeetingId, {
        title: editTitle.trim(),
        date: editDate ? new Date(editDate).toISOString() : undefined,
        latitude: latNum,
        longitude: lonNum,
        radius_meters: editRadiusMeters,
      });

      setMeetings(prev => prev.map(m => m.id === editingMeetingId ? { ...m, ...updated } : m));
      if (selectedMeeting?.id === editingMeetingId) {
        setSelectedMeeting((prev: any) => ({ ...prev, ...updated }));
      }
      setIsEditModalOpen(false);
      alert('✅ Meeting details amended and updated successfully!');
    } catch (err: any) {
      alert(`⚠️ Failed to update meeting: ${err.message}`);
    } finally {
      setSavingEdit(false);
    }
  }
  
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Manual Permission & Rejection Modal state ──────────────────────────────
  const [activeModal, setActiveModal] = useState<null | {
    type: 'checkin' | 'excuse' | 'reject';
    memberId: string;
    memberName: string;
  }>(null);
  const [modalNote, setModalNote] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Load report and requests whenever selected meeting changes
  useEffect(() => {
    if (selectedMeeting) {
      loadMeetingData(selectedMeeting.id);
    } else {
      setAttendanceReport([]);
      setAbsenceRequests([]);
    }
  }, [selectedMeeting]);

  async function loadMeetingData(meetingId: string) {
    setLoadingReport(true);
    try {
      const [report, requests] = await Promise.all([
        getAttendanceReport(meetingId, profile.commandery_id),
        getAbsenceRequests(meetingId)
      ]);
      setAttendanceReport(report);
      setAbsenceRequests(requests);
    } catch (e) {
      console.error('Failed to load meeting details:', e);
    } finally {
      setLoadingReport(false);
    }
  }

  // Pin current GPS coordinates to form
  function handlePinLocation() {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toString());
        setLongitude(pos.coords.longitude.toString());
      },
      (err) => {
        alert(`Failed to get location: ${err.message}`);
      },
      { enableHighAccuracy: true }
    );
  }

  async function handleCreateMeeting(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingMeeting(true);
    setError(null);
    setMessage(null);

    try {
      const newMeeting = await createMeeting({
        commandery_id: profile.commandery_id,
        title: title.trim(),
        date,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius_meters: radiusMeters
      });

      setMeetings(prev => [newMeeting, ...prev]);
      setSelectedMeeting(newMeeting);
      setMessage('🎉 Geofenced meeting scheduled successfully!');
      
      // Clear fields
      setTitle('');
      setDate('');
      setLatitude('');
      setLongitude('');
      setRadiusMeters(100);
    } catch (err: any) {
      setError(err.message || 'Failed to schedule meeting.');
    } finally {
      setSubmittingMeeting(false);
    }
  }

  async function handleDeleteMeeting(meetingId: string, meetingTitle: string, checkinCount: number = 0) {
    const isTestTitle = /test|sample|trial|demo|fictitious|practice|sandbox|dry run|training/i.test(meetingTitle);

    const checkinNotice = checkinCount > 0
      ? `\n\n⚠️ Notice: This meeting has ${checkinCount} test check-in(s). Deleting will cleanly purge these test records without affecting official Commandery standing.`
      : '';

    const confirmation = prompt(
      `⚠️ MEETING DELETION CONFIRMATION:\n\n` +
      `Meeting: "${meetingTitle}"` +
      checkinNotice +
      `\n\nTo confirm deletion, type DELETE below:`
    );

    if (!confirmation || confirmation.trim().toUpperCase() !== 'DELETE') {
      return;
    }

    setDeletingId(meetingId);
    try {
      await deleteMeeting(meetingId, isTestTitle);
      const remaining = meetings.filter(m => m.id !== meetingId);
      setMeetings(remaining);
      if (selectedMeeting?.id === meetingId) {
        setSelectedMeeting(remaining[0] || null);
      }
      alert(`Meeting "${meetingTitle}" deleted successfully.`);
    } catch (err: any) {
      alert(`🛡️ ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  }

  // Open the modal for a manual check-in, grant excuse, or reject sign-in action
  function openModal(type: 'checkin' | 'excuse' | 'reject', memberId: string, memberName: string) {
    setModalNote('');
    setActiveModal({ type, memberId, memberName });
  }

  function closeModal() {
    setActiveModal(null);
    setModalNote('');
    setModalSubmitting(false);
  }

  // Dispatches the correct action when the modal is confirmed
  async function handleModalConfirm() {
    if (!activeModal || !selectedMeeting) return;
    setModalSubmitting(true);
    try {
      if (activeModal.type === 'checkin') {
        await checkInMember({
          meeting_id: selectedMeeting.id,
          member_id: activeModal.memberId,
          method: 'manual',
          verified_by: profile.id,
          commandery_id: profile.commandery_id,
          override_note: modalNote.trim() || undefined,
        });
      } else if (activeModal.type === 'reject') {
        await rejectCheckIn({
          meeting_id: selectedMeeting.id,
          member_id: activeModal.memberId,
        });
      } else {
        if (!modalNote.trim()) {
          alert('Please provide a reason for the excuse.');
          setModalSubmitting(false);
          return;
        }
        await registrarGrantExcuse({
          meeting_id: selectedMeeting.id,
          member_id: activeModal.memberId,
          reason: modalNote.trim(),
          granted_by: profile.id,
        });
      }
      closeModal();
      loadMeetingData(selectedMeeting.id);
    } catch (e: any) {
      alert(`Action failed: ${e.message}`);
      setModalSubmitting(false);
    }
  }

  async function handleReviewExcuse(requestId: string, status: 'approved' | 'declined') {
    if (!selectedMeeting) return;
    try {
      await reviewAbsenceRequest({
        id: requestId,
        status,
        reviewed_by: profile.id
      });
      loadMeetingData(selectedMeeting.id);
    } catch (e: any) {
      alert(`Failed to review excuse: ${e.message}`);
    }
  }

  const downloadAttendanceCSV = () => {
    if (!attendanceReport.length || !selectedMeeting) return;

    const headers = [
      'Meeting Title',
      'Meeting Date',
      'Brother\'s Name',
      'Email',
      'Phone',
      'Attendance Status',
      'Check-in Time'
    ];

    const rows = sortedAttendanceReport.map(m => [
      selectedMeeting.title || '',
      new Date(selectedMeeting.date).toLocaleString(),
      `${m.first_name} ${m.surname}`,
      m.email || '',
      m.phone || '',
      m.status || 'Absent',
      m.checkInTime ? new Date(m.checkInTime).toLocaleTimeString() : '—'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedMeeting.title.replace(/\s+/g, '_')}_attendance_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printAttendancePDF = () => {
    if (!attendanceReport.length || !selectedMeeting) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print this report.');
      return;
    }

    const rowsHtml = sortedAttendanceReport.map(m => {
      const checkInStr = m.checkInTime ? new Date(m.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
      const statusColor = m.status.startsWith('Present') ? '#16a34a' : m.status === 'Excused' ? '#0284c7' : '#dc2626';

      return `
        <tr>
          <td><strong>${m.first_name} ${m.surname}</strong><br/><span style="font-size: 11px; color: #64748b;">${m.email || m.phone || 'No contact'}</span></td>
          <td style="text-align: center;"><span style="color: ${statusColor}; font-weight: 700;">${m.status.toUpperCase()}</span></td>
          <td style="text-align: right;">${checkInStr}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Attendance Report - ${selectedMeeting.title}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #10233f; }
            .report-header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #C9A84C; padding-bottom: 20px; }
            .report-header h1 { text-transform: uppercase; letter-spacing: 2px; margin: 0; font-size: 24px; color: #10233f; }
            .report-header p { color: #C9A84C; font-weight: 700; margin: 5px 0 0 0; }
            
            .meeting-info { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 30px; }
            .meeting-info h2 { margin: 0 0 8px; color: #10233f; }
            .meeting-info p { margin: 0; font-size: 13px; color: #64748b; }
            
            .stats-container { display: flex; gap: 15px; margin-top: 15px; }
            .stat-badge { background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 16px; font-size: 12px; font-weight: 700; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; padding: 12px; border-bottom: 2px solid #10233f; font-size: 13px; text-transform: uppercase; background: #f1f5f9; }
            td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; }
            .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #64748b; }
            @page { margin: 1.5cm; }
          </style>
        </head>
        <body onload="window.print(); window.onafterprint = function() { window.close(); }">
          <div class="report-header">
            <h1>Knight St. John International</h1>
            <p>Meeting Attendance Sheet</p>
          </div>
          
          <div class="meeting-info">
            <h2>${selectedMeeting.title}</h2>
            <p>📅 <strong>Date:</strong> ${formatDisplayDate(selectedMeeting.date)} | 🎯 <strong>Geofence:</strong> ${selectedMeeting.radius_meters}m radius</p>
            
            <div class="stats-container" style="display: flex; gap: 15px; margin-top: 15px;">
              <div class="stat-badge" style="border-left: 3px solid #16a34a; color: #16a34a;">
                <strong>Attendance Data:</strong> ${presentCount} of ${totalRoster} Attended
              </div>
              <div class="stat-badge" style="border-left: 3px solid #0284c7; color: #0284c7;">
                <strong>Attendance Assessment:</strong> ${presentPct}% Compliance
              </div>
              <div class="stat-badge" style="border-left: 3px solid #64748b; color: #475569;">
                Excused: ${excusedCount} | Absent: ${absentCount}
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Member Name / Contact</th>
                <th style="text-align: center;">Status</th>
                <th style="text-align: right;">Check-in Time</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="footer">
            <p>Confidential — Official Commandery Registry Record</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="meetings-page-grid">
      {/* Top Banner: Meeting Metrics & Turnout Analytics */}
      <div
        style={{
          gridColumn: '1 / -1',
          padding: '16px 22px',
          borderRadius: 14,
          background: 'linear-gradient(135deg, #0A1628 0%, #1e293b 100%)',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.15)',
          border: '1px solid rgba(201, 168, 76, 0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 28 }}>📊</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#C9A84C' }}>
              Meeting Metrics & Turnout Analytics Hub
            </div>
            <div style={{ fontSize: 13, color: '#94a3b8' }}>
              Explore key attendance metrics, turnout compliance, and check-in logs across all recorded sessions.
            </div>
          </div>
        </div>
        <Link
          href="/registrar/meetings/metrics"
          style={{
            padding: '10px 20px',
            borderRadius: 10,
            background: 'linear-gradient(135deg, #C9A84C 0%, #b3923b 100%)',
            color: '#0A1628',
            fontWeight: 800,
            fontSize: 13,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
        >
          <span>View All Meeting Metrics ({meetings.length}) →</span>
        </Link>
      </div>
      {/* Left Column: Create Form & List */}
      <div style={{ minWidth: 0, display: 'grid', gap: 24, alignContent: 'start' }}>
        
        {/* Schedule Form */}
        <form onSubmit={handleCreateMeeting} className="card" style={{ minWidth: 0, display: 'grid', gap: 14 }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, color: 'var(--navy)', fontWeight: 800 }}>Schedule Meeting</h3>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Configure geofenced meeting parameters.</p>
          </div>

          {/* Venue Preset Selector */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(201,168,76,0.12) 0%, rgba(10,22,40,0.04) 100%)',
            border: '1px solid rgba(201,168,76,0.35)',
            borderRadius: 12,
            padding: '12px',
            fontSize: 12,
            display: 'grid',
            gap: 10
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, color: 'var(--navy)', fontSize: 12 }}>
                📍 Commandery Meeting Venues (Dansoman)
              </span>
              <span style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 700 }}>1-Click Presets</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {KSJI_VENUE_PRESETS.map((p) => {
                const isSelected = Math.abs(parseFloat(latitude) - p.latitude) < 0.0002 && Math.abs(parseFloat(longitude) - p.longitude) < 0.0002;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyVenuePreset(p)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: isSelected ? '2px solid var(--navy)' : '1px solid #cbd5e1',
                      background: isSelected ? '#ffffff' : 'rgba(255,255,255,0.7)',
                      color: isSelected ? 'var(--navy)' : '#475569',
                      fontWeight: isSelected ? 800 : 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      boxShadow: isSelected ? '0 2px 4px rgba(10,22,40,0.1)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      minWidth: 0
                    }}
                  >
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{p.icon}</span>
                    <div style={{ minWidth: 0, overflow: 'hidden' }}>
                      <div style={{ fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.short_name}
                      </div>
                      <div style={{ fontSize: 10, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.default_radius_meters}m radius</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {(() => {
              const matched = getMatchingVenuePreset(parseFloat(latitude), parseFloat(longitude));
              if (matched) {
                return (
                  <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.4, borderTop: '1px dashed rgba(201,168,76,0.35)', paddingTop: 8 }}>
                    <strong>{matched.icon} {matched.full_name}</strong><br/>
                    📍 <em>{matched.address}</em> • Plus Code: <code>{matched.plus_code}</code>
                  </div>
                );
              }
              return (
                <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic', borderTop: '1px dashed #cbd5e1', paddingTop: 8 }}>
                  📍 Custom Location Coordinates entered.
                </div>
              );
            })()}
          </div>

          <label style={label}>
            <span>Meeting Title</span>
            <input value={title} onChange={e => setTitle(e.target.value)} required style={input} placeholder="e.g. October 2026 General Meeting" />
          </label>

          <label style={label}>
            <span>Date & Time</span>
            <input value={date} onChange={e => setDate(e.target.value)} type="datetime-local" required style={input} />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, minWidth: 0 }}>
            <label style={label}>
              <span>Latitude</span>
              <input value={latitude} onChange={e => setLatitude(e.target.value)} required type="number" step="0.000001" style={input} placeholder="5.55925" />
            </label>
            <label style={label}>
              <span>Longitude</span>
              <input value={longitude} onChange={e => setLongitude(e.target.value)} required type="number" step="0.000001" style={input} placeholder="-0.271167" />
            </label>
          </div>

          {/* Typo warning if extra zero detected */}
          {hasMistypedAccraLongitude(longitude) && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #f87171',
              borderRadius: 8,
              padding: '8px 10px',
              fontSize: 11,
              color: '#991b1b',
              lineHeight: 1.4
            }}>
              ⚠️ <strong>Longitude Typo:</strong> You entered <code>{longitude}</code>. In Dansoman/Accra, the longitude is <code>-0.271...</code> (one zero). Entering <code>-0.027...</code> (extra zero) moves the meeting location <strong>27 km away</strong> into the ocean! Click <strong>"↺ Reset to Venue"</strong> above to auto-correct.
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', minWidth: 0 }}>
            <button
              type="button"
              onClick={handlePinLocation}
              style={{ flex: 1, minWidth: 0, padding: '9px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              📌 Pin Current Location
            </button>
            <label style={{ ...label, width: 85, flexShrink: 0 }}>
              <span style={{ fontSize: 11 }}>Radius (m)</span>
              <input value={radiusMeters} onChange={e => setRadiusMeters(parseInt(e.target.value) || 150)} required type="number" style={input} placeholder="150" />
            </label>
          </div>
          <span style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 700, marginTop: -4 }}>* Radius in meters (Recommended: 150m for full campus)</span>

          <button type="submit" disabled={submittingMeeting} style={button}>
            {submittingMeeting ? 'Scheduling…' : 'Schedule Meeting'}
          </button>

          {message && <div style={{ color: '#1f6f43', fontSize: 12, fontWeight: 600 }}>{message}</div>}
          {error && <div style={{ color: 'crimson', fontSize: 12, fontWeight: 600 }}>⚠️ {error}</div>}
        </form>

        {/* Scheduled Meetings List */}
        <div className="card" style={{ display: 'grid', gap: 12 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 15, color: 'var(--navy)', fontWeight: 800 }}>Recent Meetings</h3>
          {meetings.length === 0 ? (
            <span style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>No meetings scheduled.</span>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {meetings.map((m) => {
                const isUpcoming = new Date().getTime() < new Date(m.date).getTime();
                const matchedVenue = getMatchingVenuePreset(m.latitude, m.longitude);
                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMeeting(m)}
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      cursor: 'pointer',
                      border: selectedMeeting?.id === m.id ? '1.5px solid var(--gold)' : '1px solid #e2e8f0',
                      background: selectedMeeting?.id === m.id ? 'rgba(212, 175, 55, 0.04)' : '#fff',
                      transition: 'all 0.2s',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: 13, color: 'var(--navy)' }}>{m.title}</strong>
                        {isUpcoming ? (
                          <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: '#dbeafe', color: '#1e40af' }}>
                            ⏳ Upcoming
                          </span>
                        ) : (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#f1f5f9', color: '#64748b' }}>
                            ✓ Past
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                        <span style={{ fontSize: 11, color: '#64748b' }}>📅 {formatDisplayDateTime(m.date)}</span>
                        {matchedVenue && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--navy)', background: '#f1f5f9', padding: '1px 6px', borderRadius: 4 }}>
                            {matchedVenue.icon} {matchedVenue.short_name}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(m);
                          }}
                          style={{
                            fontSize: 11,
                            color: 'var(--navy)',
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            borderRadius: 6,
                            padding: '4px 8px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                          title="Amend details before meeting starts"
                        >
                          ✏️ Amend Details
                        </button>
                        <Link
                          href={`/registrar/meetings/${m.id}/scan`}
                          onClick={(e) => e.stopPropagation()}
                          style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 700 }}
                        >
                          📱 Scan QR →
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Details & Manual Overrides */}
      <div style={{ minWidth: 0, display: 'grid', gap: 24, alignContent: 'start' }}>
        {selectedMeeting ? (
          <>
            {/* Header Detail Card */}
            <div className="card" style={{ borderLeft: '4px solid var(--gold)', background: 'linear-gradient(135deg, #ffffff 0%, #fffdf9 100%)' }}>
              <h2 style={{ margin: '0 0 4px', color: 'var(--navy)', fontWeight: 800 }}>{selectedMeeting.title}</h2>
              {(() => {
                const matched = getMatchingVenuePreset(selectedMeeting.latitude, selectedMeeting.longitude);
                return (
                  <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                    📆 <strong>Date & Time:</strong> {formatDisplayDateTime(selectedMeeting.date)} | 🎯 <strong>Geofence:</strong> {selectedMeeting.radius_meters}m radius
                    {matched && (
                      <span> | {matched.icon} <strong>Venue:</strong> {matched.full_name}</span>
                    )}
                    <span> | 📍 Lat: {selectedMeeting.latitude}, Lon: {selectedMeeting.longitude}</span>
                  </p>
                );
              })()}
              {hasMistypedAccraLongitude(selectedMeeting.longitude) && (
                <div style={{
                  marginTop: 10,
                  background: '#fef2f2',
                  border: '1.5px solid #ef4444',
                  borderRadius: 10,
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 10
                }}>
                  <div>
                    <strong style={{ color: '#991b1b', fontSize: 13, display: 'block' }}>
                      ⚠️ Critical Geofence Misconfiguration Detected
                    </strong>
                    <span style={{ color: '#7f1d1d', fontSize: 12 }}>
                      This meeting has longitude <code>{selectedMeeting.longitude}</code> (extra zero), placing it 27 km away into the sea! All GPS check-ins will fail.
                    </span>
                  </div>
                  <button
                    onClick={() => openEditModal(selectedMeeting)}
                    style={{
                      background: '#b91c1c',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '8px 14px',
                      fontWeight: 800,
                      fontSize: 12,
                      cursor: 'pointer'
                    }}
                  >
                    Fix Geofence Now
                  </button>
                </div>
              )}
              {/* QR Scan Quick Action & Delete Meeting */}
              <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <Link
                  href={`/registrar/meetings/${selectedMeeting.id}/scan`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 24px',
                    background: '#C9A84C',
                    color: '#0A1628',
                    borderRadius: 12,
                    fontWeight: 800,
                    fontSize: 15,
                    textDecoration: 'none',
                  }}
                >
                  📱 Start QR Check-In Session
                </Link>

                <button
                  onClick={() => setIsNoticeModalOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 20px',
                    background: '#0A1628',
                    color: '#C9A84C',
                    border: '1px solid #1e293b',
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  📢 Send Notice (SMS / Email)
                </button>

                <button
                  onClick={() => openEditModal(selectedMeeting)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 18px',
                    background: '#ffffff',
                    color: 'var(--navy)',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                  }}
                >
                  ✏️ Amend Meeting Details
                </button>

                
              </div>
            </div>

            {/* Visual Attendance Insights Graph */}
            <div className="card" style={{ background: '#fff', display: 'grid', gap: 16 }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 15, color: 'var(--navy)', fontWeight: 800 }}>📊 Meeting Attendance Breakdown</h3>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Objective facts and calculated compliance metrics.</p>
              </div>

              {loadingReport ? (
                <div style={{ padding: 12, textAlign: 'center', color: '#64748b', fontSize: 13 }}>⌛ Loading statistics...</div>
              ) : (
                <div style={{ display: 'grid', gap: 16 }}>
                  {/* Attendance Data vs Attendance Assessment Summary */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: '#64748b', marginBottom: 2 }}>
                        📊 Attendance Data (Objective Facts)
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy)' }}>
                        {presentCount} of {totalRoster} Attended
                      </div>
                      <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                        {excusedCount} Excused • {absentCount} Absent
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: '#64748b', marginBottom: 2 }}>
                        ⚡ Attendance Assessment (Calculated Metrics)
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: presentPct >= 60 ? '#16a34a' : '#dc2626' }}>
                        {presentPct}% Attendance Rate
                      </div>
                      <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                        {presentPct >= 60 ? '✓ Meeting Threshold Met' : '⚠️ Below 60% Threshold'}
                      </div>
                    </div>
                  </div>

                  {/* Grid of stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <div style={{ padding: '12px 6px', borderRadius: 10, background: 'rgba(34, 197, 94, 0.04)', border: '1px solid rgba(34, 197, 94, 0.08)', textAlign: 'center' }}>
                      <div style={{ fontSize: 18, marginBottom: 4 }}>✅</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#16a34a' }}>{presentCount}</div>
                      <div style={{ fontSize: 10, color: '#15803d', fontWeight: 700 }}>Present ({presentPct}%)</div>
                    </div>
                    <div style={{ padding: '12px 6px', borderRadius: 10, background: 'rgba(3, 105, 161, 0.04)', border: '1px solid rgba(3, 105, 161, 0.08)', textAlign: 'center' }}>
                      <div style={{ fontSize: 18, marginBottom: 4 }}>✉️</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#0284c7' }}>{excusedCount}</div>
                      <div style={{ fontSize: 10, color: '#0369a1', fontWeight: 700 }}>Excused ({excusedPct}%)</div>
                    </div>
                    <div style={{ padding: '12px 6px', borderRadius: 10, background: 'rgba(239, 68, 68, 0.04)', border: '1px solid rgba(239, 68, 68, 0.08)', textAlign: 'center' }}>
                      <div style={{ fontSize: 18, marginBottom: 4 }}>❌</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#ef4444' }}>{absentCount}</div>
                      <div style={{ fontSize: 10, color: '#b91c1c', fontWeight: 700 }}>Absent ({absentPct}%)</div>
                    </div>
                  </div>

                  {/* Horizontal Bar Graph */}
                  <div style={{ height: 24, borderRadius: 12, overflow: 'hidden', background: '#f1f5f9', display: 'flex', width: '100%' }}>
                    {presentCount > 0 && (
                      <div 
                        style={{ width: `${presentPct}%`, background: 'linear-gradient(90deg, #22c55e, #16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 800 }}
                        title={`Present: ${presentPct}%`}
                      >
                        {presentPct >= 10 ? `${presentPct}%` : ''}
                      </div>
                    )}
                    {excusedCount > 0 && (
                      <div 
                        style={{ width: `${excusedPct}%`, background: 'linear-gradient(90deg, #38bdf8, #0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 800 }}
                        title={`Excused: ${excusedPct}%`}
                      >
                        {excusedPct >= 10 ? `${excusedPct}%` : ''}
                      </div>
                    )}
                    {absentCount > 0 && (
                      <div 
                        style={{ width: `${absentPct}%`, background: 'linear-gradient(90deg, #f87171, #ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 800 }}
                        title={`Absent: ${absentPct}%`}
                      >
                        {absentPct >= 10 ? `${absentPct}%` : ''}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Excuse & Permission Requests Panel */}
            <div className="card" style={{ border: '1px solid rgba(3, 105, 161, 0.1)', background: 'rgba(3, 105, 161, 0.005)', display: 'grid', gap: 16 }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 15, color: '#0369a1', fontWeight: 800 }}>✉️ Excuse & Permission Requests</h3>
                <p style={{ margin: 0, fontSize: 12, color: '#0284c7' }}>Review absence permission excuses submitted by members.</p>
              </div>

              {absenceRequests.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#0284c7', fontSize: 12, fontStyle: 'italic', background: '#fff', borderRadius: 10, border: '1px dashed #bae6fd' }}>
                  No pending excuses or permissions submitted for this meeting.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {absenceRequests.map((req) => (
                    <div 
                      key={req.id} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: 14, 
                        background: '#fff', 
                        borderRadius: 10, 
                        border: '1px solid #e0f2fe' 
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: 14, color: 'var(--navy)' }}>
                          {req.members?.title || 'Bro.'} {req.members?.first_name} {req.members?.surname}
                        </strong>
                        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#334155' }}>
                          ✍️ <em>"{req.reason}"</em>
                        </p>
                        <span style={{ fontSize: 11, fontWeight: 700, color: req.status === 'pending' ? '#b45309' : '#0369a1', display: 'block', marginTop: 4 }}>
                          Status: {req.status.toUpperCase()}
                        </span>
                      </div>

                      {req.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => handleReviewExcuse(req.id, 'approved')}
                            style={{ padding: '6px 12px', background: '#0284c7', color: '#fff', border: 0, borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReviewExcuse(req.id, 'declined')}
                            style={{ padding: '6px 12px', background: '#ef4444', color: '#fff', border: 0, borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Attendance List & Manual Overrides */}
            <div className="card" style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: 16, color: 'var(--navy)', fontWeight: 800 }}>📊 Live Attendance Roster</h3>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Active members in St. Margaret-Mary registry check-in status.</p>
                </div>
                {attendanceReport.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--navy)' }}>Sort:</span>
                      <select
                        value={rosterSortOrder}
                        onChange={(e) => setRosterSortOrder(e.target.value as any)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 6,
                          border: '1px solid #cbd5e1',
                          background: '#fff',
                          fontSize: 12,
                          fontWeight: 700,
                          color: 'var(--navy)',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="status_priority">⚡ Attended → Excused → Absent</option>
                        <option value="name">🔤 Member Name (A-Z)</option>
                        <option value="checkin_time">🕒 Check-in Time (Recent First)</option>
                      </select>
                    </div>

                    <button 
                      onClick={downloadAttendanceCSV}
                      style={{ background: '#f8fafc', color: 'var(--navy)', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                      📥 Export CSV
                    </button>
                    <button 
                      onClick={printAttendancePDF}
                      style={{ background: 'var(--gold)', color: 'var(--navy)', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                      🖨️ Print PDF
                    </button>
                  </div>
                )}
              </div>

              {/* Search & Filter Sign-ins Bar */}
              {attendanceReport.length > 0 && (
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
                    <input
                      type="text"
                      value={attendanceQuery}
                      onChange={(e) => setAttendanceQuery(e.target.value)}
                      placeholder="🔍 Query sign-ins by member name, phone, email, or method..."
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        fontSize: 13,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    {attendanceQuery && (
                      <button
                        onClick={() => setAttendanceQuery('')}
                        style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 14 }}
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Filter Pills */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setStatusFilter('all')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 20,
                        border: 'none',
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: 'pointer',
                        background: statusFilter === 'all' ? 'var(--navy)' : '#e2e8f0',
                        color: statusFilter === 'all' ? '#fff' : '#475569'
                      }}
                    >
                      All ({totalRoster})
                    </button>
                    <button
                      onClick={() => setStatusFilter('present')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 20,
                        border: 'none',
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: 'pointer',
                        background: statusFilter === 'present' ? '#166534' : '#dcfce7',
                        color: statusFilter === 'present' ? '#fff' : '#15803d'
                      }}
                    >
                      Present Sign-ins ({presentCount})
                    </button>
                    <button
                      onClick={() => setStatusFilter('excused')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 20,
                        border: 'none',
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: 'pointer',
                        background: statusFilter === 'excused' ? '#0369a1' : '#e0f2fe',
                        color: statusFilter === 'excused' ? '#fff' : '#0369a1'
                      }}
                    >
                      Excused ({excusedCount})
                    </button>
                    <button
                      onClick={() => setStatusFilter('absent')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 20,
                        border: 'none',
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: 'pointer',
                        background: statusFilter === 'absent' ? '#b91c1c' : '#fee2e2',
                        color: statusFilter === 'absent' ? '#fff' : '#b91c1c'
                      }}
                    >
                      Absent ({absentCount})
                    </button>
                  </div>
                </div>
              )}

              {loadingReport ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 13 }}>⌛ Loading attendance status...</div>
              ) : attendanceReport.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 13 }}>⚠️ No active members found.</div>
              ) : filteredAttendanceReport.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 13 }}>🔍 No sign-in records match query filters.</div>
              ) : (
                <div style={{ display: 'grid', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                  {/* Table Header */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1.4fr', background: '#f8fafc', padding: '12px 16px', fontWeight: 800, fontSize: 12, color: 'var(--navy)', borderBottom: '1px solid #e2e8f0' }}>
                    <span>MEMBER</span>
                    <span>STATUS</span>
                    <span style={{ textAlign: 'right' }}>OVERRIDE & REJECTION ACTIONS</span>
                  </div>

                  {/* Table Body */}
                  {filteredAttendanceReport.map((m) => {
                    const isPresent = m.status.startsWith('Present');
                    const isExcused = m.status === 'Excused';
                    const isPending = m.status === 'Excuse Pending';
                    const memberName = `${m.first_name} ${m.surname}`;

                    const statusBg = isPresent ? '#e6f4ea' : isExcused ? '#e0f2fe' : isPending ? '#fef9c3' : '#fdeaea';
                    const statusColor = isPresent ? '#1f6f43' : isExcused ? '#0369a1' : isPending ? '#92400e' : 'crimson';

                    return (
                      <div 
                        key={m.id} 
                        style={{ 
                          display: 'grid', 
                          gridTemplateColumns: '1.5fr 1fr 1.4fr', 
                          padding: '14px 16px', 
                          alignItems: 'center', 
                          fontSize: 13, 
                          borderBottom: '1px solid #f1f5f9',
                          background: isPresent ? 'rgba(34,197,94,0.02)' : isExcused ? 'rgba(3,105,161,0.02)' : 'transparent',
                        }}
                      >
                        {/* Col 1: Member name */}
                        <div>
                          <strong style={{ color: 'var(--navy)', display: 'block' }}>{memberName}</strong>
                          <span style={{ fontSize: 11, color: '#64748b' }}>{m.email || m.phone || 'No contact'}</span>
                          {m.excuseReason && (
                            <span style={{ fontSize: 10, color: '#0369a1', display: 'block', marginTop: 3, fontStyle: 'italic' }}>
                              ✍️ &ldquo;{m.excuseReason}&rdquo;
                            </span>
                          )}
                        </div>

                        {/* Col 2: Status badge */}
                        <div>
                          <span style={{ display: 'inline-block', padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800, background: statusBg, color: statusColor }}>
                            {m.status.toUpperCase()}
                          </span>
                          {m.checkInTime && (
                            <span style={{ display: 'block', fontSize: 10, color: '#64748b', marginTop: 4 }}>
                              🕒 {new Date(m.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>

                        {/* Col 3: Override action buttons */}
                        <div style={{ textAlign: 'right', display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
                          {isPresent && (
                            <>
                              <span style={{ color: '#22c55e', fontWeight: 800, fontSize: 12 }}>✓ PRESENT</span>
                              <button
                                onClick={() => openModal('reject', m.id, memberName)}
                                style={{ padding: '4px 10px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: 6, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
                                title="Reject / revoke this meeting sign-in"
                              >
                                ❌ Reject Sign-In
                              </button>
                            </>
                          )}
                          {isExcused && (
                            <span style={{ color: '#0369a1', fontWeight: 700, fontSize: 12 }}>✉️ EXCUSED</span>
                          )}
                          {!isPresent && !isExcused && (
                            <>
                              <button
                                onClick={() => openModal('checkin', m.id, memberName)}
                                style={{ padding: '5px 10px', background: '#10233f', color: '#fff', border: 0, borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                                title="Manually sign this member in"
                              >
                                🔗 Check In
                              </button>
                              <button
                                onClick={() => openModal('excuse', m.id, memberName)}
                                style={{ padding: '5px 10px', background: '#0284c7', color: '#fff', border: 0, borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                                title="Grant an official excuse from an external letter"
                              >
                                ✉️ Grant Excuse
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── DANGER ZONE / MEETING ADMINISTRATION ── */}
            <div
              style={{
                marginTop: 12,
                padding: '14px 18px',
                borderRadius: 12,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <details style={{ cursor: 'pointer' }}>
                <summary style={{ fontSize: 12, fontWeight: 700, color: '#64748b', userSelect: 'none' }}>
                  ⚙️ Advanced Meeting Administration & Danger Zone
                </summary>
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
                  {(() => {
                    const isTestOrDraft =
                      selectedMeeting?.status === 'draft' ||
                      /test|sample|trial|demo|practice|sandbox|dry run|training|fictitious/i.test(selectedMeeting?.title || '');
                    const isMinuteCheckins = presentCount <= 5;
                    const isDeletable = isTestOrDraft || isMinuteCheckins;

                    if (!isDeletable) {
                      return (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: 12,
                            borderRadius: 8,
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                          }}
                        >
                          <span style={{ fontSize: 20 }}>🔒</span>
                          <div style={{ fontSize: 12, color: '#1e40af', lineHeight: 1.4 }}>
                            <strong>Permanent Historical Record Protected:</strong> This official Commandery meeting has <strong>{presentCount} confirmed check-ins</strong>.
                            Official attendance logs are permanently locked against deletion to safeguard audit and dues compliance.
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                              <em>Note: Only draft meetings, test sessions, or sessions with a minute number of check-ins (≤ 5) can be deleted.</em>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (presentCount === 0) {
                      return (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#991b1b' }}>Delete Empty Draft / Test Session</div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>
                              This session has 0 check-ins. If this was created by accident or for testing, it can be safely removed.
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteMeeting(selectedMeeting.id, selectedMeeting.title, 0)}
                            disabled={deletingId === selectedMeeting.id}
                            style={{
                              padding: '8px 16px',
                              background: '#fee2e2',
                              color: '#991b1b',
                              border: '1px solid #fca5a5',
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: deletingId === selectedMeeting.id ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {deletingId === selectedMeeting.id ? '⏳ Deleting...' : '🗑️ Delete Empty Session'}
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#991b1b' }}>
                            Delete Test / Draft Session ({presentCount} test check-in{presentCount > 1 ? 's' : ''})
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b', maxWidth: 480 }}>
                            A minute number of test check-ins ({presentCount}) were recorded. Deleting will cleanly purge these test records without jeopardizing official Commandery data.
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteMeeting(selectedMeeting.id, selectedMeeting.title, presentCount)}
                          disabled={deletingId === selectedMeeting.id}
                          style={{
                            padding: '8px 16px',
                            background: '#fee2e2',
                            color: '#991b1b',
                            border: '1px solid #fca5a5',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: deletingId === selectedMeeting.id ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {deletingId === selectedMeeting.id ? '⏳ Purging & Deleting...' : `🗑️ Delete Session & Purge ${presentCount} Test Log${presentCount > 1 ? 's' : ''}`}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </details>
            </div>
          </>
        ) : (
          <div className="card" style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
            📅 Select or create a meeting to manage live attendance.
          </div>
        )}
      </div>

      {/* ── Amend Meeting Details Modal (Editable Till Meeting Starts) ───────── */}
      {isEditModalOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(10, 20, 40, 0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(3px)',
            padding: 24,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsEditModalOpen(false); }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: 32,
              maxWidth: 540,
              width: '100%',
              boxShadow: '0 24px 64px rgba(10,20,40,0.25)',
              display: 'grid',
              gap: 18,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, color: 'var(--navy)', fontWeight: 800 }}>
                  ✏️ Amend Meeting Details
                </h2>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b' }}>
                  Amend meeting title, date, time, venue, or geofence parameters before meeting starts.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#64748b', lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            {/* Quick Apply Venue Presets */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '12px 14px',
              display: 'grid',
              gap: 8,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, fontSize: 12, color: 'var(--navy)' }}>
                  📍 Quick Apply Venue Preset
                </span>
                <span style={{ fontSize: 11, color: '#64748b' }}>1-Click Location Coordinates</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {KSJI_VENUE_PRESETS.map((p) => {
                  const isSelected = Math.abs(parseFloat(editLatitude) - p.latitude) < 0.0002 && Math.abs(parseFloat(editLongitude) - p.longitude) < 0.0002;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyEditVenuePreset(p)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: isSelected ? '2px solid var(--navy)' : '1px solid #cbd5e1',
                        background: isSelected ? '#ffffff' : '#fff',
                        color: isSelected ? 'var(--navy)' : '#475569',
                        fontWeight: isSelected ? 800 : 600,
                        cursor: 'pointer',
                        textAlign: 'left',
                        boxShadow: isSelected ? '0 2px 4px rgba(10,22,40,0.1)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <span style={{ fontSize: 16 }}>{p.icon}</span>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 800 }}>{p.short_name}</div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>Radius: {p.default_radius_meters}m</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleSaveEditMeeting} style={{ display: 'grid', gap: 14 }}>
              <label style={label}>
                <span>Meeting Title</span>
                <input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  required
                  style={input}
                  placeholder="e.g. October 2026 General Meeting"
                />
              </label>

              <label style={label}>
                <span>Date & Time</span>
                <input
                  type="datetime-local"
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                  required
                  style={input}
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={label}>
                  <span>Latitude</span>
                  <input
                    type="number"
                    step="0.000001"
                    value={editLatitude}
                    onChange={e => setEditLatitude(e.target.value)}
                    required
                    style={input}
                  />
                </label>
                <label style={label}>
                  <span>Longitude</span>
                  <input
                    type="number"
                    step="0.000001"
                    value={editLongitude}
                    onChange={e => setEditLongitude(e.target.value)}
                    required
                    style={input}
                  />
                </label>
              </div>

              {hasMistypedAccraLongitude(editLongitude) && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #f87171',
                  borderRadius: 8,
                  padding: '8px 10px',
                  fontSize: 11,
                  color: '#991b1b',
                  lineHeight: 1.4
                }}>
                  ⚠️ <strong>Longitude Typo Warning:</strong> You entered <code>{editLongitude}</code>. In Dansoman/Accra, the longitude is approx <code>-0.271...</code>. Typing <code>-0.027...</code> (extra zero) moves the meeting location <strong>27 km away</strong> into the ocean! Click <strong>"Apply St. Bernadette Preset"</strong> above to auto-correct.
                </div>
              )}

              <label style={label}>
                <span>Geofence Radius (meters)</span>
                <input
                  type="number"
                  value={editRadiusMeters}
                  onChange={e => setEditRadiusMeters(parseInt(e.target.value) || 150)}
                  required
                  style={input}
                />
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  Recommended: 150m for full coverage of school campus and halls.
                </span>
              </label>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={savingEdit}
                  style={{
                    padding: '10px 18px',
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  style={{
                    padding: '10px 24px',
                    background: 'var(--navy)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: savingEdit ? 'not-allowed' : 'pointer',
                    minWidth: 140
                  }}
                >
                  {savingEdit ? '⏳ Saving...' : '💾 Save Amendments'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Manual Permission Modal ─────────────────────────────────────────── */}
      {activeModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(10, 20, 40, 0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(3px)',
            padding: 24,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: 32,
              maxWidth: 480,
              width: '100%',
              boxShadow: '0 24px 64px rgba(10,20,40,0.25)',
              display: 'grid',
              gap: 20,
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, color: 'var(--navy)', fontWeight: 800 }}>
                  {activeModal.type === 'checkin' ? '🔗 Manual Check-In' : activeModal.type === 'reject' ? '❌ Revoke / Reject Sign-In' : '✉️ Grant Official Excuse'}
                </h2>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b' }}>
                  {activeModal.type === 'checkin'
                    ? 'You are signing this member in on their behalf.'
                    : activeModal.type === 'reject'
                    ? 'You are revoking this member check-in sign-in. Their status will revert to Absent.'
                    : 'You are granting an approved excuse for this member.'}
                </p>
              </div>
              <button
                onClick={closeModal}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8', padding: 4, lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            {/* Member name pill */}
            <div style={{ background: activeModal.type === 'reject' ? '#fee2e2' : '#f1f5f9', borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>{activeModal.type === 'checkin' ? '👤' : activeModal.type === 'reject' ? '⚠️' : '📋'}</span>
              <div>
                <div style={{ fontSize: 12, color: activeModal.type === 'reject' ? '#991b1b' : '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Member</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: activeModal.type === 'reject' ? '#991b1b' : 'var(--navy)' }}>{activeModal.memberName}</div>
              </div>
            </div>

            {/* Note / Reason field */}
            {activeModal.type !== 'reject' && (
              <div style={{ display: 'grid', gap: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  {activeModal.type === 'checkin'
                    ? 'Reason for Manual Check-In (optional)'
                    : 'Official Reason / Letter Reference *'}
                </label>
                <textarea
                  value={modalNote}
                  onChange={(e) => setModalNote(e.target.value)}
                  rows={3}
                  placeholder={
                    activeModal.type === 'checkin'
                      ? 'e.g. Phone was dead, confirmed present in person'
                      : 'e.g. Official letter received 16 June 2026, signed by Secretary'
                  }
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1.5px solid #e2e8f0',
                    fontSize: 13,
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    outline: 'none',
                    color: '#1e293b',
                    lineHeight: 1.6,
                  }}
                  autoFocus
                />
                {activeModal.type === 'excuse' && (
                  <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>
                    * Required. This is recorded as the official excuse in the attendance log.
                  </p>
                )}
              </div>
            )}

            {activeModal.type === 'reject' && (
              <div style={{ background: '#fff5f5', border: '1px solid #fecaca', padding: '12px 14px', borderRadius: 8, fontSize: 13, color: '#991b1b' }}>
                Are you sure you want to remove and reject the check-in record for <strong>{activeModal.memberName}</strong>? This action will mark them as Absent in official reports.
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={closeModal}
                disabled={modalSubmitting}
                style={{ padding: '10px 20px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleModalConfirm}
                disabled={modalSubmitting}
                style={{
                  padding: '10px 24px',
                  background: activeModal.type === 'checkin' ? 'var(--navy)' : activeModal.type === 'reject' ? '#dc2626' : '#0284c7',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: modalSubmitting ? 'not-allowed' : 'pointer',
                  opacity: modalSubmitting ? 0.7 : 1,
                  minWidth: 120,
                }}
              >
                {modalSubmitting
                  ? '⏳ Saving...'
                  : activeModal.type === 'checkin'
                  ? '✅ Confirm Check-In'
                  : activeModal.type === 'reject'
                  ? '❌ Confirm Sign-In Rejection'
                  : '✉️ Grant Excuse'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meeting Notice Broadcast Modal */}
      <MeetingNoticeModal
        isOpen={isNoticeModalOpen}
        onClose={() => setIsNoticeModalOpen(false)}
        meeting={selectedMeeting}
        activeCount={members?.length || attendanceReport.length}
        unconfirmedCount={Math.max(
          0,
          (members?.length || attendanceReport.length) -
            attendanceReport.filter((m: any) => m.status?.startsWith('Present')).length
        )}
      />
    </div>
  );
}

const label: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--navy)' }; 
const input: React.CSSProperties = { padding: '9px 12px', borderRadius: 8, border: '1px solid #cfd8e3', outline: 'none', fontSize: 13, width: '100%', boxSizing: 'border-box' }; 
const button: React.CSSProperties = { padding: '11px 14px', borderRadius: 8, border: 0, background: 'var(--navy)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13, boxShadow: '0 4px 10px rgba(16, 35, 63, 0.1)' };
