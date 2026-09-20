'use client';

import React, { useState, useMemo } from 'react';
import {
  enrollHistoricalBrother,
  updateMemberArchivalStatus,
  updateRollBookEntry,
  linkRollBookToExistingMember,
  unlinkRollBookEntry
} from '@/services/memberService';

export interface LedgerItem {
  id?: string;
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
  enrolledMemberId?: string | null;
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

// Levenshtein / fuzzy similarity helper for smart typo detection (e.g. Ditse vs Dotse)
function isSimilar(s1: string, s2: string): boolean {
  if (!s1 || !s2) return false;
  if (s1 === s2) return true;
  if (s1.includes(s2) || s2.includes(s1)) return true;
  if (s1.length >= 4 && s2.length >= 4) {
    let diff = 0;
    const minLen = Math.min(s1.length, s2.length);
    if (Math.abs(s1.length - s2.length) > 2) return false;
    for (let i = 0; i < minLen; i++) {
      if (s1[i] !== s2[i]) diff++;
    }
    return diff <= 2;
  }
  return false;
}

export default function HistoricalMembersClient({
  initialDbMembers,
  ledgerData: initialLedger
}: {
  initialDbMembers: DbMemberItem[];
  ledgerData: LedgerItem[];
}) {
  const [dbMembers, setDbMembers] = useState<DbMemberItem[]>(initialDbMembers);
  const [ledger, setLedger] = useState<LedgerItem[]>(initialLedger);
  const [activeTab, setActiveTab] = useState<'unregistered' | 'matched' | 'archived' | 'all'>('unregistered');
  
  // Search & Filter
  const [search, setSearch] = useState('');
  const [selectedCohort, setSelectedCohort] = useState('ALL');
  const [archivedFilter, setArchivedFilter] = useState<'ALL' | 'Deceased' | 'Transfer-Out' | 'Dismissed'>('ALL');

  // Modals
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [existingModalOpen, setExistingModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Selected item for Edit or Enroll
  const [selectedItem, setSelectedItem] = useState<LedgerItem | null>(null);

  // Edit Roll Book Form State
  const [editForm, setEditForm] = useState<{
    id: string;
    raw_name: string;
    title: string;
    first_name: string;
    surname: string;
    date_of_initiation: string;
    cohort_year: string;
    residence: string;
    occupation: string;
    age_at_initiation: string;
    notes: string;
    selectedLinkMemberId: string;
  }>({
    id: '',
    raw_name: '',
    title: 'Bro.',
    first_name: '',
    surname: '',
    date_of_initiation: '',
    cohort_year: '',
    residence: '',
    occupation: '',
    age_at_initiation: '',
    notes: '',
    selectedLinkMemberId: ''
  });

  // Enroll Form State
  const [enrollForm, setEnrollForm] = useState<{
    rollBookId?: string;
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

  // Existing member status edit
  const [existingForm, setExistingForm] = useState<{
    id: string;
    name: string;
    status: 'Active' | 'Deceased' | 'Transfer-Out' | 'Dismissed';
    date_of_death: string;
    burial_place: string;
    burial_date: string;
    transfer_to: string;
    transfer_date: string;
    date_of_dismissal: string;
    notes: string;
  }>({
    id: '',
    name: '',
    status: 'Active',
    date_of_death: '',
    burial_place: '',
    burial_date: '',
    transfer_to: '',
    transfer_date: '',
    date_of_dismissal: '',
    notes: ''
  });

  function showToast(text: string, type: 'success' | 'error' = 'success') {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 5000);
  }

  // Find candidate matches for any ledger item
  function getCandidateMatches(item: LedgerItem): DbMemberItem[] {
    const sName = clean(item.surname);
    const fName = clean(item.firstName);
    const raw = clean(item.rawName);

    return dbMembers.filter(m => {
      const ms = clean(m.surname);
      const mf = clean(m.first_name);

      // Explicit ID link
      if (item.enrolledMemberId && item.enrolledMemberId === m.id) return true;

      // Exact surname and first name
      if (ms.length >= 3 && mf.length >= 3 && ms === sName && mf === fName) return true;

      // Surname similar (e.g. Ditse vs Dotse) and first name matches or is similar
      if (isSimilar(ms, sName) && (isSimilar(mf, fName) || mf.includes(fName) || fName.includes(mf))) return true;

      // Combined raw string match
      if (raw.includes(ms) && raw.includes(mf)) return true;

      return false;
    });
  }

  // Cross-reference ledger against current dbMembers
  const { unregisteredLedger, matchedLedger } = useMemo(() => {
    const unregistered: { item: LedgerItem; candidateMatches: DbMemberItem[] }[] = [];
    const matched: { item: LedgerItem; linkedMember?: DbMemberItem }[] = [];

    ledger.forEach(item => {
      // If explicitly linked by foreign key
      if (item.enrolledMemberId) {
        const found = dbMembers.find(m => m.id === item.enrolledMemberId);
        matched.push({ item, linkedMember: found });
        return;
      }

      // Check candidate matches
      const candidates = getCandidateMatches(item);
      if (candidates.length === 1 && (clean(candidates[0].surname) === clean(item.surname) && clean(candidates[0].first_name) === clean(item.firstName))) {
        // Direct clean match
        matched.push({ item, linkedMember: candidates[0] });
      } else {
        // Unregistered, with any potential suggestions
        unregistered.push({ item, candidateMatches: candidates });
      }
    });

    return { unregisteredLedger: unregistered, matchedLedger: matched };
  }, [ledger, dbMembers]);

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
    ledger.forEach(l => {
      if (l.cohortYear && l.cohortYear !== 'Unknown') set.add(l.cohortYear);
    });
    return Array.from(set).sort();
  }, [ledger]);

