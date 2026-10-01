'use client';

import React, { useState, useEffect } from 'react';
import { broadcastMeetingNotice } from '@/services/communicationService';
import { formatDisplayDate, formatDisplayTime } from '@/lib/utils/ksji-logic';

interface MeetingNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: any;
  activeCount?: number;
  unconfirmedCount?: number;
}

export default function MeetingNoticeModal({
  isOpen,
  onClose,
  meeting,
  activeCount = 0,
  unconfirmedCount = 0,
}: MeetingNoticeModalProps) {
  const [channel, setChannel] = useState<'sms' | 'email' | 'both'>('sms');
  const [target, setTarget] = useState<'all_active' | 'unconfirmed_only'>('all_active');
  const [time, setTime] = useState(() => formatDisplayTime(meeting?.date) || '8:00 AM');
  const [uniform, setUniform] = useState('Meeting Uniform');
  const [specialNote, setSpecialNote] = useState('Brothers are kindly requested to be punctual.');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; totalQueued?: number } | null>(null);

  useEffect(() => {
    if (meeting?.date) {
      setTime(formatDisplayTime(meeting.date) || '8:00 AM');
    }
  }, [meeting?.date]);

  if (!isOpen || !meeting) return null;

  const recipientCount = target === 'all_active' ? activeCount : unconfirmedCount;
  const estimatedSmsMinutes = Math.ceil(recipientCount / 3);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setResult(null);

    try {
      const res = await broadcastMeetingNotice({
        meetingId: meeting.id,
        channel,
        target,
        meetingTime: time.trim() || undefined,
        uniform: uniform.trim() || undefined,
        specialNote: specialNote.trim() || undefined,
      });

      setResult({
        success: res.success,
        message: res.message,
        totalQueued: res.totalQueued,
      });
    } catch (err: any) {
      setResult({
        success: false,
        message: err.message || 'Failed to dispatch meeting broadcast',
      });
    } finally {
      setSending(false);
    }
  };

  return (
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
          maxWidth: 620,
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            background: 'linear-gradient(135deg, #0A1628 0%, #1e293b 100%)',
            color: '#ffffff',
            borderRadius: '16px 16px 0 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#C9A84C' }}>
              📢 Dispatch Meeting Notice & Reminders
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#94a3b8' }}>
              {meeting.title} • {formatDisplayDate(meeting.date)}{time ? ` at ${time}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: 22,
              cursor: 'pointer',
              lineHeight: 1,
              padding: 4,
            }}
          >
            &times;
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSend} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Channel Selection */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
              Communication Channel
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                { id: 'sms', label: '💬 Cellular SMS', desc: 'Via Phone (SIM 1)' },
                { id: 'email', label: '✉️ Email Notice', desc: 'HTML & Plaintext' },
                { id: 'both', label: '📲 Both (SMS + Email)', desc: 'Full Coverage' },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setChannel(opt.id as any)}
                  style={{
                    padding: '12px 10px',
                    borderRadius: 10,
                    border: channel === opt.id ? '2px solid #C9A84C' : '1px solid #e2e8f0',
                    background: channel === opt.id ? '#fffdf7' : '#f8fafc',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: 13, color: channel === opt.id ? '#0A1628' : '#475569' }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Target Audience */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
              Target Recipients
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                type="button"
                onClick={() => setTarget('all_active')}
                style={{
                  padding: '12px',
                  borderRadius: 10,
                  border: target === 'all_active' ? '2px solid #C9A84C' : '1px solid #e2e8f0',
                  background: target === 'all_active' ? '#fffdf7' : '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 13, color: target === 'all_active' ? '#0A1628' : '#475569' }}>
                  👥 All Active Brothers
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  {activeCount > 0 ? `${activeCount} members on roll` : 'Complete active Commandery roll'}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTarget('unconfirmed_only')}
                style={{
                  padding: '12px',
                  borderRadius: 10,
                  border: target === 'unconfirmed_only' ? '2px solid #C9A84C' : '1px solid #e2e8f0',
                  background: target === 'unconfirmed_only' ? '#fffdf7' : '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 13, color: target === 'unconfirmed_only' ? '#0A1628' : '#475569' }}>
                  ⏳ Unconfirmed Only
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  {unconfirmedCount > 0 ? `${unconfirmedCount} yet to check in` : 'Excludes already checked-in'}
                </div>
              </button>
            </div>
          </div>

          {/* Meeting Schedule & Time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                📅 Scheduled Date
              </label>
              <div
                style={{
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#0A1628',
                }}
              >
                {formatDisplayDate(meeting.date)}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                ⏰ Meeting Time
              </label>
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="e.g. 8:00 AM or 8:00 AM Prompt"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  outline: 'none',
                  color: '#0A1628',
                  fontWeight: 600,
                }}
              />
            </div>
          </div>

          {/* Uniform Specification */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                Prescribed Uniform
              </label>
              <span style={{ fontSize: 11, color: '#64748b' }}>Select option</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 8 }}>
              {[
                { label: 'Meeting Uniform', desc: 'Standard Attire (Default)' },
                { label: 'Sash & Cap', desc: 'Prescribed Ceremonial' },
                { label: 'Full Military', desc: 'Full Military Turnout' },
              ].map((opt) => {
                const isSelected = uniform === opt.label;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setUniform(opt.label)}
                    style={{
                      padding: '10px 8px',
                      borderRadius: 8,
                      border: isSelected ? '2px solid #C9A84C' : '1px solid #cbd5e1',
                      background: isSelected ? 'rgba(201, 168, 76, 0.12)' : '#ffffff',
                      color: isSelected ? '#0A1628' : '#475569',
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2,
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 1px 4px rgba(201, 168, 76, 0.2)' : 'none',
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: 12.5 }}>
                      {isSelected ? '✓ ' : ''}{opt.label}
                    </span>
                    <span style={{ fontSize: 10, color: isSelected ? '#856404' : '#94a3b8', textAlign: 'center' }}>
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>

            <input
              type="text"
              value={uniform}
              onChange={(e) => setUniform(e.target.value)}
              placeholder="Or specify custom uniform requirements"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 12.5,
                outline: 'none',
                color: '#334155',
              }}
            />
          </div>

          {/* Special Instructions / Note */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
              Special Note / Instructions (Optional)
            </label>
            <textarea
              rows={2}
              value={specialNote}
              onChange={(e) => setSpecialNote(e.target.value)}
              placeholder="e.g. Brothers are kindly requested to be punctual."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Queue Pacing & Rate Limit Badge */}
          {(channel === 'sms' || channel === 'both') && (
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
              }}
            >
              <span style={{ fontSize: 18 }}>⏱️</span>
              <div style={{ fontSize: 12, color: '#1e40af', lineHeight: 1.4 }}>
                <strong>Queue Rate Limiter Active:</strong> Outbound SMS messages are queued safely at{' '}
                <strong>3 messages per minute</strong> (1 message every 20 seconds) via SIM 1 (+233246258166).{' '}
                {recipientCount > 0 && (
                  <span>
                    Estimated dispatch duration: ~{estimatedSmsMinutes} {estimatedSmsMinutes === 1 ? 'minute' : 'minutes'} for {recipientCount} brothers.
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Live Preview Snippet */}
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: '#f8fafc',
              border: '1px dashed #cbd5e1',
              fontSize: 12,
              color: '#334155',
            }}
          >
            <div style={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', fontSize: 10, marginBottom: 4 }}>
              Preview Snippet (SMS / Email)
            </div>
            <div>
              &ldquo;KSJI Notice: Dear [Brother Name], you are invited to {meeting.title} on {formatDisplayDate(meeting.date)}{time ? ` at ${time}` : ''} at {meeting.location_name || 'Commandery Hall'}.
              {uniform ? ` Uniform: ${uniform}.` : ''}
              {specialNote ? ` Note: ${specialNote}` : ''} Fraternally, KSJI 500.&rdquo;
            </div>
          </div>

          {/* Result Banner */}
          {result && (
            <div
              style={{
                padding: 14,
                borderRadius: 8,
                background: result.success ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${result.success ? '#86efac' : '#fca5a5'}`,
                color: result.success ? '#166534' : '#991b1b',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {result.success ? '✅ ' : '❌ '} {result.message}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              style={{
                padding: '10px 18px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {result?.success ? 'Close' : 'Cancel'}
            </button>

            <button
              type="submit"
              disabled={sending}
              style={{
                padding: '10px 22px',
                borderRadius: 8,
                border: 'none',
                background: sending ? '#94a3b8' : 'linear-gradient(135deg, #C9A84C 0%, #b3923b 100%)',
                color: '#0A1628',
                fontSize: 13,
                fontWeight: 800,
                cursor: sending ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 6px -1px rgba(201, 168, 76, 0.3)',
              }}
            >
              {sending ? '⏳ Queuing Broadcast…' : '🚀 Enqueue & Dispatch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
