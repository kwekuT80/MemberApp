'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  STANDARD_OFFICER_ROLES,
  OfficerRoleDefinition,
  normalizePositionTitle,
} from '@/types/officers';
import {
  assignOfficerPosition,
  deleteOfficerPosition,
} from '@/services/officersService';
import { formatDisplayDate } from '@/lib/utils/ksji-logic';

interface Props {
  initialPositions: any[];
  allMembers: any[];
  isRegistrar?: boolean;
}

export default function CommanderyOfficersClient({
  initialPositions,
  allMembers,
  isRegistrar = false,
}: Props) {
  const router = useRouter();
  const [positions, setPositions] = useState<any[]>(initialPositions);
  
  // Available biennial terms
  const currentYear = new Date().getFullYear();
  const currentTermStart = currentYear % 2 === 0 ? currentYear : currentYear - 1;
  const currentTermKey = `${currentTermStart}-${currentTermStart + 1}`;

  const availableTerms = useMemo(() => {
    const termSet = new Set<string>();
    // Add current and recent terms
    for (let y = currentTermStart + 2; y >= 2010; y -= 2) {
      termSet.add(`${y}-${y + 1}`);
    }

    // Add any terms from existing database records
    positions.forEach((p) => {
      const fromY = p.date_from ? parseInt(p.date_from.substring(0, 4), 10) : null;
      if (fromY && !isNaN(fromY)) {
        const start = fromY % 2 === 0 ? fromY : fromY - 1;
        termSet.add(`${start}-${start + 1}`);
      }
    });

    return Array.from(termSet).sort((a, b) => {
      const startA = parseInt(a.split('-')[0], 10);
      const startB = parseInt(b.split('-')[0], 10);
      return startB - startA;
    });
  }, [positions, currentTermStart]);

  const [selectedTerm, setSelectedTerm] = useState<string>(currentTermKey);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'commandery' | 'trustees' | 'military' | 'appointed' | 'board_of_trustees'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State for assigning / editing officer
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalRole, setModalRole] = useState<string>('');
  const [modalPositionId, setModalPositionId] = useState<string | undefined>(undefined);
  const [modalMemberId, setModalMemberId] = useState<string>('');
  const [modalDateFrom, setModalDateFrom] = useState<string>('');
  const [modalDateTo, setModalDateTo] = useState<string>('');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Term start & end years
  const [termStartYear, termEndYear] = useMemo(() => {
    const parts = selectedTerm.split('-');
    return [parseInt(parts[0], 10), parseInt(parts[1], 10)];
  }, [selectedTerm]);

  // Positions matching the selected term (allowing any assigned brother, living or deceased)
  const termPositions = useMemo(() => {
    return positions.filter((p) => {
      const fromYear = p.date_from ? parseInt(p.date_from.substring(0, 4), 10) : null;
      const toYear = p.date_to ? parseInt(p.date_to.substring(0, 4), 10) : null;

      // If both dates are empty, match current term only if active
      if (!fromYear && !toYear) {
        return selectedTerm === currentTermKey;
      }

      // Check overlap with term [termStartYear, termEndYear]
      const effectiveStart = fromYear || termStartYear;
      const effectiveEnd = toYear || (effectiveStart >= termStartYear ? termEndYear : 9999);

      return effectiveStart <= termEndYear && effectiveEnd >= termStartYear;
    });
  }, [positions, selectedTerm, termStartYear, termEndYear, currentTermKey]);

  // Map standard roles to their assigned officers in this term
  const roleSlots = useMemo(() => {
    const slots = STANDARD_OFFICER_ROLES.map((role) => {
      // Find matching positions in this term
      const matches = termPositions
        .filter((p) => {
          const norm = normalizePositionTitle(p.position_title);
          return norm.toLowerCase() === role.title.toLowerCase();
        })
        .sort((a, b) => (a.date_from || '').localeCompare(b.date_from || ''));

      return {
        role,
        assigned: matches[matches.length - 1] || null,
        allAssigned: matches,
      };
    });

    return slots;
  }, [termPositions]);

  // Additional positions for this term that aren't part of standard roles
  const additionalOfficers = useMemo(() => {
    const standardTitlesLower = new Set(STANDARD_OFFICER_ROLES.map((r) => r.title.toLowerCase()));
    STANDARD_OFFICER_ROLES.forEach((r) => {
      r.aliases.forEach((a) => standardTitlesLower.add(a.toLowerCase()));
    });
    return termPositions.filter((p) => {
      const raw = (p.position_title || '').trim();
      if (!raw) return false;
      const lower = raw.toLowerCase();
      // Omit non-local / grand / district / committee positions from the commandery officers roster
      if (
        lower.includes('grandmaster') ||
        lower.includes('grand') ||
        lower.includes('welfare') ||
        lower.includes('committee')
      ) {
        return false;
      }
      const norm = normalizePositionTitle(p.position_title);
      return !standardTitlesLower.has(norm.toLowerCase()) && !standardTitlesLower.has(lower);
    });
  }, [termPositions]);

  // Past Worthy Presidents (who constitutionally sit on the Board of Trustees)
  const pastPresidents = useMemo(() => {
    const list: Array<{
      id: string;
      memberId: string;
      name: string;
      title?: string | null;
      status?: string | null;
      photoUrl?: string | null;
      phone?: string | null;
      email?: string | null;
      tenure: string;
      isDeceased: boolean;
    }> = [];

    const presPositions = positions.filter((p) => {
      const norm = normalizePositionTitle(p.position_title);
      return norm === 'Worthy President' || norm === 'President';
    });

    const seenMembers = new Set<string>();
    presPositions.forEach((p) => {
      const m = p.members;
      if (!m || seenMembers.has(m.id)) return;
      seenMembers.add(m.id);

      const fromYear = p.date_from ? p.date_from.substring(0, 4) : '';
      const toYear = p.date_to ? p.date_to.substring(0, 4) : 'Present';
      const tenure = fromYear ? `${fromYear} – ${toYear}` : 'Past President';

      list.push({
        id: p.id,
        memberId: m.id,
        name: `${m.first_name || ''} ${m.surname || ''}`.trim(),
        title: m.title,
        status: m.status,
        photoUrl: m.photo_url,
        phone: m.phone,
        email: m.email,
        tenure,
        isDeceased: m.is_deceased || m.status === 'Deceased',
      });
    });

    return list;
  }, [positions]);

  // Filter slots by category and search query
  const filteredSlots = useMemo(() => {
    return roleSlots.filter((slot) => {
      // 1. Category filter
      if (selectedCategory !== 'all' && selectedCategory !== 'board_of_trustees' && slot.role.category !== selectedCategory) {
        return false;
      }

      // 2. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const roleMatches = slot.role.title.toLowerCase().includes(q);
        const nameMatches = slot.allAssigned.some((pos) => {
          const member = pos.members;
          return member
            ? `${member.title || ''} ${member.first_name || ''} ${member.surname || ''} ${member.other_names || ''}`.toLowerCase().includes(q)
            : false;
        });
        return roleMatches || nameMatches;
      }

      return true;
    });
  }, [roleSlots, selectedCategory, searchQuery]);

  // Filter active members for assignment picker
  const filteredMembersForPicker = useMemo(() => {
    if (!memberSearchTerm.trim()) {
      return allMembers;
    }
    const q = memberSearchTerm.toLowerCase().trim();
    return allMembers.filter((m) => {
      const full = `${m.title || ''} ${m.first_name || ''} ${m.other_names || ''} ${m.surname || ''}`.toLowerCase();
      return full.includes(q);
    });
  }, [allMembers, memberSearchTerm]);

  const selectedMember = useMemo(() => {
    return allMembers.find((m) => m.id === modalMemberId) || null;
  }, [allMembers, modalMemberId]);

  // Open modal for a specific role
  function handleOpenAssignModal(roleTitle: string, existingAssignment?: any) {
    setModalRole(roleTitle);
    setModalPositionId(existingAssignment?.id);
    setModalMemberId(existingAssignment?.member_id || '');
    setModalDateFrom(existingAssignment?.date_from || `${termStartYear}-01-01`);
    setModalDateTo(existingAssignment?.date_to || `${termEndYear}-12-31`);
    setMemberSearchTerm('');
    setModalError(null);
    setIsModalOpen(true);
  }

  // Handle saving the assignment
  async function handleSaveAssignment(e: React.FormEvent) {
    e.preventDefault();
    let targetMemberId = modalMemberId;

    // If user searched for a name, ensure we pick from the search results
    if (memberSearchTerm.trim()) {
      const matchExists = filteredMembersForPicker.some((m) => m.id === modalMemberId);
      if (!matchExists && filteredMembersForPicker.length >= 1) {
        targetMemberId = filteredMembersForPicker[0].id;
      }
    } else if (!targetMemberId && filteredMembersForPicker.length >= 1) {
      targetMemberId = filteredMembersForPicker[0].id;
    }

    if (!targetMemberId) {
      setModalError('Please select a brother from the list below.');
      return;
    }

    setModalSubmitting(true);
    setModalError(null);

    try {
      const res = await assignOfficerPosition({
        positionId: modalPositionId,
        memberId: targetMemberId,
        positionTitle: modalRole,
        dateFrom: modalDateFrom,
        dateTo: modalDateTo || null,
      });

      // res.data includes the joined members relation
      const enriched = res.data;

      setPositions((prev) => {
        if (modalPositionId) {
          return prev.map((p) => (p.id === modalPositionId ? enriched : p));
        }
        const normTarget = normalizePositionTitle(modalRole).toLowerCase();
        const withoutExactDuplicate = prev.filter((p) => {
          if (p.id === enriched.id) return false;
          if (
            normalizePositionTitle(p.position_title).toLowerCase() === normTarget &&
            p.date_from === enriched.date_from
          ) {
            return false;
          }
          return true;
        });
        return [enriched, ...withoutExactDuplicate];
      });

      setIsModalOpen(false);
      setActionSuccess(`Officer assigned successfully for ${modalRole}.`);
      router.refresh();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setModalError(err.message || 'Failed to save officer assignment.');
    } finally {
      setModalSubmitting(false);
    }
  }

  // Handle deleting/unassigning an officer
  async function handleDeleteAssignment(positionId: string, roleTitle: string) {
    if (!confirm(`Are you sure you want to remove this officer assignment for ${roleTitle}?`)) {
      return;
    }

    try {
      await deleteOfficerPosition(positionId);
      setPositions((prev) => prev.filter((p) => p.id !== positionId));
      setActionSuccess(`Officer removed from ${roleTitle}.`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(`Error removing assignment: ${err.message}`);
    }
  }

  const categoryGroups = [
    { id: 'commandery', label: '🏛️ Commandery Officers', desc: 'Presidency, Secretariat & Treasury' },
    { id: 'trustees', label: '🛡️ Trustees', desc: '1st, 2nd, and 3rd Trustees elected to serve within the Board of Trustees' },
    { id: 'military', label: '⚔️ Military Officers', desc: 'Parade, Drill, Inspection & Turnout Staff' },
    { id: 'appointed', label: '🎖️ Appointed Officers', desc: 'Appointive commandery responsibilities (Cadet Organiser)' },
  ];

  return (
    <div style={{ color: '#0F172A', fontFamily: 'Inter, sans-serif' }}>
      
      {/* ── Executive Hero Banner ────────────────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0A1628 0%, #1e293b 50%, #0F172A 100%)',
          borderRadius: 20,
          padding: '32px 36px',
          color: 'white',
          marginBottom: 28,
          boxShadow: '0 16px 36px rgba(10, 22, 40, 0.25)',
          borderLeft: '6px solid #C9A84C',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 24 }}>⚔️</span>
            <span style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.5, color: '#C9A84C', fontWeight: 800 }}>
              Knights of St. John International • Commandery #500
            </span>
          </div>

          <h1 style={{ margin: '0 0 10px', fontSize: 28, fontWeight: 900, letterSpacing: '-0.5px' }}>
            Commandery Officers Roster
          </h1>

          <p style={{ margin: 0, fontSize: 14, color: '#94a3b8', maxWidth: 720, lineHeight: 1.6 }}>
            Official leadership directory and administration roster for St. Margaret-Mary Commandery #500.
            Officers are presented by branch: Commandery Officers, Trustees, Military Staff, and Appointed Officers.
            <em> Note: The entire Officer Corps and all Past Worthy Presidents constitutionally constitute the Board of Trustees.</em>
          </p>

          {/* Quick Metrics Bar */}
          <div style={{ display: 'flex', gap: 20, marginTop: 24, flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 16px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Active Term</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#C9A84C' }}>{selectedTerm}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 16px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Standard Offices</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#ffffff' }}>{STANDARD_OFFICER_ROLES.length}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 16px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Filled Positions</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#22c55e' }}>
                {roleSlots.filter((s) => s.assigned).length} / {STANDARD_OFFICER_ROLES.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Success Toast ──────────────────────────────────────────────── */}
      {actionSuccess && (
        <div
          style={{
            background: '#f0fdf4',
            border: '1.5px solid #86efac',
            color: '#166534',
            padding: '12px 18px',
            borderRadius: 10,
            marginBottom: 20,
            fontSize: 13,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span>✅</span>
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* ── Term Selector & Filter Toolbar ─────────────────────────────── */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          padding: 18,
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          marginBottom: 24,
          display: 'grid',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          {/* Term Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#0A1628' }}>📆 Administration Term:</span>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1.5px solid #cbd5e1',
                fontSize: 13,
                fontWeight: 700,
                color: '#0A1628',
                background: '#f8fafc',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {availableTerms.map((t) => (
                <option key={t} value={t}>
                  {t} {t === currentTermKey ? '★ Current Administration' : 'Term'}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div style={{ minWidth: 260 }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Search officer or position title..."
              style={{
                width: '100%',
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
          {[
            { id: 'all', label: 'All Offices' },
            { id: 'commandery', label: '🏛️ Commandery Officers' },
            { id: 'trustees', label: '🛡️ Trustees' },
            { id: 'military', label: '⚔️ Military Officers' },
            { id: 'appointed', label: '🎖️ Appointed Officers' },
            { id: 'board_of_trustees', label: '🏛️ Board of Trustees (Full Composition)' },
          ].map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id as any)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 20,
                  border: isSelected ? '1.5px solid #C9A84C' : '1px solid #e2e8f0',
                  background: isSelected ? '#0A1628' : '#ffffff',
                  color: isSelected ? '#C9A84C' : '#475569',
                  fontWeight: isSelected ? 800 : 600,
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Constitutional Board of Trustees Banner ─────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(201, 168, 76, 0.08) 0%, rgba(10, 22, 40, 0.03) 100%)',
          border: '1.5px solid rgba(201, 168, 76, 0.35)',
          borderRadius: 14,
          padding: '16px 20px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 14,
        }}
      >
        <span style={{ fontSize: 24, flexShrink: 0 }}>🏛️</span>
        <div style={{ fontSize: 13, color: '#1e293b', lineHeight: 1.6 }}>
          <div style={{ fontWeight: 800, color: '#0A1628', fontSize: 14, marginBottom: 2 }}>
            Constitutional Governance Note: Board of Trustees
          </div>
          <div>
            In KSJI Commandery governance, the <strong>Board of Trustees</strong> is comprised of the{' '}
            <strong>entire Officer Corps</strong> together with all <strong>Past Worthy Presidents</strong> of the Commandery
            (rather than only the elected Trustees). The <em>1st, 2nd, and 3rd Trustees</em> are the elected trustees serving within this constitutional body.
          </div>
        </div>
      </div>

      {/* ── Dedicated Board of Trustees Full Composition View ──────────── */}
      {selectedCategory === 'board_of_trustees' && (
        <div style={{ display: 'grid', gap: 24, marginBottom: 28 }}>
          {/* Branch 1: The Incumbent Officer Corps */}
          <div style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0A1628' }}>
                  Branch 1: The Officer Corps ({selectedTerm})
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                  All elected and appointive officers of the current administration serving on the Board
                </p>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0A1628', background: '#f1f5f9', padding: '4px 10px', borderRadius: 8 }}>
                {roleSlots.filter((s) => s.allAssigned.length > 0).length} of {roleSlots.length} Roles Filled ({roleSlots.reduce((acc, s) => acc + s.allAssigned.length, 0)} Officers Recorded)
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
              {roleSlots.flatMap(({ role, allAssigned }) => {
                if (allAssigned.length === 0) {
                  return [
                    <div
                      key={role.id}
                      style={{
                        padding: 10,
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        background: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#C9A84C' }}>{role.title}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8' }}>
                          ○ Vacant / Unassigned
                        </div>
                      </div>
                    </div>,
                  ];
                }

                return allAssigned.map((pos, idx) => {
                  const member = pos.members;
                  const isDeceased = member?.is_deceased || member?.status === 'Deceased';
                  const isSuccession = allAssigned.length > 1;

                  return (
                    <div
                      key={pos.id}
                      style={{
                        padding: 10,
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        background: isDeceased ? '#fcfbf7' : '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: '#C9A84C' }}>{role.title}</span>
                          {isSuccession && (
                            <span style={{ fontSize: 9, fontWeight: 800, background: '#fef3c7', color: '#92400e', padding: '1px 5px', borderRadius: 4 }}>
                              {idx === 0 ? 'Predecessor' : 'Successor'}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0A1628' }}>
                          {member ? `${member.title ? `${member.title} ` : ''}${member.first_name} ${member.surname}` : '○ Vacant'}
                          {isDeceased && <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}> (🕊️ Deceased)</span>}
                        </div>
                        {pos.date_from && (
                          <div style={{ fontSize: 10, color: '#64748b' }}>
                            Tenure: {pos.date_from.substring(0, 4)} – {pos.date_to ? pos.date_to.substring(0, 4) : 'Present'}
                          </div>
                        )}
                      </div>
                      {member && (
                        <Link
                          href={isRegistrar ? `/registrar/members/${member.id}` : `/me`}
                          style={{ fontSize: 11, fontWeight: 700, color: '#0A1628', textDecoration: 'none' }}
                        >
                          Profile →
                        </Link>
                      )}
                    </div>
                  );
                });
              })}
            </div>
          </div>

          {/* Branch 2: Past Worthy Presidents */}
          <div style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderBottom: '1px solid #f1f5f9', paddingBottom: 10, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0A1628' }}>
                  Branch 2: Past Worthy Presidents of Commandery #500
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                  Honorary lifetime members of the Board of Trustees by virtue of their presidential service
                </p>
              </div>
              <Link
                href={isRegistrar ? '/registrar/presidents' : '/me/presidents'}
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: '#0A1628',
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  padding: '6px 12px',
                  borderRadius: 8,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>👑 View Roll of Worthy Presidents</span>
                <span>→</span>
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
              {pastPresidents.map((p) => (
                <div
                  key={p.memberId}
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    background: p.isDeceased ? '#f8fafc' : '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#0A1628' }}>
                      {p.title ? `${p.title} ` : ''}{p.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      Tenure: {p.tenure} {p.isDeceased && '• ✝️ Deceased'}
                    </div>
                  </div>
                  <Link
                    href={isRegistrar ? `/registrar/members/${p.memberId}` : `/me`}
                    style={{ fontSize: 11, fontWeight: 700, color: '#0A1628', textDecoration: 'none' }}
                  >
                    Profile →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Grouped Officer Sections ────────────────────────────────────── */}
      <div style={{ display: 'grid', gap: 28 }}>
        {categoryGroups.map((group) => {
          if (selectedCategory !== 'all' && selectedCategory !== group.id) {
            return null;
          }

          const groupSlots = filteredSlots.filter((s) => s.role.category === group.id);
          if (groupSlots.length === 0) return null;

          return (
            <div key={group.id} style={{ display: 'grid', gap: 14 }}>
              {/* Group Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '2px solid #e2e8f0', paddingBottom: 8 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0A1628' }}>
                    {group.label}
                  </h2>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                    {group.desc}
                  </p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', background: '#f1f5f9', padding: '3px 8px', borderRadius: 12 }}>
                  {groupSlots.filter((s) => s.allAssigned.length > 0).length} of {groupSlots.length} filled
                </span>
              </div>

              {/* Neat List Table / Rows */}
              <div style={{ display: 'grid', gap: 10 }}>
                {groupSlots.map(({ role, assigned, allAssigned }) => {
                  // Case 1: Mid-Term Succession (multiple incumbents in one term)
                  if (allAssigned.length > 1) {
                    return (
                      <div
                        key={role.id}
                        style={{
                          background: '#ffffff',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: 14,
                          padding: '16px 20px',
                          display: 'grid',
                          gap: 14,
                          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                        }}
                      >
                        {/* Header: Role & Mid-Term Succession Tag */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 15, fontWeight: 900, color: '#0A1628' }}>
                                {role.title}
                              </span>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 800,
                                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                                  color: '#92400e',
                                  padding: '2px 8px',
                                  borderRadius: 6,
                                  border: '1px solid #fcd34d',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                <span>⚡ Mid-Term Succession</span>
                                <span>({allAssigned.length} Incumbents)</span>
                              </span>
                              {role.isAppointive && (
                                <span style={{ fontSize: 10, fontWeight: 800, background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: 4 }}>
                                  Appointive
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
                              Tenure: {selectedTerm} {selectedTerm === currentTermKey && '• Current'} — Officer stepped in to complete unexpired term
                            </div>
                          </div>

                          {isRegistrar && (
                            <button
                              type="button"
                              onClick={() => handleOpenAssignModal(role.title)}
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: '#0A1628',
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                padding: '5px 10px',
                                borderRadius: 6,
                                cursor: 'pointer',
                              }}
                            >
                              ➕ Add Successor / Incumbent
                            </button>
                          )}
                        </div>

                        {/* Chronological List of Incumbents */}
                        <div style={{ display: 'grid', gap: 10 }}>
                          {allAssigned.map((pos, idx) => {
                            const member = pos.members;
                            const isDeceased = member?.is_deceased || member?.status === 'Deceased';
                            const isLatest = idx === allAssigned.length - 1;
                            const pUrl = isRegistrar ? `/registrar/members/${member?.id}` : `/me`;

                            return (
                              <div key={pos.id} style={{ display: 'grid', gap: 6 }}>
                                {idx > 0 && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 18, color: '#64748b', fontSize: 11, fontWeight: 700 }}>
                                    <span style={{ color: '#C9A84C' }}>↳</span>
                                    <span style={{ background: '#f1f5f9', padding: '1px 8px', borderRadius: 4, border: '1px solid #e2e8f0', color: '#475569', fontSize: 10 }}>
                                      Succession • Succeeded for unexpired portion of the term
                                    </span>
                                  </div>
                                )}

                                <div
                                  style={{
                                    padding: '10px 14px',
                                    borderRadius: 10,
                                    border: isLatest ? '1.5px solid #C9A84C' : '1px solid #e2e8f0',
                                    background: isDeceased ? '#fcfbf7' : isLatest ? '#faf8f2' : '#f8fafc',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 14,
                                    flexWrap: 'wrap',
                                  }}
                                >
                                  {/* Left: Avatar & Details */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '1 1 260px', minWidth: 240 }}>
                                    <div
                                      style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: '50%',
                                        background: member?.photo_url
                                          ? `url(${member.photo_url}) center/cover no-repeat`
                                          : 'linear-gradient(135deg, #0A1628 0%, #1e293b 100%)',
                                        border: isLatest ? '2px solid #C9A84C' : '2px solid #94a3b8',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#C9A84C',
                                        fontWeight: 800,
                                        fontSize: 13,
                                        flexShrink: 0,
                                        position: 'relative',
                                      }}
                                    >
                                      {!member?.photo_url && (
                                        `${(member?.first_name || '')[0] || ''}${(member?.surname || '')[0] || ''}`
                                      )}
                                      {isDeceased && (
                                        <span
                                          title="Deceased"
                                          style={{
                                            position: 'absolute',
                                            bottom: -3,
                                            right: -3,
                                            fontSize: 11,
                                            background: '#ffffff',
                                            borderRadius: '50%',
                                            padding: '0 2px',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                                          }}
                                        >
                                          🕊️
                                        </span>
                                      )}
                                    </div>

                                    <div style={{ minWidth: 0 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                        <Link
                                          href={pUrl}
                                          style={{ fontSize: 13, fontWeight: 800, color: '#0A1628', textDecoration: 'none' }}
                                          className="hover:underline"
                                        >
                                          {member?.title ? `${member.title} ` : ''}{member?.first_name} {member?.surname}
                                        </Link>

                                        {isDeceased ? (
                                          <span style={{ fontSize: 10, fontWeight: 800, background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: 4, border: '1px solid #fde68a' }}>
                                            🕊️ In Memoriam • Passed in Office
                                          </span>
                                        ) : isLatest ? (
                                          <span style={{ fontSize: 10, fontWeight: 800, background: '#dbeafe', color: '#1e40af', padding: '1px 6px', borderRadius: 4, border: '1px solid #bfdbfe' }}>
                                            ⚡ Successor (Unexpired Term)
                                          </span>
                                        ) : null}

                                        {member?.status && (
                                          <span
                                            style={{
                                              fontSize: 9,
                                              fontWeight: 700,
                                              padding: '1px 5px',
                                              borderRadius: 4,
                                              background: member.status === 'Active' ? '#f0fdf4' : '#f1f5f9',
                                              color: member.status === 'Active' ? '#16a34a' : '#64748b',
                                            }}
                                          >
                                            ● {member.status}
                                          </span>
                                        )}
                                      </div>

                                      <div style={{ fontSize: 11, color: '#0A1628', fontWeight: 600, marginTop: 2 }}>
                                        Served: <span style={{ color: '#0369a1', fontWeight: 700 }}>{pos.date_from ? formatDisplayDate(pos.date_from) : '—'}</span> to <span style={{ color: '#0369a1', fontWeight: 700 }}>{pos.date_to ? formatDisplayDate(pos.date_to) : 'Present'}</span>
                                      </div>

                                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 1, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                        {member?.phone && (
                                          <a href={`tel:${member.phone}`} style={{ color: '#0284c7', textDecoration: 'none' }}>
                                            📞 {member.phone}
                                          </a>
                                        )}
                                        {member?.email && (
                                          <a href={`mailto:${member.email}`} style={{ color: '#64748b', textDecoration: 'none' }}>
                                            ✉️ {member.email}
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Right: Actions */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                    <Link
                                      href={pUrl}
                                      style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: '#0A1628',
                                        background: '#f1f5f9',
                                        padding: '5px 10px',
                                        borderRadius: 6,
                                        textDecoration: 'none',
                                      }}
                                    >
                                      Profile →
                                    </Link>

                                    {isRegistrar && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleOpenAssignModal(role.title, pos)}
                                          style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: '#0A1628',
                                            background: '#ffffff',
                                            border: '1px solid #cbd5e1',
                                            padding: '5px 8px',
                                            borderRadius: 6,
                                            cursor: 'pointer',
                                          }}
                                          title="Edit tenure details"
                                        >
                                          ✏️ Edit
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteAssignment(pos.id, role.title)}
                                          style={{
                                            fontSize: 11,
                                            color: '#ef4444',
                                            background: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: '5px 4px',
                                          }}
                                          title="Remove record"
                                        >
                                          🗑️
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  // Case 2: Single incumbent or Vacant
                  const member = assigned?.members;
                  const profileUrl = isRegistrar
                    ? `/registrar/members/${member?.id}`
                    : `/me`;

                  return (
                    <div
                      key={role.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 12,
                        padding: '14px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16,
                        flexWrap: 'wrap',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {/* Left: Role Info */}
                      <div style={{ minWidth: 220, flex: '1 1 220px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14, fontWeight: 800, color: '#0A1628' }}>
                            {role.title}
                          </span>
                          {role.isAppointive && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                background: '#fef3c7',
                                color: '#92400e',
                                padding: '2px 6px',
                                borderRadius: 4,
                                border: '1px solid #fde68a',
                              }}
                            >
                              Appointive
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
                          Tenure: {selectedTerm} {selectedTerm === currentTermKey && '• Current'}
                        </div>
                      </div>

                      {/* Center: Officer Details or Vacant State */}
                      <div style={{ minWidth: 260, flex: '2 1 260px', display: 'flex', alignItems: 'center', gap: 12 }}>
                        {member ? (
                          <>
                            {/* Avatar */}
                            <div
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: '50%',
                                background: member.photo_url ? `url(${member.photo_url}) center/cover no-repeat` : 'linear-gradient(135deg, #0A1628 0%, #1e293b 100%)',
                                border: '2px solid #C9A84C',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#C9A84C',
                                fontWeight: 800,
                                fontSize: 14,
                                flexShrink: 0,
                                position: 'relative',
                              }}
                            >
                              {!member.photo_url && (
                                `${(member.first_name || '')[0] || ''}${(member.surname || '')[0] || ''}`
                              )}
                              {(member.is_deceased || member.status === 'Deceased') && (
                                <span
                                  title="Deceased"
                                  style={{
                                    position: 'absolute',
                                    bottom: -4,
                                    right: -4,
                                    fontSize: 12,
                                    background: '#ffffff',
                                    borderRadius: '50%',
                                    padding: '0 2px',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                  }}
                                >
                                  🕊️
                                </span>
                              )}
                            </div>

                            {/* Name & Contact */}
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <Link
                                  href={profileUrl}
                                  style={{
                                    fontSize: 14,
                                    fontWeight: 800,
                                    color: '#0A1628',
                                    textDecoration: 'none',
                                  }}
                                  className="hover:underline"
                                >
                                  {member.title ? `${member.title} ` : ''}{member.first_name} {member.surname}
                                </Link>

                                {member.status && (
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      padding: '2px 6px',
                                      borderRadius: 4,
                                      background: member.status === 'Active' ? '#f0fdf4' : '#f1f5f9',
                                      color: member.status === 'Active' ? '#16a34a' : '#64748b',
                                    }}
                                  >
                                    ● {member.status} {member.is_deceased ? '• 🕊️ Deceased' : ''}
                                  </span>
                                )}
                              </div>

                              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                {member.phone && (
                                  <a href={`tel:${member.phone}`} style={{ color: '#0284c7', textDecoration: 'none' }}>
                                    📞 {member.phone}
                                  </a>
                                )}
                                {member.email && (
                                  <a href={`mailto:${member.email}`} style={{ color: '#64748b', textDecoration: 'none' }}>
                                    ✉️ {member.email}
                                  </a>
                                )}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '6px 12px',
                              borderRadius: 6,
                              background: '#f8fafc',
                              border: '1px dashed #cbd5e1',
                              fontSize: 12,
                              color: '#94a3b8',
                              fontStyle: 'italic',
                            }}
                          >
                            <span>○</span>
                            <span>Vacant / Not yet recorded for this term</span>
                          </div>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        {member && (
                          <Link
                            href={profileUrl}
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: '#0A1628',
                              background: '#f1f5f9',
                              padding: '6px 12px',
                              borderRadius: 6,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <span>Profile</span>
                            <span>→</span>
                          </Link>
                        )}

                        {/* Registrar Assignment Controls */}
                        {isRegistrar && (
                          <>
                            {member ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenAssignModal(role.title, assigned)}
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: '#0A1628',
                                    background: '#ffffff',
                                    border: '1px solid #cbd5e1',
                                    padding: '6px 10px',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                  }}
                                  title="Change or reassign officer"
                                >
                                  ✏️ Change
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenAssignModal(role.title)}
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: '#0284c7',
                                    background: '#f0f9ff',
                                    border: '1px solid #bae6fd',
                                    padding: '6px 10px',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                  }}
                                  title="Record a successor who stepped in mid-term"
                                >
                                  + Add Successor
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenAssignModal(role.title)}
                                style={{
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: '#ffffff',
                                  background: '#0A1628',
                                  border: '1px solid #0A1628',
                                  padding: '6px 12px',
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                }}
                              >
                                ➕ Assign Officer
                              </button>
                            )}

                            {assigned && (
                              <button
                                type="button"
                                onClick={() => handleDeleteAssignment(assigned.id, role.title)}
                                style={{
                                  fontSize: 12,
                                  color: '#ef4444',
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '6px 4px',
                                }}
                                title="Delete erroneous assignment"
                              >
                                🗑️
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* ── Additional Appointments for this Term ───────────────────────── */}
        {additionalOfficers.length > 0 && (
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: 8 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0A1628' }}>
                🎖️ Other Local Positions & Special Appointments
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                Additional appointments or special service records recorded for {selectedTerm}
              </p>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              {additionalOfficers.map((p) => {
                const member = p.members;
                const profileUrl = isRegistrar
                  ? `/registrar/members/${member?.id}`
                  : `/me`;

                return (
                  <div
                    key={p.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 12,
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 16,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#0A1628' }}>
                        {p.position_title}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        {p.date_from ? formatDisplayDate(p.date_from) : '—'} to {p.date_to ? formatDisplayDate(p.date_to) : 'Present'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Link
                        href={profileUrl}
                        style={{ fontSize: 13, fontWeight: 700, color: '#0A1628', textDecoration: 'none' }}
                      >
                        {member ? `${member.title ? `${member.title} ` : ''}${member.first_name} ${member.surname}` : 'Unassigned'}
                      </Link>

                      {isRegistrar && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAssignment(p.id, p.position_title)}
                          style={{ fontSize: 12, color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer' }}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Assign / Change Officer Modal (Registrar only) ──────────────── */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10, 22, 40, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 9999,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !modalSubmitting) {
              setIsModalOpen(false);
            }
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              maxWidth: 500,
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                background: 'linear-gradient(135deg, #0A1628 0%, #1e293b 100%)',
                color: '#ffffff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#C9A84C' }}>
                  {modalPositionId ? '✏️ Change Officer Assignment' : '➕ Assign Commandery Officer'}
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: '#94a3b8' }}>
                  {modalRole} • Term {selectedTerm}
                </p>
              </div>
              <button
                type="button"
                onClick={() => !modalSubmitting && setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 22, cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveAssignment} style={{ padding: 24, display: 'grid', gap: 16 }}>
              {modalError && (
                <div style={{ padding: '10px 12px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: 12 }}>
                  ⚠️ {modalError}
                </div>
              )}

              {/* Office Title */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                  Office / Position Title
                </label>
                <input
                  type="text"
                  value={modalRole}
                  onChange={(e) => setModalRole(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#0A1628',
                  }}
                />
              </div>

              {/* Member Picker */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
                    Select Brother to Assign
                  </label>
                  {selectedMember ? (
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#166534', background: '#dcfce7', padding: '3px 10px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      ✓ Selected: {selectedMember.title ? `${selectedMember.title} ` : ''}{selectedMember.surname}, {selectedMember.first_name} {selectedMember.is_deceased ? '(Deceased)' : ''}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '3px 10px', borderRadius: 10 }}>
                      ⚠️ None selected yet
                    </span>
                  )}
                </div>

                <input
                  type="text"
                  value={memberSearchTerm}
                  onChange={(e) => {
                    const term = e.target.value;
                    setMemberSearchTerm(term);
                    const q = term.toLowerCase().trim();
                    if (q) {
                      const matches = allMembers.filter((m) => {
                        const full = `${m.title || ''} ${m.first_name || ''} ${m.other_names || ''} ${m.surname || ''}`.toLowerCase();
                        return full.includes(q);
                      });
                      // If current selected member is not in the filtered matches, select the first match immediately!
                      if (matches.length > 0 && !matches.some(m => m.id === modalMemberId)) {
                        setModalMemberId(matches[0].id);
                        setModalError(null);
                      }
                    }
                  }}
                  placeholder="Type to filter brothers by name..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1.5px solid #cbd5e1',
                    fontSize: 13,
                    marginBottom: 8,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />

                {/* Helper instruction */}
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, fontWeight: 600 }}>
                  👉 Click on a brother from the list below to select:
                </div>

                {/* Interactive Member Selection List */}
                <div
                  style={{
                    maxHeight: 180,
                    overflowY: 'auto',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: 8,
                    background: '#ffffff',
                  }}
                >
                  {filteredMembersForPicker.length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                      No brother found matching &quot;{memberSearchTerm}&quot;
                    </div>
                  ) : (
                    filteredMembersForPicker.map((m) => {
                      const isSelected = modalMemberId === m.id;
                      return (
                        <div
                          key={m.id}
                          onClick={() => {
                            setModalMemberId(m.id);
                            setModalError(null);
                          }}
                          style={{
                            padding: '10px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: '1px solid #f1f5f9',
                            cursor: 'pointer',
                            background: isSelected ? 'rgba(201, 168, 76, 0.15)' : '#ffffff',
                            borderLeft: isSelected ? '4px solid #C9A84C' : '4px solid transparent',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 16 }}>{isSelected ? '🔘' : '⚪'}</span>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: isSelected ? 800 : 600, color: '#0A1628' }}>
                                {m.title ? `${m.title} ` : ''}{m.surname}, {m.first_name}
                              </div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>
                                Status: {m.status || (m.is_deceased ? 'Deceased' : 'Active')} {m.is_deceased ? '• 🕊️ Deceased' : ''} {m.phone ? `• 📞 ${m.phone}` : ''}
                              </div>
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 800,
                              color: isSelected ? '#C9A84C' : '#94a3b8',
                            }}
                          >
                            {isSelected ? '✓ Selected' : 'Select'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Tenure Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                    Start Date (YYYY-MM-DD)
                  </label>
                  <input
                    type="date"
                    value={modalDateFrom}
                    onChange={(e) => setModalDateFrom(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={modalDateTo}
                    onChange={(e) => setModalDateTo(e.target.value)}
                    placeholder="Leave empty if ongoing"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                    }}
                  />
                </div>
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                {modalPositionId ? (
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm(`Remove this officer assignment for ${modalRole}?`)) {
                        await handleDeleteAssignment(modalPositionId, modalRole);
                        setIsModalOpen(false);
                      }
                    }}
                    disabled={modalSubmitting}
                    style={{
                      padding: '9px 14px',
                      borderRadius: 8,
                      border: '1px solid #fecaca',
                      background: '#fff1f2',
                      color: '#b91c1c',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    🗑️ Vacate / Remove
                  </button>
                ) : <div />}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={modalSubmitting}
                    style={{
                      padding: '9px 16px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={modalSubmitting}
                    style={{
                      padding: '9px 20px',
                      borderRadius: 8,
                      border: 'none',
                      background: '#0A1628',
                      color: '#C9A84C',
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: modalSubmitting ? 'not-allowed' : 'pointer',
                      opacity: modalSubmitting ? 0.7 : 1,
                    }}
                  >
                    {modalSubmitting
                      ? '⏳ Saving...'
                      : selectedMember
                      ? `Confirm: Assign ${selectedMember.surname}`
                      : 'Confirm Assignment'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
