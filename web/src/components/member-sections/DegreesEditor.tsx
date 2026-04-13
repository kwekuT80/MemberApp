'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DegreeRecord } from '@/types/degree';

const toInputDate = (value?: string | null) => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const mdy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const [, mm, dd, yyyy] = mdy;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  const dmy = value.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmy) {
    const [, dd, mm, yyyy] = dmy;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  return '';
};

const fromInputDate = (value?: string | null) => {
  if (!value) return '';
  return value;
};


export default function DegreesEditor({ memberId, initialDegrees, degreeTypes }: { memberId: string; initialDegrees: DegreeRecord[]; degreeTypes: string[] }) {
  const supabase = createClient();
  const [degrees, setDegrees] = useState<DegreeRecord[]>(initialDegrees.length ? initialDegrees.map((d) => ({ ...d, degree_date: toInputDate(d.degree_date) })) : [{ degree_type: '', degree_date: '', degree_place: '' }]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update(index: number, key: keyof DegreeRecord, value: string) {
    setDegrees((items) => items.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  }

  async function handleSave() {
    setBusy(true);
    setError(null);
    setMessage(null);
    const existingIds = initialDegrees.filter((d) => d.id).map((d) => d.id) as string[];
    const currentIds = degrees.filter((d) => d.id).map((d) => d.id) as string[];
    const toDelete = existingIds.filter((id) => !currentIds.includes(id));
    if (toDelete.length) await supabase.from('degrees').delete().in('id', toDelete);

    for (const degree of degrees) {
      if (!(degree.degree_type || degree.degree_date || degree.degree_place)) continue;
      const payload = { ...degree, member_id: memberId, degree_date: fromInputDate(degree.degree_date) };
      const result = degree.id
        ? await supabase.from('degrees').update(payload).eq('id', degree.id).select().single()
        : await supabase.from('degrees').insert(payload).select().single();
      if (result.error) {
        setError(result.error.message);
        setBusy(false);
        return;
      }
    }
    setMessage('Degree records saved.');
    setBusy(false);
    window.location.reload();
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Degree</h2>
        <button type='button' onClick={() => setDegrees((items) => [...items, { degree_type: '', degree_date: '', degree_place: '' }])} style={secondaryButton}>Add degree</button>
      </div>
      {degrees.map((degree, index) => (
        <div key={degree.id || index} style={subCardStyle}>
          <div style={gridStyle}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={labelStyle}>Degree Type</span>
              <select value={degree.degree_type || ''} onChange={(e) => update(index, 'degree_type', e.target.value)} style={inputStyle}>
                <option value=''>Select…</option>
                {degreeTypes.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <Field label='Date' value={degree.degree_date || ''} type='date' onChange={(v) => update(index, 'degree_date', v)} />
            <Field label='Place' value={degree.degree_place || ''} onChange={(v) => update(index, 'degree_place', v)} />
          </div>
          <button type='button' onClick={() => setDegrees((items) => items.filter((_, i) => i !== index))} style={dangerButton}>Remove</button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type='button' onClick={handleSave} disabled={busy} style={primaryButton}>{busy ? 'Saving…' : 'Save degree records'}</button>
        {message ? <span style={{ color: '#1f6f43' }}>{message}</span> : null}
        {error ? <span style={{ color: 'crimson' }}>{error}</span> : null}
      </div>
    </div>
  );
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
