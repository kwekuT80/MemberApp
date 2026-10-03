'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import MemberShell from '@/components/layout/MemberShell';
import { Member } from '@/types/member';
import { 
  formatMemberTitle, 
  getOfficialDegreeDetail, 
  getLeadershipOfficeSummary, 
  formatDisplayDate 
} from '@/lib/utils/ksji-logic';

export default function MyIDCardPage() {
  const [member, setMember] = useState<(Member & { degrees?: any[]; positions?: any[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('member_id')
            .eq('id', user.id)
            .maybeSingle();

          if (profile?.member_id) {
            const { data } = await supabase
              .from('members')
              .select('*, degrees(*), positions(*)')
              .eq('id', profile.member_id)
              .maybeSingle();
            if (data) setMember(data);
          } else {
            const { data } = await supabase
              .from('members')
              .select('*, degrees(*), positions(*)')
              .eq('user_id', user.id)
              .limit(1);
            if (data && data.length > 0) setMember(data[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load member ID card:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <MemberShell title="Digital ID Card" subtitle="Your official KSJI membership credential.">
        <div style={{ padding: 60, textAlign: 'center', color: '#64748B' }}>Loading Digital ID Card...</div>
      </MemberShell>
    );
  }

  if (!member) {
    return (
      <MemberShell title="Digital ID Card" subtitle="Your official KSJI membership credential.">
        <div style={{ padding: 40, textAlign: 'center' }}>Member record not found.</div>
      </MemberShell>
    );
  }

  const degreeDetail = getOfficialDegreeDetail(member.degrees);
  const leadership = getLeadershipOfficeSummary(member.positions);
  const title = formatMemberTitle(member.title, member.degrees);

  const isDeceased = member.is_deceased === true || String(member.status || '').toLowerCase() === 'deceased';
  const isActive = String(member.status || '').toLowerCase() === 'active';

  const verifyTarget = typeof window !== 'undefined' 
    ? `${window.location.origin}/verify/${member.id}` 
    : `https://ksji-members.vercel.app/verify/${member.id}`;
  const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(verifyTarget)}&size=300&margin=1&ecLevel=Q`;

  return (
    <MemberShell title="Digital ID Card" subtitle="Your official digital membership card and QR credential.">
      <div style={{ padding: '20px 0', maxWidth: 440, margin: '0 auto' }}>
        <div 
          style={{ 
            background: 'linear-gradient(135deg, #0A1628 0%, #1e293b 100%)', 
            borderRadius: 24, 
            padding: 28, 
            border: '2px solid #C9A84C', 
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            color: 'white',
            fontFamily: 'Inter, sans-serif',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid rgba(201, 168, 76, 0.3)', paddingBottom: 12 }}>
            <div>
              <div style={{ color: '#C9A84C', fontWeight: 900, fontSize: 13, letterSpacing: 1 }}>KSJI COMMANDERY #500</div>
              <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600 }}>Official Digital ID & QR Credential</div>
            </div>
            <div 
              style={{ 
                background: isDeceased ? '#312e81' : isActive ? '#10b981' : '#f59e0b', 
                borderRadius: 8, 
                padding: '4px 10px', 
                color: '#ffffff', 
                fontWeight: 800, 
                fontSize: 10.5,
                letterSpacing: '0.5px',
                textTransform: 'uppercase'
              }}
            >
              {isDeceased ? '🕊️ ROLL OF HONOUR' : isActive ? '✓ GOOD STANDING' : member.status}
            </div>
          </div>

          {/* Body */}
          <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginBottom: 20 }}>
            <div style={{ width: 92, height: 112, borderRadius: 12, background: '#334155', overflow: 'hidden', border: '2px solid #C9A84C', flexShrink: 0 }}>
              {member.photo_url ? (
                <img src={member.photo_url ?? undefined} alt={member.surname ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: '#94a3b8' }}>
                  👤
                </div>
              )}
            </div>

            <div>
              <div style={{ color: '#C9A84C', fontSize: 12, fontWeight: 700 }}>{title}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#f8fafc', lineHeight: 1.2 }}>
                {member.first_name} {member.surname}
              </div>
              <div style={{ fontSize: 11.5, color: '#cbd5e1', marginTop: 4 }}>
                ID: <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#FCD34D' }}>KSJI-{member.id?.slice(0, 8).toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                <span style={{ fontSize: 10, background: 'rgba(201, 168, 76, 0.2)', border: '1px solid #C9A84C', padding: '2px 8px', borderRadius: 999, color: '#FCD34D', fontWeight: 700 }}>
                  {degreeDetail.icon} {degreeDetail.badgeLabel}
                </span>
                {leadership.isPastPresident && (
                  <span style={{ fontSize: 10, background: 'rgba(168, 85, 247, 0.2)', border: '1px solid #c084fc', padding: '2px 8px', borderRadius: 999, color: '#e9d5ff', fontWeight: 700 }}>
                    👑 PWP
                  </span>
                )}
                {leadership.activeOffice && (
                  <span style={{ fontSize: 10, background: 'rgba(59, 130, 246, 0.2)', border: '1px solid #60a5fa', padding: '2px 8px', borderRadius: 999, color: '#bfdbfe', fontWeight: 700 }}>
                    ⚔️ {leadership.activeOffice}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* QR Code section */}
          <div style={{ background: '#ffffff', borderRadius: 16, padding: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
            <img src={qrCodeUrl} alt="ID QR Code" style={{ width: 80, height: 80, borderRadius: 8, border: '1px solid #e2e8f0' }} />
            <div>
              <div style={{ color: '#0A1628', fontWeight: 900, fontSize: 12 }}>Official QR Public Verification</div>
              <div style={{ color: '#64748b', fontSize: 10.5, marginTop: 2, lineHeight: 1.4 }}>
                Scan to verify fraternal standing, official degree elevation, and executive appointments.
              </div>
              <div style={{ fontSize: 9.5, color: '#94a3b8', marginTop: 4 }}>
                Member Since: {formatDisplayDate(member.date_joined)}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <button 
            onClick={() => window.print()}
            style={{
              background: '#C9A84C',
              color: '#0A1628',
              border: 'none',
              padding: '10px 24px',
              borderRadius: 12,
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(201, 168, 76, 0.3)',
            }}
          >
            🖨️ Print ID Card
          </button>
        </div>
      </div>
    </MemberShell>
  );
}
