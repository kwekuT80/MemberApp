'use client';

import React, { useState } from 'react';
import { approveProfileLink, rejectProfile, approveAsNewMember } from '@/services/profileService';

interface PendingRegistration {
  id: string;
  email: string | null;
  first_name: string | null;
  surname: string | null;
  phone: string | null;
  commandery_id?: string | null;
  commanderies?: {
    name: string;
    number: number;
  } | null;
  match?: {
    id: string;
    first_name: string;
    surname: string;
    email: string;
    phone: string;
  } | null;
}

interface WaitingRoomProps {
  initialPending: PendingRegistration[];
  unlinkedMembers: any[];
}

export default function WaitingRoom({ initialPending, unlinkedMembers = [] }: WaitingRoomProps) {
  const [pending, setPending] = useState<PendingRegistration[]>(initialPending);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Manual linking states
  const [manualLinkIds, setManualLinkIds] = useState<{ [key: string]: boolean }>({});
  const [searchQueries, setSearchQueries] = useState<{ [key: string]: string }>({});
  const [selectedMemberIds, setSelectedMemberIds] = useState<{ [key: string]: string }>({});

  const toggleManualLink = (id: string) => {
    setManualLinkIds(prev => ({ ...prev, [id]: !prev[id] }));
    setSearchQueries(prev => ({ ...prev, [id]: '' }));
    setSelectedMemberIds(prev => ({ ...prev, [id]: '' }));
  };

  const handleSearchChange = (id: string, q: string) => {
    setSearchQueries(prev => ({ ...prev, [id]: q }));
  };

  const handleSelectMember = (profileId: string, memberId: string) => {
    setSelectedMemberIds(prev => ({ ...prev, [profileId]: memberId }));
  };

  async function handleApprove(profileId: string, memberId: string) {
    setProcessingId(profileId);
    setMessage(null);
    try {
      await approveProfileLink(profileId, memberId);
      setPending(prev => prev.filter(p => p.id !== profileId));
      setMessage('Account linked and approved successfully!');
    } catch (e: any) {
      setMessage(`Error: ${e.message || 'Failed to approve'}`);
    } finally {
      setProcessingId(null);
    }
  }

  async function handleApproveAsNew(profileId: string) {
    setProcessingId(profileId);
    setMessage(null);
    try {
      await approveAsNewMember(profileId);
      setPending(prev => prev.filter(p => p.id !== profileId));
      setMessage('New member record created and account approved successfully!');
    } catch (e: any) {
      setMessage(`Error: ${e.message || 'Failed to approve as new'}`);
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(profileId: string) {
    if (!confirm('Are you sure you want to reject and delete this registration request?')) return;
    setProcessingId(profileId);
    setMessage(null);
    try {
      await rejectProfile(profileId);
      setPending(prev => prev.filter(p => p.id !== profileId));
      setMessage('Registration request rejected.');
    } catch (e: any) {
      setMessage(`Error: ${e.message || 'Failed to reject'}`);
    } finally {
      setProcessingId(null);
    }
  }

  if (pending.length === 0) return null;

  return (
    <div className="card" style={{ marginBottom: 32, borderLeft: '4px solid var(--gold)', background: 'linear-gradient(135deg, #ffffff 0%, #fffdf9 100%)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 className="label" style={{ margin: 0, color: 'var(--navy)', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>⏳ Waiting Room (Pending Registrations)</span>
          <span style={{ background: 'var(--gold)', color: 'var(--navy)', padding: '2px 8px', borderRadius: 99, fontSize: 12, fontWeight: 800 }}>
            {pending.length}
          </span>
        </h3>
      </div>

      {message && (
        <div style={{ padding: '10px 16px', borderRadius: 8, background: '#e6f4ea', color: '#1f6f43', fontSize: 14, marginBottom: 16, fontWeight: 500 }}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gap: 16 }}>
        {pending.map((item) => {
          const hasMatch = !!item.match;
          const query = searchQueries[item.id] || '';
          
          // Filter unlinked members for manual search
          const commanderyUnlinked = unlinkedMembers.filter(m => m.commandery_id === item.commandery_id);
          const otherUnlinked = unlinkedMembers.filter(m => m.commandery_id !== item.commandery_id);
          
          const filterFn = (m: any) => {
            if (!query) return true;
            const term = query.toLowerCase();
            return (
              m.first_name?.toLowerCase().includes(term) ||
              m.surname?.toLowerCase().includes(term) ||
              m.email?.toLowerCase().includes(term) ||
              m.phone?.includes(term)
            );
          };

          const matchedCommandery = commanderyUnlinked.filter(filterFn);
          const matchedOthers = otherUnlinked.filter(filterFn);

          return (
            <div key={item.id} style={{ border: '1px solid #eee', borderRadius: 12, padding: 20, background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--navy)' }}>
                    {item.first_name} {item.surname}
                  </h4>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#666' }}>
                    📧 {item.email} | 📞 {item.phone || 'No phone'}
                  </p>
                  {item.commanderies && (
                    <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 600, color: 'var(--gold)' }}>
                      🛡️ Commandery: {item.commanderies.name} (No. {item.commanderies.number})
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {hasMatch && item.match ? (
                    <button
                      disabled={processingId === item.id}
                      onClick={() => handleApprove(item.id, item.match!.id)}
                      className="tab tab-active"
                      style={{ background: 'var(--gold)', color: 'var(--navy)', border: 0, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
                    >
                      {processingId === item.id ? 'Processing…' : 'Approve & Link'}
                    </button>
                  ) : (
                    <button
                      disabled={processingId === item.id}
                      onClick={() => handleApproveAsNew(item.id)}
                      className="tab tab-active"
                      style={{ background: 'var(--gold)', color: 'var(--navy)', border: 0, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
                    >
                      {processingId === item.id ? 'Processing…' : 'Approve as New'}
                    </button>
                  )}

                  <button
                    disabled={processingId === item.id}
                    onClick={() => toggleManualLink(item.id)}
                    style={{ background: '#f0f4f8', color: '#10233f', border: '1px solid #cfd8e3', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
                  >
                    {manualLinkIds[item.id] ? 'Cancel Manual Link' : '🔗 Link Manually'}
                  </button>

                  <button
                    disabled={processingId === item.id}
                    onClick={() => handleReject(item.id)}
                    style={{ background: '#fdeaea', color: 'crimson', border: '1px solid #fdeaea', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
                  >
                    Reject
                  </button>
                </div>
              </div>

              {/* Automated Match Panel */}
              {hasMatch && item.match && !manualLinkIds[item.id] && (
                <div style={{ background: '#fdf8e2', borderLeft: '3px solid var(--gold)', padding: '12px 16px', borderRadius: 8, fontSize: 13 }}>
                  <p style={{ margin: 0, fontWeight: 700, color: '#856404' }}>
                    🔍 Automated Search found a potential matching record:
                  </p>
                  <p style={{ margin: '4px 0 0', color: '#856404' }}>
                    <strong>Name:</strong> {item.match.first_name} {item.match.surname} | <strong>Email:</strong> {item.match.email} | <strong>Phone:</strong> {item.match.phone || 'N/A'}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#856404', fontStyle: 'italic' }}>
                    Clicking "Approve & Link" will link this profile and sync their records automatically.
                  </p>
                </div>
              )}

              {!hasMatch && !manualLinkIds[item.id] && (
                <div style={{ background: '#f5f5f5', borderLeft: '3px solid #ccc', padding: '12px 16px', borderRadius: 8, fontSize: 13, color: '#666' }}>
                  ⚠️ No potential matching record found in the pre-populated database by email or phone.
                </div>
              )}

              {/* Manual Link Panel */}
              {manualLinkIds[item.id] && (
                <div style={{ border: '1px solid #cfd8e3', borderRadius: 8, padding: 16, background: '#f8fafc', display: 'grid', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', marginBottom: 6, display: 'block' }}>
                      Search Registry to manually link:
                    </label>
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => handleSearchChange(item.id, e.target.value)}
                      placeholder="Type member name, email, or phone number to filter..."
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none' }}
                    />
                  </div>

                  <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff' }}>
                    {matchedCommandery.length === 0 && matchedOthers.length === 0 ? (
                      <div style={{ padding: 12, fontSize: 13, color: '#64748b', textAlign: 'center' }}>
                        No unlinked members match search criteria.
                      </div>
                    ) : (
                      <>
                        {matchedCommandery.length > 0 && (
                          <div>
                            <div style={{ background: '#f1f5f9', padding: '4px 10px', fontSize: 11, fontWeight: 800, color: 'var(--navy)' }}>
                              SAME COMMANDERY ({item.commanderies?.name || 'Assigned'})
                            </div>
                            {matchedCommandery.map(m => (
                              <div
                                key={m.id}
                                onClick={() => handleSelectMember(item.id, m.id)}
                                style={{
                                  padding: '8px 12px',
                                  fontSize: 13,
                                  cursor: 'pointer',
                                  borderBottom: '1px solid #f1f5f9',
                                  background: selectedMemberIds[item.id] === m.id ? '#fdf8e2' : 'transparent',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}
                              >
                                <div>
                                  <strong>{m.first_name} {m.surname}</strong>
                                  <span style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>{m.email || m.phone || 'No contact'}</span>
                                </div>
                                {selectedMemberIds[item.id] === m.id && <span style={{ color: 'var(--navy)', fontWeight: 800 }}>✓ Selected</span>}
                              </div>
                            ))}
                          </div>
                        )}

                        {matchedOthers.length > 0 && (
                          <div>
                            <div style={{ background: '#f1f5f9', padding: '4px 10px', fontSize: 11, fontWeight: 800, color: '#64748b' }}>
                              OTHER COMMANDERIES
                            </div>
                            {matchedOthers.map(m => (
                              <div
                                key={m.id}
                                onClick={() => handleSelectMember(item.id, m.id)}
                                style={{
                                  padding: '8px 12px',
                                  fontSize: 13,
                                  cursor: 'pointer',
                                  borderBottom: '1px solid #f1f5f9',
                                  background: selectedMemberIds[item.id] === m.id ? '#fdf8e2' : 'transparent',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}
                              >
                                <div>
                                  <strong>{m.first_name} {m.surname}</strong>
                                  <span style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>{m.email || m.phone || 'No contact'}</span>
                                </div>
                                {selectedMemberIds[item.id] === m.id && <span style={{ color: 'var(--navy)', fontWeight: 800 }}>✓ Selected</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {selectedMemberIds[item.id] && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        disabled={processingId === item.id}
                        onClick={() => handleApprove(item.id, selectedMemberIds[item.id])}
                        className="tab tab-active"
                        style={{ background: 'var(--navy)', color: '#fff', border: 0, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
                      >
                        {processingId === item.id ? 'Processing…' : 'Approve & Link to Selected'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
