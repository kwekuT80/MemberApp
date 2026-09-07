'use client';

import React, { useState } from 'react';
import { sendSingleMemberStatement } from '@/services/communicationService';

interface MemberStatementActionButtonProps {
  memberId: string;
  memberName: string;
  phone?: string;
  email?: string;
  disabled?: boolean;
}

export default function MemberStatementActionButton({
  memberId,
  memberName,
  phone,
  email,
  disabled = false,
}: MemberStatementActionButtonProps) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSend = async (channel: 'sms' | 'email') => {
    if (loading) return;
    setLoading(true);
    setFeedback(null);

    try {
      const res = await sendSingleMemberStatement({
        memberId,
        channel,
      });

      setFeedback(`✅ ${res.message || 'Sent'}`);
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback(`❌ ${err.message || 'Failed to send'}`);
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setLoading(false);
    }
  };

  if (disabled) return null;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, position: 'relative' }}>
      <button
        type="button"
        title={phone ? `Send SMS Statement to ${phone}` : 'No phone number on file'}
        onClick={() => handleSend('sms')}
        disabled={loading || !phone}
        style={{
          padding: '6px 10px',
          fontSize: 11,
          fontWeight: 700,
          borderRadius: 6,
          border: '1px solid #C9A84C',
          background: '#fffdf7',
          color: '#0A1628',
          cursor: loading || !phone ? 'not-allowed' : 'pointer',
          opacity: !phone ? 0.4 : 1,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          transition: 'all 0.15s ease',
        }}
      >
        💬 {loading ? '…' : 'SMS'}
      </button>

      {email && (
        <button
          type="button"
          title={`Send Email Statement to ${email}`}
          onClick={() => handleSend('email')}
          disabled={loading}
          style={{
            padding: '6px 10px',
            fontSize: 11,
            fontWeight: 700,
            borderRadius: 6,
            border: '1px solid #cbd5e1',
            background: '#f8fafc',
            color: '#475569',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            transition: 'all 0.15s ease',
          }}
        >
          ✉️ {loading ? '…' : 'Email'}
        </button>
      )}

      {feedback && (
        <span
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: 4,
            whiteSpace: 'nowrap',
            background: '#0A1628',
            color: '#ffffff',
            fontSize: 11,
            fontWeight: 600,
            padding: '4px 8px',
            borderRadius: 6,
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.2)',
            zIndex: 10,
          }}
        >
          {feedback}
        </span>
      )}
    </div>
  );
}
