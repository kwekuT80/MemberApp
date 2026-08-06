'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { Html5Qrcode } from 'html5-qrcode';
import { formatDisplayDate } from '@/lib/utils/ksji-logic';
import { deleteMeeting } from '@/services/attendanceService';

interface ScannedMember {
  id: string;
  name: string;
  status?: string;
  alreadyCheckedIn: boolean;
  checkInTime?: string;
}

export default function MeetingScanPage() {
  const router = useRouter();
  const params = useParams();
  const meetingId = params.meetingId as string;
  const supabase = createClient();

  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState<ScannedMember | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [meetingInfo, setMeetingInfo] = useState<{ title?: string; date?: string } | null>(null);
  const [membersWithStatus, setMembersWithStatus] = useState<Map<string, boolean>>(new Map());
  const [deleting, setDeleting] = useState(false);
  const [commanderyMembers, setCommanderyMembers] = useState<any[]>([]);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const cameraIdRef = useRef<string>('');

  const handleDeleteMeeting = async () => {
    if (membersWithStatus.size > 0) {
      alert(`🛡️ Protected Official Record: This meeting contains ${membersWithStatus.size} recorded check-in(s). Official meetings with active data CANNOT be deleted.`);
      return;
    }

    const confirmation = prompt(
      `⚠️ DELETION PROTECTION POLICY:\n\n` +
      `• Official meetings with recorded check-ins are protected and CANNOT be deleted.\n` +
      `• Only empty test/draft meetings can be removed.\n\n` +
      `To confirm deletion of empty test meeting "${meetingInfo?.title || 'this meeting'}", type DELETE below:`
    );

    if (!confirmation || confirmation.trim().toUpperCase() !== 'DELETE') {
      return;
    }

    setDeleting(true);
    try {
      await deleteMeeting(meetingId);
      alert('Test meeting deleted successfully.');
      router.push('/registrar/meetings');
    } catch (err: any) {
      alert(`🛡️ ${err.message}`);
      setDeleting(false);
    }
  };

  useEffect(() => {
    // Load meeting info, commandery members, and track check-ins
    async function loadData() {
      try {
        const { data: meeting } = await supabase
          .from('meetings')
          .select('*')
          .eq('id', meetingId)
          .single();

        if (meeting) {
          setMeetingInfo({ title: meeting.title, date: meeting.date });

          if (meeting.commandery_id) {
            const { data: members } = await supabase
              .from('members')
              .select('id, first_name, surname, title, status')
              .eq('commandery_id', meeting.commandery_id)
              .not('status', 'in', '("Dismissed","Transfer-Out","Deceased")')
              .order('surname', { ascending: true });

            if (members) setCommanderyMembers(members);
          }
        }

        // Get all members checked in for this meeting
        const { data: attendance } = await supabase
          .from('attendance')
          .select('member_id')
          .eq('meeting_id', meetingId);

        if (attendance) {
          const map = new Map<string, boolean>();
          attendance.forEach((a: any) => map.set(a.member_id, true));
          setMembersWithStatus(map);
        }
      } catch (err) {
        console.error('Failed to load meeting data:', err);
      }
    }
    loadData();
  }, [meetingId, supabase]);

  const startScanner = async () => {
    try {
      // Request camera permissions first
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      stream.getTracks().forEach(track => track.stop());

      setScanning(true);

      // Get available cameras and prefer rear camera
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        // Prefer rear-facing camera
        const rearCamera = devices.find(d =>
          d.label.toLowerCase().includes('back') ||
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('wide')
        );
        cameraIdRef.current = rearCamera?.id || devices[0].id;
      } else {
        return;
      }

      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('qr-reader');
      } else {
        try {
          scannerRef.current.resume();
          setScanning(true);
          return;
        } catch (e) {
          try { await scannerRef.current.stop(); } catch (err) {}
        }
      }

      await scannerRef.current.start(
        cameraIdRef.current,
        { 
          fps: 10,
          aspectRatio: 1.0,
          qrbox: { width: 250, height: 250 },
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          }
        } as any,
        (decodedText: string) => {
          const text = (decodedText || '').trim();

          // Require a valid KSJI member QR format so camera blur/reflections are ignored until focused
          const isValidMemberFormat =
            text.includes('/verify/') ||
            text.startsWith('KSJI-') ||
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(text) ||
            (text.length >= 8 && /^[a-zA-Z0-9_-]+$/.test(text));

          if (!isValidMemberFormat) {
            return; // Ignore un-focused camera blur or non-member barcodes
          }

          // Instantly pause scanning feed without waiting for hardware stop promise
          if (scannerRef.current) {
            try {
              scannerRef.current.pause(true);
            } catch (e) {
              scannerRef.current.stop().catch(() => {});
            }
            setScanning(false);
          }

          // Fire API check-in immediately without hardware blocking delay
          handleQrCode(decodedText);
        },
        () => {} // Ignore scan failures while camera focuses
      );
    } catch (err) {
      console.error('Failed to start camera:', err);
      alert('Unable to access camera. Please grant permissions or try photo upload fallback.');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scanning) {
      try {
        await scannerRef.current.stop();
      } catch (e) {}
      setScanning(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setCheckingIn(true);
      const html5QrCode = new Html5Qrcode('qr-reader');
      const decodedText = await html5QrCode.scanFile(file, true);
      await handleQrCode(decodedText);
    } catch (err) {
      console.error('File scan error:', err);
      alert('Could not decode QR code from the selected photo. Please ensure the QR image is crisp and well-lit.');
      setCheckingIn(false);
    }
  };

  const handleQrCode = async (qrText: string) => {
    setCheckingIn(true);

    try {
      // Call the API to check in
      const response = await fetch('/api/attendance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrText, meetingId }),
      });

      const result = await response.json();

      if (result.success) {
        setLastResult({
          id: result.member.id,
          name: result.member.name,
          status: result.member.status,
          alreadyCheckedIn: result.alreadyCheckedIn || false,
          checkInTime: result.checkInTime,
        });

        // Update tracked members if newly checked in
        if (!result.alreadyCheckedIn) {
          setMembersWithStatus(prev => new Map(prev).set(result.member.id, true));
        }

        setCheckingIn(false);

        // Automatically resume camera scanner after 2 seconds for continuous check-ins
        setTimeout(() => {
          startScanner();
        }, 2000);
      } else {
        alert(result.error || 'Failed to check in member');
        setCheckingIn(false);
        // Restart scanner after error
        setTimeout(startScanner, 2000);
      }
    } catch (err) {
      console.error('Scan API error:', err);
      alert('Network error. Please try again.');
      setCheckingIn(false);
    }
  };

  const handleScanningComplete = () => {
    // After showing result, restart scanner for next member
    if (!scanning) {
      setTimeout(startScanner, 1000);
    }
  };

  return (
    <RegistrarShell title="QR Scan Check-In" subtitle={`Meeting: ${meetingInfo?.title || ''} • ${formatDisplayDate(meetingInfo?.date)}`}>
      <div className="space-y-6">
        {/* Scanner Section */}
        <div style={{ maxWidth: 500, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h2 style={{ color: 'var(--navy)', fontWeight: 800, fontSize: 24 }}>
              {scanning ? 'Scan Member QR Code' : checkingIn ? 'Checking In...' : 'Ready to Scan'}
            </h2>
          </div>

          {/* Scanner Camera View */}
          <div style={{
            background: '#1a1a2e',
            borderRadius: 16,
            padding: 20,
            marginBottom: 24,
            minHeight: 350,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div id="qr-reader" style={{ width: '100%', maxWidth: 400 }} />

            {scanning && (
              <div style={{ color: '#C9A84C', fontSize: 13, fontWeight: 700, marginTop: 12, textAlign: 'center', background: 'rgba(201, 168, 76, 0.1)', padding: '6px 14px', borderRadius: 20, border: '1px solid rgba(201, 168, 76, 0.3)' }}>
                🎯 Center & focus member QR code inside reticle
              </div>
            )}

            {!scanning && !checkingIn && (
              <div style={{ color: '#8892B0', fontSize: 16, textAlign: 'center' }}>
                Tap button below to start scanning
              </div>
            )}

            {checkingIn && (
              <div style={{ color: '#C9A84C', fontSize: 16, marginTop: 24 }}>
                Recording attendance...
              </div>
            )}
          </div>

          {/* Scan Buttons */}
          <div style={{ textAlign: 'center', marginBottom: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <input
              type="file"
              accept="image/*"
              id="qr-file-input"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />

            {!scanning ? (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  onClick={startScanner}
                  disabled={checkingIn}
                  style={{
                    background: '#C9A84C',
                    color: '#0A1628',
                    border: 'none',
                    padding: '16px 36px',
                    borderRadius: 100,
                    fontWeight: 800,
                    fontSize: 16,
                    cursor: checkingIn ? 'not-allowed' : 'pointer',
                    opacity: checkingIn ? 0.5 : 1,
                  }}
                >
                  📷 START LIVE SCAN
                </button>

                <button
                  onClick={() => document.getElementById('qr-file-input')?.click()}
                  disabled={checkingIn}
                  style={{
                    background: '#1E293B',
                    color: '#F8FAFC',
                    border: '1px solid #475569',
                    padding: '16px 28px',
                    borderRadius: 100,
                    fontWeight: 700,
                    fontSize: 16,
                    cursor: checkingIn ? 'not-allowed' : 'pointer',
                    opacity: checkingIn ? 0.5 : 1,
                  }}
                >
                  🖼️ UPLOAD QR PHOTO
                </button>
              </div>
            ) : (
              <button
                onClick={stopScanner}
                style={{
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  padding: '16px 48px',
                  borderRadius: 100,
                  fontWeight: 800,
                  fontSize: 18,
                  cursor: 'pointer',
                }}
              >
                STOP SCANNING
              </button>
            )}
          </div>

          {/* Last Scanned Result */}
          {lastResult && (
            <div style={{
              background: lastResult.alreadyCheckedIn ? '#fef3c7' : '#d1fae5',
              border: `2px solid ${lastResult.alreadyCheckedIn ? '#f59e0b' : '#10b981'}`,
              borderRadius: 16,
              padding: 24,
              marginBottom: 24,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 50, height: 50, borderRadius: 25, background: lastResult.alreadyCheckedIn ? '#f59e0b' : '#10b981',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 24
                }}>
                  {lastResult.alreadyCheckedIn ? '✓' : '+'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--navy)' }}>{lastResult.name}</div>
                  <div style={{ color: '#64748b', fontSize: 14 }}>
                    {lastResult.alreadyCheckedIn ? (
                      <>Already checked in at {new Date(lastResult.checkInTime!).toLocaleTimeString()}</>
                    ) : (
                      <>Checked in at {new Date().toLocaleTimeString()}</>
                    )}
                  </div>
                </div>
                {!scanning && (
                  <button
                    onClick={startScanner}
                    style={{
                      background: '#0F172A',
                      color: 'white',
                      border: 'none',
                      padding: '10px 18px',
                      borderRadius: 100,
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }}
                  >
                    📷 Scan Next
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Attendance Summary */}
        <div style={{ maxWidth: 500, margin: '0 auto' }}>
          <h3 style={{ color: 'var(--navy)', fontWeight: 700, marginBottom: 16 }}>Check-In Progress</h3>

          {(() => {
            const checkedCount = membersWithStatus.size;
            return (
              <div style={{
                background: '#f8fafc', borderRadius: 12, padding: 24, marginBottom: 16,
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: '#64748b' }}>Checked In</span>
                  <span style={{ fontWeight: 800, color: '#10b981' }}>{checkedCount}</span>
                </div>
              </div>
            );
          })()}

          {/* Member List */}
          <details style={{ background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <summary style={{ padding: 24, cursor: 'pointer', fontWeight: 600, color: 'var(--navy)' }}>
              View Full Member List
            </summary>
            <div style={{ padding: '0 24px 24px' }}>
              <table style={{ width: '100%', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ textAlign: 'left', padding: '8px 0', color: '#64748b' }}>Name</th>
                    <th style={{ width: 60, textAlign: 'center', color: '#64748b' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {commanderyMembers.length === 0 ? (
                    <tr>
                      <td colSpan={2} style={{ padding: 16, textAlign: 'center', color: '#64748b' }}>
                        Loading commandery member roster...
                      </td>
                    </tr>
                  ) : (
                    commanderyMembers.map((m) => {
                      const isCheckedIn = membersWithStatus.has(m.id);
                      return (
                        <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 0', fontWeight: 600, color: 'var(--navy)' }}>
                            {m.first_name} {m.surname}
                          </td>
                          <td style={{ textAlign: 'center', padding: '10px 0' }}>
                            {isCheckedIn ? (
                              <span style={{ color: '#10b981', fontWeight: 800, fontSize: 13 }}>✓ Checked In</span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: 12 }}>Absent</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </details>

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button
              onClick={() => router.push('/registrar/meetings')}
              style={{
                flex: 1, background: '#C9A84C', color: '#0A1628',
                border: 'none', padding: '14px', borderRadius: 12, fontWeight: 700, cursor: 'pointer'
              }}
            >
              Back to Meetings
            </button>
            <button
              onClick={handleDeleteMeeting}
              disabled={deleting}
              style={{
                background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5',
                padding: '14px 20px', borderRadius: 12, fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer'
              }}
            >
              {deleting ? 'Deleting...' : '🗑️ Delete Meeting'}
            </button>
          </div>
        </div>
      </div>

    </RegistrarShell>
  );
}
