'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatMemberTitle, formatDisplayDate } from '@/lib/utils/ksji-logic';

export default function VerificationPage() {
  const { id } = useParams();
  const [member, setMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Use client-side supabase for public read if policies allow
      const supabase = createClient();
      const { data } = await supabase
        .from('members')
        .select('*, degrees(*), positions(*)')
        .eq('id', id)
        .single();
      
      if (data) setMember(data);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <div style={container}><div style={card}>Loading Verification Data...</div></div>;
  if (!member) return <div style={container}><div style={card}><h3>Invalid ID</h3><p>This membership record could not be verified.</p></div></div>;

  const displayTitle = formatMemberTitle(member.title);
  const fullName = `${displayTitle} ${member.first_name} ${member.surname}`.toUpperCase();
  const isActive = member.status === 'Active';
  
  // Find highest degree
  const degrees = member.degrees || [];
  const has5th = degrees.some((d: any) => d.degree_type?.toLowerCase().includes('5th') || d.degree_type?.toLowerCase().includes('fifth'));
  const has4th = degrees.some((d: any) => d.degree_type?.toLowerCase().includes('4th') || d.degree_type?.toLowerCase().includes('fourth'));
  
  let rank = 'Brother';
  if (has5th) rank = 'Noble Brother';
  else if (has4th) rank = 'Chevalier';

  return (
    <div style={container}>
      <div style={card}>
        <div style={badgeHeader}>
          <div style={logo}>KSJI</div>
          <div style={headerText}>OFFICIAL VERIFICATION</div>
        </div>

        <div style={photoWrap}>
          {member.photo_url ? (
            <img src={member.photo_url} alt="Portrait" style={photo} />
          ) : (
            <div style={photoPlaceholder}>👤</div>
          )}
        </div>

        <h1 style={name}>{fullName}</h1>
        <div style={rankTag}>{rank.toUpperCase()}</div>

        <div style={divider} />

        <div style={statusGrid}>
          <div style={statusItem}>
            <div style={label}>Status</div>
            <div style={{ ...statusValue, color: isActive ? '#1f6f43' : '#a02020' }}>
              {isActive ? '✓ ACTIVE' : '⚠ ' + (member.status || 'INACTIVE').toUpperCase()}
            </div>
          </div>
          <div style={statusItem}>
            <div style={label}>Member Since</div>
            <div style={statusValue}>{formatDisplayDate(member.date_joined)}</div>
          </div>
        </div>

        <div style={footer}>
          Verified by KSJI Registrar Suite<br />
          {new Date().toLocaleString()}
        </div>
      </div>
      
      <div style={branding}>
        Knights of St. John International
      </div>
    </div>
  );
}

const container: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: '#10233f',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px',
  fontFamily: 'system-ui, -apple-system, sans-serif',
};

const card: React.CSSProperties = {
  backgroundColor: '#fff',
  width: '100%',
  maxWidth: '400px',
  borderRadius: '24px',
  padding: '40px',
  boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
  textAlign: 'center',
  border: '1px solid #d4af37',
};

const badgeHeader: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  marginBottom: '30px',
};

const logo: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: '900',
  color: '#d4af37',
  letterSpacing: '2px',
};

const headerText: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: '700',
  color: '#a0aec0',
  marginTop: '4px',
  letterSpacing: '1px',
};

const photoWrap: React.CSSProperties = {
  width: '150px',
  height: '150px',
  borderRadius: '75px',
  border: '4px solid #d4af37',
  margin: '0 auto 24px',
  overflow: 'hidden',
  backgroundColor: '#f8fafc',
};

const photo: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const photoPlaceholder: React.CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '60px',
  opacity: 0.2,
};

const name: React.CSSProperties = {
  fontSize: '22px',
  margin: '0 0 8px',
  color: '#10233f',
  fontWeight: '800',
};

const rankTag: React.CSSProperties = {
  display: 'inline-block',
  padding: '6px 16px',
  backgroundColor: '#f0f4f8',
  borderRadius: '20px',
  fontSize: '12px',
  fontWeight: '700',
  color: '#53657d',
  marginBottom: '24px',
};

const divider: React.CSSProperties = {
  height: '1px',
  backgroundColor: '#edf2f7',
  margin: '0 0 24px',
};

const statusGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '16px',
  marginBottom: '30px',
};

const statusItem: React.CSSProperties = {
  textAlign: 'left',
};

const label: React.CSSProperties = {
  fontSize: '11px',
  color: '#a0aec0',
  fontWeight: '700',
  textTransform: 'uppercase',
  marginBottom: '4px',
};

const statusValue: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '700',
  color: '#10233f',
};

const footer: React.CSSProperties = {
  fontSize: '11px',
  color: '#cbd5e0',
  marginTop: '20px',
  lineHeight: '1.5',
};

const branding: React.CSSProperties = {
  color: '#d4af37',
  marginTop: '24px',
  fontSize: '13px',
  fontWeight: '600',
  letterSpacing: '1px',
  textTransform: 'uppercase',
};
