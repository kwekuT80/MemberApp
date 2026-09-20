'use client';

import React, { useState, useMemo } from 'react';
import { enrollHistoricalBrother, updateMemberArchivalStatus } from '@/services/memberService';

export interface LedgerItem {
  ledgerId: string;
  source: string;
  entryNo: string | null;
  rawName: string;
  title: string;
  firstName: string;
  surname: string;
  dateOfInitiation: string | null;
  cohortYear: string;
  residence: string | null;
  occupation: string | null;
  ageAtInitiation: string | null;
  notes: string | null;
}

export interface DbMemberItem {
  id: string;
  title: string | null;
  first_name: string;
  surname: string;
  other_names?: string | null;
  status: string | null;
  is_deceased?: boolean | null;
  date_joined?: string | null;
  date_of_birth?: string | null;
  occupation?: string | null;
  residential_address?: string | null;
  notes?: string | null;
  transfer_to?: string | null;
  transfer_date?: string | null;
  date_of_death?: string | null;
  burial_place?: string | null;
  burial_date?: string | null;
  date_of_dismissal?: string | null;
}

function clean(str?: string | null) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export default function HistoricalMembersClient({
  initialDbMembers,
  ledgerData
}: {
  initialDbMembers: DbMemberItem[];
  ledgerData: LedgerItem[];
}) {
  const [dbMembers, setDbMembers] = useState<DbMemberItem[]>(initialDbMembers);
  const [activeTab, setActiveTab] = useState<'unregistered' | 'archived' | 'all'>('unregistered');
  
  // Search & Filter
  const [search, setSearch] = useState('');
  const [selectedCohort, setSelectedCohort] = useState('ALL');
  const [archivedFilter, setArchivedFilter] = useState<'ALL' | 'Deceased' | 'Transfer-Out' | 'Dismissed'>('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [form, setForm] = useState<{
    title: string;
    first_name: string;
    surname: string;
    other_names: string;
    date_joined: string;
    status: 'Active' | 'Deceased' | 'Transfer-Out' | 'Dismissed';
    date_of_death: string;
    burial_place: string;
    burial_date: string;
    transfer_to: string;
    transfer_date: string;
    date_of_dismissal: string;
    occupation: string;
    residential_address: string;
    notes: string;
    isExistingId?: string;
  }>({
    title: 'Bro.',
    first_name: '',
    surname: '',
    other_names: '',
    date_joined: '',
    status: 'Deceased',
    date_of_death: '',
    burial_place: '',
    burial_date: '',
    transfer_to: '',
    transfer_date: '',
    date_of_dismissal: '',
    occupation: '',
    residential_address: '',
    notes: ''
  });

  function showToast(text: string, type: 'success' | 'error' = 'success') {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 5000);
  }

  // Cross-reference ledger against current dbMembers
  const { unregisteredLedger, matchedCount } = useMemo(() => {
    let matched = 0;
    const unregistered: LedgerItem[] = [];

    ledgerData.forEach(item => {
      const cName = clean(item.rawName);
      const sName = clean(item.surname);
      const fName = clean(item.firstName);

      const found = dbMembers.find(m => {
        const ms = clean(m.surname);
        const mf = clean(m.first_name);
        if (ms.length >= 3 && mf.length >= 3) {
          if (cName.includes(ms) && cName.includes(mf)) return true;
        }
        if (ms.length >= 3 && sName.length >= 3 && ms === sName) {
          if (mf.length >= 3 && fName.length >= 3 && (mf.includes(fName) || fName.includes(mf))) return true;
        }
        return false;
      });

      if (found) {
        matched++;
      } else {
        unregistered.push(item);
      }
    });

    return { unregisteredLedger: unregistered, matchedCount: matched };
  }, [dbMembers, ledgerData]);

  // Derived lists
  const pastArchivedMembers = useMemo(() => {
    return dbMembers.filter(m => m.status === 'Deceased' || m.is_deceased || m.status === 'Transfer-Out' || m.status === 'Dismissed');
  }, [dbMembers]);

  const deceasedCount = useMemo(() => dbMembers.filter(m => m.status === 'Deceased' || m.is_deceased).length, [dbMembers]);
  const transferCount = useMemo(() => dbMembers.filter(m => m.status === 'Transfer-Out').length, [dbMembers]);
  const dismissedCount = useMemo(() => dbMembers.filter(m => m.status === 'Dismissed').length, [dbMembers]);
  const activeCount = useMemo(() => dbMembers.filter(m => m.status === 'Active').length, [dbMembers]);

  // Unique cohort years
  const cohortYears = useMemo(() => {
    const set = new Set<string>();
    ledgerData.forEach(l => {
      if (l.cohortYear && l.cohortYear !== 'Unknown') set.add(l.cohortYear);
    });
    return Array.from(set).sort();
  }, [ledgerData]);

  // Filtered unregistered ledger
  const filteredUnregistered = useMemo(() => {
    return unregisteredLedger.filter(item => {
      if (selectedCohort !== 'ALL' && item.cohortYear !== selectedCohort) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const n = item.rawName.toLowerCase();
        const o = (item.occupation || '').toLowerCase();
        const r = (item.residence || '').toLowerCase();
        const notes = (item.notes || '').toLowerCase();
        if (!n.includes(q) && !o.includes(q) && !r.includes(q) && !notes.includes(q)) return false;
      }
      return true;
    });
  }, [unregisteredLedger, selectedCohort, search]);

  // Filtered archived past members
  const filteredArchived = useMemo(() => {
    return pastArchivedMembers.filter(m => {
      if (archivedFilter !== 'ALL') {
        if (archivedFilter === 'Deceased' && m.status !== 'Deceased' && !m.is_deceased) return false;
        if (archivedFilter === 'Transfer-Out' && m.status !== 'Transfer-Out') return false;
        if (archivedFilter === 'Dismissed' && m.status !== 'Dismissed') return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const full = ((m.first_name || '') + ' ' + (m.surname || '') + ' ' + (m.other_names || '')).toLowerCase();
        const notes = (m.notes || '').toLowerCase();
        const dest = (m.transfer_to || '').toLowerCase();
        const burial = (m.burial_place || '').toLowerCase();
        if (!full.includes(q) && !notes.includes(q) && !dest.includes(q) && !burial.includes(q)) return false;
      }
      return true;
    });
  }, [pastArchivedMembers, archivedFilter, search]);

  // Quick enroll click
  function openEnroll(item: LedgerItem, status: 'Active' | 'Deceased' | 'Transfer-Out' | 'Dismissed') {
    let noteText = item.notes || '';
    if (item.ageAtInitiation) {
      const ageNote = `Age at initiation: ${item.ageAtInitiation}`;
      noteText = noteText ? `${noteText}; ${ageNote}` : ageNote;
    }
    if (item.source) {
      const srcNote = `Source: ${item.source} (Entry #${item.entryNo || 'N/A'})`;
      noteText = noteText ? `${noteText}; ${srcNote}` : srcNote;
    }

    setForm({
      title: item.title || 'Bro.',
      first_name: item.firstName,
      surname: item.surname,
      other_names: '',
      date_joined: item.dateOfInitiation || '',
      status,
      date_of_death: '',
      burial_place: '',
      burial_date: '',
      transfer_to: '',
      transfer_date: '',
      date_of_dismissal: '',
      occupation: item.occupation || '',
      residential_address: item.residence || '',
      notes: noteText,
      isExistingId: undefined
    });
    setModalOpen(true);
  }

  // Open edit for existing member
  function openEditExisting(member: DbMemberItem) {
    setForm({
      title: member.title || 'Bro.',
      first_name: member.first_name,
      surname: member.surname,
      other_names: member.other_names || '',
      date_joined: member.date_joined || '',
      status: (member.status as any) || (member.is_deceased ? 'Deceased' : 'Active'),
      date_of_death: member.date_of_death || '',
      burial_place: member.burial_place || '',
      burial_date: member.burial_date || '',
      transfer_to: member.transfer_to || '',
      transfer_date: member.transfer_date || '',
      date_of_dismissal: member.date_of_dismissal || '',
      occupation: member.occupation || '',
      residential_address: member.residential_address || '',
      notes: member.notes || '',
      isExistingId: member.id
    });
    setModalOpen(true);
  }

  // Save handler
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.first_name.trim() || !form.surname.trim()) {
      showToast('First Name and Surname are required.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (form.isExistingId) {
        // Update existing member status & archival fields
        const updated = await updateMemberArchivalStatus(form.isExistingId, form.status, {
          date_of_death: form.date_of_death,
          burial_date: form.burial_date,
          burial_place: form.burial_place,
          transfer_to: form.transfer_to,
          transfer_date: form.transfer_date,
          date_of_dismissal: form.date_of_dismissal,
          notes: form.notes
        });

        setDbMembers(prev => prev.map(m => m.id === form.isExistingId ? { ...m, ...updated } : m));
        showToast(`Successfully updated ${form.first_name} ${form.surname} (${form.status})`);
      } else {
        // Enroll new historical brother
        const newRecord = await enrollHistoricalBrother({
          title: form.title,
          first_name: form.first_name,
          surname: form.surname,
          other_names: form.other_names,
          date_joined: form.date_joined,
          status: form.status,
          date_of_death: form.date_of_death,
          burial_date: form.burial_date,
          burial_place: form.burial_place,
          transfer_to: form.transfer_to,
          transfer_date: form.transfer_date,
          date_of_dismissal: form.date_of_dismissal,
          occupation: form.occupation,
          residential_address: form.residential_address,
          notes: form.notes
        });

        setDbMembers(prev => [newRecord, ...prev]);
        showToast(`Enrolled ${form.title} ${form.first_name} ${form.surname} into Supabase as ${form.status}!`);
      }
      setModalOpen(false);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to save record to Supabase.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          color: '#fff',
          fontWeight: 600,
          fontSize: '14px',
          backgroundColor: toastMessage.type === 'success' ? '#137333' : '#c5221f'
        }}>
          {toastMessage.type === 'success' ? '✓ ' : '✕ '} {toastMessage.text}
        </div>
      )}

      {/* KPI Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '14px'
      }}>
        <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Roll Book Records</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{ledgerData.length}</div>
          <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '2px' }}>{matchedCount} matched in DB</div>
        </div>

        <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', border: '1px solid #fecaca', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Unregistered Brothers</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#b91c1c', marginTop: '4px' }}>{unregisteredLedger.length}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Awaiting archival classification</div>
        </div>

        <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', border: '1px solid #fed7aa', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#9a3412', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🕊️ Roll of Honour (Deceased)</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#c2410c', marginTop: '4px' }}>{deceasedCount}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Permanently archived</div>
        </div>

        <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🔄 Transferred Out</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0284c7', marginTop: '4px' }}>{transferCount}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Commandery transfers</div>
        </div>

        <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🚫 Dismissed</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#64748b', marginTop: '4px' }}>{dismissedCount}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Separated records</div>
        </div>

        <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', border: '1px solid #bbf7d0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🟢 Active Members</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>{activeCount}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Current membership</div>
        </div>
      </div>

      {/* Main Tab Navigation Bar */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid #e2e8f0',
        gap: '8px',
        alignItems: 'center',
        background: '#fff',
        padding: '0 16px',
        borderRadius: '8px 8px 0 0'
      }}>
        <button
          onClick={() => setActiveTab('unregistered')}
          style={{
            padding: '12px 18px',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            color: activeTab === 'unregistered' ? '#800020' : '#64748b',
            borderBottom: activeTab === 'unregistered' ? '3px solid #800020' : '3px solid transparent'
          }}
        >
          📖 Unregistered Roll Book Brothers ({unregisteredLedger.length})
        </button>

        <button
          onClick={() => setActiveTab('archived')}
          style={{
            padding: '12px 18px',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            color: activeTab === 'archived' ? '#800020' : '#64748b',
            borderBottom: activeTab === 'archived' ? '3px solid #800020' : '3px solid transparent'
          }}
        >
          🏛️ Roll of Honour &amp; Past Members in DB ({pastArchivedMembers.length})
        </button>

        <button
          onClick={() => setActiveTab('all')}
          style={{
            padding: '12px 18px',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            color: activeTab === 'all' ? '#800020' : '#64748b',
            borderBottom: activeTab === 'all' ? '3px solid #800020' : '3px solid transparent'
          }}
        >
          👥 All Database Members ({dbMembers.length})
        </button>
      </div>

      {/* Filter and Action Controls */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#fff',
        padding: '12px 16px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1, minWidth: '260px' }}>
          <input
            type="text"
            placeholder="Search by name, occupation, residence, or remarks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              maxWidth: '380px',
              padding: '8px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '13px'
            }}
          />
        </div>

        {activeTab === 'unregistered' && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Cohort Year:</span>
            <select
              value={selectedCohort}
              onChange={e => setSelectedCohort(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '13px',
                background: '#fff'
              }}
            >
              <option value="ALL">All Cohorts ({unregisteredLedger.length})</option>
              {cohortYears.map(yr => (
                <option key={yr} value={yr}>Cohort {yr}</option>
              ))}
            </select>
          </div>
        )}

        {activeTab === 'archived' && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Status Filter:</span>
            <select
              value={archivedFilter}
              onChange={e => setArchivedFilter(e.target.value as any)}
              style={{
                padding: '8px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '13px',
                background: '#fff'
              }}
            >
              <option value="ALL">All Past Members ({pastArchivedMembers.length})</option>
              <option value="Deceased">🕊️ Roll of Honour / Deceased ({deceasedCount})</option>
              <option value="Transfer-Out">🔄 Transferred Out ({transferCount})</option>
              <option value="Dismissed">🚫 Dismissed ({dismissedCount})</option>
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: UNREGISTERED ROLL BOOK BROTHERS */}
      {activeTab === 'unregistered' && (
        <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                  <th style={{ padding: '10px 14px', width: '70px' }}>Entry #</th>
                  <th style={{ padding: '10px 14px' }}>Transcribed Name</th>
                  <th style={{ padding: '10px 14px' }}>Initiation Date</th>
                  <th style={{ padding: '10px 14px' }}>Location &amp; Profile</th>
                  <th style={{ padding: '10px 14px' }}>Ledger Remarks</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', minWidth: '320px' }}>Direct Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUnregistered.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                      No unregistered historical entries found matching this search.
                    </td>
                  </tr>
                ) : (
                  filteredUnregistered.map((item, idx) => (
                    <tr key={item.ledgerId} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '10px 14px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>
                        {item.entryNo ? `#${item.entryNo}` : '—'}
                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>{item.source.includes('Batch') ? 'Batch 2' : 'Append'}</div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                          <span style={{ fontSize: '11px', color: '#800020', background: '#fdf2f2', padding: '2px 6px', borderRadius: '4px', marginRight: '6px' }}>{item.title}</span>
                          {item.rawName}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          Parsed: {item.surname}, {item.firstName}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontWeight: 600, color: '#334155' }}>{item.dateOfInitiation || 'Date Unknown'}</span>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Cohort: {item.cohortYear}</div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {item.residence && <div style={{ fontSize: '12px' }}>📍 {item.residence}</div>}
                        {item.occupation && <div style={{ fontSize: '12px', color: '#475569' }}>💼 {item.occupation}</div>}
                        {item.ageAtInitiation && <div style={{ fontSize: '11px', color: '#64748b' }}>Age at entry: {item.ageAtInitiation}</div>}
                        {!item.residence && !item.occupation && <span style={{ color: '#94a3b8', fontSize: '12px' }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#64748b', fontSize: '12px', maxWidth: '220px' }}>
                        {item.notes || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => openEnroll(item, 'Deceased')}
                            title="Enroll directly into Roll of Honour (Deceased)"
                            style={{
                              background: '#fef2f2',
                              color: '#991b1b',
                              border: '1px solid #fecaca',
                              borderRadius: '4px',
                              padding: '5px 10px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            🕊️ Roll of Honour
                          </button>
                          <button
                            onClick={() => openEnroll(item, 'Transfer-Out')}
                            title="Enroll as Transferred Out"
                            style={{
                              background: '#f0f9ff',
                              color: '#0369a1',
                              border: '1px solid #bae6fd',
                              borderRadius: '4px',
                              padding: '5px 10px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            🔄 Transfer
                          </button>
                          <button
                            onClick={() => openEnroll(item, 'Dismissed')}
                            title="Enroll as Dismissed"
                            style={{
                              background: '#f8fafc',
                              color: '#475569',
                              border: '1px solid #cbd5e1',
                              borderRadius: '4px',
                              padding: '5px 10px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            🚫 Dismissed
                          </button>
                          <button
                            onClick={() => openEnroll(item, 'Active')}
                            title="Edit or Enroll with Custom Details"
                            style={{
                              background: '#800020',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '5px 12px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            ✏️ Edit &amp; Enroll
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ROLL OF HONOUR & PAST MEMBERS IN DB */}
      {activeTab === 'archived' && (
        <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                  <th style={{ padding: '10px 14px' }}>Member Name</th>
                  <th style={{ padding: '10px 14px' }}>Archival Status</th>
                  <th style={{ padding: '10px 14px' }}>Date Joined / Initiated</th>
                  <th style={{ padding: '10px 14px' }}>Archival Details &amp; Records</th>
                  <th style={{ padding: '10px 14px' }}>Notes / Remarks</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredArchived.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                      No archived past members found matching this filter.
                    </td>
                  </tr>
                ) : (
                  filteredArchived.map((m, idx) => {
                    const isDeceased = m.status === 'Deceased' || m.is_deceased;
                    return (
                      <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>
                            {m.title ? `${m.title} ` : ''}{m.first_name} {m.surname}
                          </div>
                          {m.occupation && <div style={{ fontSize: '12px', color: '#64748b' }}>{m.occupation}</div>}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {isDeceased && (
                            <span style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                              🕊️ Roll of Honour (Deceased)
                            </span>
                          )}
                          {m.status === 'Transfer-Out' && (
                            <span style={{ background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                              🔄 Transferred Out
                            </span>
                          )}
                          {m.status === 'Dismissed' && (
                            <span style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                              🚫 Dismissed
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {m.date_joined || '—'}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: '12px' }}>
                          {isDeceased && (
                            <div>
                              {m.date_of_death && <div>Died: {m.date_of_death}</div>}
                              {m.burial_place && <div>Burial: {m.burial_place}</div>}
                              {!m.date_of_death && !m.burial_place && <span style={{ color: '#94a3b8' }}>Archived Memorial</span>}
                            </div>
                          )}
                          {m.status === 'Transfer-Out' && (
                            <div>
                              {m.transfer_to && <div>To: {m.transfer_to}</div>}
                              {m.transfer_date && <div>Date: {m.transfer_date}</div>}
                              {!m.transfer_to && !m.transfer_date && <span style={{ color: '#94a3b8' }}>Transferred</span>}
                            </div>
                          )}
                          {m.status === 'Dismissed' && (
                            <div>
                              {m.date_of_dismissal ? `Dismissed: ${m.date_of_dismissal}` : 'Dismissed Record'}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#64748b', fontSize: '12px' }}>
                          {m.notes || '—'}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                          <button
                            onClick={() => openEditExisting(m)}
                            style={{
                              background: '#fff',
                              color: '#0f172a',
                              border: '1px solid #cbd5e1',
                              borderRadius: '4px',
                              padding: '5px 12px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            ✏️ Edit Status / Info
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ALL DATABASE MEMBERS */}
      {activeTab === 'all' && (
        <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                  <th style={{ padding: '10px 14px' }}>Member</th>
                  <th style={{ padding: '10px 14px' }}>Current Status</th>
                  <th style={{ padding: '10px 14px' }}>Initiation Date</th>
                  <th style={{ padding: '10px 14px' }}>Occupation &amp; Address</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Quick Status Change</th>
                </tr>
              </thead>
              <tbody>
                {dbMembers
                  .filter(m => {
                    if (!search.trim()) return true;
                    const q = search.toLowerCase();
                    const full = `${m.first_name || ''} ${m.surname || ''} ${m.status || ''}`.toLowerCase();
                    return full.includes(q);
                  })
                  .map((m, idx) => (
                    <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>
                          {m.title ? `${m.title} ` : ''}{m.first_name} {m.surname}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: m.status === 'Active' ? '#ecfdf5' : (m.status === 'Deceased' ? '#fef2f2' : '#f8fafc'),
                          color: m.status === 'Active' ? '#065f46' : (m.status === 'Deceased' ? '#991b1b' : '#475569'),
                          border: m.status === 'Active' ? '1px solid #a7f3d0' : (m.status === 'Deceased' ? '1px solid #fecaca' : '1px solid #cbd5e1')
                        }}>
                          {m.status || 'Active'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#334155' }}>
                        {m.date_joined || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '12px', color: '#475569' }}>
                        {m.occupation || m.residential_address ? (
                          <div>
                            {m.occupation && <div>💼 {m.occupation}</div>}
                            {m.residential_address && <div>📍 {m.residential_address}</div>}
                          </div>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <button
                          onClick={() => openEditExisting(m)}
                          style={{
                            background: '#fff',
                            color: '#800020',
                            border: '1px solid #800020',
                            borderRadius: '4px',
                            padding: '4px 10px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Change Status / Edit
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ENROLL & EDIT MODAL */}
      {modalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '10px',
            width: '100%',
            maxWidth: '640px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#800020', fontWeight: 800 }}>
                  {form.isExistingId ? 'Update Member Archival Status' : 'Enroll Historical Brother to Supabase'}
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  {form.isExistingId
                    ? 'Modify archival status, destination, or memorial details in Supabase.'
                    : 'Add this roll book brother permanently to Commandery records.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Name Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Title</label>
                  <select
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                  >
                    <option value="Bro.">Bro.</option>
                    <option value="N/B">N/B</option>
                    <option value="Sir">Sir</option>
                    <option value="Rev.">Rev.</option>
                    <option value="Dr.">Dr.</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>First Name *</label>
                  <input
                    type="text"
                    required
                    value={form.first_name}
                    onChange={e => setForm({ ...form, first_name: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Surname *</label>
                  <input
                    type="text"
                    required
                    value={form.surname}
                    onChange={e => setForm({ ...form, surname: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* Status Selector & Initiation Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Classification Status *</label>
                  <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value as any })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', fontWeight: 700 }}
                  >
                    <option value="Deceased">🕊️ Roll of Honour (Deceased)</option>
                    <option value="Transfer-Out">🔄 Transferred Out</option>
                    <option value="Dismissed">🚫 Dismissed / Resigned</option>
                    <option value="Active">🟢 Active</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Date of Initiation</label>
                  <input
                    type="date"
                    value={form.date_joined}
                    onChange={e => setForm({ ...form, date_joined: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* Conditional: Deceased Fields */}
              {form.status === 'Deceased' && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#991b1b', marginBottom: '4px' }}>Date of Death (if known)</label>
                    <input
                      type="date"
                      value={form.date_of_death}
                      onChange={e => setForm({ ...form, date_of_death: e.target.value })}
                      style={{ width: '100%', padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#991b1b', marginBottom: '4px' }}>Burial Place / Cemetery</label>
                    <input
                      type="text"
                      placeholder="e.g. Osu Cemetery / Home town"
                      value={form.burial_place}
                      onChange={e => setForm({ ...form, burial_place: e.target.value })}
                      style={{ width: '100%', padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px' }}
                    />
                  </div>
                </div>
              )}

              {/* Conditional: Transfer Fields */}
              {form.status === 'Transfer-Out' && (
                <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px', padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#0369a1', marginBottom: '4px' }}>Transfer Destination Commandery</label>
                    <input
                      type="text"
                      placeholder="e.g. Commandery #456 Kumasi"
                      value={form.transfer_to}
                      onChange={e => setForm({ ...form, transfer_to: e.target.value })}
                      style={{ width: '100%', padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#0369a1', marginBottom: '4px' }}>Transfer Date</label>
                    <input
                      type="date"
                      value={form.transfer_date}
                      onChange={e => setForm({ ...form, transfer_date: e.target.value })}
                      style={{ width: '100%', padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px' }}
                    />
                  </div>
                </div>
              )}

              {/* Conditional: Dismissed Fields */}
              {form.status === 'Dismissed' && (
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Date of Dismissal / Separation</label>
                  <input
                    type="date"
                    value={form.date_of_dismissal}
                    onChange={e => setForm({ ...form, date_of_dismissal: e.target.value })}
                    style={{ width: '100%', maxWidth: '240px', padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px' }}
                  />
                </div>
              )}

              {/* Profile details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Occupation</label>
                  <input
                    type="text"
                    value={form.occupation}
                    onChange={e => setForm({ ...form, occupation: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Residence</label>
                  <input
                    type="text"
                    value={form.residential_address}
                    onChange={e => setForm({ ...form, residential_address: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Historical Notes &amp; Ledger Remarks</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: '#800020',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 20px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1
                  }}
                >
                  {submitting ? 'Saving to Supabase...' : (form.isExistingId ? 'Save Changes' : 'Enroll Member to Supabase')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
