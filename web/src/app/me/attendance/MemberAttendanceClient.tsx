'use client';

import React, { useState, useEffect } from 'react';
import { checkInMember, submitAbsenceRequest } from '@/services/attendanceService';

interface Props {
  member: any;
  initialMeetings: any[];
  initialAttendance: any[];
  initialExcuses: any[];
}

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // Earth radius in meters
  const p1 = lat1 * Math.PI/180;
  const p2 = lat2 * Math.PI/180;
  const dp = (lat2-lat1) * Math.PI/180;
  const dl = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(dp/2)**2 + Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

export default function MemberAttendanceClient({ member, initialMeetings, initialAttendance, initialExcuses }: Props) {
  const [meetings, setMeetings] = useState(initialMeetings);
  const [attendance, setAttendance] = useState<any[]>(initialAttendance);
  const [excuses, setExcuses] = useState<any[]>(initialExcuses);

  // GPS / Geolocation state
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [acquiringGps, setAcquiringGps] = useState(false);

  // Excuse Submission States
  const [activeExcuseMeetingId, setActiveExcuseMeetingId] = useState<string | null>(null);
  const [excuseReason, setExcuseReason] = useState('');
  const [submittingExcuse, setSubmittingExcuse] = useState(false);

  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Auto-acquire GPS location on mount
  useEffect(() => {
    acquireLocation();
  }, []);

  function acquireLocation() {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setAcquiringGps(true);
    setGpsError(null);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setAcquiringGps(false);
      },
      (err) => {
        console.error('GPS error:', err);
        setGpsError(`GPS Access Denied: ${err.message}. Please enable location services.`);
        setAcquiringGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  async function handleCheckIn(meeting: any) {
    if (!coords) {
      setAlertMsg({ type: 'error', text: 'Please acquire your GPS location first.' });
      return;
    }

    const dist = getDistance(coords.latitude, coords.longitude, meeting.latitude, meeting.longitude);
    if (dist > meeting.radius_meters) {
      setAlertMsg({ type: 'error', text: `Failed: You are ${Math.round(dist)}m away. Required proximity is <= ${meeting.radius_meters}m.` });
      return;
    }

    setCheckingInId(meeting.id);
    setAlertMsg(null);

    try {
      const result = await checkInMember({
        meeting_id: meeting.id,
        member_id: member.id,
        method: 'gps',
        commandery_id: member.commandery_id
      });

      setAttendance(prev => [...prev, result]);
      setAlertMsg({ type: 'success', text: `🎉 Successfully checked in to "${meeting.title}" via GPS!` });
    } catch (e: any) {
      setAlertMsg({ type: 'error', text: e.message || 'Check-in failed.' });
    } finally {
      setCheckingInId(null);
    }
  }

  async function handleExcuseSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeExcuseMeetingId || !excuseReason.trim()) return;

    setSubmittingExcuse(true);
    setAlertMsg(null);

    try {
      const result = await submitAbsenceRequest({
        meeting_id: activeExcuseMeetingId,
        member_id: member.id,
        reason: excuseReason.trim()
      });

      setExcuses(prev => [...prev, result]);
      setAlertMsg({ type: 'success', text: 'Excuse request submitted successfully for review!' });
      setActiveExcuseMeetingId(null);
      setExcuseReason('');
    } catch (e: any) {
      setAlertMsg({ type: 'error', text: e.message || 'Failed to submit excuse request.' });
    } finally {
      setSubmittingExcuse(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* GPS Status Card */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, borderLeft: '4px solid var(--gold)', background: 'linear-gradient(135deg, #ffffff 0%, #fffdf9 100%)' }}>
        <div>
          <h3 style={{ margin: '0 0 6px', color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>📡 Geofencing GPS Verification</span>
            {coords && <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />}
          </h3>
          {coords ? (
            <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>
              📍 <strong>Current Position:</strong> Lat: {coords.latitude.toFixed(6)}, Lon: {coords.longitude.toFixed(6)}
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: gpsError ? 'crimson' : '#64748b', fontWeight: gpsError ? 600 : 400 }}>
              {gpsError || 'Acquiring high-accuracy satellite coordinates...'}
            </p>
          )}
        </div>
        <button 
          onClick={acquireLocation} 
          disabled={acquiringGps}
          style={{ padding: '10px 18px', background: 'var(--navy)', color: '#fff', border: 0, borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          🔄 {acquiringGps ? 'Syncing GPS...' : 'Refresh GPS Location'}
        </button>
      </div>

      {alertMsg && (
        <div style={{ padding: '12px 18px', borderRadius: 10, background: alertMsg.type === 'success' ? '#e6f4ea' : '#fdeaea', color: alertMsg.type === 'success' ? '#1f6f43' : 'crimson', fontSize: 14, fontWeight: 700 }}>
          {alertMsg.text}
        </div>
      )}

      {/* Meetings Section */}
      <div>
        <h3 className="label" style={{ marginBottom: 16, color: 'var(--navy)', fontSize: 16 }}>Upcoming & Recent Meetings</h3>
        
        {meetings.length === 0 ? (
          <div className="card" style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>
            ℹ️ No commandery meetings have been scheduled yet.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {meetings.map((meeting) => {
              const checkIn = attendance.find(a => a.meeting_id === meeting.id);
              const excuse = excuses.find(e => e.meeting_id === meeting.id);

              // Time active window calculations
              const meetingTime = new Date(meeting.date).getTime();
              const nowTime = new Date().getTime();
              
              const checkInOpenTime = meetingTime - 60 * 60 * 1000; // 1 hour before
              const checkInCloseTime = meetingTime + 24 * 60 * 60 * 1000; // 24 hours after
              
              const isTooEarly = nowTime < checkInOpenTime;
              const isExpired = nowTime > checkInCloseTime;

              // Proximity calculations
              let distanceMeters: number | null = null;
              let isWithinRadius = false;
              
              if (coords) {
                distanceMeters = getDistance(coords.latitude, coords.longitude, meeting.latitude, meeting.longitude);
                isWithinRadius = distanceMeters <= meeting.radius_meters;
              }

              const formattedDate = new Date(meeting.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div key={meeting.id} className="card" style={{ display: 'grid', gap: 16, border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                      <h4 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: 'var(--navy)' }}>{meeting.title}</h4>
                      <p style={{ margin: '0 0 8px', fontSize: 13, color: '#64748b' }}>📅 {formattedDate}</p>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--gold)', fontWeight: 700 }}>
                        📍 Required Proximity: Within {meeting.radius_meters} meters
                      </p>
                    </div>

                    {/* Badge Actions */}
                    <div>
                      {checkIn ? (
                        <span style={{ display: 'inline-block', background: '#e6f4ea', color: '#1f6f43', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 800 }}>
                          ✓ PRESENT ({checkIn.method.toUpperCase()} Check-in)
                        </span>
                      ) : excuse ? (
                        <span style={{ display: 'inline-block', background: excuse.status === 'approved' ? '#e0f2fe' : '#fef3c7', color: excuse.status === 'approved' ? '#0369a1' : '#b45309', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 800 }}>
                          ℹ️ EXCUSE: {excuse.status.toUpperCase()} ({excuse.reason})
                        </span>
                      ) : isExpired ? (
                        <span style={{ display: 'inline-block', background: '#fdeaea', color: 'crimson', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 800 }}>
                          🔒 CLOSED (Ended)
                        </span>
                      ) : (
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          {isTooEarly ? (
                            <button
                              disabled={true}
                              style={{
                                padding: '10px 20px',
                                background: '#f1f5f9',
                                color: '#64748b',
                                border: '1px dashed #cbd5e1',
                                borderRadius: 8,
                                fontWeight: 800,
                                fontSize: 13,
                                cursor: 'not-allowed'
                              }}
                            >
                              ⌛ Opens 1hr Before
                            </button>
                          ) : (
                            <button
                              disabled={!isWithinRadius || checkingInId === meeting.id || !coords}
                              onClick={() => handleCheckIn(meeting)}
                              style={{
                                padding: '10px 20px',
                                background: isWithinRadius ? '#16a34a' : '#cbd5e1',
                                color: '#fff',
                                border: 0,
                                borderRadius: 8,
                                fontWeight: 800,
                                fontSize: 13,
                                cursor: isWithinRadius ? 'pointer' : 'not-allowed',
                                transition: 'all 0.2s',
                                boxShadow: isWithinRadius ? '0 4px 10px rgba(22, 163, 74, 0.2)' : 'none'
                              }}
                            >
                              {checkingInId === meeting.id ? 'Verifying GPS…' : 'Check In'}
                            </button>
                          )}
                          
                          <button
                            onClick={() => setActiveExcuseMeetingId(meeting.id)}
                            style={{
                              padding: '10px 16px',
                              background: 'transparent',
                              border: '1px solid #cfd8e3',
                              color: '#10233f',
                              borderRadius: 8,
                              fontWeight: 700,
                              fontSize: 13,
                              cursor: 'pointer'
                            }}
                          >
                            Submit Excuse
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Proximity & Status Panel */}
                  {!checkIn && !excuse && (
                    <div style={{ padding: 14, borderRadius: 10, background: '#f8fafc', border: '1px dashed #cbd5e1', fontSize: 13 }}>
                      {isExpired ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#b91c1c', fontWeight: 700 }}>
                          <span>🔒</span>
                          <span>This meeting has concluded. Check-in and excuse submissions are no longer active.</span>
                        </div>
                      ) : isTooEarly ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#64748b' }}>
                          <span>⌛</span>
                          <span>Check-in is not yet active. It will open on <strong>{new Date(checkInOpenTime).toLocaleString()}</strong> (1 hour before start time). You can still submit an excuse ahead of time if needed.</span>
                        </div>
                      ) : coords ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 18 }}>{isWithinRadius ? '✅' : '⚠️'}</span>
                          <span style={{ color: isWithinRadius ? '#16a34a' : '#9a3412', fontWeight: 700 }}>
                            {isWithinRadius 
                              ? `Within Range! You are only ${Math.round(distanceMeters!)}m away from meeting coordinates.` 
                              : `Too Far: You are currently ${Math.round(distanceMeters!)}m away. Move closer (<= ${meeting.radius_meters}m) to check in.`
                            }
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: '#64748b' }}>⌛ Waiting for browser GPS location lock to verify proximity...</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Excuse Submission Modal Overlay */}
      {activeExcuseMeetingId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(16, 35, 63, 0.4)', display: 'grid', placeItems: 'center', zIndex: 1000, backdropFilter: 'blur(2px)' }}>
          <form onSubmit={handleExcuseSubmit} style={{ background: '#fff', padding: 28, borderRadius: 20, maxWidth: 440, width: '90%', display: 'grid', gap: 16, boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: 18, color: 'var(--navy)', fontWeight: 800 }}>Submit Absence Request</h3>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Provide an official reason for your absence to the Registrar.</p>
            </div>
            
            <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 700 }}>
              <span>Reason / Excuse Detail</span>
              <textarea
                value={excuseReason}
                onChange={e => setExcuseReason(e.target.value)}
                required
                rows={4}
                placeholder="e.g. Travel, unwell, or work conflict..."
                style={{ padding: 12, borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13, resize: 'none', outline: 'none' }}
              />
            </label>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                onClick={() => { setActiveExcuseMeetingId(null); setExcuseReason(''); }}
                style={{ padding: '10px 16px', background: '#f1f5f9', border: 0, borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', color: '#64748b' }}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={submittingExcuse || !excuseReason.trim()}
                style={{ padding: '10px 20px', background: 'var(--navy)', color: '#fff', border: 0, borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                {submittingExcuse ? 'Submitting…' : 'Submit Excuse'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
