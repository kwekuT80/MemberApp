'use client';

import React, { useState, useEffect } from 'react';
import { createMeeting, checkInMember, getAbsenceRequests, reviewAbsenceRequest, getAttendanceReport } from '@/services/attendanceService';

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

  // Stats for the selected meeting
  const totalRoster = attendanceReport.length;
  const presentCount = attendanceReport.filter(m => m.status.startsWith('Present')).length;
  const excusedCount = attendanceReport.filter(m => m.status === 'Excused').length;
  const absentCount = attendanceReport.filter(m => m.status === 'Absent').length;
  
  const presentPct = totalRoster > 0 ? Math.round((presentCount / totalRoster) * 100) : 0;
  const excusedPct = totalRoster > 0 ? Math.round((excusedCount / totalRoster) * 100) : 0;
  const absentPct = totalRoster > 0 ? Math.round((absentCount / totalRoster) * 100) : 0;

  // New Meeting Form States
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [radiusMeters, setRadiusMeters] = useState(100);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [submittingMeeting, setSubmittingMeeting] = useState(false);
  
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  async function handleManualCheckIn(memberId: string) {
    if (!selectedMeeting) return;
    try {
      await checkInMember({
        meeting_id: selectedMeeting.id,
        member_id: memberId,
        method: 'manual',
        verified_by: profile.id,
        commandery_id: profile.commandery_id
      });
      
      // Refresh report
      loadMeetingData(selectedMeeting.id);
    } catch (e: any) {
      alert(`Check-in failed: ${e.message}`);
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

      // Refresh report & requests list
      loadMeetingData(selectedMeeting.id);
    } catch (e: any) {
      alert(`Failed to review excuse: ${e.message}`);
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) 1fr', gap: 24, flexWrap: 'wrap' }}>
      {/* Left Column: Create Form & List */}
      <div style={{ display: 'grid', gap: 24, alignContent: 'start' }}>
        
        {/* Schedule Form */}
        <form onSubmit={handleCreateMeeting} className="card" style={{ display: 'grid', gap: 14 }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, color: 'var(--navy)', fontWeight: 800 }}>Schedule Meeting</h3>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Configure geofenced parameters.</p>
          </div>

          <label style={label}>
            <span>Meeting Title</span>
            <input value={title} onChange={e => setTitle(e.target.value)} required style={input} placeholder="e.g. May Monthly Plenary" />
          </label>

          <label style={label}>
            <span>Date & Time</span>
            <input value={date} onChange={e => setDate(e.target.value)} type="datetime-local" required style={input} />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label style={label}>
              <span>Latitude</span>
              <input value={latitude} onChange={e => setLatitude(e.target.value)} required type="number" step="0.000001" style={input} placeholder="5.6037" />
            </label>
            <label style={label}>
              <span>Longitude</span>
              <input value={longitude} onChange={e => setLongitude(e.target.value)} required type="number" step="0.000001" style={input} placeholder="-0.1870" />
            </label>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button 
              type="button" 
              onClick={handlePinLocation}
              style={{ flex: 1, padding: '8px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              📌 Pin Current Location
            </button>
            <label style={{ ...label, width: 90 }}>
              <input value={radiusMeters} onChange={e => setRadiusMeters(parseInt(e.target.value))} required type="number" style={input} placeholder="100" />
            </label>
          </div>
          <span style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 700, marginTop: -4 }}>* Radius in meters (Defaults to 100m)</span>

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
              {meetings.map((m) => (
                <div 
                  key={m.id} 
                  onClick={() => setSelectedMeeting(m)}
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    cursor: 'pointer',
                    border: selectedMeeting?.id === m.id ? '1.5px solid var(--gold)' : '1px solid #e2e8f0',
                    background: selectedMeeting?.id === m.id ? 'rgba(212, 175, 55, 0.04)' : '#fff',
                    transition: 'all 0.2s'
                  }}
                >
                  <strong style={{ fontSize: 13, color: 'var(--navy)', display: 'block' }}>{m.title}</strong>
                  <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginTop: 4 }}>
                    📅 {new Date(m.date).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Details & Manual Overrides */}
      <div style={{ display: 'grid', gap: 24, alignContent: 'start' }}>
        {selectedMeeting ? (
          <>
            {/* Header Detail Card */}
            <div className="card" style={{ borderLeft: '4px solid var(--gold)', background: 'linear-gradient(135deg, #ffffff 0%, #fffdf9 100%)' }}>
              <h2 style={{ margin: '0 0 4px', color: 'var(--navy)', fontWeight: 800 }}>{selectedMeeting.title}</h2>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                📆 <strong>Date:</strong> {new Date(selectedMeeting.date).toLocaleString()} | 🎯 <strong>Geofence:</strong> {selectedMeeting.radius_meters}m radius
              </p>
            </div>

            {/* Visual Attendance Insights Graph */}
            <div className="card" style={{ background: '#fff', display: 'grid', gap: 16 }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 15, color: 'var(--navy)', fontWeight: 800 }}>📊 Meeting Attendance Analysis</h3>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Visual breakdown of presence, excuses, and absences.</p>
              </div>

              {loadingReport ? (
                <div style={{ padding: 12, textAlign: 'center', color: '#64748b', fontSize: 13 }}>⌛ Loading statistics...</div>
              ) : (
                <div style={{ display: 'grid', gap: 16 }}>
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
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 16, color: 'var(--navy)', fontWeight: 800 }}>📊 Live Attendance Roster</h3>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Active members in St. Margaret-Mary registry check-in status.</p>
              </div>

              {loadingReport ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 13 }}>⌛ Loading attendance status...</div>
              ) : attendanceReport.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 13 }}>⚠️ No active members found.</div>
              ) : (
                <div style={{ display: 'grid', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                  {/* Table Header */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', background: '#f8fafc', padding: '12px 16px', fontWeight: 800, fontSize: 12, color: 'var(--navy)', borderBottom: '1px solid #e2e8f0' }}>
                    <span>MEMBER</span>
                    <span>STATUS</span>
                    <span style={{ textAlign: 'right' }}>OVERRIDE ACTION</span>
                  </div>

                  {/* Table Body */}
                  {attendanceReport.map((m) => {
                    const isPresent = m.status.startsWith('Present');
                    const isExcused = m.status === 'Excused';

                    return (
                      <div 
                        key={m.id} 
                        style={{ 
                          display: 'grid', 
                          gridTemplateColumns: '1.5fr 1fr 1fr', 
                          padding: '14px 16px', 
                          alignItems: 'center', 
                          fontSize: 13, 
                          borderBottom: '1px solid #f1f5f9',
                          background: isPresent ? 'rgba(34, 197, 94, 0.01)' : 'transparent' 
                        }}
                      >
                        <div>
                          <strong style={{ color: 'var(--navy)', display: 'block' }}>{m.first_name} {m.surname}</strong>
                          <span style={{ fontSize: 11, color: '#64748b' }}>{m.email || m.phone || 'No contact'}</span>
                        </div>

                        <div>
                          <span 
                            style={{ 
                              display: 'inline-block',
                              padding: '4px 8px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 800,
                              background: isPresent ? '#e6f4ea' : isExcused ? '#e0f2fe' : '#fdeaea',
                              color: isPresent ? '#1f6f43' : isExcused ? '#0369a1' : 'crimson'
                            }}
                          >
                            {m.status.toUpperCase()}
                          </span>
                          {m.checkInTime && (
                            <span style={{ display: 'block', fontSize: 10, color: '#64748b', marginTop: 4 }}>
                              🕒 {new Date(m.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          {!isPresent && (
                            <button
                              onClick={() => handleManualCheckIn(m.id)}
                              style={{ 
                                padding: '6px 12px', 
                                background: '#10233f', 
                                color: '#fff', 
                                border: 0, 
                                borderRadius: 6, 
                                fontSize: 11, 
                                fontWeight: 700, 
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              🔗 Manual Check-In
                            </button>
                          )}
                          {isPresent && <span style={{ color: '#22c55e', fontWeight: 800, fontSize: 14 }}>✓ PRESENT</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="card" style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
            📅 Select or create a meeting to manage live attendance.
          </div>
        )}
      </div>
    </div>
  );
}

const label: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--navy)' }; 
const input: React.CSSProperties = { padding: '9px 12px', borderRadius: 8, border: '1px solid #cfd8e3', outline: 'none', fontSize: 13, width: '100%', boxSizing: 'border-box' }; 
const button: React.CSSProperties = { padding: '11px 14px', borderRadius: 8, border: 0, background: 'var(--navy)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13, boxShadow: '0 4px 10px rgba(16, 35, 63, 0.1)' };
