'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SpouseRecord } from '@/types/spouse';
import { ChildRecord } from '@/types/child';
import { DependentRecord } from '@/types/dependent';

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
  if (!value) return null;
  return value;
};


export default function FamilyEditor({
  memberId,
  initialSpouse,
  initialChildren,
  initialDependents = []
}: {
  memberId: string;
  initialSpouse: SpouseRecord | null;
  initialChildren: ChildRecord[];
  initialDependents?: DependentRecord[];
}) {
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
  
  const [children, setChildren] = useState<ChildRecord[]>(
    initialChildren.length
      ? initialChildren.map((c) => ({ ...c, birth_date: toInputDate(c.birth_date) }))
      : []
  );

  const [dependents, setDependents] = useState<DependentRecord[]>(
    initialDependents.length
      ? initialDependents.map((d) => ({ ...d, birth_date: toInputDate(d.birth_date) }))
      : []
  );

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  async function handleSave() {
    setBusy(true);
    setMessage(null);
    setError(null);

    // 1. Save Spouse
    const spousePayload = { ...spouse, member_id: memberId, spouse_dob: fromInputDate(spouse.spouse_dob) };
    const spouseResult = await supabase
      .from('spouse')
      .upsert(spousePayload, { onConflict: 'member_id' })
      .select()
      .single();

    if (spouseResult.error) {
      setError(spouseResult.error.message);
      setBusy(false);
      return;
    }

    // 2. Save Children
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

    // 3. Save Dependents (If table is available)
    const existingDepIds = initialDependents.filter((d) => d.id).map((d) => d.id) as string[];
    const currentDepIds = dependents.filter((d) => d.id).map((d) => d.id) as string[];
    const depToDelete = existingDepIds.filter((id) => !currentDepIds.includes(id));
    
    // Check if table is available by writing a select test first to handle grace cases
    const { error: tableCheck } = await supabase.from('dependents').select('id').limit(1);
    if (!tableCheck) {
      if (depToDelete.length) {
        await supabase.from('dependents').delete().in('id', depToDelete);
      }

      for (const dep of dependents) {
        if (!(dep.dependent_name || dep.relationship || dep.birth_date)) continue;
        const payload = {
          ...dep,
          member_id: memberId,
          birth_date: fromInputDate(dep.birth_date)
        };
        const result = dep.id
          ? await supabase.from('dependents').update(payload).eq('id', dep.id).select().single()
          : await supabase.from('dependents').insert(payload).select().single();
          
        if (result.error) {
          setError(result.error.message);
          setBusy(false);
          return;
        }
      }
    } else {
      console.warn("Skipping dependents save because the table dependents is not yet created in the DB.");
    }

    setMessage('Family and dependent records saved.');
    setBusy(false);
    setIsEditing(false);
    window.location.reload();
  }

  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Family & Dependents</h2>
        {!isEditing && (
          <button type='button' onClick={() => setIsEditing(true)} style={secondaryButton}>✏️ Edit Records</button>
        )}
      </div>
      
      {/* Spouse Section */}
      <div style={subCard}>
        <h3 style={{ margin: '0 0 12px' }}>Spouse</h3>
        <div style={grid}>
          {isEditing ? (
            <>
              {field('Name', spouse.spouse_name || '', (v) => setSpouse((cur) => ({ ...cur, spouse_name: v })))}
              {dateField('Date of Birth', spouse.spouse_dob || '', (v) => setSpouse((cur) => ({ ...cur, spouse_dob: v })))}
              {field('Nationality', spouse.spouse_nationality || '', (v) => setSpouse((cur) => ({ ...cur, spouse_nationality: v })))}
              {field('Denomination', spouse.spouse_denomination || '', (v) => setSpouse((cur) => ({ ...cur, spouse_denomination: v })))}
              {checkboxField('Is Sister?', !!spouse.spouse_is_sister, (v) => setSpouse((cur) => ({ ...cur, spouse_is_sister: v })))}
              {field('Parish', spouse.spouse_parish || '', (v) => setSpouse((cur) => ({ ...cur, spouse_parish: v })))}
              {field('Auxiliary Name', spouse.auxiliary_name || '', (v) => setSpouse((cur) => ({ ...cur, auxiliary_name: v })))}
              {field('Auxiliary Number', spouse.auxiliary_number || '', (v) => setSpouse((cur) => ({ ...cur, auxiliary_number: v })))}
            </>
          ) : (
            <>
              <ReadOnlyField label='Name' value={spouse.spouse_name} />
              <ReadOnlyField label='Date of Birth' value={spouse.spouse_dob} />
              <ReadOnlyField label='Nationality' value={spouse.spouse_nationality} />
              <ReadOnlyField label='Denomination' value={spouse.spouse_denomination} />
              <ReadOnlyField label='Is Sister?' value={spouse.spouse_is_sister ? 'Yes' : 'No'} />
              <ReadOnlyField label='Parish' value={spouse.spouse_parish} />
              <ReadOnlyField label='Auxiliary Name' value={spouse.auxiliary_name} />
              <ReadOnlyField label='Auxiliary Number' value={spouse.auxiliary_number} />
            </>
          )}
        </div>
        {isEditing ? (
          textareaField('Notes', spouse.spouse_notes || '', (v) => setSpouse((cur) => ({ ...cur, spouse_notes: v })))
        ) : (
          <ReadOnlyField label='Notes' value={spouse.spouse_notes} />
        )}
      </div>

      {/* Children Section */}
      <div style={subCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Children</h3>
          {isEditing && (
            <button type='button' onClick={() => setChildren((items) => [...items, { child_name: '', birth_date: '', birth_place: '' }])} style={secondaryButton}>+ Add child</button>
          )}
        </div>

        {!isEditing && children.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>No children records found.</div>
        )}

        {children.map((child, index) => (
          <div key={child.id || index} style={{ ...subCard, marginTop: 12 }}>
            <div style={grid}>
              {isEditing ? (
                <>
                  {field('Child name', child.child_name || '', (v) => setChildren((items) => items.map((item, i) => (i === index ? { ...item, child_name: v } : item))))}
                  {dateField('Birth date', child.birth_date || '', (v) => setChildren((items) => items.map((item, i) => (i === index ? { ...item, birth_date: v } : item))))}
                  {field('Birth place', child.birth_place || '', (v) => setChildren((items) => items.map((item, i) => (i === index ? { ...item, birth_place: v } : item))))}
                </>
              ) : (
                <>
                  <ReadOnlyField label='Child name' value={child.child_name} />
                  <ReadOnlyField label='Birth date' value={child.birth_date} />
                  <ReadOnlyField label='Birth place' value={child.birth_place} />
                </>
              )}
            </div>
            {isEditing && (
              <button type='button' onClick={() => setChildren((items) => items.filter((_, i) => i !== index))} style={dangerButton}>Remove</button>
            )}
          </div>
        ))}
      </div>

      {/* Dependents Section */}
      <div style={subCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Dependents (Parents, In-Laws, etc.)</h3>
          {isEditing && (
            <button type='button' onClick={() => setDependents((items) => [...items, { dependent_name: '', relationship: 'Dependant', birth_date: '' }])} style={secondaryButton}>+ Add dependent</button>
          )}
        </div>

        {!isEditing && dependents.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>No dependents records found.</div>
        )}

        {dependents.map((dep, index) => (
          <div key={dep.id || index} style={{ ...subCard, marginTop: 12 }}>
            <div style={grid}>
              {isEditing ? (
                <>
                  {field('Dependent name', dep.dependent_name || '', (v) => setDependents((items) => items.map((item, i) => (i === index ? { ...item, dependent_name: v } : item))))}
                  {selectField('Relationship', dep.relationship || 'Dependant', ['Dependant', 'Parent', 'In-Law', 'Child', 'Other'], (v) => setDependents((items) => items.map((item, i) => (i === index ? { ...item, relationship: v } : item))))}
                  {dateField('Birth date', dep.birth_date || '', (v) => setDependents((items) => items.map((item, i) => (i === index ? { ...item, birth_date: v } : item))))}
                </>
              ) : (
                <>
                  <ReadOnlyField label='Dependent name' value={dep.dependent_name} />
                  <ReadOnlyField label='Relationship' value={dep.relationship} />
                  <ReadOnlyField label='Birth date' value={dep.birth_date} />
                </>
              )}
            </div>
            {isEditing && (
              <button type='button' onClick={() => setDependents((items) => items.filter((_, i) => i !== index))} style={dangerButton}>Remove</button>
            )}
          </div>
        ))}
      </div>

      {isEditing && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type='button' onClick={handleSave} disabled={busy} style={primaryButton}>{busy ? 'Saving…' : 'Save all records'}</button>
          <button type='button' onClick={() => { 
            setIsEditing(false); 
            setSpouse(initialSpouse ? { ...initialSpouse, spouse_dob: toInputDate(initialSpouse.spouse_dob) } : { spouse_name: '', spouse_dob: '', spouse_nationality: '', spouse_denomination: '', spouse_is_sister: false, spouse_parish: '', auxiliary_name: '', auxiliary_number: '', spouse_notes: '' });
            setChildren(initialChildren.length ? initialChildren.map((c) => ({ ...c, birth_date: toInputDate(c.birth_date) })) : []);
            setDependents(initialDependents.length ? initialDependents.map((d) => ({ ...d, birth_date: toInputDate(d.birth_date) })) : []);
          }} disabled={busy} style={secondaryButton}>Cancel</button>
          {message && <span style={{ color: '#1f6f43' }}>{message}</span>}
          {error && <span style={{ color: 'crimson' }}>{error}</span>}
        </div>
      )}
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

