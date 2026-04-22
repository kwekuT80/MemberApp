'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Member } from '@/types/member';
import { saveMember } from '@/services/memberService';
import { uploadMemberPhoto } from '@/services/photoService';


interface Props {
  initialMember: Member | null;
  mode: 'self' | 'registrar';
  redirectTo?: string;
}

const TITLES = ['Bro.', 'Sir', 'Rev.', 'Dr.', 'Prof.', 'N/B'];
const MARITAL = ['Married', 'Single', 'Widowed', 'Religious', 'Separated'];
const EMP_STATUS = ['Employed', 'Self-employed', 'Unemployed', 'Student', 'Other'];
const STATUSES = ['Active', 'Suspended', 'Dismissed', 'Transfer-In', 'Transfer-Out', 'Deceased'];

const TABS = ['Bio', 'Family', 'Employment', 'Degrees', 'Military', 'Lifecycle'];

export default function MemberMainForm({ initialMember, mode, redirectTo }: Props) {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState(0);
  const [form, setForm] = useState<any>(initialMember || { status: 'Active' });
  const [regions, setRegions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

        {activeTab === 1 && (
          <div className="grid-cols-2">
            <div style={{ gridColumn: '1 / -1', marginBottom: 20, padding: 16, background: 'rgba(212, 175, 55, 0.05)', borderRadius: 12, border: '1px dashed var(--gold)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div>
                 <div style={{ fontWeight: 800, color: 'var(--navy)' }}>Family & Dependents</div>
                 <div style={{ fontSize: 12, opacity: 0.7 }}>Manage spouse details and children records.</div>
               </div>
               {form.id ? (
                 <div style={{ display: 'flex', gap: 8 }}>
                   <Link href={`/registrar/members/${form.id}/family`} className="tab tab-active">Manage Family →</Link>
                 </div>
               ) : <span style={{ fontSize: 12, fontStyle: 'italic' }}>Save member first to manage family.</span>}
            </div>
            <InputField label="Father's Name" value={form.fathers_name} onChange={(v: string) => updateField('fathers_name', v)} />
            <InputField label="Mother's Name" value={form.mothers_name} onChange={(v: string) => updateField('mothers_name', v)} />
            <SelectField label="Marital Status" value={form.marital_status} options={MARITAL} onChange={(v: string) => updateField('marital_status', v)} />
          </div>
        )}

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

        {activeTab === 3 && (
          <div className="grid-cols-2">
            <div style={{ gridColumn: '1 / -1', marginBottom: 20, padding: 16, background: 'rgba(212, 175, 55, 0.05)', borderRadius: 12, border: '1px dashed var(--gold)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div>
                 <div style={{ fontWeight: 800, color: 'var(--navy)' }}>Detailed Degree Records</div>
                 <div style={{ fontSize: 12, opacity: 0.7 }}>Manage exemplification history and certificate details.</div>
               </div>
               {form.id ? (
                 <Link href={`/registrar/members/${form.id}/education`} className="tab tab-active">Manage Degrees →</Link>
               ) : <span style={{ fontSize: 12, fontStyle: 'italic' }}>Save member first to manage degrees.</span>}
            </div>
            <InputField label="1st Degree Exemplification" value={form.degree1_place} onChange={(v: string) => updateField('degree1_place', v)} />
            <InputField label="2nd & 3rd Degree" value={form.degree23_place} onChange={(v: string) => updateField('degree23_place', v)} />
            <InputField label="4th Degree" value={form.degree4_place} onChange={(v: string) => updateField('degree4_place', v)} />
            <InputField label="Noble Degree" value={form.degree_noble_place} onChange={(v: string) => updateField('degree_noble_place', v)} />
          </div>
        )}

        {activeTab === 4 && (
          <div className="grid-cols-2">
            <div style={{ gridColumn: '1 / -1', marginBottom: 20, padding: 16, background: 'rgba(212, 175, 55, 0.05)', borderRadius: 12, border: '1px dashed var(--gold)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div>
                 <div style={{ fontWeight: 800, color: 'var(--navy)' }}>Uniformed Rank Records</div>
                 <div style={{ fontSize: 12, opacity: 0.7 }}>Manage commissions, promotions, and service history.</div>
               </div>
               {form.id ? (
                 <Link href={`/registrar/members/${form.id}/military`} className="tab tab-active">Manage Military →</Link>
               ) : <span style={{ fontSize: 12, fontStyle: 'italic' }}>Save member first to manage military.</span>}
            </div>
            <InputField label="Uniformed Position" value={form.uniform_positions} onChange={(v: string) => updateField('uniform_positions', v)} />
            <InputField label="Date Joined KSJI" type="date" value={form.date_joined} onChange={(v: string) => updateField('date_joined', v)} />
          </div>
        )}

        {activeTab === 5 && (
          <div className="grid-cols-2">
            <SelectField 
              label="Membership Status" 
              value={form.status} 
              options={STATUSES} 
              onChange={(v: string) => {
                updateField('status', v);
                if (v === 'Deceased') updateField('is_deceased', true);
                else updateField('is_deceased', false);
              }} 
            />
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

function InputField({ label, value, onChange, type = "text" }: any) {
  return (
    <div className="input-group">
      <label className="label">{label}</label>
      <input 
        type={type} 
        className="input" 
        value={value || ''} 
        onChange={e => onChange(e.target.value)} 
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
