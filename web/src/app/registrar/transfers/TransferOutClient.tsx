'use client';

import React, { useState, useMemo } from 'react';
import { enrollHistoricalBrother, updateMemberArchivalStatus } from '@/services/memberService';

interface RollBookEntry {
  id: string;
  entry_no: string | null;
  raw_name: string | null;
  title?: string | null;
  first_name?: string | null;
  surname?: string | null;
  date_of_initiation: string | null;
  cohort_year: string | null;
  residence?: string | null;
  occupation?: string | null;
  notes?: string | null;
  enrolled_member_id?: string | null;
}

interface ActiveMember {
  id: string;
  title: string | null;
  first_name: string;
  surname: string;
  other_names?: string | null;
  status: string | null;
  date_joined: string | null;
  occupation?: string | null;
  residential_address?: string | null;
  transfer_to?: string | null;
  transfer_date?: string | null;
}

interface CommanderyPreset {
  id: string;
  name: string;
  location: string;
  defaultDate: string;
  badge: string;
}

const COMMANDERY_PRESETS: CommanderyPreset[] = [
  {
    id: '747',
    name: 'SS. Peter & Paul Commandery (#747)',
    location: 'New Aplaku',
    defaultDate: '2012-10-04',
    badge: 'Chartered: Oct 4, 2012'
  },
  {
    id: '825',
    name: 'Our Lady Star of the Sea Commandery (#825)',
    location: 'Dansoman Last Stop',
    defaultDate: '2014-12-20',
    badge: 'Chartered: Dec 20, 2014'
  },
  {
    id: 'custom',
    name: 'Custom / Other Commandery',
    location: 'Enter destination commandery name & number',
    defaultDate: new Date().toISOString().split('T')[0],
    badge: 'Custom Destination'
  }
];

