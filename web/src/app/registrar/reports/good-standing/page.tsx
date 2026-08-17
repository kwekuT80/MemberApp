'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import RegistrarShell from '@/components/layout/RegistrarShell';
import StandingCertificateCard from '@/components/reports/StandingCertificateCard';
import { createClient } from '@/lib/supabase/client';
import { getMemberPersonalReport, getBatchMemberPersonalReports, PersonalReportData } from '@/services/memberService';
import { formatMemberTitle, isSystemMember } from '@/lib/utils/ksji-logic';

export default function BatchGoodStandingPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL_ACTIVE' | 'GOOD_STANDING' | 'DELINQUENT' | 'EXEMPT' | 'ALL'>('ALL_ACTIVE');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Batch Generation State
  const [batchReports, setBatchReports] = useState<PersonalReportData[]>([]);
  const [generatingBatch, setGeneratingBatch] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [viewMode, setViewMode] = useState<'SELECTION_TABLE' | 'BATCH_PRINT_PREVIEW'>('SELECTION_TABLE');

  // Single Quick Preview
  const [quickPreviewReport, setQuickPreviewReport] = useState<PersonalReportData | null>(null);
  const [loadingQuickPreview, setLoadingQuickPreview] = useState(false);

  useEffect(() => {
    async function loadMembers() {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('surname', { ascending: true });

      if (!error && data) {
        // Exclude system/service accounts (such as Operational Outflows account)
        const realMembers = data.filter(m => !isSystemMember(m));
        setMembers(realMembers);
        // Default select all active members
        const activeIds = new Set<string>();
        realMembers.forEach(m => {
          if (m.status === 'Active' && !m.is_deceased) {
            activeIds.add(m.id);
          }
        });
        setSelectedIds(activeIds);
      }
      setLoading(false);
    }
    loadMembers();
  }, []);

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      if (isSystemMember(m)) return false;
      const isDeceased = m.is_deceased || String(m.status || '').toLowerCase() === 'deceased';
      const isActive = m.status === 'Active' && !isDeceased;

      // Status Tab Filters
      if (statusFilter === 'ALL_ACTIVE' && !isActive) return false;
      if (statusFilter === 'EXEMPT' && !isDeceased) return false;
      
      // Search matching
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const full = `${m.title || ''} ${m.first_name || ''} ${m.surname || ''} ${m.other_names || ''} ${m.occupation || ''} ${m.phone || ''}`.toLowerCase();
        if (!full.includes(term)) return false;
      }

      return true;
    });
  }, [members, statusFilter, searchTerm]);

  // Bulk Selection Handlers
  const handleToggleMember = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAllFiltered = () => {
    const next = new Set(selectedIds);
    filteredMembers.forEach(m => next.add(m.id));
    setSelectedIds(next);
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  // Generate Batch Reports
  const handleGenerateBatch = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setGeneratingBatch(true);
    setGenerationProgress(0);
    setBatchReports([]);

    try {
      const reports: PersonalReportData[] = [];
      const total = ids.length;

      // Process in chunks of 5 for real-time progress update
      const chunkSize = 5;
      for (let i = 0; i < total; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const results = await Promise.all(chunk.map(id => getMemberPersonalReport(id)));
        for (const r of results) {
          if (r) reports.push(r);
        }
        setGenerationProgress(Math.min(100, Math.round(((i + chunk.length) / total) * 100)));
      }

      setBatchReports(reports);
      setViewMode('BATCH_PRINT_PREVIEW');
    } catch (err) {
      console.error('Batch generation failed:', err);
      alert('Error compiling batch reports.');
    } finally {
      setGeneratingBatch(false);
    }
  };

  const handleQuickPreview = async (memberId: string) => {
    setLoadingQuickPreview(true);
    try {
      const data = await getMemberPersonalReport(memberId);
      setQuickPreviewReport(data);
    } catch (e) {
      console.error('Quick preview failed:', e);
    } finally {
      setLoadingQuickPreview(false);
    }
  };

  const selectedCount = selectedIds.size;
  const activeMembersCount = members.filter(m => m.status === 'Active' && !m.is_deceased).length;

  return (
    <RegistrarShell
      title="Personal Good Standing Batch Generator"
      subtitle="Compile, preview, and batch-print official standing statements for convention, delegates, or audits"
    >
      <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 60 }}>
        
        {/* Top Action Bar (No Print) */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link
              href="/registrar/reports"
              style={{ textDecoration: 'none', color: '#475569', fontWeight: 700, fontSize: 13 }}
            >
              ← Reports Hub
            </Link>
            <span style={{ color: '#CBD5E1' }}>•</span>
            <Link
              href="/registrar/members"
              style={{ textDecoration: 'none', color: '#2563EB', fontWeight: 700, fontSize: 13 }}
            >
              Member Directory
            </Link>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            {viewMode === 'BATCH_PRINT_PREVIEW' ? (
              <>
                <button
                  onClick={() => setViewMode('SELECTION_TABLE')}
                  style={{
                    background: '#FFFFFF',
                    color: '#0F172A',
                    border: '1px solid #CBD5E1',
                    padding: '10px 18px',
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  ← Edit Selection
                </button>
                <button
                  onClick={() => window.print()}
                  style={{
                    background: '#0F172A',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '10px 22px',
                    borderRadius: 8,
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 4px 12px rgba(15,23,42,0.2)'
                  }}
                >
                  <span>🖨️</span> Print Batch ({batchReports.length} Statements)
                </button>
              </>
            ) : (
              <button
                onClick={handleGenerateBatch}
                disabled={selectedCount === 0 || generatingBatch}
                style={{
                  background: selectedCount === 0 ? '#94A3B8' : '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '10px 22px',
                  borderRadius: 8,
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: selectedCount === 0 || generatingBatch ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 4px 12px rgba(15,23,42,0.2)'
                }}
              >
                {generatingBatch ? (
                  <span>⏳ Compiling ({generationProgress}%)...</span>
                ) : (
                  <>
                    <span>📜</span> Generate & Preview Batch ({selectedCount} Selected)
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* BATCH PRINT PREVIEW MODE */}
        {viewMode === 'BATCH_PRINT_PREVIEW' && (
          <div>
            <div className="no-print" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '16px 20px', borderRadius: 12, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ color: '#0F172A', fontSize: 15 }}>Batch Statement Preview Ready</strong>
                <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
                  Showing {batchReports.length} compiled individual standing statements. Each statement is formatted to break cleanly across pages when printed.
                </div>
              </div>
              <button
                onClick={() => window.print()}
                style={{
                  background: '#16A34A',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: 8,
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                🖨️ Print Batch Now
              </button>
            </div>

            {batchReports.map(report => (
              <StandingCertificateCard key={report.member.id} report={report} />
            ))}
          </div>
        )}

        {/* SELECTION & AUDIT TABLE MODE */}
        {viewMode === 'SELECTION_TABLE' && (
          <div>
            {/* Quick Metrics Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
              <div style={metricBox}>
                <div style={metricLabel}>ACTIVE MEMBERS ON ROLL</div>
                <div style={metricNumber}>{activeMembersCount}</div>
              </div>
              <div style={{ ...metricBox, borderLeft: '4px solid #2563EB' }}>
                <div style={metricLabel}>SELECTED FOR BATCH</div>
                <div style={{ ...metricNumber, color: '#2563EB' }}>{selectedCount}</div>
              </div>
              <div style={{ ...metricBox, borderLeft: '4px solid #16A34A' }}>
                <div style={metricLabel}>FILTERED MATCHES</div>
                <div style={{ ...metricNumber, color: '#16A34A' }}>{filteredMembers.length}</div>
              </div>
            </div>

            {/* Filter and Search Controls */}
            <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E2E8F0', padding: '18px 20px', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                
                {/* Status Tabs */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setStatusFilter('ALL_ACTIVE')}
                    style={statusFilter === 'ALL_ACTIVE' ? activeTabBtn : tabBtn}
                  >
                    Active Living Members ({activeMembersCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter('ALL')}
                    style={statusFilter === 'ALL' ? activeTabBtn : tabBtn}
                  >
                    All Directory ({members.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('EXEMPT')}
                    style={statusFilter === 'EXEMPT' ? activeTabBtn : tabBtn}
                  >
                    Roll of Honor / Deceased ({members.filter(m => m.is_deceased || m.status === 'Deceased').length})
                  </button>
                </div>

                {/* Search Input */}
                <div style={{ minWidth: 260 }}>
                  <input
                    type="text"
                    placeholder="🔍 Search by name, title, or phone..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 14px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      fontSize: 13,
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Bulk Checkbox Actions Bar */}
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ fontSize: 13, color: '#64748B' }}>
                  Selected: <strong style={{ color: '#0F172A' }}>{selectedCount}</strong> of {filteredMembers.length} displayed
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleSelectAllFiltered}
                    style={actionChip}
                  >
                    ✓ Select All ({filteredMembers.length})
                  </button>
                  <button
                    onClick={handleDeselectAll}
                    style={actionChip}
                  >
                    ✕ Deselect All
                  </button>
                </div>
              </div>
            </div>

            {/* Member Selection Table */}
            <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B', fontSize: 14, fontWeight: 700 }}>
                  ⏳ Loading member directory...
                </div>
              ) : filteredMembers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94A3B8', fontSize: 14 }}>
                  No members found matching your search and filter criteria.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569' }}>
                      <th style={{ padding: '12px 16px', width: 44, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={filteredMembers.length > 0 && filteredMembers.every(m => selectedIds.has(m.id))}
                          onChange={e => {
                            if (e.target.checked) handleSelectAllFiltered();
                            else handleDeselectAll();
                          }}
                          style={{ cursor: 'pointer', width: 16, height: 16 }}
                        />
                      </th>
                      <th style={{ padding: '12px 16px' }}>Member Name</th>
                      <th style={{ padding: '12px 16px' }}>Contact</th>
                      <th style={{ padding: '12px 16px' }}>Occupation</th>
                      <th style={{ padding: '12px 16px' }}>Status</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Individual Statement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map(m => {
                      const isSelected = selectedIds.has(m.id);
                      const displayTitle = formatMemberTitle(m.title);
                      const isDeceased = m.is_deceased || m.status === 'Deceased';

                      return (
                        <tr
                          key={m.id}
                          style={{
                            borderBottom: '1px solid #F1F5F9',
                            background: isSelected ? '#F0FDF4' : 'transparent',
                            transition: 'background 0.15s'
                          }}
                        >
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleMember(m.id)}
                              style={{ cursor: 'pointer', width: 16, height: 16 }}
                            />
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 800, color: '#0F172A' }}>
                              {displayTitle} {m.first_name} {m.surname}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748B' }}>
                              ID: {m.id.substring(0, 8)}...
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', color: '#475569' }}>
                            {m.phone || m.mobile || '—'}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#475569' }}>
                            {m.occupation || '—'}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 10px',
                                borderRadius: 20,
                                fontSize: 11,
                                fontWeight: 800,
                                background: isDeceased ? '#312E81' : m.status === 'Active' ? '#DCFCE7' : '#FEF3C7',
                                color: isDeceased ? '#FDE047' : m.status === 'Active' ? '#166534' : '#92400E'
                              }}
                            >
                              {isDeceased ? 'Roll of Honor' : m.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: 6 }}>
                              <button
                                onClick={() => handleQuickPreview(m.id)}
                                style={{
                                  background: '#F1F5F9',
                                  color: '#334155',
                                  border: 'none',
                                  padding: '6px 12px',
                                  borderRadius: 6,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                👁️ Preview
                              </button>
                              <Link
                                href={`/registrar/members/${m.id}/good-standing`}
                                style={{
                                  background: '#0F172A',
                                  color: '#FFFFFF',
                                  textDecoration: 'none',
                                  padding: '6px 12px',
                                  borderRadius: 6,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                              >
                                🎖️ Full Certificate
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Quick Preview Modal */}
        {quickPreviewReport && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.7)',
              zIndex: 1000,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 20
            }}
          >
            <div
              style={{
                background: 'white',
                borderRadius: 16,
                maxWidth: 900,
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: 24,
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0F172A' }}>
                  Statement Preview
                </h3>
                <button
                  onClick={() => setQuickPreviewReport(null)}
                  style={{
                    background: '#F1F5F9',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  ✕ Close
                </button>
              </div>

              <StandingCertificateCard report={quickPreviewReport} />
            </div>
          </div>
        )}

      </div>
    </RegistrarShell>
  );
}

const metricBox: React.CSSProperties = {
  background: 'white',
  borderRadius: 12,
  border: '1px solid #E2E8F0',
  padding: '16px 20px',
};

const metricLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  color: '#64748B',
  letterSpacing: 0.5,
  marginBottom: 4,
};

const metricNumber: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 900,
  color: '#0F172A',
  fontFamily: 'monospace',
};

const tabBtn: React.CSSProperties = {
  background: '#F1F5F9',
  color: '#475569',
  border: 'none',
  padding: '8px 14px',
  borderRadius: 6,
  fontSize: 12.5,
  fontWeight: 700,
  cursor: 'pointer',
};

const activeTabBtn: React.CSSProperties = {
  background: '#0F172A',
  color: '#FFFFFF',
  border: 'none',
  padding: '8px 14px',
  borderRadius: 6,
  fontSize: 12.5,
  fontWeight: 800,
  cursor: 'pointer',
};

const actionChip: React.CSSProperties = {
  background: '#FFFFFF',
  color: '#334155',
  border: '1px solid #CBD5E1',
  padding: '6px 12px',
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
};