function selectField(label: string, value: string, options: string[], onChange: (value: string) => void) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={labelStyle}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </label>
  );
}

function textareaField(label: string, value: string, onChange: (value: string) => void) {
  return <label style={{ display: 'grid', gap: 6 }}><span style={labelStyle}>{label}</span><textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} /></label>;
}

function ReadOnlyField({ label, value }: { label: string; value: string | undefined | null }) {
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <span style={labelStyle}>{label}</span>
      <span style={{ fontSize: 15, color: '#10233f', fontWeight: 500 }}>{value || '-'}</span>
    </div>
  );
}

const card: React.CSSProperties = { background: '#fff', padding: 20, borderRadius: 16, boxShadow: '0 8px 24px rgba(16,35,63,0.08)', display: 'grid', gap: 16 };
const subCard: React.CSSProperties = { padding: 14, border: '1px solid #dce4ee', borderRadius: 12, display: 'grid', gap: 12 };
const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 };
const labelStyle: React.CSSProperties = { fontSize: 12, color: '#53657d', fontWeight: 700 };
const inputStyle: React.CSSProperties = { padding: '11px 12px', borderRadius: 10, border: '1px solid #cfd8e3', fontSize: 14, background: '#fff', outline: 'none' };
const primaryButton: React.CSSProperties = { padding: '12px 16px', borderRadius: 10, border: 0, background: '#10233f', color: '#fff', fontWeight: 700, cursor: 'pointer' };
const secondaryButton: React.CSSProperties = { padding: '10px 14px', borderRadius: 10, border: '1px solid #cfd8e3', background: '#fff', cursor: 'pointer', outline: 'none' };
const dangerButton: React.CSSProperties = { padding: '9px 12px', borderRadius: 10, border: '1px solid #f0c9c9', color: '#8a1f1f', background: '#fff5f5', cursor: 'pointer', justifySelf: 'start' };
