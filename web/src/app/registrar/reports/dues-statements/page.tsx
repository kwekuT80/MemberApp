'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import RegistrarShell from '@/components/layout/RegistrarShell';
import AnnualDuesStatement from '@/components/documents/AnnualDuesStatement';
import { createClient } from '@/lib/supabase/client';
import { getMemberPersonalReport, PersonalReportData } from '@/services/memberService';
import { formatMemberTitle, isSystemMember } from '@/lib/utils/ksji-logic';

interface StatementBatchItem {
  report: PersonalReportData;
  payments: any[];
}

export default function BatchDuesStatementsPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL_ACTIVE' | 'GOOD_STANDING' | 'DELINQUENT' | 'ALL'>('ALL_ACTIVE');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Batch Generation State
  const [batchStatements, setBatchStatements] = useState<StatementBatchItem[]>([]);
  const [generatingBatch, setGeneratingBatch] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [viewMode, setViewMode] = useState<'SELECTION_TABLE' | 'BATCH_PRINT_PREVIEW'>('SELECTION_TABLE');

  // Single Quick Preview State
  const [previewItem, setPreviewItem] = useState<StatementBatchItem | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function loadMembers() {
      setLoading(true);
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('surname', { ascending: true });

      if (!error && data) {
        const realMembers = data.filter(m => !isSystemMember(m));
        setMembers(realMembers);
        
        // Default select all active living members
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

      if (statusFilter === 'ALL_ACTIVE' && !isActive) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const full = `${m.title || ''} ${m.first_name || ''} ${m.surname || ''} ${m.other_names || ''} ${m.occupation || ''} ${m.phone || ''}`.toLowerCase();
        if (!full.includes(term)) return false;
      }

      return true;
    });
  }, [members, statusFilter, searchTerm]);

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

  // Generate Batch Statements
  const handleGenerateBatch = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setGeneratingBatch(true);
    setGenerationProgress(0);
    setBatchStatements([]);

    try {
      const items: StatementBatchItem[] = [];
      const total = ids.length;
      const chunkSize = 5;

      for (let i = 0; i < total; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const results = await Promise.all(
          chunk.map(async (id) => {
            const [report, payRes] = await Promise.all([
              getMemberPersonalReport(id),
              supabase
                .from('financial_payments')
                .select('*')
                .eq('member_id', id)
                .order('payment_date', { ascending: false })
            ]);
            if (report) {
              return { report, payments: payRes.data || [] };
            }
            return null;
          })
        );

        for (const res of results) {
          if (res) items.push(res);
        }
        setGenerationProgress(Math.min(100, Math.round(((i + chunk.length) / total) * 100)));
      }

      setBatchStatements(items);
      setViewMode('BATCH_PRINT_PREVIEW');
    } catch (err) {
      console.error('Batch statement generation failed:', err);
      alert('Error compiling batch dues statements.');
    } finally {
      setGeneratingBatch(false);
    }
  };

  const handleQuickPreview = async (memberId: string) => {
    setLoadingPreview(true);
    try {
      const [report, payRes] = await Promise.all([
        getMemberPersonalReport(memberId),
        supabase
          .from('financial_payments')
          .select('*')
          .eq('member_id', memberId)
          .order('payment_date', { ascending: false })
      ]);
      if (report) {
        setPreviewItem({ report, payments: payRes.data || [] });
      }
    } catch (e) {
      console.error('Quick statement preview failed:', e);
    } finally {
      setLoadingPreview(false);
    }
  };

  const selectedCount = selectedIds.size;

  return (
    <RegistrarShell
      title="Annual Dues Statements Studio"
      subtitle="Generate, preview, and batch-print official three-pillar fraternal financial statements."
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
        
        {/* Top Breadcrumb Navigation */}
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
              href="/registrar/reports/good-standing"
              style={{ textDecoration: 'none', color: '#15803D', fontWeight: 700, fontSize: 13 }}
            >
              📜 Good Standing Studio
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
                    background: '#10233F',
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
                    boxShadow: '0 4px 12px rgba(16,35,63,0.25)'
                  }}
                >
                  <span>🖨️</span> Print Batch ({batchStatements.length} Statements)
                </button>
              </>
            ) : (
              <button
                onClick={handleGenerateBatch}
                disabled={selectedCount === 0 || generatingBatch}
                style={{
                  background: selectedCount === 0 ? '#94A3B8' : '#10233F',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '10px 22px',
                  borderRadius: 8,
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: selectedCount === 0 || generatingBatch ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 12px rgba(16,35,63,0.2)'
                }}
              >
                {generatingBatch ? (
                  <span>⏳ Compiling ({generationProgress}%)...</span>
                ) : (
                  <span>🖨️ Batch Generate Statements ({selectedCount})</span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* BATCH PRINT PREVIEW MODE */}
        {viewMode === 'BATCH_PRINT_PREVIEW' ? (
          <div>
            <div
              className="no-print"
              style={{
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: 12,
                padding: '14px 20px',
                marginBottom: 24,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <strong style={{ color: '#166534', fontSize: 15 }}>
                  ✓ {batchStatements.length} Official Statements Ready for Printing
                </strong>
                <p style={{ margin: '2px 0 0', color: '#15803D', fontSize: 13 }}>
                  Formatted with separate itemized tables for Dues, Voluntary Appeals, and Welfare. Each statement will print on a fresh A4 page.
                </p>
              </div>
              <button
                onClick={() => window.print()}
                style={{
                  background: '#166534',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: 8,
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                🖨️ Print All
              </button>
            </div>

            {batchStatements.map((item, idx) => (
              <div 
                key={item.report.member.id || idx}
                style={{ 
                  pageBreakAfter: 'always', 
                  marginBottom: 36 
                }}
              >
                <AnnualDuesStatement
                  report={item.report}
                  payments={item.payments}
                  hideNav={true}
                />
              </div>
            ))}
          </div>
        ) : (
          /* SELECTION & FILTER STUDIO MODE */
          <div>
            {/* Header Hero Banner */}
            <div
              style={{
                background: 'linear-gradient(135deg, #10233F 0%, #1E3A8A 100%)',
                borderRadius: 16,
                padding: '24px 28px',
                color: 'white',
                marginBottom: 24,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 16,
                boxShadow: '0 8px 24px rgba(16,35,63,0.15)'
              }}
            >
              <div>
                <div style={{ color: '#FCD34D', fontSize: 11, fontWeight: 900, letterSpacing: 1.2, textTransform: 'uppercase' }}>
                  TREASURY & AUDIT RECONCILIATION SUITE
                </div>
                <h2 style={{ margin: '6px 0 4px', fontSize: 22, fontWeight: 900, color: 'white' }}>
                  Annual Dues Statements Generator
                </h2>
                <p style={{ margin: 0, fontSize: 13, color: '#CBD5E1', maxWidth: 640 }}>
                  Generate and print certified financial statements for brothers. Each statement features three distinct accounting tables: Statutory Dues Assessment, Voluntary Contributions, and Welfare Scheme Subscriptions.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 14 }}>
                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px 18px', borderRadius: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#CBD5E1' }}>Active Members</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#FCD34D' }}>{members.filter(m => m.status === 'Active' && !m.is_deceased).length}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px 18px', borderRadius: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#CBD5E1' }}>Selected for Print</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#34D399' }}>{selectedCount}</div>
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 12,
                border: '1px solid #E2E8F0',
                padding: '16px 20px',
                marginBottom: 20,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 14
              }}
            >
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="🔍 Search member name, occupation, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: 13,
                    minWidth: 280,
                    outline: 'none'
                  }}
                />

                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => setStatusFilter('ALL_ACTIVE')}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: 'none',
                      background: statusFilter === 'ALL_ACTIVE' ? '#10233F' : '#F1F5F9',
                      color: statusFilter === 'ALL_ACTIVE' ? '#FFFFFF' : '#475569'
                    }}
                  >
                    Active Members ({members.filter(m => m.status === 'Active' && !m.is_deceased).length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('ALL')}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: 'none',
                      background: statusFilter === 'ALL' ? '#10233F' : '#F1F5F9',
                      color: statusFilter === 'ALL' ? '#FFFFFF' : '#475569'
                    }}
                  >
                    All Records ({members.length})
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleSelectAllFiltered}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: '#334155'
                  }}
                >
                  ✓ Select All Filtered ({filteredMembers.length})
                </button>
                <button
                  onClick={handleDeselectAll}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: '#64748B'
                  }}
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Member Selection Table */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 12,
                border: '1px solid #E2E8F0',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
              }}
            >
              {loading ? (
                <div style={{ padding: 60, textAlign: 'center', color: '#64748B' }}>
                  Loading member directory...
                </div>
              ) : filteredMembers.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>
                  No members matched the search or filter criteria.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#64748B' }}>
                      <th style={{ padding: '12px 16px', width: 44, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={filteredMembers.length > 0 && filteredMembers.every(m => selectedIds.has(m.id))}
                          onChange={handleSelectAllFiltered}
                          style={{ cursor: 'pointer', width: 16, height: 16 }}
                        />
                      </th>
                      <th style={{ padding: '12px 16px' }}>Brother Name</th>
                      <th style={{ padding: '12px 16px' }}>Contact</th>
                      <th style={{ padding: '12px 16px' }}>Occupation</th>
                      <th style={{ padding: '12px 16px' }}>Membership Status</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
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
                            background: isSelected ? '#F0F9FF' : 'transparent',
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
                            <div style={{ fontWeight: 800, color: '#10233F' }}>
                              {displayTitle} {m.first_name} {m.surname}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace' }}>
                              ID: {m.id.substring(0, 8).toUpperCase()}...
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
                            <div style={{ display: 'inline-flex', gap: 8 }}>
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
                                href={`/registrar/members/${m.id}/statement`}
                                style={{
                                  background: '#10233F',
                                  color: '#FFFFFF',
                                  textDecoration: 'none',
                                  padding: '6px 14px',
                                  borderRadius: 6,
                                  fontSize: 12,
                                  fontWeight: 800,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                              >
                                📄 Full Statement
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

        {/* Quick Statement Preview Modal */}
        {previewItem && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
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
                maxWidth: 940,
                width: '100%',
                maxHeight: '92vh',
                overflowY: 'auto',
                padding: 24,
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#10233F' }}>
                  Official Dues Statement Preview
                </h3>
                <button
                  onClick={() => setPreviewItem(null)}
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

              <AnnualDuesStatement
                report={previewItem.report}
                payments={previewItem.payments}
                hideNav={true}
              />
            </div>
          </div>
        )}

      </div>
    </RegistrarShell>
  );
}
