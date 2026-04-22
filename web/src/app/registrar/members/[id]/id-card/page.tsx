'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Member } from '@/types/member';

export default function IDCardPage() {
  const { id } = useParams();
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from('members').select('*').eq('id', id).single();
      if (!error) setMember(data);
      setLoading(false);
    }
    load();
  }, [id, supabase]);

  if (loading) return <div style={{ padding: 100, textAlign: 'center' }}>Loading ID Card...</div>;
  if (!member) return <div style={{ padding: 100, textAlign: 'center' }}>Record not found.</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#0A1628', padding: '40px 20px', color: 'white', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 400, margin: '0 auto' }}>
        <button 
          onClick={() => router.back()} 
          style={{ background: 'none', border: 'none', color: '#C9A84C', fontWeight: 800, cursor: 'pointer', marginBottom: 20 }}
          className="no-print"
        >
          ‹ BACK TO PROFILE
        </button>

        <div style={{ 
          background: '#132135', 
          borderRadius: 24, 
          padding: 32, 
          border: '3px solid #C9A84C', 
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Card Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40, position: 'relative', zIndex: 2 }}>
            <div>
              <div style={{ color: '#C9A84C', fontWeight: 900, letterSpacing: 1, fontSize: 14 }}>K.S.J.I REGISTRAR SUITE</div>
              <div style={{ color: '#8892B0', fontSize: 10, fontWeight: 700 }}>Official Membership Record</div>
            </div>
            <div style={{ background: 'white', borderRadius: '50%', padding: 4, width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <img src="/logo.png" alt="Logo" style={{ width: '90%', height: '90%', objectFit: 'contain' }} />
            </div>
          </div>

          {/* Member Photo */}
          <div style={{ textAlign: 'center', marginBottom: 24, position: 'relative', zIndex: 2 }}>
            <div style={{ 
              width: 160, 
              height: 180, 
              background: '#eee', 
              margin: '0 auto', 
              borderRadius: 12, 
              border: '4px solid #C9A84C',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {member.photo_url ? (
                <img src={member.photo_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ color: '#aaa', fontWeight: 800 }}>NO PHOTO</span>
              )}
            </div>
          </div>

          {/* Member Info */}
          <div style={{ textAlign: 'center', marginBottom: 32, position: 'relative', zIndex: 2 }}>
            <div style={{ color: '#C9A84C', fontWeight: 800, fontSize: 14 }}>{member.title || 'Bro.'}</div>
            <div style={{ fontSize: 32, fontWeight: 900, textTransform: 'uppercase' }}>{member.surname}</div>
            <div style={{ color: '#CCD6F6', fontSize: 18, fontWeight: 600 }}>{member.first_name} {member.other_names || ''}</div>
            
            <div style={{ 
              marginTop: 20, 
              display: 'inline-block', 
              background: 'rgba(255,255,255,0.05)', 
              padding: '8px 24px', 
              borderRadius: 100,
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{ color: '#8892B0', fontSize: 10, fontWeight: 800 }}>STATUS</div>
              <div style={{ fontWeight: 900, fontSize: 16 }}>{member.status?.toUpperCase() || 'ACTIVE'}</div>
            </div>
          </div>

          {/* Card Footer */}
          <div style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 24, position: 'relative', zIndex: 2 }}>
            <div style={{ width: 100, textAlign: 'center' }}>
              <div style={{ background: 'white', padding: 8, borderRadius: 8, width: 85, height: 85, margin: '0 auto' }}>
                <img 
                  src={`https://quickchart.io/qr?text=${encodeURIComponent('KSJI:MEMBER:' + member.id)}&size=150&margin=1`} 
                  alt="QR Code" 
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
              <div style={{ color: '#8892B0', fontSize: 8, fontWeight: 800, marginTop: 8 }}>SCAN TO VERIFY</div>
            </div>
            
            <div style={{ flex: 1, paddingLeft: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ color: '#8892B0', fontSize: 9, fontWeight: 800 }}>ID NUMBER</div>
              <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700 }}>KSJI-{member.id?.slice(0,8).toUpperCase()}</div>
              
              <div style={{ color: '#8892B0', fontSize: 9, fontWeight: 800, marginTop: 12 }}>JOINED</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{member.date_joined || '---'}</div>
            </div>
          </div>

          {/* Decorative Elements */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 100, background: 'rgba(201, 168, 76, 0.05)', pointerEvents: 'none' }} />
        </div>

        <div style={{ marginTop: 40, textAlign: 'center' }} className="no-print">
          <button 
            onClick={() => window.print()} 
            style={{ 
              background: '#C9A84C', 
              color: '#0A1628', 
              border: 'none', 
              padding: '12px 32px', 
              borderRadius: 100, 
              fontWeight: 800, 
              cursor: 'pointer' 
            }}
          >
            PRINT PHYSICAL CARD
          </button>
        </div>
      </div>
    </div>
  );
}
