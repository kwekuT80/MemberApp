'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SpouseRecord } from '@/types/spouse';
import { ChildRecord } from '@/types/child';

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


export default function FamilyEditor({ memberId, initialSpouse, initialChildren }: { memberId: string; initialSpouse: SpouseRecord | null; initialChildren: ChildRecord[] }) {
  const supabase = createClient();
  const [spouse, setSpouse] = useState<SpouseRecord>(
    initialSpouse ? { ...initialSpouse, spouse_dob: toInputDate(initialSpouse.spouse_dob) } : {
      spouse_name: '',
      spouse_dob: '',
      spouse_nationality: '',
      spouse_denomination: '',
      spouse_is_sister: false,
      spouse_parish: '',
      auxiliary_name: '',
      auxiliary_number: '',
      spouse_notes: '',
    },
  );
  const [children, setChildren] = useState<ChildRecord[]>(initialChildren.length ? initialChildren.map((c) => ({ ...c, birth_date: toInputDate(c.birth_date) })) : [{ child_name: '', birth_date: '', birth_place: '' }]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setBusy(true);
    setMessage(null);
    setError(null);

    const spousePayload = { ...spouse, member_id: memberId, spouse_dob: fromInputDate(spouse.spouse_dob) };
    const spouseResult = spouse.id
      ? await supabase.from('spouse').update(spousePayload).eq('id', spouse.id).select().single()
      : await supabase.from('spouse').insert(spousePayload).select().single();
    if (spouseResult.error) {
      setError(spouseResult.error.message);
      setBusy(false);
      return;
    }

    const existingIds = initialChildren.filter((c) => c.id).map((c) => c.id) as string[];
    const currentIds = children.filter((c) => c.id).map((c) => c.id) as string[];
    const toDelete = existingIds.filter((id) => !currentIds.includes(id));
    if (toDelete.length) await supabase.from('children').delete().in('id', toDelete);

    for (const child of children) {
      if (!(child.child_name || child.birth_date || child.birth_place)) continue;
      const payload = { ...child, member_id: memberId, birth_date: fromInputDate(child.birth_date) };
      const result = child.id
        ? await supabase.from('children').update(payload).eq('id', child.id).select().single()
        : await supabase.from('children').insert(payload).select().single();
      if (result.error) {
        setError(result.error.message);
        setBusy(false);
        return;
      }
    }

    setMessage('Family records saved.');
    setBusy(false);
    window.location.reload();
  }

  return (
    <div style={card}>
      <h2 style={{ margin: 0 }}>Family</h2>
      <div style={subCard}>
        <h3 style={{ margin: '0 0 12px' }}>Spouse</h3>
        <div style={grid}>
          {field('Name', spouse.spouse_name || '', (v) => setSpouse((cur) => ({ ...cur, spouse_name: v })))}
          {dateField('Date of Birth', spouse.spouse_dob || '', (v) => setSpouse((cur) => ({ ...cur, spouse_dob: v })))}
          {field('Nationality', spouse.spouse_nationality || '', (v) => setSpouse((cur) => ({ ...cur, spouse_nationality: v })))}
          {field('Denomination', spouse.spouse_denomination || '', (v) => setSpouse((cur) => ({ ...cur, spouse_denomination: v })))}
          {checkboxField('Is Sister?', !!spouse.spouse_is_sister, (v) => setSpouse((cur) => ({ ...cur, spouse_is_sister: v })))}
          {field('Parish', spouse.spouse_parish || '', (v) => setSpouse((cur) => ({ ...cur, spouse_parish: v })))}
          {field('Auxiliary Name', spouse.auxiliary_name || '', (v) => setSpouse((cur) => ({ ...cur, auxiliary_name: v })))}
          {field('Auxiliary Number', spouse.auxiliary_number || '', (v) => setSpouse((cur) => ({ ...cur, auxiliary_number: v })))}
        </div>
        {textareaField('Notes', spouse.spouse_notes || '', (v) => setSpouse((cur) => ({ ...cur, spouse_notes: v })))}
      </div>

      <div style={subCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Children</h3>
          <button type='button' onClick={() => setChildren((items) => [...items, { child_name: '', birth_date: '', birth_place: '' }])} style={secondaryButton}>Add child</button>
        </div>
        {children.map((child, index) => (
          <div key={child.id || index} style={{ ...subCard, marginTop: 12 }}>
            <div style={grid}>
              {field('Child name', child.child_name || '', (v) => setChildren((items) => items.map((item, i) => (i === index ? { ...item, child_name: v } : item))))}
              {dateField('Birth date', child.birth_date || '', (v) => setChildren((items) => items.map((item, i) => (i === index ? { ...item, birth_date: v } : item))))}
              {field('Birth place', child.birth_place || '', (v) => setChildren((items) => items.map((item, i) => (i === index ? { ...item, birth_place: v } : item))))}
            </div>
            <button type='button' onClick={() => setChildren((items) => items.filter((_, i) => i !== index))} style={dangerButton}>Remove</button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type='button' onClick={handleSave} disabled={busy} style={primaryButton}>{busy ? 'Saving…' : 'Save family records'}</button>
        {message ? <span style={{ color: '#1f6f43' }}>{message}</span> : null}
        {error ? <span style={{ color: 'crimson' }}>{error}</span> : null}
      </div>
    </div>
  );
}

function field(label: string, value: string, onChange: (value: string) => void) {
  return <label style={{ display: 'grid', gap: 6 }}><span style={labelStyle}>{label}</span><input value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} /></label>;
}

function dateField(label: string, value: string, onChange: (value: string) => void) {
  return <label style={{ display: 'grid', gap: 6 }}><span style={labelStyle}>{label}</span><input type='date' value={value || ''} onChange={(e) => onChange(e.target.value)} style={inputStyle} /></label>;
}

function checkboxField(label: string, checked: boolean, onChange: (checked: boolean) => void) {
  return <label style={{ display: 'grid', gap: 6 }}><span style={labelStyle}>{label}</span><input type='checkbox' checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ width: 18, height: 18 }} /></label>;
}

function textareaField(label: string, value: string, onChange: (value: string) => void) {
  return <label style={{ display: 'grid', gap: 6 }}><span style={labelStyle}>{label}</span><textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} /></label>;
}

const card: React.CSSProperties = { background: '#fff', padding: 20, borderRadius: 16, boxShadow: '0 8px 24px rgba(16,35,63,0.08)', display: 'grid', gap: 16 };
const subCard: React.CSSProperties = { padding: 14, border: '1px solid #dce4ee', borderRadius: 12, display: 'grid', gap: 12 };
const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 };
const labelStyle: React.CSSProperties = { fontSize: 12, color: '#53657d', fontWeight: 700 };
const inputStyle: React.CSSProperties = { padding: '11px 12px', borderRadius: 10, border: '1px solid #cfd8e3', fontSize: 14 };
const primaryButton: React.CSSProperties = { padding: '12px 16px', borderRadius: 10, border: 0, background: '#10233f', color: '#fff', fontWeight: 700, cursor: 'pointer' };
const secondaryButton: React.CSSProperties = { padding: '10px 14px', borderRadius: 10, border: '1px solid #cfd8e3', background: '#fff', cursor: 'pointer' };
const dangerButton: React.CSSProperties = { padding: '9px 12px', borderRadius: 10, border: '1px solid #f0c9c9', color: '#8a1f1f', background: '#fff5f5', cursor: 'pointer', justifySelf: 'start' };
