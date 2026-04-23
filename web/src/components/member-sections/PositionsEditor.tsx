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

const HIERARCHY_LEVELS = [
  'Local',
  'Battalion',
  'District',
  'Regiment',
  'Grand Commandery',
  'Supreme Subordinate Commandery',
  'Supreme Commandery'
];

const RANK_OPTIONS = [
  '2nd Lt.',
  '1st Lt.',
  'Capt.',
  'Major',
  'Lt. Col.',
  'Col.',
  'Brig. Gen.',
  'Maj. Gen.',
  'Lt. Gen.',
  'Gen.',
  'Adjutant Gen.',
  'Paymaster Gen.',
  'Judge-Advocate Gen.',
];

const POSITION_DATA: Record<string, string[]> = {
  'Local': [
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
    'Cadet Organizer',
  ],
  'Battalion': [
    'Battalion Commander',
    '1st Vice Commander',
    '2nd Vice Commander',
    'Adjutant',
    'Inspector',
    'Paymaster',
    'Quartermaster',
  ],
  'District': [
    'District Commander',
    '1st Vice Commander',
    '2nd Vice Commander',
    'Adjutant',
    'Inspector',
    'Paymaster',
    'Quartermaster',
    'District Cadet Coordinator',
  ],
  'Regiment': [
    'Regimental Commander',
    '1st Vice Commander',
    '2nd Vice Commander',
    'Adjutant',
    'Inspector',
    'Paymaster',
    'Quartermaster',
    'Regimental Cadet Coordinator',
  ],
  'Grand Commandery': [
    'Spiritual Director',
    'Grand President',
    'Past Grand President',
    '1st Vice President',
    '2nd Vice President',
    'Grand Secretary',
    'Grand Treasurer',
    'Grand Financial Secretary',
    'Grand Judge Advocate',
    'Grand Trustee (1st)',
    'Grand Trustee (2nd)',
    'Grand Trustee (3rd)',
    'Grand Messenger',
    'Grand Sergeant-at-Arms',
    'Grand Guard',
    'Assistant Grand Secretary',
    'Grand Organizer',
    'Grand Deputy Organizer',
    'Grand Cadet Organizer',
  ],
  'Supreme Subordinate Commandery': [
    'Supreme Subordinate Spiritual Director',
    'Supreme Subordinate President',
    'Supreme Subordinate First Vice President',
    'Supreme Subordinate Second Vice President',
    'Supreme Subordinate Secretary',
    'Supreme Subordinate Treasurer',
    'Supreme Subordinate Judge Advocate',
    'Supreme Subordinate Trustee (1)',
    'Supreme Subordinate Trustee (2)',
  ],
  'Supreme Commandery': [
    'Supreme President',
    'Supreme First Vice-President',
    'Supreme Second Vice-President',
    'Supreme Secretary',
    'Supreme Treasurer',
    'Supreme Trustee (1)',
    'Supreme Trustee (2)',
    'Supreme Spiritual Director',
    'Supreme Counsel',
    'Inspector-General',
    'Quartermaster-General',
    'Supreme Organizer',
    'Aide-de-Camp',
  ],
};

export default function PositionsEditor({ memberId, initialPositions }: { memberId: string; initialPositions: any[] }) {
  const supabase = createClient();
  const [positions, setPositions] = useState<PositionRecord[]>(initialPositions.length ? initialPositions.map((p) => ({ ...p, date_from: toInputDate(p.date_from), date_to: toInputDate(p.date_to) })) : [{ position_title: '', date_from: '', date_to: '' }]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update(index: number, key: string, value: string) {
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
      const payload = { 
        ...position, 
        member_id: memberId, 
        date_from: fromInputDate(position.date_from), 
        date_to: fromInputDate(position.date_to),
        level: position.level || 'Local',
        rank: position.rank || ''
      };
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

  return <div style={cardStyle}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h2 style={{ margin: 0 }}>Positions</h2><button type='button' onClick={() => setPositions((items) => [...items, { position_title: '', date_from: '', date_to: '', level: 'Local', rank: '' }])} style={secondaryButton}>Add position</button></div>{positions.map((position, index) => {
    const currentLevel = position.level || 'Local';
    const availableTitles = POSITION_DATA[currentLevel] || [];

    return (
      <div key={position.id || index} style={subCardStyle}>
        <div style={gridStyle}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={labelStyle}>Level of Jurisdiction</span>
            <select value={currentLevel} onChange={(e) => {
              update(index, 'level', e.target.value);
              update(index, 'position_title', ''); // Reset title if level changes
            }} style={inputStyle}>
              {HIERARCHY_LEVELS.map((lvl) => <option key={lvl} value={lvl}>{lvl}</option>)}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={labelStyle}>Position Title</span>
            <select value={position.position_title || ''} onChange={(e) => update(index, 'position_title', e.target.value)} style={inputStyle}>
              <option value=''>Select…</option>
              {availableTitles.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={labelStyle}>Military Rank</span>
            <select value={position.rank || ''} onChange={(e) => update(index, 'rank', e.target.value)} style={inputStyle}>
              <option value=''>N/A</option>
              {RANK_OPTIONS.map((rank) => <option key={rank} value={rank}>{rank}</option>)}
            </select>
          </label>
          <Field label='From' type='date' value={position.date_from || ''} onChange={(v: string) => update(index, 'date_from', v)} />
          <Field label='To' type='date' value={position.date_to || ''} onChange={(v: string) => update(index, 'date_to', v)} />
        </div>
        <button type='button' onClick={() => setPositions((items) => items.filter((_, i) => i !== index))} style={dangerButton}>Remove</button>
      </div>
    );
  })}<div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}><button type='button' onClick={handleSave} disabled={busy} style={primaryButton}>{busy ? 'Saving…' : 'Save positions'}</button>{message ? <span style={{ color: '#1f6f43' }}>{message}</span> : null}{error ? <span style={{ color: 'crimson' }}>{error}</span> : null}</div></div>;
}

function Field({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return <label style={{ display: 'grid', gap: 6 }}><span style={labelStyle}>{label}</span><input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={inputStyle} /></label>;
}

const cardStyle: React.CSSProperties = { background: '#fff', padding: 20, borderRadius: 16, boxShadow: '0 8px 24px rgba(16,35,63,0.08)', display: 'grid', gap: 16 };
const subCardStyle: React.CSSProperties = { padding: 14, border: '1px solid #dce4ee', borderRadius: 12, display: 'grid', gap: 12 };
const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 };
const labelStyle: React.CSSProperties = { fontSize: 12, color: '#53657d', fontWeight: 700 };
const inputStyle: React.CSSProperties = { padding: '11px 12px', borderRadius: 10, border: '1px solid #cfd8e3', fontSize: 14, background: '#fff' };
const primaryButton: React.CSSProperties = { padding: '12px 16px', borderRadius: 10, border: 0, background: '#10233f', color: '#fff', fontWeight: 700, cursor: 'pointer' };
const secondaryButton: React.CSSProperties = { padding: '10px 14px', borderRadius: 10, border: '1px solid #cfd8e3', background: '#fff', cursor: 'pointer' };
const dangerButton: React.CSSProperties = { padding: '9px 12px', borderRadius: 10, border: '1px solid #f0c9c9', color: '#8a1f1f', background: '#fff5f5', cursor: 'pointer', justifySelf: 'start' };
