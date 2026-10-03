'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Member } from '@/types/member';
import { 
  formatMemberTitle, 
  getOfficialDegreeDetail, 
  getLeadershipOfficeSummary, 
  formatDisplayDate 
} from '@/lib/utils/ksji-logic';

export default function IDCardPage() {
  const { id } = useParams();
  const router = useRouter();
  const [member, setMember] = useState<(Member & { degrees?: any[]; positions?: any[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('members')
        .select('*, degrees(*), positions(*)')
        .eq('id', id)
        .single();
      if (!error && data) setMember(data);
      setLoading(false);
    }
    load();
  }, [id, supabase]);

  if (loading) return <div style={{ padding: 100, textAlign: 'center', color: '#C9A84C' }}>Loading ID Card...</div>;
  if (!member) return <div style={{ padding: 100, textAlign: 'center', color: '#fff' }}>Record not found.</div>;

  const degreeDetail = getOfficialDegreeDetail(member.degrees);
  const leadership = getLeadershipOfficeSummary(member.positions);
  const title = formatMemberTitle(member.title, member.degrees);
  const isDeceased = member.is_deceased === true || String(member.status || '').toLowerCase() === 'deceased';
  const isActive = String(member.status || '').toLowerCase() === 'active';

  const shortCode = `KSJI-${member.id?.slice(0, 8).toUpperCase()}`;
  const verifyTarget = typeof window !== 'undefined'
    ? `${window.location.origin}/verify/${member.id}`
    : `https://ksji-members.vercel.app/verify/${member.id}`;
  const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(verifyTarget)}&size=300&margin=1&ecLevel=Q`;

  return (
    <div style={{ minHeight: '100vh', background: '#0A1628', padding: '40px 20px', color: 'white', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <button 
          onClick={() => router.back()} 
          style={{ background: 'none', border: 'none', color: '#C9A84C', fontWeight: 800, cursor: 'pointer', marginBottom: 20 }}
          className="no-print"
        >
          ‹ BACK TO PROFILE
        </button>

        <div style={{ 
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', 
          borderRadius: 24, 
          padding: 30, 
          border: '2px solid #C9A84C', 
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Card Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, position: 'relative', zIndex: 2 }}>
            <div>
              <div style={{ color: '#C9A84C', fontWeight: 900, letterSpacing: 1, fontSize: 13 }}>K.S.J.I REGISTRAR SUITE</div>
              <div style={{ color: '#8892B0', fontSize: 10, fontWeight: 700 }}>Commandery #500 Official Credential</div>
            </div>
            <div 
              style={{ 
                background: isDeceased ? '#312e81' : isActive ? '#059669' : '#b45309', 
                borderRadius: 8, 
                padding: '4px 8px', 
                color: '#ffffff', 
                fontWeight: 800, 
                fontSize: 10,
                letterSpacing: '0.4px',
                textTransform: 'uppercase'
              }}
            >
              {isDeceased ? '🕊️ ROLL OF HONOUR' : isActive ? '✓ GOOD STANDING' : member.status}
            </div>
          </div>

          {/* Member Photo */}
          <div style={{ textAlign: 'center', marginBottom: 20, position: 'relative', zIndex: 2 }}>
            <div style={{ 
              width: 140, 
              height: 160, 
              background: '#334155', 
              margin: '0 auto', 
              borderRadius: 14, 
              border: '3px solid #C9A84C',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {member.photo_url ? (
                <img src={member.photo_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ color: '#aaa', fontWeight: 800, fontSize: 44 }}>👤</span>
              )}
            </div>
          </div>

          {/* Member Info */}
          <div style={{ textAlign: 'center', marginBottom: 24, position: 'relative', zIndex: 2 }}>
            <div style={{ color: '#C9A84C', fontWeight: 800, fontSize: 13 }}>{title}</div>
            <div style={{ fontSize: 26, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.3px', color: '#ffffff' }}>
              {member.surname}
            </div>
            <div style={{ color: '#CCD6F6', fontSize: 16, fontWeight: 600 }}>
              {member.first_name} {member.other_names || ''}
            </div>
            
            {/* Degree & Leadership Badges */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
              <span style={{ fontSize: 10.5, background: 'rgba(201, 168, 76, 0.2)', border: '1px solid #C9A84C', padding: '3px 8px', borderRadius: 999, color: '#FCD34D', fontWeight: 700 }}>
                {degreeDetail.icon} {degreeDetail.badgeLabel}
              </span>
              {leadership.isPastPresident && (
                <span style={{ fontSize: 10.5, background: 'rgba(168, 85, 247, 0.2)', border: '1px solid #c084fc', padding: '3px 8px', borderRadius: 999, color: '#e9d5ff', fontWeight: 700 }}>
                  👑 PWP
                </span>
              )}
              {leadership.activeOffice && (
                <span style={{ fontSize: 10.5, background: 'rgba(59, 130, 246, 0.2)', border: '1px solid #60a5fa', padding: '3px 8px', borderRadius: 999, color: '#bfdbfe', fontWeight: 700 }}>
                  ⚔️ {leadership.activeOffice}
                </span>
              )}
            </div>
          </div>

          {/* Card Footer with QR */}
          <div style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 18, position: 'relative', zIndex: 2, alignItems: 'center' }}>
            <div style={{ width: 85, textAlign: 'center' }}>
              <div style={{ background: 'white', padding: 4, borderRadius: 8, width: 75, height: 75, margin: '0 auto' }}>
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code" 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
              <div style={{ color: '#8892B0', fontSize: 8, fontWeight: 800, marginTop: 4 }}>SCAN TO VERIFY</div>
            </div>
            
            <div style={{ flex: 1, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div>
                <div style={{ color: '#8892B0', fontSize: 8.5, fontWeight: 800 }}>ID NUMBER</div>
                <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#FCD34D' }}>{shortCode}</div>
              </div>
              <div>
                <div style={{ color: '#8892B0', fontSize: 8.5, fontWeight: 800 }}>MEMBER SINCE</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#CCD6F6' }}>{formatDisplayDate(member.date_joined)}</div>
              </div>
            </div>
          </div>

          {/* Decorative Elements */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 80, background: 'rgba(201, 168, 76, 0.05)', pointerEvents: 'none' }} />
        </div>

        <div style={{ marginTop: 24, textAlign: 'center' }} className="no-print">
          <button 
            onClick={() => window.print()} 
            style={{ 
              background: '#C9A84C', 
              color: '#0A1628', 
              border: 'none', 
              padding: '12px 32px', 
              borderRadius: 100, 
              fontWeight: 800, 
              fontSize: 13,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(201, 168, 76, 0.3)',
            }}
          >
            PRINT PHYSICAL CARD
          </button>
        </div>
      </div>
    </div>
  );
}
