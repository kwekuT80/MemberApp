'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MilitaryRecord } from '@/types/military';
import { RankRecord } from '@/types/rankRecord';

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


export default function MilitaryEditor({ memberId, initialMilitary, initialRanks }: { memberId: string; initialMilitary: MilitaryRecord | null; initialRanks: RankRecord[] }) {
  const supabase = createClient();
  const [military, setMilitary] = useState<MilitaryRecord>(initialMilitary ? { ...initialMilitary, uniform_blessed_date: toInputDate(initialMilitary.uniform_blessed_date), first_uniform_use_date: toInputDate(initialMilitary.first_uniform_use_date) } : { is_military: false, uniform_blessed_date: '', first_uniform_use_date: '', current_rank: '', commission: '' });
  const [ranks, setRanks] = useState<RankRecord[]>(initialRanks.length ? initialRanks.map((r) => ({ ...r, commission_date: toInputDate(r.commission_date) })) : [{ rank_title: '', commission_date: '', is_current: false, notes: '' }]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setBusy(true);
    setError(null);
    setMessage(null);
    const militaryPayload = { ...military, member_id: memberId, uniform_blessed_date: fromInputDate(military.uniform_blessed_date), first_uniform_use_date: fromInputDate(military.first_uniform_use_date) };
    const militaryResult = military.id
      ? await supabase.from('military').update(militaryPayload).eq('id', military.id).select().single()
      : await supabase.from('military').insert(militaryPayload).select().single();
    if (militaryResult.error) {
      setError(militaryResult.error.message);
      setBusy(false);
      return;
    }
    const existingIds = initialRanks.filter((r) => r.id).map((r) => r.id) as string[];
    const currentIds = ranks.filter((r) => r.id).map((r) => r.id) as string[];
    const toDelete = existingIds.filter((id) => !currentIds.includes(id));
    if (toDelete.length) await supabase.from('uniformed_rank_records').delete().in('id', toDelete);
    for (const rank of ranks) {
      if (!(rank.rank_title || rank.commission_date || rank.notes || rank.is_current)) continue;
      const payload = { ...rank, member_id: memberId, commission_date: fromInputDate(rank.commission_date) };
      const result = rank.id
        ? await supabase.from('uniformed_rank_records').update(payload).eq('id', rank.id).select().single()
        : await supabase.from('uniformed_rank_records').insert(payload).select().single();
      if (result.error) {
        setError(result.error.message);
        setBusy(false);
        return;
      }
    }
    setMessage('Uniformed rank records saved.');
    setBusy(false);
    window.location.reload();
  }

  return <div style={card}><div style={subCard}><h2 style={{ margin: '0 0 12px' }}>Uniformed Rank</h2><div style={grid}>{checkboxField('In uniform?', !!military.is_military, (v) => setMilitary((cur) => ({ ...cur, is_military: v })))}{dateField('Uniform Blessed Date', military.uniform_blessed_date || '', (v) => setMilitary((cur) => ({ ...cur, uniform_blessed_date: v })))}{dateField('First Uniform Use Date', military.first_uniform_use_date || '', (v) => setMilitary((cur) => ({ ...cur, first_uniform_use_date: v })))}{field('Current Rank', military.current_rank || '', (v) => setMilitary((cur) => ({ ...cur, current_rank: v })))}{field('Commission', military.commission || '', (v) => setMilitary((cur) => ({ ...cur, commission: v })))} </div></div><div style={subCard}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h3 style={{ margin: 0 }}>Commission History</h3><button type='button' onClick={() => setRanks((items) => [...items, { rank_title: '', commission_date: '', is_current: false, notes: '' }])} style={secondaryButton}>Add rank</button></div>{ranks.map((rank, index) => <div key={rank.id || index} style={{ ...subCard, marginTop: 12 }}><div style={grid}>{field('Rank Title', rank.rank_title || '', (v) => setRanks((items) => items.map((item, i) => (i === index ? { ...item, rank_title: v } : item))))}{dateField('Commission Date', rank.commission_date || '', (v) => setRanks((items) => items.map((item, i) => (i === index ? { ...item, commission_date: v } : item))))}{checkboxField('Current Rank?', !!rank.is_current, (v) => setRanks((items) => items.map((item, i) => (i === index ? { ...item, is_current: v } : item))))}</div>{textareaField('Notes', rank.notes || '', (v) => setRanks((items) => items.map((item, i) => (i === index ? { ...item, notes: v } : item))))}<button type='button' onClick={() => setRanks((items) => items.filter((_, i) => i !== index))} style={dangerButton}>Remove</button></div>)}</div><div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}><button type='button' onClick={handleSave} disabled={busy} style={primaryButton}>{busy ? 'Saving…' : 'Save uniformed rank records'}</button>{message ? <span style={{ color: '#1f6f43' }}>{message}</span> : null}{error ? <span style={{ color: 'crimson' }}>{error}</span> : null}</div></div>;
}

function field(label: string, value: string, onChange: (value: string) => void) { return <label style={{ display: 'grid', gap: 6 }}><span style={labelStyle}>{label}</span><input value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} /></label>; }
function dateField(label: string, value: string, onChange: (value: string) => void) { return <label style={{ display: 'grid', gap: 6 }}><span style={labelStyle}>{label}</span><input type='date' value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} /></label>; }
function checkboxField(label: string, checked: boolean, onChange: (checked: boolean) => void) { return <label style={{ display: 'grid', gap: 6 }}><span style={labelStyle}>{label}</span><input type='checkbox' checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ width: 18, height: 18 }} /></label>; }
function textareaField(label: string, value: string, onChange: (value: string) => void) { return <label style={{ display: 'grid', gap: 6 }}><span style={labelStyle}>{label}</span><textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} /></label>; }

const card: React.CSSProperties = { background: '#fff', padding: 20, borderRadius: 16, boxShadow: '0 8px 24px rgba(16,35,63,0.08)', display: 'grid', gap: 16 };
const subCard: React.CSSProperties = { padding: 14, border: '1px solid #dce4ee', borderRadius: 12, display: 'grid', gap: 12 };
const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 };
const labelStyle: React.CSSProperties = { fontSize: 12, color: '#53657d', fontWeight: 700 };
const inputStyle: React.CSSProperties = { padding: '11px 12px', borderRadius: 10, border: '1px solid #cfd8e3', fontSize: 14 };
const primaryButton: React.CSSProperties = { padding: '12px 16px', borderRadius: 10, border: 0, background: '#10233f', color: '#fff', fontWeight: 700, cursor: 'pointer' };
const secondaryButton: React.CSSProperties = { padding: '10px 14px', borderRadius: 10, border: '1px solid #cfd8e3', background: '#fff', cursor: 'pointer' };
const dangerButton: React.CSSProperties = { padding: '9px 12px', borderRadius: 10, border: '1px solid #f0c9c9', color: '#8a1f1f', background: '#fff5f5', cursor: 'pointer', justifySelf: 'start' };
