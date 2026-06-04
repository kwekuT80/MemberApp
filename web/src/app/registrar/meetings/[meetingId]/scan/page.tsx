'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import RegistrarShell from '@/components/layout/RegistrarShell';
import Html5Qrcode from 'html5-qrcode';

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

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const cameraIdRef = useRef<string>('');

  useEffect(() => {
    // Load meeting info and track which members are already checked in
    async function loadData() {
      try {
        const { data: meetings } = await supabase
          .from('meetings')
          .select('*')
          .eq('id', meetingId)
          .single();

        if (meetings) {
          setMeetingInfo({ title: meetings.title, date: meetings.date });
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

      scannerRef.current = new Html5Qrcode('qr-reader');

      await scannerRef.current.start(
        cameraIdRef.current,
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          // Stop scanning once we detect a QR code to avoid double reads
          if (scannerRef.current && scanning) {
            await scannerRef.current.stop();
            setScanning(false);
          }

          // Parse and check in the member
          handleQrCode(decodedText);
        },
        () => {} // Ignore scan failures (no QR detected)
      );
    } catch (err) {
      console.error('Failed to start camera:', err);
      alert('Unable to access camera. Please grant permissions.');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scanning) {
      await scannerRef.current.stop();
      setScanning(false);
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
      } else {
        alert(result.error || 'Failed to check in member');
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
    <RegistrarShell title="QR Scan Check-In" subtitle={`Meeting: ${meetingInfo?.title || ''} • ${meetingInfo?.date || ''}`}>
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

          {/* Scan Button */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            {!scanning ? (
              <button
                onClick={startScanner}
                disabled={checkingIn}
                style={{
                  background: '#C9A84C',
                  color: '#0A1628',
                  border: 'none',
                  padding: '16px 48px',
                  borderRadius: 100,
                  fontWeight: 800,
                  fontSize: 18,
                  cursor: checkingIn ? 'not-allowed' : 'pointer',
                  opacity: checkingIn ? 0.5 : 1,
                }}
              >
                START SCANNING
              </button>
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
                  {/* Members would be loaded here - simplified for initial version */}
                  <tr>
                    <td colSpan={2} style={{ padding: 16, textAlign: 'center', color: '#64748b' }}>
                      Member list requires commandery assignment
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </details>

          <button
            onClick={() => router.push('/registrar/meetings')}
            style={{
              width: '100%', marginTop: 24, background: '#C9A84C', color: '#0A1628',
              border: 'none', padding: '14px', borderRadius: 12, fontWeight: 700, cursor: 'pointer'
            }}
          >
            Back to Meetings
          </button>
        </div>
      </div>

    </RegistrarShell>
  );
}
