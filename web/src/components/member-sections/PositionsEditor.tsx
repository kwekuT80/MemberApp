'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PositionRecord } from '@/types/position';


const toInputDate = (value?: string | null) => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const mdy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const [, mm, dd, yyyy] = mdy;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  return '';
};

const fromInputDate = (value?: string | null) => {
  if (!value) return '';
  return value;
};

const POSITION_OPTIONS = [
  'President',
  '1st Vice President',
  '2nd Vice President',
  'Recording & Corresponding Secretary',
  'Assistant Secretary',
  'Financial Secretary',
  'Treasurer',
  '1st Trustee',
  '2nd Trustee',
  '3rd Trustee',
  'Commander',
  'First Vice Commander',
  'Second Vice Commander',
  'Messenger',
  'Sergeant-at-Arms',
  'Guard',
];

export default function PositionsEditor({ memberId, initialPositions }: { memberId: string; initialPositions: PositionRecord[] }) {
  const supabase = createClient();
  const [positions, setPositions] = useState<PositionRecord[]>(initialPositions.length ? initialPositions.map((p) => ({ ...p, date_from: toInputDate(p.date_from), date_to: toInputDate(p.date_to) })) : [{ position_title: '', date_from: '', date_to: '' }]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update(index: number, key: keyof PositionRecord, value: string) {
    setPositions((items) => items.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  }

  async function handleSave() {
    setBusy(true);
    setError(null);
    setMessage(null);
    const existingIds = initialPositions.filter((p) => p.id).map((p) => p.id) as string[];
    const currentIds = positions.filter((p) => p.id).map((p) => p.id) as string[];
    const toDelete = existingIds.filter((id) => !currentIds.includes(id));
    if (toDelete.length) await supabase.from('positions').delete().in('id', toDelete);
    for (const position of positions) {
      if (!(position.position_title || position.date_from || position.date_to)) continue;
      const payload = { ...position, member_id: memberId, date_from: fromInputDate(position.date_from), date_to: fromInputDate(position.date_to) };
      const result = position.id
        ? await supabase.from('positions').update(payload).eq('id', position.id).select().single()
        : await supabase.from('positions').insert(payload).select().single();
      if (result.error) {
        setError(result.error.message);
        setBusy(false);
        return;
      }
    }
    setMessage('Position records saved.');
    setBusy(false);
    window.location.reload();
  }

  return <div style={cardStyle}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h2 style={{ margin: 0 }}>Positions</h2><button type='button' onClick={() => setPositions((items) => [...items, { position_title: '', date_from: '', date_to: '' }])} style={secondaryButton}>Add position</button></div>{positions.map((position, index) => <div key={position.id || index} style={subCardStyle}><div style={gridStyle}><label style={{ display: 'grid', gap: 6 }}><span style={labelStyle}>Position Title</span><select value={position.position_title || ''} onChange={(e) => update(index, 'position_title', e.target.value)} style={inputStyle}><option value=''>Select…</option>{POSITION_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><Field label='From' type='date' value={position.date_from || ''} onChange={(v) => update(index, 'date_from', v)} /><Field label='To' type='date' value={position.date_to || ''} onChange={(v) => update(index, 'date_to', v)} /></div><button type='button' onClick={() => setPositions((items) => items.filter((_, i) => i !== index))} style={dangerButton}>Remove</button></div>)}<div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}><button type='button' onClick={handleSave} disabled={busy} style={primaryButton}>{busy ? 'Saving…' : 'Save positions'}</button>{message ? <span style={{ color: '#1f6f43' }}>{message}</span> : null}{error ? <span style={{ color: 'crimson' }}>{error}</span> : null}</div></div>;
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label style={{ display: 'grid', gap: 6 }}><span style={labelStyle}>{label}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} /></label>;
}

const cardStyle: React.CSSProperties = { background: '#fff', padding: 20, borderRadius: 16, boxShadow: '0 8px 24px rgba(16,35,63,0.08)', display: 'grid', gap: 16 };
const subCardStyle: React.CSSProperties = { padding: 14, border: '1px solid #dce4ee', borderRadius: 12, display: 'grid', gap: 12 };
const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 };
const labelStyle: React.CSSProperties = { fontSize: 12, color: '#53657d', fontWeight: 700 };
const inputStyle: React.CSSProperties = { padding: '11px 12px', borderRadius: 10, border: '1px solid #cfd8e3', fontSize: 14, background: '#fff' };
const primaryButton: React.CSSProperties = { padding: '12px 16px', borderRadius: 10, border: 0, background: '#10233f', color: '#fff', fontWeight: 700, cursor: 'pointer' };
const secondaryButton: React.CSSProperties = { padding: '10px 14px', borderRadius: 10, border: '1px solid #cfd8e3', background: '#fff', cursor: 'pointer' };
const dangerButton: React.CSSProperties = { padding: '9px 12px', borderRadius: 10, border: '1px solid #f0c9c9', color: '#8a1f1f', background: '#fff5f5', cursor: 'pointer', justifySelf: 'start' };