  // Filtered unregistered ledger
  const filteredUnregistered = useMemo(() => {
    return unregisteredLedger.filter(({ item }) => {
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

  // ================= ACTION HANDLERS =================

  // 1. Open Edit Roll Book Entry Modal (ONLY edits ledger entry & allows linking)
  function openEditModal(item: LedgerItem) {
    setSelectedItem(item);
    const candidates = getCandidateMatches(item);
    const defaultLink = candidates.length > 0 ? candidates[0].id : '';

    setEditForm({
      id: item.id || '',
      raw_name: item.rawName,
      title: item.title || 'Bro.',
      first_name: item.firstName,
      surname: item.surname,
      date_of_initiation: item.dateOfInitiation || '',
      cohort_year: item.cohortYear || '',
      residence: item.residence || '',
      occupation: item.occupation || '',
      age_at_initiation: item.ageAtInitiation || '',
      notes: item.notes || '',
      selectedLinkMemberId: defaultLink
    });
    setEditModalOpen(true);
  }

  // 2. Open Enroll as New Member Modal
  function openEnrollModal(item: LedgerItem, presetStatus: 'Active' | 'Deceased' | 'Transfer-Out' | 'Dismissed' = 'Deceased') {
    setSelectedItem(item);
    let noteText = item.notes || '';
    if (item.ageAtInitiation) {
      const ageNote = `Age at initiation: ${item.ageAtInitiation}`;
      noteText = noteText ? `${noteText}; ${ageNote}` : ageNote;
    }
    if (item.source) {
      const srcNote = `Source: ${item.source} (Entry #${item.entryNo || 'N/A'})`;
      noteText = noteText ? `${noteText}; ${srcNote}` : srcNote;
    }

    setEnrollForm({
      rollBookId: item.id,
      title: item.title || 'Bro.',
      first_name: item.firstName,
      surname: item.surname,
      other_names: '',
      date_joined: item.dateOfInitiation || '',
      status: presetStatus,
      date_of_death: '',
      burial_place: '',
      burial_date: '',
      transfer_to: '',
      transfer_date: '',
      date_of_dismissal: '',
      occupation: item.occupation || '',
      residential_address: item.residence || '',
      notes: noteText
    });
    setEnrollModalOpen(true);
  }

  // 3. Open Existing Member Status Edit Modal
  function openExistingModal(m: DbMemberItem) {
    setExistingForm({
      id: m.id,
      name: `${m.title ? m.title + ' ' : ''}${m.first_name} ${m.surname}`,
      status: (m.status as any) || (m.is_deceased ? 'Deceased' : 'Active'),
      date_of_death: m.date_of_death || '',
      burial_place: m.burial_place || '',
      burial_date: m.burial_date || '',
      transfer_to: m.transfer_to || '',
      transfer_date: m.transfer_date || '',
      date_of_dismissal: m.date_of_dismissal || '',
      notes: m.notes || ''
    });
    setExistingModalOpen(true);
  }

  // Save Roll Book Corrections (Updates roll_book_entries table ONLY)
  async function handleSaveRollBookEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editForm.id) {
      showToast('Record ID not found in Supabase table.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const updated = await updateRollBookEntry(editForm.id, {
        raw_name: editForm.raw_name,
        title: editForm.title,
        first_name: editForm.first_name,
        surname: editForm.surname,
        date_of_initiation: editForm.date_of_initiation || null,
        cohort_year: editForm.cohort_year || (editForm.date_of_initiation ? editForm.date_of_initiation.substring(0, 4) : 'Unknown'),
        residence: editForm.residence || null,
        occupation: editForm.occupation || null,
        age_at_initiation: editForm.age_at_initiation || null,
        notes: editForm.notes || null
      });

      // Update local state
      setLedger(prev => prev.map(l => l.id === editForm.id ? {
        ...l,
        rawName: editForm.raw_name,
        title: editForm.title,
        firstName: editForm.first_name,
        surname: editForm.surname,
        dateOfInitiation: editForm.date_of_initiation || null,
        cohortYear: editForm.cohort_year,
        residence: editForm.residence || null,
        occupation: editForm.occupation || null,
        ageAtInitiation: editForm.age_at_initiation || null,
        notes: editForm.notes || null
      } : l));

      showToast(`Corrected roll book record for: ${editForm.first_name} ${editForm.surname}`);
      setEditModalOpen(false);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to update roll book record.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  // Link Roll Book Entry to Existing Member
  async function handleLinkMember(memberId: string) {
    if (!selectedItem?.id) return;
    setSubmitting(true);
    try {
      await linkRollBookToExistingMember(selectedItem.id, memberId, true);
      
      // Update local state
      setLedger(prev => prev.map(l => l.id === selectedItem.id ? { ...l, enrolledMemberId: memberId } : l));
      
      const targetMember = dbMembers.find(m => m.id === memberId);
      showToast(`Linked roll book entry "${selectedItem.rawName}" to registered member: ${targetMember?.first_name} ${targetMember?.surname}!`);
      setEditModalOpen(false);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to link record.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  // Unlink Roll Book Entry
  async function handleUnlink(rollBookId: string) {
    setSubmitting(true);
    try {
      await unlinkRollBookEntry(rollBookId);
      setLedger(prev => prev.map(l => l.id === rollBookId ? { ...l, enrolledMemberId: null } : l));
      showToast('Unlinked roll book record.');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to unlink record.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  // Submit New Member Enrollment
  async function handleEnrollSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!enrollForm.first_name.trim() || !enrollForm.surname.trim()) {
      showToast('First Name and Surname are required.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const newRecord = await enrollHistoricalBrother({
        rollBookId: enrollForm.rollBookId,
        title: enrollForm.title,
        first_name: enrollForm.first_name,
        surname: enrollForm.surname,
        other_names: enrollForm.other_names,
        date_joined: enrollForm.date_joined,
        status: enrollForm.status,
        date_of_death: enrollForm.date_of_death,
        burial_date: enrollForm.burial_date,
        burial_place: enrollForm.burial_place,
        transfer_to: enrollForm.transfer_to,
        transfer_date: enrollForm.transfer_date,
        date_of_dismissal: enrollForm.date_of_dismissal,
        occupation: enrollForm.occupation,
        residential_address: enrollForm.residential_address,
        notes: enrollForm.notes
      });

      setDbMembers(prev => [newRecord, ...prev]);
      if (enrollForm.rollBookId) {
        setLedger(prev => prev.map(l => l.id === enrollForm.rollBookId ? { ...l, enrolledMemberId: newRecord.id } : l));
      }

      showToast(`Enrolled ${enrollForm.title} ${enrollForm.first_name} ${enrollForm.surname} as ${enrollForm.status}!`);
      setEnrollModalOpen(false);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to enroll member.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  // Submit Existing Member Status Change
  async function handleExistingSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const updated = await updateMemberArchivalStatus(existingForm.id, existingForm.status, {
        date_of_death: existingForm.date_of_death,
        burial_date: existingForm.burial_date,
        burial_place: existingForm.burial_place,
        transfer_to: existingForm.transfer_to,
        transfer_date: existingForm.transfer_date,
        date_of_dismissal: existingForm.date_of_dismissal,
        notes: existingForm.notes
      });

      setDbMembers(prev => prev.map(m => m.id === existingForm.id ? { ...m, ...updated } : m));
      showToast(`Updated status for ${existingForm.name} to ${existingForm.status}`);
      setExistingModalOpen(false);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to update member status.', 'error');
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
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{ledger.length}</div>
          <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '2px' }}>{matchedLedger.length} matched / linked</div>
        </div>

        <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', border: '1px solid #fecaca', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Unregistered Records</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#b91c1c', marginTop: '4px' }}>{unregisteredLedger.length}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Awaiting edit, match or enrollment</div>
        </div>

        <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', border: '1px solid #fed7aa', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#9a3412', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🕊️ Roll of Honour (Deceased)</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#c2410c', marginTop: '4px' }}>{deceasedCount}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Permanent memorial roll</div>
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
          📖 Unregistered Roll Book Records ({unregisteredLedger.length})
        </button>

        <button
          onClick={() => setActiveTab('matched')}
          style={{
            padding: '12px 18px',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            color: activeTab === 'matched' ? '#800020' : '#64748b',
            borderBottom: activeTab === 'matched' ? '3px solid #800020' : '3px solid transparent'
          }}
        >
          🔗 Matched &amp; Linked Records ({matchedLedger.length})
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

      {/* TAB 1: UNREGISTERED ROLL BOOK RECORDS */}
      {activeTab === 'unregistered' && (
        <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                  <th style={{ padding: '10px 14px', width: '70px' }}>Entry #</th>
                  <th style={{ padding: '10px 14px' }}>Transcribed Name &amp; Match Detection</th>
                  <th style={{ padding: '10px 14px' }}>Initiation Date</th>
                  <th style={{ padding: '10px 14px' }}>Location &amp; Profile</th>
                  <th style={{ padding: '10px 14px' }}>Ledger Remarks</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', minWidth: '360px' }}>Split Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUnregistered.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                      No unregistered roll book entries found matching this filter.
                    </td>
                  </tr>
                ) : (
                  filteredUnregistered.map(({ item, candidateMatches }, idx) => (
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

                        {/* Candidate Match Suggestion Tag */}
                        {candidateMatches.length > 0 && (
                          <div style={{ marginTop: '4px', fontSize: '11px', color: '#0369a1', background: '#f0f9ff', padding: '3px 8px', borderRadius: '4px', border: '1px solid #bae6fd', display: 'inline-block' }}>
                            💡 Suggested DB Match: <strong>{candidateMatches[0].first_name} {candidateMatches[0].surname}</strong> ({candidateMatches[0].status})
                          </div>
                        )}
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
                      <td style={{ padding: '10px 14px', color: '#64748b', fontSize: '12px', maxWidth: '200px' }}>
                        {item.notes || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {/* EDIT RECORD (Correct spelling, etc.) */}
                          <button
                            onClick={() => openEditModal(item)}
                            title="Edit name typo or link to an existing registered member"
                            style={{
                              background: '#f8fafc',
                              color: '#1e293b',
                              border: '1px solid #cbd5e1',
                              borderRadius: '4px',
                              padding: '5px 10px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            ✏️ Edit Record
                          </button>

                          {/* Quick Link Button if candidate match exists */}
                          {candidateMatches.length > 0 && (
                            <button
                              onClick={() => {
                                setSelectedItem(item);
                                handleLinkMember(candidateMatches[0].id);
                              }}
                              title={`Link this entry directly to ${candidateMatches[0].first_name} ${candidateMatches[0].surname}`}
                              style={{
                                background: '#f0fdf4',
                                color: '#15803d',
                                border: '1px solid #bbf7d0',
                                borderRadius: '4px',
                                padding: '5px 10px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              🔗 Link ({candidateMatches[0].surname})
                            </button>
                          )}

                          {/* ENROLL AS NEW MEMBER (Deceased / Past / Active) */}
                          <button
                            onClick={() => openEnrollModal(item, 'Deceased')}
                            title="Enroll as a new member on Roll of Honour"
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
                            onClick={() => openEnrollModal(item, 'Active')}
                            title="Enroll as a new member with full options"
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
                            ➕ Enroll New
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

      {/* TAB 2: MATCHED & LINKED RECORDS */}
      {activeTab === 'matched' && (
        <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                  <th style={{ padding: '10px 14px' }}>Roll Book Entry</th>
                  <th style={{ padding: '10px 14px' }}>Initiation Date</th>
                  <th style={{ padding: '10px 14px' }}>Linked Database Member</th>
                  <th style={{ padding: '10px 14px' }}>Member Status</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {matchedLedger.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                      No linked records found yet.
                    </td>
                  </tr>
                ) : (
                  matchedLedger.map(({ item, linkedMember }, idx) => (
                    <tr key={item.ledgerId} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                          <span style={{ fontSize: '11px', color: '#800020', background: '#fdf2f2', padding: '2px 6px', borderRadius: '4px', marginRight: '6px' }}>{item.title}</span>
                          {item.rawName}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          Entry #{item.entryNo || '—'} ({item.source})
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {item.dateOfInitiation || '—'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {linkedMember ? (
                          <div>
                            <span style={{ fontWeight: 700, color: '#0f172a' }}>
                              {linkedMember.title ? linkedMember.title + ' ' : ''}{linkedMember.first_name} {linkedMember.surname}
                            </span>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              ID: {linkedMember.id.substring(0, 8)}... | Joined: {linkedMember.date_joined || 'None'}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>Auto-Matched by Name</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {linkedMember && (
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: linkedMember.status === 'Active' ? '#ecfdf5' : (linkedMember.status === 'Deceased' ? '#fef2f2' : '#f8fafc'),
                            color: linkedMember.status === 'Active' ? '#065f46' : (linkedMember.status === 'Deceased' ? '#991b1b' : '#475569'),
                            border: linkedMember.status === 'Active' ? '1px solid #a7f3d0' : (linkedMember.status === 'Deceased' ? '1px solid #fecaca' : '1px solid #cbd5e1')
                          }}>
                            {linkedMember.status || 'Active'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            onClick={() => openEditModal(item)}
                            style={{
                              background: '#fff',
                              border: '1px solid #cbd5e1',
                              borderRadius: '4px',
                              padding: '4px 10px',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            ✏️ Edit Entry
                          </button>
                          {item.enrolledMemberId && (
                            <button
                              onClick={() => handleUnlink(item.id!)}
                              style={{
                                background: '#fff',
                                color: '#b91c1c',
                                border: '1px solid #fecaca',
                                borderRadius: '4px',
                                padding: '4px 10px',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              Unlink
                            </button>
                          )}
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

      {/* TAB 3: ROLL OF HONOUR & PAST MEMBERS IN DB */}
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
                            onClick={() => openExistingModal(m)}
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

      {/* TAB 4: ALL DATABASE MEMBERS */}
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
                          onClick={() => openExistingModal(m)}
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

      {/* ================= MODAL 1: EDIT ROLL BOOK ENTRY (WITH LINKING) ================= */}
      {editModalOpen && selectedItem && (
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
                  ✏️ Edit Roll Book Record
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  Correct spelling typos (e.g. Ditse → Dotse), update initiation dates, or link directly to an existing registered member.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {/* Smart Matching Box */}
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                🔗 Match With Registered Database Member
              </div>
              <p style={{ fontSize: '12px', color: '#334155', margin: '0 0 10px 0' }}>
                If this brother is <strong>already registered in the app</strong> (e.g. <em>Solomon Dotse</em>), link him below instead of creating a duplicate.
              </p>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select
                  value={editForm.selectedLinkMemberId}
                  onChange={e => setEditForm({ ...editForm, selectedLinkMemberId: e.target.value })}
                  style={{ flex: 1, padding: '8px', border: '1px solid #93c5fd', borderRadius: '6px', fontSize: '13px', background: '#fff' }}
                >
                  <option value="">-- Select Existing Member to Link --</option>
                  {dbMembers.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.surname}, {m.first_name} ({m.status || 'Active'}{m.date_joined ? ` — Initiated: ${m.date_joined}` : ''})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  disabled={!editForm.selectedLinkMemberId || submitting}
                  onClick={() => handleLinkMember(editForm.selectedLinkMemberId)}
                  style={{
                    background: '#0284c7',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: !editForm.selectedLinkMemberId || submitting ? 'not-allowed' : 'pointer',
                    opacity: !editForm.selectedLinkMemberId || submitting ? 0.6 : 1,
                    whiteSpace: 'nowrap'
                  }}
                >
                  🔗 Link to Member
                </button>
              </div>
            </div>

            {/* Edit Form */}
            <form onSubmit={handleSaveRollBookEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Title</label>
                  <select
                    value={editForm.title}
                    onChange={e => setEditForm({ ...editForm, title: e.target.value })}
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
                    value={editForm.first_name}
                    onChange={e => setEditForm({
                      ...editForm,
                      first_name: e.target.value,
                      raw_name: `${editForm.title} ${e.target.value} ${editForm.surname}`.trim()
                    })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Surname *</label>
                  <input
                    type="text"
                    required
                    value={editForm.surname}
                    onChange={e => setEditForm({
                      ...editForm,
                      surname: e.target.value,
                      raw_name: `${editForm.title} ${editForm.first_name} ${e.target.value}`.trim()
                    })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Date of Initiation</label>
                  <input
                    type="date"
                    value={editForm.date_of_initiation}
                    onChange={e => setEditForm({
                      ...editForm,
                      date_of_initiation: e.target.value,
                      cohort_year: e.target.value ? e.target.value.substring(0, 4) : editForm.cohort_year
                    })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Cohort Year</label>
                  <input
                    type="text"
                    value={editForm.cohort_year}
                    onChange={e => setEditForm({ ...editForm, cohort_year: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Occupation</label>
                  <input
                    type="text"
                    value={editForm.occupation}
                    onChange={e => setEditForm({ ...editForm, occupation: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Residence</label>
                  <input
                    type="text"
                    value={editForm.residence}
                    onChange={e => setEditForm({ ...editForm, residence: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Ledger Notes &amp; Remarks</label>
                <textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setEditModalOpen(false);
                    openEnrollModal(selectedItem, 'Deceased');
                  }}
                  style={{
                    background: '#fef2f2',
                    color: '#991b1b',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    padding: '8px 14px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  ➕ Not Registered? Enroll as New Member
                </button>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setEditModalOpen(false)}
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
                      background: '#1e293b',
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
                    {submitting ? 'Saving...' : '💾 Save Roll Book Corrections'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: ENROLL AS NEW MEMBER ================= */}
      {enrollModalOpen && (
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
                  ➕ Enroll as New / Past Member
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  Create a new member record in Supabase (Roll of Honour, Transferred, Dismissed, or Active).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEnrollModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEnrollSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Title</label>
                  <select
                    value={enrollForm.title}
                    onChange={e => setEnrollForm({ ...enrollForm, title: e.target.value })}
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
                    value={enrollForm.first_name}
                    onChange={e => setEnrollForm({ ...enrollForm, first_name: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Surname *</label>
                  <input
                    type="text"
                    required
                    value={enrollForm.surname}
                    onChange={e => setEnrollForm({ ...enrollForm, surname: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Classification Status *</label>
                  <select
                    value={enrollForm.status}
                    onChange={e => setEnrollForm({ ...enrollForm, status: e.target.value as any })}
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
                    value={enrollForm.date_joined}
                    onChange={e => setEnrollForm({ ...enrollForm, date_joined: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>
              </div>

              {enrollForm.status === 'Deceased' && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#991b1b', marginBottom: '4px' }}>Date of Death (if known)</label>
                    <input
                      type="date"
                      value={enrollForm.date_of_death}
                      onChange={e => setEnrollForm({ ...enrollForm, date_of_death: e.target.value })}
                      style={{ width: '100%', padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#991b1b', marginBottom: '4px' }}>Burial Place / Cemetery</label>
                    <input
                      type="text"
                      placeholder="e.g. Osu Cemetery / Home town"
                      value={enrollForm.burial_place}
                      onChange={e => setEnrollForm({ ...enrollForm, burial_place: e.target.value })}
                      style={{ width: '100%', padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px' }}
                    />
                  </div>
                </div>
              )}

              {enrollForm.status === 'Transfer-Out' && (
                <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px', padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#0369a1', marginBottom: '4px' }}>Transfer Destination Commandery</label>
                    <input
                      type="text"
                      placeholder="e.g. Commandery #456 Kumasi"
                      value={enrollForm.transfer_to}
                      onChange={e => setEnrollForm({ ...enrollForm, transfer_to: e.target.value })}
                      style={{ width: '100%', padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#0369a1', marginBottom: '4px' }}>Transfer Date</label>
                    <input
                      type="date"
                      value={enrollForm.transfer_date}
                      onChange={e => setEnrollForm({ ...enrollForm, transfer_date: e.target.value })}
                      style={{ width: '100%', padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px' }}
                    />
                  </div>
                </div>
              )}

              {enrollForm.status === 'Dismissed' && (
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Date of Dismissal / Separation</label>
                  <input
                    type="date"
                    value={enrollForm.date_of_dismissal}
                    onChange={e => setEnrollForm({ ...enrollForm, date_of_dismissal: e.target.value })}
                    style={{ width: '100%', maxWidth: '240px', padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px' }}
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Occupation</label>
                  <input
                    type="text"
                    value={enrollForm.occupation}
                    onChange={e => setEnrollForm({ ...enrollForm, occupation: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Residence</label>
                  <input
                    type="text"
                    value={enrollForm.residential_address}
                    onChange={e => setEnrollForm({ ...enrollForm, residential_address: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Historical Notes &amp; Ledger Remarks</label>
                <textarea
                  rows={2}
                  value={enrollForm.notes}
                  onChange={e => setEnrollForm({ ...enrollForm, notes: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setEnrollModalOpen(false)}
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
                  {submitting ? 'Enrolling...' : `Confirm & Enroll as ${enrollForm.status}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: EDIT EXISTING MEMBER STATUS ================= */}
      {existingModalOpen && (
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
            maxWidth: '540px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', color: '#800020', fontWeight: 800 }}>
                  Update Status: {existingForm.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setExistingModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExistingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Status *</label>
                <select
                  value={existingForm.status}
                  onChange={e => setExistingForm({ ...existingForm, status: e.target.value as any })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', fontWeight: 700 }}
                >
                  <option value="Active">🟢 Active</option>
                  <option value="Deceased">🕊️ Roll of Honour (Deceased)</option>
                  <option value="Transfer-Out">🔄 Transferred Out</option>
                  <option value="Dismissed">🚫 Dismissed / Resigned</option>
                </select>
              </div>

              {existingForm.status === 'Deceased' && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#991b1b', marginBottom: '4px' }}>Date of Death</label>
                    <input
                      type="date"
                      value={existingForm.date_of_death}
                      onChange={e => setExistingForm({ ...existingForm, date_of_death: e.target.value })}
                      style={{ width: '100%', padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#991b1b', marginBottom: '4px' }}>Burial Place</label>
                    <input
                      type="text"
                      value={existingForm.burial_place}
                      onChange={e => setExistingForm({ ...existingForm, burial_place: e.target.value })}
                      style={{ width: '100%', padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px' }}
                    />
                  </div>
                </div>
              )}

              {existingForm.status === 'Transfer-Out' && (
                <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px', padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#0369a1', marginBottom: '4px' }}>Transfer To</label>
                    <input
                      type="text"
                      value={existingForm.transfer_to}
                      onChange={e => setExistingForm({ ...existingForm, transfer_to: e.target.value })}
                      style={{ width: '100%', padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#0369a1', marginBottom: '4px' }}>Transfer Date</label>
                    <input
                      type="date"
                      value={existingForm.transfer_date}
                      onChange={e => setExistingForm({ ...existingForm, transfer_date: e.target.value })}
                      style={{ width: '100%', padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px' }}
                    />
                  </div>
                </div>
              )}

              {existingForm.status === 'Dismissed' && (
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Date of Dismissal</label>
                  <input
                    type="date"
                    value={existingForm.date_of_dismissal}
                    onChange={e => setExistingForm({ ...existingForm, date_of_dismissal: e.target.value })}
                    style={{ width: '100%', maxWidth: '240px', padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px' }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Notes</label>
                <textarea
                  rows={2}
                  value={existingForm.notes}
                  onChange={e => setExistingForm({ ...existingForm, notes: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setExistingModalOpen(false)}
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
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
