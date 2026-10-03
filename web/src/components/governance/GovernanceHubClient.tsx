'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  GovernanceHubData,
  TempleMemberRecord,
  TempleOfficerRecord,
  EnhancedCommittee,
} from '@/types/governance';
import { AssignedOfficer, TermAdministration } from '@/types/officers';
import {
  assignOfficerPosition,
  deleteOfficerPosition,
} from '@/services/officersService';
import {
  assignCommitteeMember,
  removeCommitteeMember,
  assignTempleOfficer,
  removeTempleOfficer,
} from '@/services/governanceService';
import { formatDisplayDate } from '@/lib/utils/ksji-logic';

interface Props {
  initialData: GovernanceHubData;
  isRegistrar?: boolean;
  defaultTab?: 'officers' | 'trustees' | 'temples' | 'committees';
}

export default function GovernanceHubClient({
  initialData,
  isRegistrar = false,
  defaultTab = 'officers',
}: Props) {
  const [data, setData] = useState<GovernanceHubData>(initialData);
  const [activeTab, setActiveTab] = useState<'officers' | 'trustees' | 'temples' | 'committees'>(defaultTab);

  // Officers tab state
  const [selectedTermKey, setSelectedTermKey] = useState<string>(
    data.officers.currentTerm?.termKey || data.officers.administrations[0]?.termKey || '2026-2027'
  );

  // Active administration
  const activeAdmin = useMemo(() => {
    return (
      data.officers.administrations.find((a) => a.termKey === selectedTermKey) ||
      data.officers.administrations[0] ||
      null
    );
  }, [data.officers.administrations, selectedTermKey]);

  // Board of Trustees filter
  const [trusteeFilter, setTrusteeFilter] = useState<'all' | 'living' | 'deceased'>('all');
  const [trusteeSearch, setTrusteeSearch] = useState('');

  // Temple tab state
  const [activeTemple, setActiveTemple] = useState<'chevalier' | 'noble'>('chevalier');
  const [templeSearch, setTempleSearch] = useState('');

  // Committee tab state
  const [selectedCommitteeId, setSelectedCommitteeId] = useState<string>('all');
  const [committeeSearch, setCommitteeSearch] = useState('');

  // Modals state
  const [isAssignOfficerOpen, setIsAssignOfficerOpen] = useState(false);
  const [assigningRole, setAssigningRole] = useState<string>('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [termDateFrom, setTermDateFrom] = useState<string>('2026-01-01');
  const [termDateTo, setTermDateTo] = useState<string>('');
  const [editingPositionId, setEditingPositionId] = useState<string | null>(null);

  // Committee modal state
  const [isAssignCommitteeOpen, setIsAssignCommitteeOpen] = useState(false);
  const [committeeToAssign, setCommitteeToAssign] = useState<string>('');
  const [committeeRoleToAssign, setCommitteeRoleToAssign] = useState<string>('Member');

  // Temple officer modal state
  const [isAssignTempleOfficerOpen, setIsAssignTempleOfficerOpen] = useState(false);
  const [templeLevelToAssign, setTempleLevelToAssign] = useState<'Chapter' | 'Nobles Temple'>('Chapter');
  const [templeOfficerTitle, setTempleOfficerTitle] = useState<string>('');

  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filtered Past Presidents
  const filteredPastPresidents = useMemo(() => {
    return data.boardOfTrustees.pastPresidents.filter((p) => {
      if (trusteeFilter === 'living' && p.isDeceased) return false;
      if (trusteeFilter === 'deceased' && !p.isDeceased) return false;
      if (trusteeSearch) {
        const q = trusteeSearch.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q) ||
          p.tenure.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [data.boardOfTrustees.pastPresidents, trusteeFilter, trusteeSearch]);

  // Active Temple Data
  const currentTempleData = useMemo(() => {
    return activeTemple === 'chevalier'
      ? data.degreeTemples.chevaliersChapter
      : data.degreeTemples.noblesTemple;
  }, [activeTemple, data.degreeTemples]);

  // Filtered Temple Roster
  const filteredTempleRoster = useMemo(() => {
    if (!templeSearch) return currentTempleData.roster;
    const q = templeSearch.toLowerCase();
    return currentTempleData.roster.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.title.toLowerCase().includes(q) ||
        (m.conferralPlace && m.conferralPlace.toLowerCase().includes(q))
    );
  }, [currentTempleData, templeSearch]);

  // Filtered Committees
  const filteredCommittees = useMemo(() => {
    return data.committees.filter((c) => {
      if (selectedCommitteeId !== 'all' && c.id !== selectedCommitteeId) return false;
      if (committeeSearch) {
        const q = committeeSearch.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.mandate.toLowerCase().includes(q) ||
          c.assignedMembers.some((m) => m.name.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [data.committees, selectedCommitteeId, committeeSearch]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function handleAssignOfficerSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMemberId || !assigningRole) return;
    setBusy(true);
    setFeedback(null);

    try {
      await assignOfficerPosition({
        positionId: editingPositionId || undefined,
        memberId: selectedMemberId,
        positionTitle: assigningRole,
        dateFrom: termDateFrom,
        dateTo: termDateTo || null,
      });

      setFeedback({ text: `Officer assignment for "${assigningRole}" saved successfully.`, type: 'success' });
      setIsAssignOfficerOpen(false);
      // Refresh page data silently
      window.location.reload();
    } catch (err: any) {
      setFeedback({ text: err.message || 'Failed to save officer position.', type: 'error' });
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteOfficer(positionId: string, title: string) {
    if (!window.confirm(`Are you sure you want to remove the assigned officer for "${title}"?`)) return;
    setBusy(true);
    try {
      await deleteOfficerPosition(positionId);
      setFeedback({ text: `Removed assignment for ${title}.`, type: 'success' });
      window.location.reload();
    } catch (err: any) {
      setFeedback({ text: err.message || 'Failed to delete position.', type: 'error' });
    } finally {
      setBusy(false);
    }
  }

  async function handleAssignCommitteeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMemberId || !committeeToAssign) return;
    setBusy(true);
    try {
      await assignCommitteeMember({
        memberId: selectedMemberId,
        committeeId: committeeToAssign,
        committeeRole: committeeRoleToAssign,
        dateFrom: termDateFrom,
        dateTo: termDateTo || null,
      });

      setFeedback({ text: 'Committee member assigned successfully.', type: 'success' });
      setIsAssignCommitteeOpen(false);
      window.location.reload();
    } catch (err: any) {
      setFeedback({ text: err.message || 'Failed to assign committee member.', type: 'error' });
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveCommitteeMember(positionId: string, name: string) {
    if (!window.confirm(`Are you sure you want to remove ${name} from this committee?`)) return;
    setBusy(true);
    try {
      await removeCommitteeMember(positionId);
      setFeedback({ text: `Removed ${name} from committee.`, type: 'success' });
      window.location.reload();
    } catch (err: any) {
      setFeedback({ text: err.message || 'Failed to remove committee member.', type: 'error' });
    } finally {
      setBusy(false);
    }
  }

  async function handleAssignTempleOfficerSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMemberId || !templeOfficerTitle) return;
    setBusy(true);
    try {
      await assignTempleOfficer({
        memberId: selectedMemberId,
        templeLevel: templeLevelToAssign,
        positionTitle: templeOfficerTitle,
        dateFrom: termDateFrom,
        dateTo: termDateTo || null,
      });

      setFeedback({ text: 'Temple leadership officer assigned successfully.', type: 'success' });
      setIsAssignTempleOfficerOpen(false);
      window.location.reload();
    } catch (err: any) {
      setFeedback({ text: err.message || 'Failed to assign temple officer.', type: 'error' });
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveTempleOfficer(positionId: string, title: string) {
    if (!window.confirm(`Are you sure you want to remove the officer for "${title}"?`)) return;
    setBusy(true);
    try {
      await removeTempleOfficer(positionId);
      setFeedback({ text: `Removed ${title}.`, type: 'success' });
      window.location.reload();
    } catch (err: any) {
      setFeedback({ text: err.message || 'Failed to remove temple officer.', type: 'error' });
    } finally {
      setBusy(false);
    }
  }

  // Active metrics
  const activeOfficersCount = activeAdmin
    ? activeAdmin.slots.filter((s) => s.assigned).length + activeAdmin.additionalOfficers.length
    : 0;

  const chevaliersCount = data.degreeTemples.chevaliersChapter.roster.length;
  const noblesCount = data.degreeTemples.noblesTemple.roster.length;
  const livingPresidentsCount = data.boardOfTrustees.pastPresidents.filter((p) => !p.isDeceased).length;

  return (
    <div style={{ color: '#0F172A', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* ── Feedback Toast ──────────────────────────────────────────────── */}
      {feedback && (
        <div
          style={{
            padding: '14px 20px',
            borderRadius: 12,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: feedback.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            border: `1px solid ${feedback.type === 'success' ? '#10B981' : '#EF4444'}`,
            color: feedback.type === 'success' ? '#065F46' : '#991B1B',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          <span>{feedback.type === 'success' ? '✅' : '⚠️'} {feedback.text}</span>
          <button
            onClick={() => setFeedback(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'inherit' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Executive Governance Banner ─────────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0A1628 0%, #1E1B4B 50%, #172554 100%)',
          borderRadius: 24,
          padding: '36px 40px',
          color: 'white',
          marginBottom: 28,
          boxShadow: '0 20px 40px rgba(10, 22, 40, 0.35)',
          borderLeft: '8px solid #C9A84C',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            right: -20,
            bottom: -30,
            opacity: 0.04,
            fontSize: 220,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          ⚔️
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24, position: 'relative', zIndex: 1 }}>
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(201, 168, 76, 0.15)',
                border: '1px solid rgba(201, 168, 76, 0.4)',
                color: '#FDE047',
                padding: '6px 14px',
                borderRadius: 30,
                fontSize: 12,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: 1.2,
                marginBottom: 12,
              }}
            >
              🏛️ Constitutional Governance Hub
            </div>
            <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900, letterSpacing: -0.8, color: '#FFFFFF' }}>
              Commandery Governance & Temples
            </h1>
            <p style={{ margin: '10px 0 0', fontSize: 15, color: '#94A3B8', maxWidth: 650, lineHeight: 1.6 }}>
              St. Margaret-Mary Commandery No. 500 — Unified directory of Commandery Officers, Constitutional Board of Trustees, Degree Temples, and Standing Committees.
            </p>
          </div>

          {/* Metric Badges */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.07)', backdropFilter: 'blur(12px)', padding: '14px 18px', borderRadius: 16, border: '1px solid rgba(255, 255, 255, 0.12)', textAlign: 'center', minWidth: 100 }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#C9A84C', fontFamily: 'monospace' }}>{activeOfficersCount}</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#CBD5E1', marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Officers</div>
            </div>

            <div style={{ background: 'rgba(59, 130, 246, 0.12)', backdropFilter: 'blur(12px)', padding: '14px 18px', borderRadius: 16, border: '1px solid rgba(59, 130, 246, 0.25)', textAlign: 'center', minWidth: 100 }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#60A5FA', fontFamily: 'monospace' }}>{chevaliersCount}</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#93C5FD', marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Chevaliers</div>
            </div>

            <div style={{ background: 'rgba(201, 168, 76, 0.12)', backdropFilter: 'blur(12px)', padding: '14px 18px', borderRadius: 16, border: '1px solid rgba(201, 168, 76, 0.3)', textAlign: 'center', minWidth: 100 }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#FCD34D', fontFamily: 'monospace' }}>{noblesCount}</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#FDE68A', marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Nobles</div>
            </div>

            <div style={{ background: 'rgba(16, 185, 129, 0.1)', backdropFilter: 'blur(12px)', padding: '14px 18px', borderRadius: 16, border: '1px solid rgba(52, 211, 153, 0.25)', textAlign: 'center', minWidth: 110 }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#34D399', fontFamily: 'monospace' }}>{livingPresidentsCount}</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#A7F3D0', marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Past Presidents</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabbed Navigation Bar ───────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          background: '#F1F5F9',
          padding: 6,
          borderRadius: 16,
          marginBottom: 28,
          border: '1px solid #E2E8F0',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={() => setActiveTab('officers')}
          style={{
            flex: 1,
            minWidth: 180,
            padding: '12px 18px',
            borderRadius: 12,
            border: 'none',
            fontSize: 14,
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: activeTab === 'officers' ? '#0A1628' : 'transparent',
            color: activeTab === 'officers' ? '#FFFFFF' : '#475569',
            boxShadow: activeTab === 'officers' ? '0 4px 12px rgba(10, 22, 40, 0.2)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <span>⚔️</span>
          <span>Commandery Officers</span>
        </button>

        <button
          onClick={() => setActiveTab('trustees')}
          style={{
            flex: 1,
            minWidth: 180,
            padding: '12px 18px',
            borderRadius: 12,
            border: 'none',
            fontSize: 14,
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: activeTab === 'trustees' ? '#0A1628' : 'transparent',
            color: activeTab === 'trustees' ? '#FFFFFF' : '#475569',
            boxShadow: activeTab === 'trustees' ? '0 4px 12px rgba(10, 22, 40, 0.2)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <span>📜</span>
          <span>Board of Trustees</span>
        </button>

        <button
          onClick={() => setActiveTab('temples')}
          style={{
            flex: 1,
            minWidth: 180,
            padding: '12px 18px',
            borderRadius: 12,
            border: 'none',
            fontSize: 14,
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: activeTab === 'temples' ? '#0A1628' : 'transparent',
            color: activeTab === 'temples' ? '#FFFFFF' : '#475569',
            boxShadow: activeTab === 'temples' ? '0 4px 12px rgba(10, 22, 40, 0.2)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <span>🏛️</span>
          <span>Degree Temples (4th & 5th)</span>
        </button>

        <button
          onClick={() => setActiveTab('committees')}
          style={{
            flex: 1,
            minWidth: 180,
            padding: '12px 18px',
            borderRadius: 12,
            border: 'none',
            fontSize: 14,
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: activeTab === 'committees' ? '#0A1628' : 'transparent',
            color: activeTab === 'committees' ? '#FFFFFF' : '#475569',
            boxShadow: activeTab === 'committees' ? '0 4px 12px rgba(10, 22, 40, 0.2)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <span>🤝</span>
          <span>Standing Committees ({data.committees.length})</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1: COMMANDERY OFFICERS
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'officers' && (
        <div>
          {/* Administration Term Selector */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 16,
              background: '#FFFFFF',
              padding: '18px 24px',
              borderRadius: 16,
              border: '1px solid #E2E8F0',
              marginBottom: 24,
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)',
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Current Administration View
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
                {activeAdmin?.label || 'Current Officers'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>Select Biennial Term:</label>
              <select
                value={selectedTermKey}
                onChange={(e) => setSelectedTermKey(e.target.value)}
                style={{
                  padding: '9px 14px',
                  borderRadius: 10,
                  border: '1.5px solid #CBD5E1',
                  background: '#F8FAFC',
                  fontWeight: 700,
                  fontSize: 14,
                  color: '#0F172A',
                  cursor: 'pointer',
                }}
              >
                {data.officers.administrations.map((adm) => (
                  <option key={adm.termKey} value={adm.termKey}>
                    {adm.label}
                  </option>
                ))}
              </select>

              {isRegistrar && (
                <button
                  onClick={() => {
                    setAssigningRole('Worthy President');
                    setSelectedMemberId('');
                    setEditingPositionId(null);
                    setTermDateFrom(`${activeAdmin?.startYear || 2026}-01-01`);
                    setTermDateTo('');
                    setIsAssignOfficerOpen(true);
                  }}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 10,
                    background: '#0A1628',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>➕</span>
                  <span>Assign Officer</span>
                </button>
              )}
            </div>
          </div>

          {/* Officers Roster Grouped by Category */}
          {['commandery', 'trustees', 'military', 'appointed'].map((catKey) => {
            const catLabel =
              catKey === 'commandery'
                ? '👑 Commandery Executive Officers'
                : catKey === 'trustees'
                ? '🛡️ Elected Trustees (Commandery Board)'
                : catKey === 'military'
                ? '⚔️ Military Line Officers'
                : '🎖️ Appointed & Ceremonial Officers';

            const catSlots = (activeAdmin?.slots || []).filter((s) => s.role.category === catKey);
            if (catSlots.length === 0) return null;

            return (
              <div key={catKey} style={{ marginBottom: 32 }}>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: '#0A1628',
                    marginBottom: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    borderBottom: '2px solid #E2E8F0',
                    paddingBottom: 8,
                  }}
                >
                  <span>{catLabel}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, background: '#E2E8F0', color: '#475569', padding: '2px 8px', borderRadius: 12 }}>
                    {catSlots.filter((s) => s.assigned).length} / {catSlots.length} Assigned
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: 16,
                  }}
                >
                  {catSlots.map((slot) => {
                    const officer = slot.assigned;
                    return (
                      <div
                        key={slot.role.id}
                        style={{
                          background: '#FFFFFF',
                          borderRadius: 16,
                          border: officer ? '1px solid #E2E8F0' : '1px dashed #CBD5E1',
                          padding: '18px 20px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          boxShadow: officer ? '0 4px 6px rgba(0, 0, 0, 0.03)' : 'none',
                          transition: 'all 0.2s',
                          position: 'relative',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                              {slot.role.title}
                            </div>
                            {officer ? (
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 800,
                                  background: officer.isIncumbent ? '#ECFDF5' : '#F1F5F9',
                                  color: officer.isIncumbent ? '#059669' : '#64748B',
                                  padding: '3px 8px',
                                  borderRadius: 10,
                                }}
                              >
                                {officer.isIncumbent ? '● Incumbent' : 'Past'}
                              </span>
                            ) : (
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8' }}>Vacant</span>
                            )}
                          </div>

                          {officer ? (
                            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                              <div
                                style={{
                                  width: 48,
                                  height: 48,
                                  borderRadius: '50%',
                                  background: 'linear-gradient(135deg, #0A1628 0%, #1E3A8A 100%)',
                                  color: '#C9A84C',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 18,
                                  fontWeight: 900,
                                  flexShrink: 0,
                                  overflow: 'hidden',
                                  border: '2px solid #C9A84C',
                                }}
                              >
                                {officer.photoUrl ? (
                                  <img
                                    src={officer.photoUrl}
                                    alt={officer.firstName}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                ) : (
                                  <span>{officer.firstName[0]}{officer.surname[0]}</span>
                                )}
                              </div>

                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  <Link
                                    href={isRegistrar ? `/registrar/members/${officer.memberId}` : `/me`}
                                    style={{ textDecoration: 'none', color: 'inherit' }}
                                  >
                                    {officer.title} {officer.firstName} {officer.surname}
                                  </Link>
                                </div>
                                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                                  {officer.tenureDisplay}
                                </div>
                                {(officer.phone || officer.email) && (
                                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>
                                    {officer.phone || officer.email}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div style={{ color: '#94A3B8', fontSize: 13, fontStyle: 'italic', padding: '10px 0' }}>
                              No officer assigned for this administration term.
                            </div>
                          )}
                        </div>

                        {/* Officer Card Action Bar */}
                        {isRegistrar && (
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'flex-end',
                              gap: 8,
                              marginTop: 14,
                              paddingTop: 10,
                              borderTop: '1px solid #F1F5F9',
                            }}
                          >
                            <button
                              onClick={() => {
                                setAssigningRole(slot.role.title);
                                setSelectedMemberId(officer?.memberId || '');
                                setEditingPositionId(officer?.positionId || null);
                                setTermDateFrom(officer?.dateFrom || `${activeAdmin?.startYear || 2026}-01-01`);
                                setTermDateTo(officer?.dateTo || '');
                                setIsAssignOfficerOpen(true);
                              }}
                              style={{
                                background: '#F8FAFC',
                                border: '1px solid #E2E8F0',
                                color: '#0A1628',
                                padding: '5px 10px',
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              ✏️ {officer ? 'Edit' : 'Assign'}
                            </button>

                            {officer?.positionId && (
                              <button
                                onClick={() => handleDeleteOfficer(officer.positionId!, slot.role.title)}
                                style={{
                                  background: '#FEF2F2',
                                  border: '1px solid #FECACA',
                                  color: '#DC2626',
                                  padding: '5px 10px',
                                  borderRadius: 8,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                ✕ Clear
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2: BOARD OF TRUSTEES
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'trustees' && (
        <div>
          {/* Constitutional Explainer Card */}
          <div
            style={{
              background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
              border: '1px solid #BFDBFE',
              borderRadius: 20,
              padding: '24px 28px',
              marginBottom: 28,
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.05)',
            }}
          >
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ fontSize: 32 }}>📜</div>
              <div>
                <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 900, color: '#1E3A8A' }}>
                  The Constitutional Board of Trustees of Commandery No. 500
                </h3>
                <p style={{ margin: 0, fontSize: 14, color: '#334155', lineHeight: 1.6 }}>
                  Under the Constitution of the Knights of St. John International, the Commandery Board of Trustees oversees property, assets, constitutional fidelity, and long-term continuity. The Board is composed of the <strong>Incumbent Worthy President</strong> (Board Chairman), the <strong>Three Elected Trustees</strong>, the <strong>Incumbent Executive Officers</strong>, and the permanent <strong>Roll of Past Worthy Presidents</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Section A: Incumbent Board Leadership */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#0A1628', marginBottom: 16 }}>
              🏛️ Active Incumbent Board of Trustees
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 16,
              }}
            >
              {/* Chairman Card */}
              {data.boardOfTrustees.chairman && (
                <div
                  style={{
                    background: 'linear-gradient(135deg, #0A1628 0%, #1E3A8A 100%)',
                    borderRadius: 18,
                    padding: '22px 24px',
                    color: '#FFFFFF',
                    boxShadow: '0 8px 20px rgba(10, 22, 40, 0.2)',
                    border: '2px solid #C9A84C',
                    gridColumn: '1 / -1',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#FDE047', textTransform: 'uppercase', letterSpacing: 1 }}>
                        👑 Chairman of the Board of Trustees
                      </span>
                      <h2 style={{ margin: '6px 0 2px', fontSize: 22, fontWeight: 900 }}>
                        {data.boardOfTrustees.chairman.title} {data.boardOfTrustees.chairman.firstName} {data.boardOfTrustees.chairman.surname}
                      </h2>
                      <div style={{ fontSize: 14, color: '#93C5FD' }}>
                        Worthy President • {data.boardOfTrustees.chairman.tenureDisplay}
                      </div>
                    </div>
                    {data.boardOfTrustees.chairman.phone && (
                      <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '8px 16px', borderRadius: 12, fontSize: 13, fontWeight: 700 }}>
                        📞 {data.boardOfTrustees.chairman.phone}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Three Elected Trustees Cards */}
              {data.boardOfTrustees.electedTrustees.map((tr) => (
                <div
                  key={tr.positionId || tr.memberId}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 16,
                    border: '1.5px solid #CBD5E1',
                    padding: '18px 20px',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                    🛡️ {tr.positionTitle}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
                    <Link
                      href={isRegistrar ? `/registrar/members/${tr.memberId}` : `/me`}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      {tr.title} {tr.firstName} {tr.surname}
                    </Link>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                    {tr.tenureDisplay}
                  </div>
                </div>
              ))}

              {/* Executive Officers */}
              {data.boardOfTrustees.executiveOfficers.map((exec) => (
                <div
                  key={exec.positionId || exec.memberId}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 16,
                    border: '1px solid #E2E8F0',
                    padding: '18px 20px',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                    📋 {exec.positionTitle}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
                    <Link
                      href={isRegistrar ? `/registrar/members/${exec.memberId}` : `/me`}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      {exec.title} {exec.firstName} {exec.surname}
                    </Link>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                    {exec.tenureDisplay}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section B: Historical Roll of Past Worthy Presidents */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#0A1628' }}>
                  👑 Roll of Past Worthy Presidents (Permanent Board Counselors)
                </div>
                <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
                  Succession roll of Worthy Presidents from Commandery founding (1996) to present day.
                </div>
              </div>

              {/* Filter Pills & Search */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Search president..."
                  value={trusteeSearch}
                  onChange={(e) => setTrusteeSearch(e.target.value)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 10,
                    border: '1px solid #CBD5E1',
                    fontSize: 13,
                    width: 180,
                  }}
                />

                <div style={{ display: 'flex', gap: 4, background: '#F1F5F9', padding: 4, borderRadius: 12 }}>
                  {(['all', 'living', 'deceased'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setTrusteeFilter(mode)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: 'none',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: trusteeFilter === mode ? '#0A1628' : 'transparent',
                        color: trusteeFilter === mode ? '#FFFFFF' : '#475569',
                      }}
                    >
                      {mode === 'all' ? 'All' : mode === 'living' ? 'Living' : 'Memorial Roll'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Past Presidents Table */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 16,
                border: '1px solid #E2E8F0',
                overflow: 'hidden',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>
                    <th style={{ padding: '14px 20px' }}>Seq</th>
                    <th style={{ padding: '14px 20px' }}>Worthy President</th>
                    <th style={{ padding: '14px 20px' }}>Administration Tenure</th>
                    <th style={{ padding: '14px 20px' }}>Duration</th>
                    <th style={{ padding: '14px 20px' }}>Board Standing</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPastPresidents.map((pres) => (
                    <tr
                      key={pres.memberId + pres.no}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        background: pres.isIncumbent ? '#F0FDF4' : pres.isDeceased ? '#F8FAFC' : '#FFFFFF',
                      }}
                    >
                      <td style={{ padding: '14px 20px', fontWeight: 800, color: '#94A3B8', fontFamily: 'monospace' }}>
                        #{pres.no.toString().padStart(2, '0')}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontWeight: 800, color: '#0F172A' }}>
                          <Link
                            href={isRegistrar ? `/registrar/members/${pres.memberId}` : `/me`}
                            style={{ textDecoration: 'none', color: 'inherit' }}
                          >
                            {pres.title} {pres.name}
                          </Link>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px', fontWeight: 700, color: '#334155' }}>
                        {pres.tenure}
                      </td>
                      <td style={{ padding: '14px 20px', color: '#64748B' }}>
                        {pres.duration}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        {pres.isIncumbent ? (
                          <span style={{ background: '#DCFCE7', color: '#166534', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 800 }}>
                            👑 Incumbent Chair
                          </span>
                        ) : pres.isDeceased ? (
                          <span style={{ background: '#EDE9FE', color: '#5B21B6', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 800 }}>
                            🕯️ Memorial Roll
                          </span>
                        ) : (
                          <span style={{ background: '#E0F2FE', color: '#0369A1', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 800 }}>
                            ⭐ Life Trustee
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 3: DEGREE TEMPLES (4TH & 5TH DEGREES)
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'temples' && (
        <div>
          {/* Temple Selector Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 28 }}>
            
            {/* Chevalier Chapter Card */}
            <div
              onClick={() => setActiveTemple('chevalier')}
              style={{
                background: activeTemple === 'chevalier' ? '#1E3A8A' : '#FFFFFF',
                color: activeTemple === 'chevalier' ? '#FFFFFF' : '#0F172A',
                borderRadius: 20,
                padding: '24px 26px',
                cursor: 'pointer',
                border: activeTemple === 'chevalier' ? '2px solid #3B82F6' : '1px solid #E2E8F0',
                boxShadow: activeTemple === 'chevalier' ? '0 12px 24px rgba(30, 58, 138, 0.25)' : 'none',
                transition: 'all 0.2s',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 32 }}>🏅</span>
                <span
                  style={{
                    background: activeTemple === 'chevalier' ? 'rgba(255, 255, 255, 0.2)' : '#EFF6FF',
                    color: activeTemple === 'chevalier' ? '#FFFFFF' : '#1D4ED8',
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  4th Degree Chapter
                </span>
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: 19, fontWeight: 900 }}>
                Archbishop William Porter Chapter of Chevaliers
              </h3>
              <p style={{ margin: 0, fontSize: 13, opacity: 0.85, lineHeight: 1.5 }}>
                Chivalric Chapter of Conferred 4th Degree Chevaliers.
              </p>
              <div style={{ marginTop: 16, fontSize: 15, fontWeight: 800 }}>
                {data.degreeTemples.chevaliersChapter.roster.length} Conferred Chevaliers
              </div>
            </div>

            {/* Nobles' Temple Card */}
            <div
              onClick={() => setActiveTemple('noble')}
              style={{
                background: activeTemple === 'noble' ? '#800020' : '#FFFFFF',
                color: activeTemple === 'noble' ? '#FFFFFF' : '#0F172A',
                borderRadius: 20,
                padding: '24px 26px',
                cursor: 'pointer',
                border: activeTemple === 'noble' ? '2px solid #C9A84C' : '1px solid #E2E8F0',
                boxShadow: activeTemple === 'noble' ? '0 12px 24px rgba(128, 0, 32, 0.25)' : 'none',
                transition: 'all 0.2s',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 32 }}>👑</span>
                <span
                  style={{
                    background: activeTemple === 'noble' ? 'rgba(255, 255, 255, 0.2)' : '#FDF2F8',
                    color: activeTemple === 'noble' ? '#FFFFFF' : '#9D174D',
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  5th Degree Temple
                </span>
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: 19, fontWeight: 900 }}>
                Accra West Nobles’ Temple
              </h3>
              <p style={{ margin: 0, fontSize: 13, opacity: 0.85, lineHeight: 1.5 }}>
                Apex Fraternal Body of Elevated 5th Degree Noble Brothers.
              </p>
              <div style={{ marginTop: 16, fontSize: 15, fontWeight: 800 }}>
                {data.degreeTemples.noblesTemple.roster.length} Elevated Nobles
              </div>
            </div>
          </div>

          {/* Active Temple Detail Header */}
          <div
            style={{
              background: currentTempleData.accentBg,
              border: `1.5px solid ${currentTempleData.borderColor}`,
              borderRadius: 20,
              padding: '24px 28px',
              marginBottom: 28,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: currentTempleData.themeColor, textTransform: 'uppercase', letterSpacing: 1 }}>
                  {currentTempleData.crestEmoji} {currentTempleData.degreeLevel} • {currentTempleData.leadershipTitle}
                </div>
                <h2 style={{ margin: '6px 0 8px', fontSize: 24, fontWeight: 900, color: '#0F172A' }}>
                  {currentTempleData.name}
                </h2>
                <p style={{ margin: 0, fontSize: 14, color: '#334155', maxWidth: 700, lineHeight: 1.6 }}>
                  {currentTempleData.description}
                </p>
              </div>

              {isRegistrar && (
                <button
                  onClick={() => {
                    setTempleLevelToAssign(activeTemple === 'chevalier' ? 'Chapter' : 'Nobles Temple');
                    setTempleOfficerTitle(activeTemple === 'chevalier' ? 'Grand Master' : 'Noble Grand Master');
                    setSelectedMemberId('');
                    setIsAssignTempleOfficerOpen(true);
                  }}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 10,
                    background: currentTempleData.themeColor,
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>➕</span>
                  <span>Assign Temple Officer</span>
                </button>
              )}
            </div>

            {/* Temple Officers List */}
            {currentTempleData.officers.length > 0 && (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(0, 0, 0, 0.08)' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 10 }}>
                  Active Temple Leadership & Officers
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {currentTempleData.officers.map((off) => (
                    <div
                      key={off.positionId}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: 12,
                        padding: '10px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: currentTempleData.themeColor, textTransform: 'uppercase' }}>
                          {off.positionTitle}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>
                          {off.title} {off.name}
                        </div>
                      </div>
                      {isRegistrar && (
                        <button
                          onClick={() => handleRemoveTempleOfficer(off.positionId, off.positionTitle)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#DC2626',
                            cursor: 'pointer',
                            fontSize: 14,
                            padding: '2px 6px',
                          }}
                          title="Remove officer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Temple Roster Table */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#0A1628' }}>
                  {currentTempleData.crestEmoji} Conferred Roll of {currentTempleData.badgeLabel}s ({filteredTempleRoster.length})
                </div>
              </div>

              <input
                type="text"
                placeholder={`Search ${currentTempleData.shortName}...`}
                value={templeSearch}
                onChange={(e) => setTempleSearch(e.target.value)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 10,
                  border: '1px solid #CBD5E1',
                  fontSize: 13,
                  width: 220,
                }}
              />
            </div>

            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 16,
                border: '1px solid #E2E8F0',
                overflow: 'hidden',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>
                    <th style={{ padding: '14px 20px' }}>Member</th>
                    <th style={{ padding: '14px 20px' }}>Conferral Date</th>
                    <th style={{ padding: '14px 20px' }}>Conferral Sanctuary</th>
                    <th style={{ padding: '14px 20px' }}>Seniority</th>
                    <th style={{ padding: '14px 20px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTempleRoster.map((m) => (
                    <tr key={m.id || m.memberId} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontWeight: 800, color: '#0F172A' }}>
                          <Link
                            href={isRegistrar ? `/registrar/members/${m.memberId}` : `/me`}
                            style={{ textDecoration: 'none', color: 'inherit' }}
                          >
                            {m.title} {m.name}
                          </Link>
                        </div>
                        {m.phone && <div style={{ fontSize: 12, color: '#64748B' }}>{m.phone}</div>}
                      </td>
                      <td style={{ padding: '14px 20px', fontWeight: 600, color: '#334155' }}>
                        {m.conferralDate ? formatDisplayDate(m.conferralDate) : 'Recorded by Elevation'}
                      </td>
                      <td style={{ padding: '14px 20px', color: '#64748B' }}>
                        {m.conferralPlace || currentTempleData.name}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        {m.yearsInDegree !== null ? (
                          <span style={{ background: '#F1F5F9', color: '#334155', padding: '3px 8px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                            {m.yearsInDegree} yr{m.yearsInDegree !== 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        {m.isDeceased ? (
                          <span style={{ background: '#EDE9FE', color: '#5B21B6', padding: '3px 8px', borderRadius: 8, fontSize: 12, fontWeight: 800 }}>
                            🕯️ Roll of Honor
                          </span>
                        ) : (
                          <span style={{ background: '#DCFCE7', color: '#166534', padding: '3px 8px', borderRadius: 8, fontSize: 12, fontWeight: 800 }}>
                            Active
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 4: STANDING COMMITTEES
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'committees' && (
        <div>
          {/* Top Filter Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 16,
              background: '#FFFFFF',
              padding: '16px 20px',
              borderRadius: 16,
              border: '1px solid #E2E8F0',
              marginBottom: 24,
            }}
          >
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>Filter Committee:</span>
              <select
                value={selectedCommitteeId}
                onChange={(e) => setSelectedCommitteeId(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: '1.5px solid #CBD5E1',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#0F172A',
                }}
              >
                <option value="all">All 9 Standing Committees</option>
                {data.committees.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.shortName}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Search committee or member..."
                value={committeeSearch}
                onChange={(e) => setCommitteeSearch(e.target.value)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 10,
                  border: '1px solid #CBD5E1',
                  fontSize: 13,
                  width: 220,
                }}
              />
            </div>

            {isRegistrar && (
              <button
                onClick={() => {
                  setCommitteeToAssign(data.committees[0]?.id || 'welfare');
                  setCommitteeRoleToAssign('Member');
                  setSelectedMemberId('');
                  setIsAssignCommitteeOpen(true);
                }}
                style={{
                  padding: '9px 16px',
                  borderRadius: 10,
                  background: '#0A1628',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>➕</span>
                <span>Assign Committee Member</span>
              </button>
            )}
          </div>

          {/* Committee Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 24 }}>
            {filteredCommittees.map((com) => {
              return (
                <div
                  key={com.id}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 20,
                    border: '1px solid #E2E8F0',
                    padding: '24px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <span
                        style={{
                          background: `${com.color}15`,
                          color: com.color,
                          border: `1px solid ${com.color}35`,
                          padding: '4px 10px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {com.shortName}
                      </span>

                      {com.id === 'welfare' && (
                        <Link
                          href="/registrar/welfare"
                          style={{
                            fontSize: 12,
                            fontWeight: 800,
                            color: '#0D9488',
                            textDecoration: 'none',
                            background: '#F0FDFA',
                            padding: '4px 8px',
                            borderRadius: 8,
                            border: '1px solid #CCFBF1',
                          }}
                        >
                          Welfare Hub 🤝
                        </Link>
                      )}
                    </div>

                    <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 900, color: '#0F172A' }}>
                      {com.name}
                    </h3>

                    <p style={{ margin: '0 0 16px', fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                      {com.mandate}
                    </p>

                    {/* Chair / Leadership */}
                    <div
                      style={{
                        background: '#F8FAFC',
                        borderRadius: 12,
                        padding: '12px 14px',
                        marginBottom: 16,
                        border: '1px solid #F1F5F9',
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>
                        Committee Leadership
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>
                        {com.activeChair ? (
                          <span>👑 {com.activeChair.title} {com.activeChair.name} ({com.activeChair.committeeRole})</span>
                        ) : (
                          <span style={{ color: '#94A3B8', fontWeight: 600 }}>
                            {com.chairmanRole ? `Designated: ${com.chairmanRole}` : 'Chairman to be designated by Worthy President'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Assigned Members */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                        <span>Assigned Members ({com.assignedMembers.length})</span>
                      </div>

                      {com.assignedMembers.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {com.assignedMembers.map((m) => (
                            <div
                              key={m.positionId}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: '#FFFFFF',
                                border: '1px solid #E2E8F0',
                                padding: '6px 10px',
                                borderRadius: 8,
                                fontSize: 13,
                              }}
                            >
                              <span style={{ fontWeight: 700, color: '#1E293B' }}>
                                {m.title} {m.name} <span style={{ fontSize: 11, color: '#64748B' }}>({m.committeeRole})</span>
                              </span>
                              {isRegistrar && (
                                <button
                                  onClick={() => handleRemoveCommitteeMember(m.positionId, m.name)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#EF4444',
                                    cursor: 'pointer',
                                    fontSize: 13,
                                    padding: '2px 4px',
                                  }}
                                  title="Remove member"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>
                          No members assigned yet for this term.
                        </div>
                      )}
                    </div>

                    {/* Mandate Boundaries Breakdown */}
                    <details style={{ marginTop: 12, fontSize: 12, color: '#475569' }}>
                      <summary style={{ cursor: 'pointer', fontWeight: 700, color: '#3B82F6', outline: 'none' }}>
                        View Mandate & Scope Boundaries ℹ️
                      </summary>
                      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8, background: '#F8FAFC', padding: 12, borderRadius: 10 }}>
                        <div>
                          <strong style={{ color: '#059669' }}>✅ Owns:</strong> {com.owns.join(', ')}.
                        </div>
                        <div>
                          <strong style={{ color: '#DC2626' }}>🚫 Does Not Own:</strong> {com.doesNotOwn.join(', ')}.
                        </div>
                        <div>
                          <strong style={{ color: '#6366F1' }}>🤝 Collaborates with:</strong> {com.collaboratesWith.join(', ')}.
                        </div>
                      </div>
                    </details>
                  </div>

                  {/* Footer Action */}
                  {isRegistrar && (
                    <div style={{ marginTop: 18, paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
                      <button
                        onClick={() => {
                          setCommitteeToAssign(com.id);
                          setCommitteeRoleToAssign('Member');
                          setSelectedMemberId('');
                          setIsAssignCommitteeOpen(true);
                        }}
                        style={{
                          width: '100%',
                          padding: '8px',
                          borderRadius: 8,
                          background: '#F8FAFC',
                          border: '1px solid #CBD5E1',
                          color: '#0F172A',
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        ➕ Assign Brother to {com.shortName}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 1: ASSIGN COMMANDERY OFFICER
      ══════════════════════════════════════════════════════════════════════ */}
      {isAssignOfficerOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              width: '100%',
              maxWidth: 480,
              padding: '28px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0A1628' }}>
                {editingPositionId ? 'Edit Officer Assignment' : 'Assign Commandery Officer'}
              </h3>
              <button
                onClick={() => setIsAssignOfficerOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignOfficerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                  Officer Position Title:
                </label>
                <input
                  type="text"
                  value={assigningRole}
                  onChange={(e) => setAssigningRole(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1.5px solid #CBD5E1',
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                  Select Brother Knight:
                </label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1.5px solid #CBD5E1',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  <option value="">-- Choose Member --</option>
                  {data.allEligibleMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title} {m.firstName} {m.surname} ({m.status})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                    Term Start:
                  </label>
                  <input
                    type="date"
                    value={termDateFrom}
                    onChange={(e) => setTermDateFrom(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1.5px solid #CBD5E1',
                      fontSize: 13,
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                    Term End (Optional):
                  </label>
                  <input
                    type="date"
                    value={termDateTo}
                    onChange={(e) => setTermDateTo(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1.5px solid #CBD5E1',
                      fontSize: 13,
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setIsAssignOfficerOpen(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 10,
                    background: '#F1F5F9',
                    border: 'none',
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: '#475569',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 10,
                    background: '#0A1628',
                    border: 'none',
                    fontWeight: 800,
                    cursor: busy ? 'not-allowed' : 'pointer',
                    color: '#FFFFFF',
                  }}
                >
                  {busy ? 'Saving...' : 'Save Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 2: ASSIGN COMMITTEE MEMBER
      ══════════════════════════════════════════════════════════════════════ */}
      {isAssignCommitteeOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              width: '100%',
              maxWidth: 480,
              padding: '28px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0A1628' }}>
                Assign Committee Appointment
              </h3>
              <button
                onClick={() => setIsAssignCommitteeOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignCommitteeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                  Target Committee:
                </label>
                <select
                  value={committeeToAssign}
                  onChange={(e) => setCommitteeToAssign(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1.5px solid #CBD5E1',
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  {data.committees.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                  Committee Role:
                </label>
                <select
                  value={committeeRoleToAssign}
                  onChange={(e) => setCommitteeRoleToAssign(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1.5px solid #CBD5E1',
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  <option value="Chairman">👑 Chairman</option>
                  <option value="Vice Chairman">🥈 Vice Chairman</option>
                  <option value="Secretary">📝 Secretary</option>
                  <option value="Treasurer">💰 Committee Treasurer</option>
                  <option value="Member">👤 Committee Member</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                  Select Brother Knight:
                </label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1.5px solid #CBD5E1',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  <option value="">-- Choose Member --</option>
                  {data.allEligibleMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title} {m.firstName} {m.surname}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setIsAssignCommitteeOpen(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 10,
                    background: '#F1F5F9',
                    border: 'none',
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: '#475569',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 10,
                    background: '#0A1628',
                    border: 'none',
                    fontWeight: 800,
                    cursor: busy ? 'not-allowed' : 'pointer',
                    color: '#FFFFFF',
                  }}
                >
                  {busy ? 'Assigning...' : 'Assign to Committee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 3: ASSIGN TEMPLE OFFICER
      ══════════════════════════════════════════════════════════════════════ */}
      {isAssignTempleOfficerOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              width: '100%',
              maxWidth: 480,
              padding: '28px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0A1628' }}>
                Assign Temple Leadership Officer
              </h3>
              <button
                onClick={() => setIsAssignTempleOfficerOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignTempleOfficerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                  Temple / Chapter:
                </label>
                <select
                  value={templeLevelToAssign}
                  onChange={(e) => setTempleLevelToAssign(e.target.value as any)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1.5px solid #CBD5E1',
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  <option value="Chapter">Archbishop William Porter Chapter of Chevaliers</option>
                  <option value="Nobles Temple">Accra West Nobles’ Temple</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                  Position Title:
                </label>
                <input
                  type="text"
                  placeholder={templeLevelToAssign === 'Chapter' ? 'e.g. Grand Master, Deputy Grand Master, Chapter Scribe' : 'e.g. Noble Grand Master, Temple Scribe, Temple Chancellor'}
                  value={templeOfficerTitle}
                  onChange={(e) => setTempleOfficerTitle(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1.5px solid #CBD5E1',
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                  Select Conferred Knight:
                </label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1.5px solid #CBD5E1',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  <option value="">-- Choose Member --</option>
                  {data.allEligibleMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title} {m.firstName} {m.surname}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setIsAssignTempleOfficerOpen(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 10,
                    background: '#F1F5F9',
                    border: 'none',
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: '#475569',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 10,
                    background: '#0A1628',
                    border: 'none',
                    fontWeight: 800,
                    cursor: busy ? 'not-allowed' : 'pointer',
                    color: '#FFFFFF',
                  }}
                >
                  {busy ? 'Saving...' : 'Save Temple Officer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
