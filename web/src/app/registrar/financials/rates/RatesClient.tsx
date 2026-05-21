'use client';

import { useState, useEffect, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

type Member = { id: string; first_name: string; surname: string; title: string | null; membership_type: string | null; };
type Assessment = {
  id: string;
  member_id: string;
  year: number;
  arrears_brought_forward: number;
  annual_assessment: number;
  members: Member;
};

export default function RatesAndBillingClient({
  initialYear,
  initialRates,
  initialAssessments,
}: {
  initialYear: number;
  initialRates: any;
  initialAssessments: Assessment[];
}) {
  const supabase = createClient();
  const [year, setYear] = useState(initialYear);
  const [regularRate, setRegularRate] = useState(initialRates?.regular_rate ?? 1050);
  const [socialRate, setSocialRate] = useState(initialRates?.social_rate ?? 700);
  const [studentRate, setStudentRate] = useState(initialRates?.student_rate ?? 350);
  const [assessments, setAssessments] = useState<Assessment[]>(initialAssessments);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editArrears, setEditArrears] = useState('');
  const [editAnnual, setEditAnnual] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  function showToast(msg: string, type: 'ok' | 'err') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleSaveRates() {
    setSaving(true);
    const { error } = await supabase.from('annual_assessment_rates').upsert({
      year, regular_rate: regularRate, social_rate: socialRate, student_rate: studentRate,
    }, { onConflict: 'year' });
    setSaving(false);
    if (error) showToast('Error saving rates: ' + error.message, 'err');
    else showToast('Rates saved successfully!', 'ok');
  }

  async function handleGenerateBills() {
    setGenerating(true);
    try {
      // Check rates saved first
      const { data: rates } = await supabase
        .from('annual_assessment_rates').select('*').eq('year', year).maybeSingle();
      if (!rates) { showToast('Save rates for ' + year + ' before generating bills.', 'err'); setGenerating(false); return; }

      // Fetch active members
      const { data: members } = await supabase
        .from('members')
        .select('id, first_name, surname, date_of_birth, membership_type, status')
        .not('status', 'in', '("Dismissed","Transfer-Out","Deceased")');

      // Fetch prior year balances
      const priorYear = year - 1;
      const { data: priorAss } = await supabase.from('financial_assessments')
        .select('member_id, arrears_brought_forward, annual_assessment').eq('year', priorYear);
      const { data: priorPay } = await supabase.from('financial_payments')
        .select('member_id, amount').eq('assessment_year', priorYear);

      const priorMap: Record<string, number> = {};
      (priorAss || []).forEach((a: any) => { priorMap[a.member_id] = parseFloat(a.arrears_brought_forward) + parseFloat(a.annual_assessment); });
      (priorPay || []).forEach((p: any) => { if (priorMap[p.member_id] !== undefined) priorMap[p.member_id] -= parseFloat(p.amount); });

      const rows = (members || []).map((m: any) => {
        const birthYear = m.date_of_birth ? new Date(m.date_of_birth).getFullYear() : null;
        const age = birthYear ? year - birthYear : 0;
        const discount = age > 80 ? 1.0 : age > 75 ? 0.5 : age > 70 ? 0.25 : 0;
        const base = m.membership_type === 'Social' ? rates.social_rate : m.membership_type === 'Student' ? rates.student_rate : rates.regular_rate;
        const annual = parseFloat((base * (1 - discount)).toFixed(2));
        const arrears = parseFloat((priorMap[m.id] ?? 0).toFixed(2));
        return { member_id: m.id, year, arrears_brought_forward: arrears, annual_assessment: annual };
      });

      const { error } = await supabase.from('financial_assessments')
        .upsert(rows, { onConflict: 'member_id,year', ignoreDuplicates: false });

      if (error) throw error;

      // Reload
      const { data: updated } = await supabase
        .from('financial_assessments')
        .select('*, members(id, first_name, surname, title, membership_type, date_of_birth)')
        .eq('year', year)
        .order('created_at');
      setAssessments((updated || []) as Assessment[]);
      showToast(`Generated bills for ${rows.length} members!`, 'ok');
    } catch (e: any) {
      showToast('Error: ' + e.message, 'err');
    }
    setGenerating(false);
  }

  async function handleSaveEdit(id: string) {
    const { error } = await supabase
      .from('financial_assessments')
      .update({ arrears_brought_forward: parseFloat(editArrears), annual_assessment: parseFloat(editAnnual) })
      .eq('id', id);
    if (error) { showToast('Error updating: ' + error.message, 'err'); return; }
    setAssessments(prev => prev.map(a => a.id === id
      ? { ...a, arrears_brought_forward: parseFloat(editArrears), annual_assessment: parseFloat(editAnnual) }
      : a
    ));
    setEditingId(null);
    showToast('Assessment updated!', 'ok');
  }

  const filtered = assessments.filter(a => {
    const name = `${a.members?.first_name} ${a.members?.surname}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const fmt = (n: number) => `GH¢ ${parseFloat(n as any).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  async function handleYearChange(newYear: number) {
    setYear(newYear);
    // Load rates for new year
    const { data: rates } = await supabase.from('annual_assessment_rates').select('*').eq('year', newYear).maybeSingle();
    if (rates) { setRegularRate(rates.regular_rate); setSocialRate(rates.social_rate); setStudentRate(rates.student_rate); }
    else { setRegularRate(1050); setSocialRate(700); setStudentRate(350); }
    // Load assessments
    const { data: ass } = await supabase
      .from('financial_assessments')
      .select('*, members(id, first_name, surname, title, membership_type, date_of_birth)')
      .eq('year', newYear).order('created_at');
    setAssessments((ass || []) as Assessment[]);
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          background: toast.type === 'ok' ? '#166534' : '#991B1B',
          color: 'white', padding: '14px 24px', borderRadius: 12,
          fontWeight: 700, fontSize: 14, boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
          animation: 'fadeIn 0.2s ease'
        }}>{toast.msg}</div>
      )}

      {/* Year Selector */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div className="label" style={{ marginBottom: 0 }}>Assessment Year</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {years.map(y => (
              <button key={y} onClick={() => handleYearChange(y)}
                className={year === y ? 'tab tab-active' : 'tab'}
                style={{ padding: '8px 18px' }}>{y}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Rate Setup Form */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 20px', color: 'var(--navy)', fontWeight: 800 }}>
          ⚙️ {year} Membership Rates
        </h3>
        <div className="grid-cols-3" style={{ marginBottom: 20 }}>
          <div className="input-group">
            <label className="label">Regular Member Rate (GH¢)</label>
            <input className="input" type="number" value={regularRate}
              onChange={e => setRegularRate(parseFloat(e.target.value))} min={0} step={0.01} />
          </div>
          <div className="input-group">
            <label className="label">Social Member Rate (GH¢)</label>
            <input className="input" type="number" value={socialRate}
              onChange={e => setSocialRate(parseFloat(e.target.value))} min={0} step={0.01} />
          </div>
          <div className="input-group">
            <label className="label">Student Member Rate (GH¢)</label>
            <input className="input" type="number" value={studentRate}
              onChange={e => setStudentRate(parseFloat(e.target.value))} min={0} step={0.01} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={handleSaveRates} disabled={saving} style={{ fontSize: 14 }}>
            {saving ? 'Saving...' : '💾 Save Rates'}
          </button>
          <button onClick={handleGenerateBills} disabled={generating} style={{
            background: generating ? '#9ca3af' : '#16a34a', color: 'white',
            padding: '14px 28px', borderRadius: 12, fontWeight: 800,
            textTransform: 'uppercase', border: 0, cursor: 'pointer', fontSize: 14,
          }}>
            {generating ? 'Generating...' : '⚡ Generate Annual Bills'}
          </button>
        </div>
        <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--grey)' }}>
          ⚠️ Generating bills will apply age discounts automatically (100% over 80, 50% over 75, 25% over 70) and roll prior-year outstanding balances as arrears.
        </p>
      </div>

      {/* Assessments Grid */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <h3 style={{ margin: 0, color: 'var(--navy)', fontWeight: 800 }}>
            {year} Member Assessments ({filtered.length})
          </h3>
          <input className="input" placeholder="Search members..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 240, padding: '10px 14px', fontSize: 13 }} />
        </div>
        {assessments.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--grey)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontWeight: 700 }}>No assessments yet for {year}</div>
            <div style={{ fontSize: 13, marginTop: 8 }}>Save rates above, then click Generate Annual Bills.</div>
          </div>
        ) : (
          <table className="member-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Type</th>
                <th>Age ({year})</th>
                <th>Arrears B/F</th>
                <th>Annual Assessment</th>
                <th>Total Due</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => {
                const m = a.members;
                const birthYear = (m as any)?.date_of_birth ? new Date((m as any).date_of_birth).getFullYear() : null;
                const age = birthYear ? year - birthYear : '—';
                const discount = typeof age === 'number' ? (age > 80 ? '100%' : age > 75 ? '50%' : age > 70 ? '25%' : '') : '';
                const total = parseFloat(a.arrears_brought_forward as any) + parseFloat(a.annual_assessment as any);
                const isEditing = editingId === a.id;

                return (
                  <tr key={a.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{m?.title || 'Bro.'} {m?.first_name} {m?.surname}</div>
                    </td>
                    <td>
                      <span className="badge-blue">{m?.membership_type || 'Regular'}</span>
                    </td>
                    <td>
                      {age}{discount && <span className="badge-gold" style={{ marginLeft: 6 }}>{discount} off</span>}
                    </td>
                    <td>
                      {isEditing
                        ? <input className="input" type="number" value={editArrears} onChange={e => setEditArrears(e.target.value)} style={{ width: 110, padding: '6px 10px', fontSize: 13 }} />
                        : <span style={{ color: parseFloat(a.arrears_brought_forward as any) < 0 ? '#166534' : parseFloat(a.arrears_brought_forward as any) > 0 ? '#991B1B' : 'var(--grey)', fontWeight: 600 }}>{fmt(parseFloat(a.arrears_brought_forward as any))}</span>
                      }
                    </td>
                    <td>
                      {isEditing
                        ? <input className="input" type="number" value={editAnnual} onChange={e => setEditAnnual(e.target.value)} style={{ width: 110, padding: '6px 10px', fontSize: 13 }} />
                        : <span style={{ fontWeight: 600 }}>{fmt(parseFloat(a.annual_assessment as any))}</span>
                      }
                    </td>
                    <td style={{ fontWeight: 800 }}>{fmt(total)}</td>
                    <td style={{ textAlign: 'right' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button onClick={() => handleSaveEdit(a.id)} style={{ background: '#16a34a', color: 'white', border: 0, borderRadius: 6, padding: '6px 14px', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>Save</button>
                          <button onClick={() => setEditingId(null)} style={{ background: 'var(--bg)', color: 'var(--navy)', border: 0, borderRadius: 6, padding: '6px 14px', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingId(a.id); setEditArrears(String(a.arrears_brought_forward)); setEditAnnual(String(a.annual_assessment)); }}
                          style={{ background: 'var(--navy)', color: 'var(--gold)', border: 0, borderRadius: 6, padding: '6px 14px', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
