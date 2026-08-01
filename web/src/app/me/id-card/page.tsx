import React from 'react';
import Link from 'next/link';
import { requireUser } from '@/lib/auth/requireUser';
import { getMyMember } from '@/services/memberService';
import MemberShell from '@/components/layout/MemberShell';

export default async function MyIDCardPage() {
  await requireUser();
  const member = await getMyMember();

  if (!member) {
    return (
      <MemberShell title="Digital ID Card" subtitle="Your official KSJI membership credential.">
        <div style={{ padding: 40, textAlign: 'center' }}>Member record not found.</div>
      </MemberShell>
    );
  }

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
    JSON.stringify({ id: member.id, name: `${member.first_name} ${member.surname}`, number: member.member_number || 'N/A' })
  )}`;

  return (
    <MemberShell title="Digital ID Card" subtitle="Your official digital membership card and QR credential.">
      <div style={{ padding: '20px 0', maxWidth: 420, margin: '0 auto' }}>
        <div 
          style={{ 
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', 
            borderRadius: 24, 
            padding: 28, 
            border: '2px solid #D4AF37', 
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            color: 'white',
            fontFamily: 'Inter, sans-serif',
            position: 'relative'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid rgba(212, 175, 55, 0.3)', paddingBottom: 12 }}>
            <div>
              <div style={{ color: '#D4AF37', fontWeight: 900, fontSize: 13, letterSpacing: 1 }}>KSJI COMMANDERY</div>
              <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600 }}>Official Digital ID Card</div>
            </div>
            <div style={{ background: '#ffffff', borderRadius: 8, padding: '4px 8px', color: '#0f172a', fontWeight: 800, fontSize: 11 }}>
              ACTIVE
            </div>
          </div>

          {/* Body */}
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 20 }}>
            <div style={{ width: 90, height: 110, borderRadius: 12, background: '#334155', overflow: 'hidden', border: '2px solid #D4AF37', flexShrink: 0 }}>
              {member.photo_url ? (
                <img src={member.photo_url} alt={member.surname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: '#94a3b8' }}>
                  👤
                </div>
              )}
            </div>

            <div>
              <div style={{ color: '#D4AF37', fontSize: 12, fontWeight: 700 }}>{member.title || 'Noble Brother'}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#f8fafc', lineHeight: 1.2 }}>{member.first_name} {member.surname}</div>
              <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 4 }}>ID: <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{member.member_number || member.id?.substring(0, 8)}</span></div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Rank: {member.rank || 'Member'}</div>
            </div>
          </div>

          {/* QR Code section */}
          <div style={{ background: '#ffffff', borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
            <img src={qrCodeUrl} alt="ID QR Code" style={{ width: 80, height: 80, borderRadius: 8 }} />
            <div>
              <div style={{ color: '#0f172a', fontWeight: 800, fontSize: 12 }}>Scan for Verification</div>
              <div style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>Contains encrypted member security token for event check-in.</div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <button 
            onClick={() => window.print()}
            style={{
              background: '#D4AF37',
              color: '#0f172a',
              border: 'none',
              padding: '10px 24px',
              borderRadius: 12,
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            🖨️ Print ID Card
          </button>
        </div>
      </div>
    </MemberShell>
  );
}
