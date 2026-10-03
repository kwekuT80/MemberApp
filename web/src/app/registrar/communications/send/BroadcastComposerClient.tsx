'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { KSJI_COMMANDERY_COMMITTEES, CommitteeDefinition } from '@/lib/constants/committees';
import { EnrichedBroadcastMember } from './page';

interface Props {
  members: EnrichedBroadcastMember[];
}

type SegmentType = 'all' | 'trustees' | 'nobles' | 'chevaliers' | 'cohort' | 'committee' | 'financial' | 'custom';
type ChannelType = 'both' | 'sms' | 'email';

export default function BroadcastComposerClient({ members }: Props) {
  // Targeting states
  const [segment, setSegment] = useState<SegmentType>('all');
  const [selectedCohortYear, setSelectedCohortYear] = useState<string>('');
  const [selectedCommitteeId, setSelectedCommitteeId] = useState<string>(KSJI_COMMANDERY_COMMITTEES[0].id);
  const [financialFilter, setFinancialFilter] = useState<'delinquent' | 'partially_paid' | 'fully_paid'>('delinquent');
  const [customSelectedIds, setCustomSelectedIds] = useState<Set<string>>(new Set());
  const [memberSearchTerm, setMemberSearchTerm] = useState('');

  // Channel & message states
  const [channel, setChannel] = useState<ChannelType>('both');
  const [subject, setSubject] = useState('KSJI Commandery #500 Official Notice');
  const [emailBody, setEmailBody] = useState(
    'Dear Brother {memberName},\n\nPlease be informed of the following update regarding our Commandery activities and fraternity obligations.\n\nFraternally Yours in Christ,\nKSJI Commandery #500 Secretariat'
  );
  const [smsBody, setSmsBody] = useState(
    'KSJI #500: Worthy Brother {memberName}, please take note of this official Commandery communication. Check email or app for details.'
  );

  // Dispatch & feedback states
  const [sending, setSending] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<{
    success: boolean;
    sent?: number;
    failed?: number;
    message?: string;
  } | null>(null);

  // Available cohort years
  const cohortYears = useMemo(() => {
    const years = new Set<string>();
    members.forEach((m) => {
      if (m.cohortYear && m.cohortYear !== 'Unknown') {
        years.add(m.cohortYear);
      }
    });
    return Array.from(years).sort().reverse();
  }, [members]);

  // Selected committee object
  const currentCommittee = useMemo(() => {
    return KSJI_COMMANDERY_COMMITTEES.find((c) => c.id === selectedCommitteeId) || KSJI_COMMANDERY_COMMITTEES[0];
  }, [selectedCommitteeId]);

  // Compute targeted recipients based on active segment
  const targetMembers = useMemo(() => {
    switch (segment) {
      case 'all':
        return members;

      case 'trustees':
        return members.filter((m) => m.isTrustee || m.isPastPresident);

      case 'nobles':
        return members.filter((m) => m.isNoble);

      case 'chevaliers':
        return members.filter((m) => m.isChevalier);

      case 'cohort':
        if (!selectedCohortYear) return members;
        return members.filter((m) => m.cohortYear === selectedCohortYear);

      case 'committee':
        // Filter members who are active or matching committee title
        const commNameLower = currentCommittee.name.toLowerCase();
        const shortLower = currentCommittee.shortName.toLowerCase();
        const committeeMatches = members.filter((m) =>
          m.activePositions.some((p) => {
            const pLower = p.toLowerCase();
            return pLower.includes(commNameLower) || pLower.includes(shortLower) || pLower.includes('committee');
          })
        );
        // If no members explicitly tagged with this committee in positions yet, return all active members as candidates
        return committeeMatches.length > 0 ? committeeMatches : members;

      case 'financial':
        if (financialFilter === 'delinquent') {
          return members.filter((m) => m.outstandingBalance > 0);
        }
        if (financialFilter === 'partially_paid') {
          return members.filter((m) => m.paymentStatus === 'partially_paid');
        }
        if (financialFilter === 'fully_paid') {
          return members.filter((m) => m.paymentStatus === 'fully_paid');
        }
        return members;

      case 'custom':
        return members.filter((m) => customSelectedIds.has(m.id));

      default:
        return members;
    }
  }, [segment, members, selectedCohortYear, currentCommittee, financialFilter, customSelectedIds]);

  // Recipient channel metrics
  const emailEligibleCount = useMemo(() => targetMembers.filter((m) => Boolean(m.email)).length, [targetMembers]);
  const smsEligibleCount = useMemo(() => targetMembers.filter((m) => Boolean(m.phone)).length, [targetMembers]);

  // SMS length calculation
  const smsLength = smsBody.length;
  const smsSegments = Math.ceil(smsLength / 160) || 1;
  const estimatedSmsMinutes = Math.ceil((smsEligibleCount * smsSegments) / 3);

  // Toggle custom recipient selection
  const handleToggleMember = (id: string) => {
    setCustomSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllCustom = () => {
    setCustomSelectedIds(new Set(members.map((m) => m.id)));
  };

  const handleClearCustom = () => {
    setCustomSelectedIds(new Set());
  };

  // Insert merge tag into active field
  const handleInsertTag = (tag: string, field: 'subject' | 'email' | 'sms') => {
    if (field === 'subject') setSubject((s) => `${s} ${tag}`);
    if (field === 'email') setEmailBody((b) => `${b} ${tag}`);
    if (field === 'sms') setSmsBody((b) => `${b} ${tag}`);
  };

  // Submit broadcast
  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (targetMembers.length === 0) {
      alert('No recipients selected. Please select at least one brother.');
      return;
    }

    const confirmMsg =
      `📢 CONFIRM BROADCAST DISPATCH:\n\n` +
      `• Target Audience: ${segment.toUpperCase()} (${targetMembers.length} brothers)\n` +
      `• Channel: ${channel.toUpperCase()}\n` +
      `• Eligible Emails: ${emailEligibleCount}\n` +
      `• Eligible SMS: ${smsEligibleCount}\n` +
      (channel !== 'email' ? `• Carrier Protection: SMS will be paced at 3 msgs/min (approx ${estimatedSmsMinutes} mins total)\n\n` : '\n\n') +
      `Proceed with dispatch?`;

    if (!window.confirm(confirmMsg)) return;

    setSending(true);
    setDispatchResult(null);

    try {
      const memberIds = targetMembers.map((m) => m.id);

      // Create variable substitutions for each member
      const variablesMap: Record<string, any> = {};
      targetMembers.forEach((m) => {
        variablesMap[m.id] = {
          memberName: m.fullName,
          degree: m.highestDegree,
          balance: `GHS ${m.outstandingBalance.toFixed(2)}`,
        };
      });

      let totalSent = 0;
      let totalFailed = 0;

      // Send Email if requested
      if (channel === 'email' || channel === 'both') {
        const emailResponse = await fetch('/api/communications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memberIds,
            type: 'email',
            templateId: 'general',
            subject,
            htmlContent: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">
              <h2 style="color: #0A1628; border-bottom: 2px solid #C9A84C; padding-bottom: 8px;">${subject}</h2>
              <p>${emailBody.replace(/\n/g, '<br/>')}</p>
              <hr style="margin: 24px 0; border: none; border-top: 1px solid #e2e8f0;" />
              <p style="font-size: 11px; color: #64748b;">
                Official message dispatched by KSJI St. Margaret-Mary Commandery #500 Secretariat.
              </p>
            </div>`,
            textContent: emailBody,
            variables: variablesMap,
          }),
        });
        const emailRes = await emailResponse.json();
        if (emailRes.success) {
          totalSent += emailRes.sent || 0;
          totalFailed += emailRes.failed || 0;
        }
      }

      // Send SMS if requested
      if (channel === 'sms' || channel === 'both') {
        const smsResponse = await fetch('/api/communications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memberIds,
            type: 'sms',
            templateId: 'general',
            smsBody,
            variables: variablesMap,
          }),
        });
        const smsRes = await smsResponse.json();
        if (smsRes.success) {
          totalSent += smsRes.sent || 0;
          totalFailed += smsRes.failed || 0;
        }
      }

      setDispatchResult({
        success: true,
        sent: totalSent,
        failed: totalFailed,
        message: `Broadcast successfully enqueued for ${targetMembers.length} brothers (${channel.toUpperCase()}). Carrier pacing active at 3 SMS/min.`,
      });
    } catch (err: any) {
      setDispatchResult({
        success: false,
        message: err.message || 'Failed to dispatch broadcast',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Header & Back Link */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Link
            href="/registrar/communications"
            style={{ fontSize: 13, color: '#C9A84C', textDecoration: 'none', fontWeight: 700 }}
          >
            ← Back to Communications Hub
          </Link>
          <h2 style={{ margin: '6px 0 0', color: 'var(--navy)', fontWeight: 800, fontSize: 22 }}>
            📢 Targeted Broadcast Composer
          </h2>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Link
            href="/registrar/communications/history"
            style={{
              padding: '9px 16px',
              borderRadius: 8,
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: 'var(--navy)',
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            📋 Delivery History
          </Link>
        </div>
      </div>

      {/* Statutory Data Protection & Compliance Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(10,22,40,0.04) 0%, rgba(201,168,76,0.12) 100%)',
          border: '1.5px solid rgba(201, 168, 76, 0.4)',
          borderRadius: 12,
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <span style={{ fontSize: 24 }}>🛡️</span>
        <div style={{ fontSize: 13, color: '#1e293b', lineHeight: 1.5 }}>
          <strong>Statutory Compliance & Archival Policy (Ghana Data Protection Act 2012):</strong> Deceased,
          dismissed, and transferred members are permanently archived on the Roll of Honour and automatically
          excluded from all communication and billing queues.
        </div>
      </div>

      {/* Dispatch Success / Error Alert */}
      {dispatchResult && (
        <div
          style={{
            padding: '18px 22px',
            borderRadius: 12,
            background: dispatchResult.success ? '#f0fdf4' : '#fef2f2',
            border: `1.5px solid ${dispatchResult.success ? '#22c55e' : '#ef4444'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontWeight: 800, color: dispatchResult.success ? '#166534' : '#991b1b', fontSize: 15 }}>
              {dispatchResult.success ? '✅ Broadcast Enqueued Successfully' : '❌ Dispatch Error'}
            </div>
            <div style={{ fontSize: 13, color: dispatchResult.success ? '#15803d' : '#b91c1c', marginTop: 4 }}>
              {dispatchResult.message}
            </div>
          </div>
          <Link
            href="/registrar/communications/history"
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              background: dispatchResult.success ? '#166534' : '#991b1b',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: 12,
              textDecoration: 'none',
            }}
          >
            View Live History →
          </Link>
        </div>
      )}

      {/* Two Column Layout: Left = Audience & Channels, Right = Message Editor & Preview */}
      <form onSubmit={handleDispatch} style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: 24, alignItems: 'start' }}>
        
        {/* Left Column: Audience Targeting */}
        <div style={{ display: 'grid', gap: 20 }}>
          
          {/* Audience Preset Tabs */}
          <div className="card" style={{ display: 'grid', gap: 14 }}>
            <h3 style={{ margin: 0, fontSize: 15, color: 'var(--navy)', fontWeight: 800 }}>
              1. Select Target Audience Segment
            </h3>

            <div style={{ display: 'grid', gap: 8 }}>
              {[
                { id: 'all', label: 'All Active Members', count: members.length, icon: '👥' },
                { id: 'trustees', label: 'Board of Trustees & Past Presidents', count: members.filter((m) => m.isTrustee || m.isPastPresident).length, icon: '📜' },
                { id: 'nobles', label: 'Nobles (5th Degree)', count: members.filter((m) => m.isNoble).length, icon: '👑' },
                { id: 'chevaliers', label: 'Chevaliers (4th Degree Chapter)', count: members.filter((m) => m.isChevalier).length, icon: '🏅' },
                { id: 'cohort', label: 'Initiation Cohort Year', count: selectedCohortYear ? members.filter((m) => m.cohortYear === selectedCohortYear).length : members.length, icon: '🎓' },
                { id: 'committee', label: 'Commandery Committee (9 Groups)', count: KSJI_COMMANDERY_COMMITTEES.length, icon: '🏛️' },
                { id: 'financial', label: 'Financial Assessment Standing', count: members.filter((m) => m.outstandingBalance > 0).length, icon: '💳' },
                { id: 'custom', label: 'Custom Member Multi-Select', count: customSelectedIds.size, icon: '✏️' },
              ].map((tab) => {
                const isSelected = segment === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSegment(tab.id as SegmentType)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: isSelected ? '2px solid var(--navy)' : '1px solid #e2e8f0',
                      background: isSelected ? 'linear-gradient(135deg, #0A1628 0%, #1e293b 100%)' : '#ffffff',
                      color: isSelected ? '#ffffff' : '#334155',
                      fontWeight: isSelected ? 800 : 600,
                      fontSize: 13,
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{tab.icon}</span>
                      <span>{tab.label}</span>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 12,
                        background: isSelected ? '#C9A84C' : '#f1f5f9',
                        color: isSelected ? '#0A1628' : '#64748b',
                      }}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Sub-selectors depending on active segment */}
            {segment === 'cohort' && (
              <div style={{ marginTop: 6, background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', display: 'block', marginBottom: 6 }}>
                  Choose Initiation Cohort Year:
                </label>
                <select
                  value={selectedCohortYear}
                  onChange={(e) => setSelectedCohortYear(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                >
                  <option value="">-- All Cohort Years ({cohortYears.length}) --</option>
                  {cohortYears.map((yr) => (
                    <option key={yr} value={yr}>
                      Cohort {yr} ({members.filter((m) => m.cohortYear === yr).length} brothers)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {segment === 'committee' && (
              <div style={{ marginTop: 6, background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', display: 'grid', gap: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', display: 'block' }}>
                  Choose Commandery Committee (Governance Manual Feb 2026):
                </label>
                <select
                  value={selectedCommitteeId}
                  onChange={(e) => setSelectedCommitteeId(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700 }}
                >
                  {KSJI_COMMANDERY_COMMITTEES.map((comm) => (
                    <option key={comm.id} value={comm.id}>
                      {comm.name} {comm.chairmanRole ? `(${comm.chairmanRole})` : ''}
                    </option>
                  ))}
                </select>

                {/* Committee Mandate Brief */}
                <div style={{ background: '#ffffff', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11, color: '#475569' }}>
                  <div style={{ fontWeight: 800, color: 'var(--navy)', marginBottom: 4 }}>📜 Committee Mandate:</div>
                  <p style={{ margin: 0, lineHeight: 1.4 }}>{currentCommittee.mandate}</p>
                  <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: '#0369a1' }}>Collaborates with:</span>
                    {currentCommittee.collaboratesWith.map((c) => (
                      <span key={c} style={{ background: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: 4 }}>{c}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {segment === 'financial' && (
              <div style={{ marginTop: 6, background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', display: 'block', marginBottom: 6 }}>
                  Financial Assessment Filter:
                </label>
                <div style={{ display: 'grid', gap: 6 }}>
                  {[
                    { id: 'delinquent', label: 'Outstanding Balance / In Arrears Only', count: members.filter((m) => m.outstandingBalance > 0).length },
                    { id: 'partially_paid', label: 'Partially Paid Accounts', count: members.filter((m) => m.paymentStatus === 'partially_paid').length },
                    { id: 'fully_paid', label: 'Fully Paid in Good Standing', count: members.filter((m) => m.paymentStatus === 'fully_paid').length },
                  ].map((f) => (
                    <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="finFilter"
                        checked={financialFilter === f.id}
                        onChange={() => setFinancialFilter(f.id as any)}
                      />
                      <span>{f.label} ({f.count})</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {segment === 'custom' && (
              <div style={{ marginTop: 6, background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>Custom Selection</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={handleSelectAllCustom} style={{ fontSize: 11, color: '#0284c7', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Select All</button>
                    <button type="button" onClick={handleClearCustom} style={{ fontSize: 11, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Clear</button>
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="Filter brothers by name..."
                  value={memberSearchTerm}
                  onChange={(e) => setMemberSearchTerm(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                />

                <div style={{ maxHeight: 200, overflowY: 'auto', display: 'grid', gap: 4, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: 6 }}>
                  {members
                    .filter((m) => !memberSearchTerm || m.fullName.toLowerCase().includes(memberSearchTerm.toLowerCase()))
                    .map((m) => {
                      const isChecked = customSelectedIds.has(m.id);
                      return (
                        <label
                          key={m.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '4px 6px',
                            borderRadius: 4,
                            background: isChecked ? '#f0fdf4' : 'transparent',
                            fontSize: 12,
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleMember(m.id)}
                          />
                          <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {m.fullName}
                          </span>
                          <span style={{ fontSize: 10, color: '#64748b' }}>{m.highestDegree.split(' ')[0]}</span>
                        </label>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Delivery Channel Selector */}
          <div className="card" style={{ display: 'grid', gap: 14 }}>
            <h3 style={{ margin: 0, fontSize: 15, color: 'var(--navy)', fontWeight: 800 }}>
              2. Delivery Channels
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                { id: 'both', label: 'SMS & Email', icon: '📬' },
                { id: 'sms', label: 'SMS Only', icon: '💬' },
                { id: 'email', label: 'Email Only', icon: '📧' },
              ].map((c) => {
                const isSelected = channel === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setChannel(c.id as ChannelType)}
                    style={{
                      padding: '10px 8px',
                      borderRadius: 10,
                      border: isSelected ? '2px solid var(--navy)' : '1px solid #e2e8f0',
                      background: isSelected ? '#0A1628' : '#ffffff',
                      color: isSelected ? '#ffffff' : '#334155',
                      fontWeight: isSelected ? 800 : 600,
                      fontSize: 12,
                      cursor: 'pointer',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{c.icon}</span>
                    <span>{c.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Recipient Deduplicated Summary Pill */}
            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: '#64748b' }}>Target Recipients:</span>
                <strong style={{ color: 'var(--navy)' }}>{targetMembers.length} Brothers</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: '#64748b' }}>With Email Address:</span>
                <span style={{ fontWeight: 700, color: '#1d4ed8' }}>{emailEligibleCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: '#64748b' }}>With Mobile Phone:</span>
                <span style={{ fontWeight: 700, color: '#059669' }}>{smsEligibleCount}</span>
              </div>
              {channel !== 'email' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 6, borderTop: '1px dashed #cbd5e1' }}>
                  <span style={{ color: '#64748b' }}>Carrier Pacing (3 SMS/min):</span>
                  <span style={{ fontWeight: 700, color: '#d97706' }}>~{estimatedSmsMinutes} mins</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Message Composition & Live Preview */}
        <div style={{ display: 'grid', gap: 20 }}>
          
          <div className="card" style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 16, color: 'var(--navy)', fontWeight: 800 }}>
                3. Message Content & Personalization
              </h3>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Insert tag:</span>
                <button
                  type="button"
                  onClick={() => handleInsertTag('{memberName}', channel === 'sms' ? 'sms' : 'email')}
                  style={{ padding: '3px 8px', borderRadius: 4, background: '#f1f5f9', border: '1px solid #cbd5e1', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}
                >
                  +{'{memberName}'}
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertTag('{degree}', channel === 'sms' ? 'sms' : 'email')}
                  style={{ padding: '3px 8px', borderRadius: 4, background: '#f1f5f9', border: '1px solid #cbd5e1', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}
                >
                  +{'{degree}'}
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertTag('{balance}', channel === 'sms' ? 'sms' : 'email')}
                  style={{ padding: '3px 8px', borderRadius: 4, background: '#f1f5f9', border: '1px solid #cbd5e1', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}
                >
                  +{'{balance}'}
                </button>
              </div>
            </div>

            {/* Email Form (shown if channel is email or both) */}
            {(channel === 'email' || channel === 'both') && (
              <div style={{ display: 'grid', gap: 10, background: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>📧</span>
                  <strong style={{ fontSize: 13, color: 'var(--navy)' }}>Email Subject & Body</strong>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                    Email Subject Line:
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                    Email Message Content:
                  </label>
                  <textarea
                    rows={6}
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontFamily: 'inherit', lineHeight: 1.5 }}
                  />
                </div>
              </div>
            )}

            {/* SMS Form (shown if channel is sms or both) */}
            {(channel === 'sms' || channel === 'both') && (
              <div style={{ display: 'grid', gap: 10, background: '#fffbeb', padding: 16, borderRadius: 10, border: '1px solid #fef3c7' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 16 }}>💬</span>
                    <strong style={{ fontSize: 13, color: '#92400e' }}>SMS Text Message (Paced at 3/min)</strong>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: smsLength > 160 ? '#b45309' : '#15803d' }}>
                    {smsLength} chars • {smsSegments} segment{smsSegments === 1 ? '' : 's'}
                  </span>
                </div>

                <div>
                  <textarea
                    rows={4}
                    value={smsBody}
                    onChange={(e) => setSmsBody(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #fcd34d', fontSize: 13, fontFamily: 'inherit', lineHeight: 1.4 }}
                  />
                </div>

                <div style={{ fontSize: 11, color: '#78350f', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>⏱️</span>
                  <span>Carrier Protection: Enqueued messages will be automatically spaced at 20-second intervals (3 SMS/min).</span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button
                type="submit"
                disabled={sending || targetMembers.length === 0}
                style={{
                  padding: '14px 28px',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #0A1628 0%, #1e293b 100%)',
                  color: '#C9A84C',
                  border: '1px solid #C9A84C',
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: sending ? 'not-allowed' : 'pointer',
                  opacity: sending ? 0.7 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  boxShadow: '0 4px 12px rgba(10, 22, 40, 0.25)',
                }}
              >
                <span>{sending ? '⏳ Enqueuing Broadcast...' : `🚀 Dispatch Broadcast (${targetMembers.length} Recipients) →`}</span>
              </button>
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="card" style={{ background: '#ffffff', display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: 14, color: 'var(--navy)', fontWeight: 800 }}>
                📱 Live Recipient Preview Sample
              </h4>
              <span style={{ fontSize: 11, color: '#64748b' }}>
                Sample Brother: {targetMembers[0]?.fullName || 'Brother Knight'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: channel === 'both' ? '1fr 1fr' : '1fr', gap: 14 }}>
              {/* SMS Sample */}
              {(channel === 'sms' || channel === 'both') && (
                <div style={{ background: '#f1f5f9', padding: 14, borderRadius: 12, border: '1px solid #cbd5e1' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>SMS Preview</div>
                  <div
                    style={{
                      background: '#ffffff',
                      padding: 12,
                      borderRadius: 10,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                      fontSize: 12,
                      color: '#0f172a',
                      lineHeight: 1.4,
                      borderLeft: '4px solid #059669',
                    }}
                  >
                    {smsBody
                      .replace(/{memberName}/g, targetMembers[0]?.fullName || 'Bro. John Doe')
                      .replace(/{degree}/g, targetMembers[0]?.highestDegree || 'Knight (1st Degree)')
                      .replace(/{balance}/g, `GHS ${(targetMembers[0]?.outstandingBalance || 0).toFixed(2)}`)}
                  </div>
                </div>
              )}

              {/* Email Sample */}
              {(channel === 'email' || channel === 'both') && (
                <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #cbd5e1' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>Email Preview</div>
                  <div
                    style={{
                      background: '#ffffff',
                      padding: 12,
                      borderRadius: 10,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                      fontSize: 12,
                      color: '#0f172a',
                      lineHeight: 1.5,
                      borderLeft: '4px solid #1d4ed8',
                    }}
                  >
                    <div style={{ fontWeight: 800, color: 'var(--navy)', marginBottom: 6 }}>{subject}</div>
                    <div style={{ whiteSpace: 'pre-line' }}>
                      {emailBody
                        .replace(/{memberName}/g, targetMembers[0]?.fullName || 'Bro. John Doe')
                        .replace(/{degree}/g, targetMembers[0]?.highestDegree || 'Knight (1st Degree)')
                        .replace(/{balance}/g, `GHS ${(targetMembers[0]?.outstandingBalance || 0).toFixed(2)}`)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </form>
    </div>
  );
}
