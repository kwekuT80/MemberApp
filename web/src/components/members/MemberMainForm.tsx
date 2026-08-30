'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Member } from '@/types/member';
import { saveMember } from '@/services/memberService';
import { uploadMemberPhoto } from '@/services/photoService';
import { formatDisplayDate } from '@/lib/utils/ksji-logic';

interface Props {
  initialMember: Member | null;
  mode: 'self' | 'registrar';
  redirectTo?: string;
}

const TITLES = ['Bro.', 'Sir', 'Rev.', 'Dr.', 'Prof.', 'N/B'];
const MARITAL = ['Married', 'Single', 'Widowed', 'Religious', 'Separated'];
const EMP_STATUS = ['Employed', 'Self-employed', 'Unemployed', 'Student', 'Retired'];
const STATUSES = ['Active', 'Suspended', 'Dismissed', 'Transfer-In', 'Transfer-Out', 'Deceased'];

function formatDegreeSummary(d: any): string {
  if (!d) return '';
  const parts: string[] = [];
  if (d.degree_date) parts.push(formatDisplayDate(d.degree_date));
  if (d.degree_place) parts.push(d.degree_place);
  return parts.join(' — ');
}

export default function MemberMainForm({ initialMember, mode, redirectTo }: Props) {
  const supabase = createClient();
  const TABS = mode === 'registrar' 
    ? ['Bio', 'Family', 'Employment', 'Degrees', 'Military', 'Lifecycle']
    : ['Bio', 'Family', 'Employment'];
    
  const [activeTab, setActiveTab] = useState(0);
  const [form, setForm] = useState<any>(initialMember || { status: 'Active' });
  const [degreesList, setDegreesList] = useState<any[]>(
    Array.isArray((initialMember as any)?.degrees) ? (initialMember as any).degrees : []
  );
  const [positionsList, setPositionsList] = useState<any[]>(
    Array.isArray((initialMember as any)?.positions) ? (initialMember as any).positions : []
  );
  const [spouseRecord, setSpouseRecord] = useState<any>(
    Array.isArray((initialMember as any)?.spouse) ? (initialMember as any).spouse[0] : ((initialMember as any)?.spouse || null)
  );
  const [dependentsList, setDependentsList] = useState<any[]>(
    Array.isArray((initialMember as any)?.dependents) ? (initialMember as any).dependents : []
  );
  const [childrenList, setChildrenList] = useState<any[]>(
    Array.isArray((initialMember as any)?.children) ? (initialMember as any).children : []
  );

  const [regions, setRegions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize degree fields from degrees table if currently empty
  useEffect(() => {
    if (degreesList.length > 0) {
      setForm((prev: any) => {
        const d1 = degreesList.find((d: any) => d.degree_type?.toLowerCase().includes('1st'));
        const d23 = degreesList.find((d: any) => d.degree_type?.toLowerCase().includes('2nd') || d.degree_type?.toLowerCase().includes('3rd'));
        const d4 = degreesList.find((d: any) => d.degree_type?.toLowerCase().includes('4th'));
        const dNoble = degreesList.find((d: any) => d.degree_type?.toLowerCase().includes('noble') || d.degree_type?.toLowerCase().includes('5th'));

        const updates: any = {};
        if (!prev.degree1_place && d1) updates.degree1_place = formatDegreeSummary(d1);
        if (!prev.degree23_place && d23) updates.degree23_place = formatDegreeSummary(d23);
        if (!prev.degree4_place && d4) updates.degree4_place = formatDegreeSummary(d4);
        if (!prev.degree_noble_place && dNoble) updates.degree_noble_place = formatDegreeSummary(dNoble);

        return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
      });
    }
  }, [degreesList]);

  // Auto-populate uniform positions from positionsList if empty
  useEffect(() => {
    if (positionsList.length > 0) {
      setForm((prev: any) => {
        if (!prev.uniform_positions) {
          const titles = positionsList.map((p: any) => p.position_title).filter(Boolean).join(', ');
          return titles ? { ...prev, uniform_positions: titles } : prev;
        }
        return prev;
      });
    }
  }, [positionsList]);

  // Fetch relational records if not loaded on initialMember
  useEffect(() => {
    async function loadRelationalData() {
      if (!form.id) return;

      if (degreesList.length === 0) {
        const { data: dData } = await supabase.from('degrees').select('*').eq('member_id', form.id).order('degree_date', { ascending: true });
        if (dData && dData.length > 0) setDegreesList(dData);
      }

      if (positionsList.length === 0) {
        const { data: pData } = await supabase.from('positions').select('*').eq('member_id', form.id);
        if (pData && pData.length > 0) setPositionsList(pData);
      }

      if (!spouseRecord) {
        const { data: sData } = await supabase.from('spouse').select('*').eq('member_id', form.id).maybeSingle();
        if (sData) setSpouseRecord(sData);
      }

      if (dependentsList.length === 0) {
        const { data: depData } = await supabase.from('dependents').select('*').eq('member_id', form.id);
        if (depData && depData.length > 0) setDependentsList(depData);
      }

      if (childrenList.length === 0) {
        const { data: chData } = await supabase.from('children').select('*').eq('member_id', form.id);
        if (chData && chData.length > 0) setChildrenList(chData);
      }
    }
    loadRelationalData();
  }, [form.id, supabase]);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const url = await uploadMemberPhoto(file);
      updateField('photo_url', url);
      setMessage('Photo uploaded successfully.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    async function loadRegions() {
      const { data, error } = await supabase.from('regions').select('region_name').order('region_name');
      if (!error) {
        setRegions((data || []).map((item: any) => item.region_name || '').filter(Boolean));
      }
    }
    loadRegions();
  }, [supabase]);

  function updateField(key: string, value: any) {
    setForm((current: any) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const saved = await saveMember(form);
      setForm(saved);
      setMessage('Record updated successfully.');
      
      const nextUrl = redirectTo || (mode === 'self' ? '/me' : `/registrar/members/${saved.id}`);
      if (nextUrl && !form.id) {
        window.location.href = nextUrl;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="tab-container">
        {TABS.map((tab, i) => (
          <div 
            key={tab} 
            className={`tab ${activeTab === i ? 'tab-active' : ''}`}
            onClick={() => setActiveTab(i)}
          >
            {tab}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {/* TAB 0: BIO */}
        {activeTab === 0 && (
          <div className="grid-cols-2">
            <div style={{ gridColumn: '1 / -1', marginBottom: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ 
                width: 150, 
                height: 150, 
                borderRadius: 12, 
                border: '2px dashed var(--gold)', 
                background: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                cursor: 'pointer',
                position: 'relative'
              }} onClick={() => document.getElementById('photo-input')?.click()}>
                {form.photo_url ? (
                  <img src={form.photo_url} alt="Portrait" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--navy)', opacity: 0.5 }}>
                    <div style={{ fontSize: 40 }}>👤</div>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{uploading ? 'Uploading...' : 'Click to Upload'}</div>
                  </div>
                )}
              </div>
              <input 
                id="photo-input" 
                type="file" 
                accept="image/*" 
                onChange={handlePhotoChange} 
                style={{ display: 'none' }} 
              />
              <button 
                type="button" 
                onClick={() => document.getElementById('photo-input')?.click()}
                style={{ marginTop: 12, fontSize: 13, background: 'none', border: 'none', color: 'var(--navy)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
              >
                Change Portrait Photo
              </button>
            </div>
            <SelectField label="Title" value={form.title} options={TITLES} onChange={(v: string) => updateField('title', v)} />
            <InputField label="Surname" value={form.surname} onChange={(v: string) => updateField('surname', v)} />
            <InputField label="First Name" value={form.first_name} onChange={(v: string) => updateField('first_name', v)} />
            <InputField label="Other Names" value={form.other_names} onChange={(v: string) => updateField('other_names', v)} />
            <InputField label="Date of Birth" type="date" value={form.date_of_birth} onChange={(v: string) => updateField('date_of_birth', v)} />
            <InputField label="Place of Birth" value={form.birth_town} onChange={(v: string) => updateField('birth_town', v)} />
            <SelectField label="Birth Region" value={form.birth_region} options={regions} onChange={(v: string) => updateField('birth_region', v)} />
            <InputField label="Nationality" value={form.nationality} onChange={(v: string) => updateField('nationality', v)} />
            <InputField label="Home Town" value={form.home_town} onChange={(v: string) => updateField('home_town', v)} />
            <SelectField label="Home Region" value={form.home_region} options={regions} onChange={(v: string) => updateField('home_region', v)} />
            <InputField label="Phone" value={form.phone} onChange={(v: string) => updateField('phone', v)} />
            <InputField label="Mobile" value={form.mobile} onChange={(v: string) => updateField('mobile', v)} />
            <InputField label="Email" type="email" value={form.email} onChange={(v: string) => updateField('email', v)} />
            <div className="input-group">
              <label className="label">Residential Address</label>
              <textarea className="textarea" value={form.residential_address || ''} onChange={e => updateField('residential_address', e.target.value)} rows={3} />
            </div>
          </div>
        )}

        {/* TAB 1: FAMILY */}
        {activeTab === 1 && (
          <div className="grid-cols-2">
            <div style={{ gridColumn: '1 / -1', marginBottom: 20, padding: 16, background: 'rgba(212, 175, 55, 0.05)', borderRadius: 12, border: '1px dashed var(--gold)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
               <div>
                 <div style={{ fontWeight: 800, color: 'var(--navy)' }}>Family, Spouse & Dependents Records</div>
                 <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
                   {spouseRecord ? `Spouse: ${spouseRecord.spouse_name || 'Recorded'} ${spouseRecord.spouse_is_sister ? `(${spouseRecord.auxiliary_name || "Ladies' Auxiliary"})` : ''}` : 'No spouse recorded'} • {dependentsList.length} dependent(s) • {childrenList.length} child(ren)
                 </div>
               </div>
               {form.id ? (
                 <div style={{ display: 'flex', gap: 8 }}>
                    <Link href={mode === 'self' ? '/me/family' : `/registrar/members/${form.id}/family`} className="tab tab-active">Manage Family & Dependents →</Link>
                 </div>
               ) : <span style={{ fontSize: 12, fontStyle: 'italic' }}>Save member first to manage family.</span>}
            </div>
            <InputField label="Father's Name" value={form.fathers_name} onChange={(v: string) => updateField('fathers_name', v)} />
            <InputField label="Mother's Name" value={form.mothers_name} onChange={(v: string) => updateField('mothers_name', v)} />
            <SelectField label="Marital Status" value={form.marital_status} options={MARITAL} onChange={(v: string) => updateField('marital_status', v)} />
          </div>
        )}

        {/* TAB 2: EMPLOYMENT */}
        {activeTab === 2 && (
          <div className="grid-cols-2">
            <SelectField label="Employment Status" value={form.emp_status} options={EMP_STATUS} onChange={(v: string) => updateField('emp_status', v)} />
            <InputField label="Occupation" value={form.occupation} onChange={(v: string) => updateField('occupation', v)} />
            <InputField label="Workplace" value={form.workplace} onChange={(v: string) => updateField('workplace', v)} />
            <InputField label="Job Role" value={form.job_status} onChange={(v: string) => updateField('job_status', v)} />
            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
               <label className="label">Work Address</label>
               <textarea className="textarea" value={form.work_address || ''} onChange={e => updateField('work_address', e.target.value)} rows={3} />
            </div>
          </div>
        )}

        {/* TAB 3: DEGREES */}
        {activeTab === 3 && (
          <div className="grid-cols-2">
            <div style={{ gridColumn: '1 / -1', marginBottom: 20, padding: 16, background: 'rgba(212, 175, 55, 0.05)', borderRadius: 12, border: '1px dashed var(--gold)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
               <div>
                 <div style={{ fontWeight: 800, color: 'var(--navy)', fontSize: 15 }}>Detailed Degree & Exemplification Records</div>
                 <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
                   {degreesList.length > 0 
                     ? `${degreesList.length} exemplification record(s) on file. Click 'Manage Degrees' to edit dates, places, or add new degrees.`
                     : 'Manage exemplification history and certificate details.'}
                 </div>
               </div>
               {form.id ? (
                 <Link href={mode === 'self' ? '/me/education' : `/registrar/members/${form.id}/education`} className="tab tab-active">
                   Manage Degrees →
                 </Link>
               ) : <span style={{ fontSize: 12, fontStyle: 'italic' }}>Save member first to manage degrees.</span>}
            </div>

            <InputField 
              label="1st Degree Exemplification" 
              value={form.degree1_place} 
              onChange={(v: string) => updateField('degree1_place', v)} 
              placeholder="e.g. 2002-12-05 — St. Margaret Mary Commandery Dansoman"
            />
            <InputField 
              label="2nd & 3rd Degree" 
              value={form.degree23_place} 
              onChange={(v: string) => updateField('degree23_place', v)} 
              placeholder="e.g. 2006-09-16 — OLAM Community 1 Tema"
            />
            <InputField 
              label="4th Degree" 
              value={form.degree4_place} 
              onChange={(v: string) => updateField('degree4_place', v)} 
              placeholder="e.g. 2013-04-20 — St. Thomas Aquinas - Cantonment"
            />
            <InputField 
              label="Noble Degree" 
              value={form.degree_noble_place} 
              onChange={(v: string) => updateField('degree_noble_place', v)} 
              placeholder="e.g. 2017-09-02 — Holy Spirit Cathedral - Accra"
            />

            {/* STRUCTURED EXEMPLIFICATION RECORDS DISPLAY */}
            {degreesList.length > 0 && (
              <div style={{ gridColumn: '1 / -1', marginTop: 12, padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--navy)', textTransform: 'uppercase', marginBottom: 10, letterSpacing: '0.5px' }}>
                  Recorded Exemplification History
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                  {degreesList.map((d: any, idx: number) => (
                    <div key={d.id || idx} style={{ background: '#ffffff', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1' }}>
                      <strong style={{ fontSize: 13, color: 'var(--navy)', display: 'block' }}>{d.degree_type}</strong>
                      <span style={{ fontSize: 12, color: '#64748b', display: 'block', marginTop: 2 }}>
                        {formatDisplayDate(d.degree_date)}
                      </span>
                      <span style={{ fontSize: 12, color: '#334155', fontWeight: 600, display: 'block', marginTop: 2 }}>
                        {d.degree_place || '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: MILITARY */}
        {activeTab === 4 && (
          <div className="grid-cols-2">
            <div style={{ gridColumn: '1 / -1', marginBottom: 20, padding: 16, background: 'rgba(212, 175, 55, 0.05)', borderRadius: 12, border: '1px dashed var(--gold)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
               <div>
                 <div style={{ fontWeight: 800, color: 'var(--navy)' }}>Uniformed Rank Records & Positions</div>
                 <div style={{ fontSize: 12, opacity: 0.7 }}>Manage commissions, promotions, and service history.</div>
               </div>
               {form.id ? (
                 <Link href={mode === 'self' ? '/me/military' : `/registrar/members/${form.id}/military`} className="tab tab-active">Manage Military & Ranks →</Link>
               ) : <span style={{ fontSize: 12, fontStyle: 'italic' }}>Save member first to manage military.</span>}
            </div>
            <InputField label="Uniformed Position" value={form.uniform_positions} onChange={(v: string) => updateField('uniform_positions', v)} />
            <InputField label="Date Joined KSJI" type="date" value={form.date_joined} onChange={(v: string) => updateField('date_joined', v)} />

            {positionsList.length > 0 && (
              <div style={{ gridColumn: '1 / -1', marginTop: 12, padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--navy)', textTransform: 'uppercase', marginBottom: 10, letterSpacing: '0.5px' }}>
                  Recorded Service Positions ({positionsList.length})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
                  {positionsList.map((p: any, idx: number) => (
                    <div key={p.id || idx} style={{ background: '#ffffff', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}>
                      <strong style={{ fontSize: 13, color: 'var(--navy)', display: 'block' }}>{p.position_title}</strong>
                      <span style={{ fontSize: 11, color: '#64748b' }}>{p.level || 'Local'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: LIFECYCLE */}
        {activeTab === 5 && (
          <div className="grid-cols-2">
            <SelectField 
              label="Membership Status" 
              value={form.status} 
              options={STATUSES} 
              onChange={(v: string) => {
                const today = new Date().toISOString().split('T')[0];
                const prevStatus = form.status;
                updateField('status', v);
                if (v === 'Deceased') updateField('is_deceased', true);
                else updateField('is_deceased', false);

                if (v === 'Suspended') {
                  if (!form.date_of_suspension) {
                    updateField('date_of_suspension', today);
                  }
                  updateField('date_of_reinstatement', null);
                  updateField('date_of_dismissal', null);
                } else if (v === 'Dismissed') {
                  if (!form.date_of_dismissal) {
                    updateField('date_of_dismissal', today);
                  }
                  updateField('date_of_reinstatement', null);
                } else if (v === 'Active') {
                  if (prevStatus === 'Suspended' || prevStatus === 'Dismissed') {
                    updateField('date_of_reinstatement', today);
                  }
                }
              }} 
            />
            {form.status === 'Suspended' && (
              <InputField 
                label="Date of Suspension" 
                type="date" 
                value={form.date_of_suspension} 
                onChange={(v: string) => updateField('date_of_suspension', v)} 
              />
            )}
            {form.status === 'Dismissed' && (
              <InputField 
                label="Date of Dismissal" 
                type="date" 
                value={form.date_of_dismissal} 
                onChange={(v: string) => updateField('date_of_dismissal', v)} 
              />
            )}
            {form.date_of_reinstatement && (
              <InputField 
                label="Date of Reinstatement" 
                type="date" 
                value={form.date_of_reinstatement} 
                onChange={(v: string) => updateField('date_of_reinstatement', v)} 
              />
            )}
            {form.status === 'Deceased' && (
              <>
                <InputField label="Date of Death" type="date" value={form.date_of_death} onChange={(v: string) => updateField('date_of_death', v)} />
                <InputField label="Burial Date" type="date" value={form.burial_date} onChange={(v: string) => updateField('burial_date', v)} />
                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="label">Place of Burial / Cemetery</label>
                  <input className="input" value={form.burial_place || ''} onChange={e => updateField('burial_place', e.target.value)} />
                </div>
              </>
            )}
            <div style={{ gridColumn: '1 / -1', height: 1, background: '#eee', margin: '8px 0' }} />
            <InputField label="Transfer From (Previous Commandery)" value={form.transfer_from} onChange={(v: string) => updateField('transfer_from', v)} />
            <InputField label="Transfer To (New Commandery)" value={form.transfer_to} onChange={(v: string) => updateField('transfer_to', v)} />
            <InputField label="Transfer Date" type="date" value={form.transfer_date} onChange={(v: string) => updateField('transfer_date', v)} />
          </div>
        )}

        <div style={{ marginTop: 24, display: 'flex', gap: 16, alignItems: 'center' }}>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Saving...' : 'Save Profile'}
          </button>
          {message && <span style={{ color: '#1f6f43', fontWeight: 600 }}>✓ {message}</span>}
          {error && <span style={{ color: 'crimson', fontWeight: 600 }}>⚠ {error}</span>}
        </div>
      </form>
    </div>
  );
}

function InputField({ label, value, onChange, type = "text", placeholder = "" }: any) {
  return (
    <div className="input-group">
      <label className="label">{label}</label>
      <input 
        type={type} 
        className="input" 
        value={value || ''} 
        onChange={e => onChange(e.target.value)} 
        placeholder={placeholder}
      />
    </div>
  );
}

function SelectField({ label, value, options, onChange }: any) {
  return (
    <div className="input-group">
      <label className="label">{label}</label>
      <select className="select" value={value || ''} onChange={e => onChange(e.target.value)}>
        <option value="">Select...</option>
        {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