export default function TransferOutClient({
  initialUnassigned,
  initialActiveMembers
}: {
  initialUnassigned: RollBookEntry[];
  initialActiveMembers: ActiveMember[];
}) {
  const [unassignedList, setUnassignedList] = useState<RollBookEntry[]>(initialUnassigned);
  const [activeMemberList, setActiveMemberList] = useState<ActiveMember[]>(initialActiveMembers);

  const [activeTab, setActiveTab] = useState<'unassigned' | 'active'>('unassigned');
  const [searchQuery, setSearchQuery] = useState('');

  // Destination Commandery state
  const [selectedPresetId, setSelectedPresetId] = useState<string>('747');
  const [customCommanderyName, setCustomCommanderyName] = useState('');
  const [transferDate, setTransferDate] = useState<string>('2012-10-04');

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // When changing commandery preset, update default transfer date
  const handleSelectPreset = (preset: CommanderyPreset) => {
    setSelectedPresetId(preset.id);
    if (preset.id !== 'custom') {
      setTransferDate(preset.defaultDate);
    }
  };

  const currentDestinationName = useMemo(() => {
    if (selectedPresetId === 'custom') {
      return customCommanderyName.trim() || 'Custom Commandery';
    }
    const found = COMMANDERY_PRESETS.find(p => p.id === selectedPresetId);
    return found ? found.name : 'Unknown Commandery';
  }, [selectedPresetId, customCommanderyName]);

  // Filtered lists
  const filteredUnassigned = useMemo(() => {
    if (!searchQuery.trim()) return unassignedList;
    const q = searchQuery.toLowerCase().trim();
    return unassignedList.filter(item => {
      const raw = (item.raw_name || '').toLowerCase();
      const entryNo = (item.entry_no || '').toLowerCase();
      const cohort = (item.cohort_year || '').toLowerCase();
      const occ = (item.occupation || '').toLowerCase();
      const notes = (item.notes || '').toLowerCase();
      return raw.includes(q) || entryNo.includes(q) || cohort.includes(q) || occ.includes(q) || notes.includes(q);
    });
  }, [unassignedList, searchQuery]);

  const filteredActive = useMemo(() => {
    if (!searchQuery.trim()) return activeMemberList;
    const q = searchQuery.toLowerCase().trim();
    return activeMemberList.filter(item => {
      const name = `${item.title || ''} ${item.first_name || ''} ${item.surname || ''} ${item.other_names || ''}`.toLowerCase();
      const occ = (item.occupation || '').toLowerCase();
      return name.includes(q) || occ.includes(q);
    });
  }, [activeMemberList, searchQuery]);

  const currentItems = activeTab === 'unassigned' ? filteredUnassigned : filteredActive;

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllFiltered = () => {
    const allFilteredIds = currentItems.map(item => item.id);
    const areAllSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedIds.has(id));
    
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (areAllSelected) {
        allFilteredIds.forEach(id => next.delete(id));
      } else {
        allFilteredIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Execute Transfers
  const handleExecuteTransfers = async () => {
    if (selectedIds.size === 0) return;
    if (selectedPresetId === 'custom' && !customCommanderyName.trim()) {
      setNotification({ type: 'error', message: 'Please enter a valid destination Commandery name.' });
      return;
    }
    if (!transferDate) {
      setNotification({ type: 'error', message: 'Please select an effective transfer date.' });
      return;
    }

    setShowConfirmModal(false);
    setIsProcessing(true);
    setNotification(null);

    let successCount = 0;
    let failureCount = 0;
    const itemsToTransfer = currentItems.filter(item => selectedIds.has(item.id));

    for (let i = 0; i < itemsToTransfer.length; i++) {
      const item = itemsToTransfer[i];
      setProgressText(`Processing ${i + 1} of ${itemsToTransfer.length}: ${('raw_name' in item ? item.raw_name : item.first_name + ' ' + item.surname) || 'Member'}...`);

      try {
        if (activeTab === 'unassigned') {
          const entry = item as RollBookEntry;
          const rawName = (entry.raw_name || '').trim();
          const parts = rawName.split(/\s+/);
          let surname = parts[0] || 'Unknown';
          let firstName = parts.slice(1).join(' ') || surname;

          await enrollHistoricalBrother({
            rollBookId: entry.id,
            title: entry.title || 'Bro.',
            first_name: firstName,
            surname: surname,
            date_joined: entry.date_of_initiation || undefined,
            status: 'Transfer-Out',
            transfer_to: currentDestinationName,
            transfer_date: transferDate,
            occupation: entry.occupation || undefined,
            residential_address: entry.residence || undefined,
            notes: entry.notes ? `[Roll Book #${entry.entry_no || 'N/A'}]: ${entry.notes}` : `Transferred to ${currentDestinationName}`
          });
          successCount++;
        } else {
          const member = item as ActiveMember;
          await updateMemberArchivalStatus(member.id, 'Transfer-Out', {
            transfer_to: currentDestinationName,
            transfer_date: transferDate,
            notes: `Transferred to ${currentDestinationName} effective ${transferDate}`
          });
          successCount++;
        }
      } catch (err: any) {
        console.error('Transfer failed for item:', item.id, err);
        failureCount++;
      }
    }

    setIsProcessing(false);
    setProgressText('');

    if (activeTab === 'unassigned') {
      setUnassignedList(prev => prev.filter(e => !selectedIds.has(e.id)));
    } else {
      setActiveMemberList(prev => prev.filter(m => !selectedIds.has(m.id)));
    }

    setSelectedIds(new Set());

    if (failureCount === 0) {
      setNotification({
        type: 'success',
        message: `Successfully transferred ${successCount} member${successCount === 1 ? '' : 's'} to ${currentDestinationName} (Effective Date: ${transferDate}).`
      });
    } else {
      setNotification({
        type: 'error',
        message: `Transferred ${successCount} member${successCount === 1 ? '' : 's'}. ${failureCount} failed to process.`
      });
    }
  };

  const allFilteredSelected = currentItems.length > 0 && currentItems.every(i => selectedIds.has(i.id));

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '16px 20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* HEADER CARD */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        color: '#fff',
        padding: '24px 28px',
        borderRadius: '12px',
        marginBottom: '24px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ fontSize: '24px' }}>🔄</span>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#f8fafc' }}>
                Batch Member Transfers Out
              </h1>
              <span style={{
                background: 'rgba(212, 175, 55, 0.2)',
                color: '#fbbf24',
                border: '1px solid rgba(212, 175, 55, 0.4)',
                borderRadius: '999px',
                padding: '2px 10px',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase'
              }}>
                Super Admin
              </span>
            </div>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px', lineHeight: '1.5' }}>
              Select a destination daughter Commandery, verify the effective charter date, and assign unassigned roll book brothers or registered members directly.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '10px 16px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#38bdf8' }}>{unassignedList.length}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Unassigned in Queue</div>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '10px 16px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#4ade80' }}>{activeMemberList.length}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Active Members</div>
            </div>
          </div>
        </div>
      </div>

      {/* NOTIFICATION BANNER */}
      {notification && (
        <div style={{
          background: notification.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${notification.type === 'success' ? '#86efac' : '#fca5a5'}`,
          borderRadius: '8px',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>{notification.type === 'success' ? '✅' : '⚠️'}</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: notification.type === 'success' ? '#166534' : '#991b1b' }}>
              {notification.message}
            </span>
          </div>
          <button
            onClick={() => setNotification(null)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#64748b' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* STEP 1: DESTINATION COMMANDERY & DATE CONFIGURATION */}
      <div style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '20px 24px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{
            background: '#0284c7',
            color: '#fff',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 800
          }}>
            1
          </span>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
            Choose Destination Commandery & Effective Transfer Date
          </h2>
        </div>

        {/* PRESET CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          {COMMANDERY_PRESETS.map(preset => {
            const isSelected = selectedPresetId === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                style={{
                  border: isSelected ? '2px solid #0284c7' : '1px solid #e2e8f0',
                  background: isSelected ? '#f0f9ff' : '#fafafa',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: isSelected ? '#0369a1' : '#1e293b' }}>
                    {preset.name}
                  </span>
                  <input
                    type="radio"
                    checked={isSelected}
                    onChange={() => handleSelectPreset(preset)}
                    style={{ cursor: 'pointer' }}
                  />
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
                  📍 {preset.location}
                </div>
                <span style={{
                  display: 'inline-block',
                  background: isSelected ? '#e0f2fe' : '#e2e8f0',
                  color: isSelected ? '#0369a1' : '#475569',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: 600
                }}>
                  {preset.badge}
                </span>
              </div>
            );
          })}
        </div>

        {/* CUSTOM NAME & DATE ROW */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: selectedPresetId === 'custom' ? '1fr 240px' : '240px',
          gap: '16px',
          background: '#f8fafc',
          padding: '14px 16px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          {selectedPresetId === 'custom' && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Destination Commandery Name & Number *
              </label>
              <input
                type="text"
                placeholder="e.g. St. Joseph Commandery (#999) Kumasi"
                value={customCommanderyName}
                onChange={e => setCustomCommanderyName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Effective Transfer Date *
            </label>
            <input
              type="date"
              value={transferDate}
              onChange={e => setTransferDate(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '13px',
                boxSizing: 'border-box',
                background: '#fff'
              }}
            />
          </div>
        </div>
      </div>

      {/* STEP 2: MEMBER SELECTION & EXECUTION */}
      <div style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '20px 24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              background: '#0284c7',
              color: '#fff',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 800
            }}>
              2
            </span>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
              Select Members to Transfer
            </h2>
          </div>

          {/* TAB TOGGLE */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
            <button
              onClick={() => { setActiveTab('unassigned'); setSelectedIds(new Set()); }}
              style={{
                border: 'none',
                background: activeTab === 'unassigned' ? '#fff' : 'transparent',
                color: activeTab === 'unassigned' ? '#0f172a' : '#64748b',
                fontWeight: activeTab === 'unassigned' ? 700 : 500,
                fontSize: '12px',
                padding: '7px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                boxShadow: activeTab === 'unassigned' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              📜 Unassigned Roll Book ({unassignedList.length})
            </button>
            <button
              onClick={() => { setActiveTab('active'); setSelectedIds(new Set()); }}
              style={{
                border: 'none',
                background: activeTab === 'active' ? '#fff' : 'transparent',
                color: activeTab === 'active' ? '#0f172a' : '#64748b',
                fontWeight: activeTab === 'active' ? 700 : 500,
                fontSize: '12px',
                padding: '7px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                boxShadow: activeTab === 'active' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              👥 Active Members ({activeMemberList.length})
            </button>
          </div>
        </div>

        {/* SEARCH & BULK ACTIONS TOOLBAR */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          background: '#f8fafc',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 300px' }}>
            <input
              type="text"
              placeholder={activeTab === 'unassigned' ? "Search by brother name, entry #, cohort year..." : "Search registered member name, occupation..."}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '13px',
                background: '#fff'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '14px' }}
              >
                ✕
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={selectAllFiltered}
              style={{
                background: '#fff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer'
              }}
            >
              {allFilteredSelected ? 'Deselect All Filtered' : 'Select All Filtered'}
            </button>

            {selectedIds.size > 0 && (
              <button
                onClick={clearSelection}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '12px',
                  color: '#64748b',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Clear ({selectedIds.size})
              </button>
            )}

            {/* ACTION BUTTON */}
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={selectedIds.size === 0 || isProcessing}
              style={{
                background: selectedIds.size > 0 ? '#0284c7' : '#94a3b8',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '9px 18px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: selectedIds.size > 0 ? 'pointer' : 'not-allowed',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: selectedIds.size > 0 ? '0 2px 6px rgba(2, 132, 199, 0.35)' : 'none'
              }}
            >
              <span>🔄</span>
              <span>Transfer Selected ({selectedIds.size})</span>
            </button>
          </div>
        </div>

        {/* PROGRESS BANNER IF RUNNING */}
        {isProcessing && (
          <div style={{
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '8px',
            padding: '14px 18px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '18px',
              height: '18px',
              border: '3px solid #bae6fd',
              borderTopColor: '#0284c7',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0369a1' }}>
              {progressText || 'Processing transfers...'}
            </span>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* TABLE OF ITEMS */}
        {currentItems.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '48px 20px',
            background: '#fafafa',
            borderRadius: '8px',
            border: '1px dashed #cbd5e1'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>
              {searchQuery ? 'No members match your search.' : activeTab === 'unassigned' ? 'No unassigned members remaining in queue.' : 'No active members available.'}
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ marginTop: '10px', background: 'none', border: 'none', color: '#0284c7', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Clear Search Filter
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '10px 14px', width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={selectAllFiltered}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  {activeTab === 'unassigned' ? (
                    <>
                      <th style={{ padding: '10px 14px', width: '80px', fontWeight: 700 }}>Roll #</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700 }}>Raw Name in Roll Book</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700 }}>Date of Initiation</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700 }}>Cohort Year</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700 }}>Occupation / Residence</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700 }}>Historical Notes</th>
                    </>
                  ) : (
                    <>
                      <th style={{ padding: '10px 14px', fontWeight: 700 }}>Member Name</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700 }}>Date Joined</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700 }}>Status</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700 }}>Occupation</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700 }}>Current Location</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {currentItems.map((item, idx) => {
                  const isChecked = selectedIds.has(item.id);
                  const isUnassigned = 'raw_name' in item;
                  const row = item as RollBookEntry;
                  const member = item as ActiveMember;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => toggleSelect(item.id)}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isChecked ? '#f0f9ff' : idx % 2 === 0 ? '#fff' : '#fafafa',
                        cursor: 'pointer',
                        transition: 'background 0.1s ease'
                      }}
                    >
                      <td style={{ padding: '10px 14px' }} onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(item.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>

                      {isUnassigned ? (
                        <>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: '#64748b' }}>
                            #{row.entry_no || '—'}
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>
                            {row.raw_name || 'Unknown'}
                          </td>
                          <td style={{ padding: '10px 14px', color: '#334155' }}>
                            {row.date_of_initiation || '—'}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              fontSize: '11px',
                              fontWeight: 700
                            }}>
                              {row.cohort_year || 'Unknown'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', color: '#64748b', fontSize: '12px' }}>
                            {[row.occupation, row.residence].filter(Boolean).join(' • ') || '—'}
                          </td>
                          <td style={{ padding: '10px 14px', color: '#64748b', fontSize: '12px', maxWidth: '240px' }}>
                            {row.notes || '—'}
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>
                            {[member.title, member.first_name, member.surname, member.other_names].filter(Boolean).join(' ')}
                          </td>
                          <td style={{ padding: '10px 14px', color: '#334155' }}>
                            {member.date_joined || '—'}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{
                              background: '#dcfce7',
                              color: '#15803d',
                              borderRadius: '4px',
                              padding: '2px 8px',
                              fontSize: '11px',
                              fontWeight: 700
                            }}>
                              {member.status || 'Active'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', color: '#64748b' }}>
                            {member.occupation || '—'}
                          </td>
                          <td style={{ padding: '10px 14px', color: '#64748b' }}>
                            {member.residential_address || '—'}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            maxWidth: '520px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ fontSize: '24px' }}>⚠️</span>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                Confirm Batch Member Transfer
              </h3>
            </div>

            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>
              You are about to transfer <strong>{selectedIds.size}</strong> member{selectedIds.size === 1 ? '' : 's'} from <strong>St. Margaret-Mary Commandery #500</strong> to:
            </p>

            <div style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '8px',
              padding: '14px 16px',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0369a1', marginBottom: '4px' }}>
                🏛️ {currentDestinationName}
              </div>
              <div style={{ fontSize: '12px', color: '#0284c7', fontWeight: 600 }}>
                📅 Effective Transfer Date: {transferDate}
              </div>
            </div>

            <p style={{ margin: '0 0 20px', fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>
              {activeTab === 'unassigned'
                ? 'These brothers will be enrolled in the members registry with status "Transfer-Out", linked to their roll book entries, and excluded from active billing in accordance with KSJI rules.'
                : 'These active members will have their status updated to "Transfer-Out" and will be excluded from future annual dues assessments.'}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isProcessing}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  borderRadius: '6px',
                  padding: '9px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                onClick={handleExecuteTransfers}
                disabled={isProcessing}
                style={{
                  background: '#0284c7',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '9px 18px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Confirm & Transfer {selectedIds.size} Member{selectedIds.size === 1 ? '' : 's'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
