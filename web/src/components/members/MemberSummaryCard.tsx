'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Member } from '@/types/member';
import { formatDisplayDate } from '@/lib/utils/ksji-logic';

function value(v?: string | null) { return v && String(v).trim() ? v : '—'; }

export default function MemberSummaryCard({ member, editHref='/me/edit', showOwner=false }: { member: Member | null; editHref?: string; showOwner?: boolean }) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, fieldName: string) => {
    if (!text || text === '—') return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (!member) return <div style={card}><h3 style={{ marginTop:0 }}>No member record found</h3><p style={{ color:'#53657d' }}>Your account exists, but your main member record has not been created yet.</p></div>;

  const emailText = member.email && member.email.trim() ? member.email.trim() : null;
  const phoneText = (member.phone || member.mobile) && String(member.phone || member.mobile).trim() ? String(member.phone || member.mobile).trim() : null;

  return (
    <div style={card}>
      <div style={{ display:'flex', justifyContent:'space-between', gap:16, alignItems:'start', flexWrap:'wrap' }}>
        <div>
          <h2 style={{ margin:'0 0 8px' }}>
            {[member.title, member.first_name, member.other_names, member.surname].filter(Boolean).join(' ') || 'Unnamed member'}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 14, color: '#53657d' }}>
            {emailText && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                ✉️ {emailText}
                <button
                  onClick={() => copyToClipboard(emailText, 'email')}
                  title="Copy email to clipboard"
                  style={copyBtnStyle}
                >
                  {copiedField === 'email' ? '✓ Copied' : '📋 Copy'}
                </button>
              </span>
            )}
            {phoneText && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                📞 {phoneText}
                <button
                  onClick={() => copyToClipboard(phoneText, 'phone')}
                  title="Copy phone to clipboard"
                  style={copyBtnStyle}
                >
                  {copiedField === 'phone' ? '✓ Copied' : '📋 Copy'}
                </button>
              </span>
            )}
            {!emailText && !phoneText && <span>No contact info registered</span>}
          </div>
        </div>
        <Link href={editHref} style={{ textDecoration:'none', background:'#10233f', color:'#fff', padding:'10px 14px', borderRadius:10, fontWeight:700 }}>
          Edit main record
        </Link>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:16, marginTop:20 }}>
        <Field label='Date of birth' value={formatDisplayDate(member.date_of_birth)} />
        <Field label='Nationality' value={value(member.nationality)} />
        <Field label='Home region' value={value(member.home_region)} />
        <Field label='Marital status' value={value(member.marital_status)} />
        <Field label='Employment' value={value(member.emp_status)} />
        <Field label='Occupation' value={value(member.occupation)} />
        <Field label='Workplace' value={value(member.workplace)} />
        <Field label='Date joined' value={formatDisplayDate(member.date_joined)} />
      </div>
    </div>
  );
}

function Field({ label, value }: { label:string; value:string }) { 
  return <div><div style={{ fontSize:12, color:'#53657d', marginBottom:4 }}>{label}</div><div style={{ fontWeight:600 }}>{value}</div></div>; 
}

const copyBtnStyle: React.CSSProperties = {
  background: '#f1f5f9',
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  padding: '2px 8px',
  fontSize: 11,
  fontWeight: 600,
  color: '#334155',
  cursor: 'pointer',
  marginLeft: 4,
};

const card: React.CSSProperties = { background:'#fff', padding:20, borderRadius:16, boxShadow:'0 8px 24px rgba(16,35,63,0.08)' };

