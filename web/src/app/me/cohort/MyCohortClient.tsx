'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MyCohortResult, MyCohortBrother } from '@/services/memberService';

interface MyCohortClientProps {
  cohortData: MyCohortResult;
}

export default function MyCohortClient({ cohortData }: MyCohortClientProps) {
  const [search, setSearch] = useState('');
  const [viewStyle, setViewStyle] = useState<'cards' | 'table'>('cards');

  const {
    hasCohort,
    formattedDate,
    initiationDate,
    cohortYear,
    totalMembers,
    activeCount,
    deceasedCount,
    transferCount,
    archivedCount,
    isPreCharter,
    isCharterDay,
    isTransferee,
    transferFrom,
    orderInitiationDate,
    orderInitiationPlace,
    myMember,
    members
  } = cohortData;

  const filteredMembers = members.filter(m => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      m.fullName.toLowerCase().includes(q) ||
      (m.occupation && m.occupation.toLowerCase().includes(q)) ||
      (m.residence && m.residence.toLowerCase().includes(q)) ||
      (m.formattedBirthday && m.formattedBirthday.toLowerCase().includes(q)) ||
      (m.phone && m.phone.includes(q)) ||
      (m.mobile && m.mobile.includes(q))
    );
  });

  const sanitizePhoneForWa = (phone: string) => {
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.startsWith('0') && clean.length === 10) {
      clean = '233' + clean.substring(1);
    }
    return clean;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      <style jsx global>{`
        @media print {
          nav, header, aside, .no-print, button {
            display: none !important;
          }
          .cohort-print-container {
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>

      {/* TOP HERO BANNER */}
      <div
        style={{
          background: 'linear-gradient(135deg, #10233F 0%, #1e3a5f 50%, #800020 100%)',
          borderRadius: '14px',
          padding: '28px 24px',
          color: '#ffffff',
          boxShadow: '0 8px 20px rgba(16, 35, 63, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '20px' }}>⚔️</span>
              <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: '#D4AF37' }}>
                Fraternal Bond & Roll of Brethren
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: '#ffffff' }}>
              {hasCohort ? (isTransferee ? `Commandery #500 Intake Cohort of ${formattedDate}` : `Cohort of ${formattedDate}`) : 'My Initiation Cohort'}
            </h1>
            <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: '#cbd5e1', maxWidth: '650px', lineHeight: '1.5' }}>
              {hasCohort ? (
                isTransferee ? (
                  `You were initiated into the Knights of St. John International${orderInitiationDate ? ` on ${orderInitiationDate}` : ''}${orderInitiationPlace || transferFrom ? ` at ${orderInitiationPlace || transferFrom}` : ''}, and transferred into St. Margaret-Mary Commandery #500 on ${formattedDate}. Below is your Commandery #500 intake class.`
                ) : isPreCharter ? (
                  `You and ${totalMembers - 1} brother${totalMembers - 1 === 1 ? '' : 's'} were initiated prior to the charter of Commandery #500 and transferred on Charter Inauguration Day (30th Dec 1995) as foundational roll members.`
                ) : isCharterDay ? (
                  `You were part of the historic Commandery #500 Charter Day Inauguration Class on 30th December 1995.`
                ) : (
                  `You were initiated alongside ${totalMembers - 1} brother${totalMembers - 1 === 1 ? '' : 's'} into St. Margaret-Mary Commandery #500. This is your permanent fraternal class roster.`
                )
              ) : (
                'Discover and connect with the brothers who took their 1st Degree and entered the Order alongside you.'
              )}
            </p>
          </div>

          {hasCohort && (
            <div className="no-print" style={{ display: 'flex', gap: '8px', alignSelf: 'center' }}>
              <button
                onClick={() => window.print()}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: '#ffffff',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>🖨️</span> Print Cohort Roster
              </button>
            </div>
          )}
        </div>

        {/* STATS PILL ROW */}
        {hasCohort && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.15)' }}>
            <span style={{ background: 'rgba(255, 255, 255, 0.18)', borderRadius: '999px', padding: '4px 14px', fontSize: '13px', fontWeight: 700 }}>
              👥 {totalMembers} Brothers Initiated Together
            </span>
            {activeCount > 0 && (
              <span style={{ background: 'rgba(34, 197, 94, 0.25)', border: '1px solid rgba(34, 197, 94, 0.4)', borderRadius: '999px', padding: '4px 14px', fontSize: '13px', fontWeight: 700, color: '#86efac' }}>
                🟢 {activeCount} Active
              </span>
            )}
            {deceasedCount > 0 && (
              <span style={{ background: 'rgba(234, 88, 12, 0.25)', border: '1px solid rgba(234, 88, 12, 0.4)', borderRadius: '999px', padding: '4px 14px', fontSize: '13px', fontWeight: 700, color: '#fed7aa' }}>
                🕊️ {deceasedCount} Roll of Honour
              </span>
            )}
            {transferCount > 0 && (
              <span style={{ background: 'rgba(14, 165, 233, 0.25)', border: '1px solid rgba(14, 165, 233, 0.4)', borderRadius: '999px', padding: '4px 14px', fontSize: '13px', fontWeight: 700, color: '#bae6fd' }}>
                🔄 {transferCount} Transferred
              </span>
            )}
            {archivedCount > 0 && (
              <span style={{ background: 'rgba(245, 158, 11, 0.25)', border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: '999px', padding: '4px 14px', fontSize: '13px', fontWeight: 700, color: '#fde68a' }}>
                📜 {archivedCount} Roll Book Ledger
              </span>
            )}
            {isPreCharter && (
              <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: '999px', padding: '4px 14px', fontSize: '13px', fontWeight: 800 }}>
                🏛️ Charter Foundation (Charter Day Transferee)
              </span>
            )}
            {isCharterDay && (
              <span style={{ background: '#dcfce7', color: '#15803d', borderRadius: '999px', padding: '4px 14px', fontSize: '13px', fontWeight: 800 }}>
                🎉 Charter Day Inauguration Class (30-12-1995)
              </span>
            )}
          </div>
        )}
      </div>

      {/* IF NO COHORT REGISTERED */}
      {!hasCohort && (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '40px 24px', textAlign: 'center', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '42px', marginBottom: '14px' }}>📜</div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
            Initiation Date Pending Verification
          </h2>
          <p style={{ margin: '0 auto 20px auto', maxWidth: '520px', fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>
            Your official initiation date is not yet recorded in the digital register. Once the Commandery Registrar verifies your 1st Degree ceremony date or links your Roll Book entry, your complete initiation class will appear here automatically.
          </p>
          <div style={{ display: 'inline-flex', gap: '10px' }}>
            <Link
              href="/me/edit"
              style={{
                textDecoration: 'none',
                background: '#10233F',
                color: '#ffffff',
                padding: '8px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700
              }}
            >
              Check My Profile Info
            </Link>
          </div>
        </div>
      )}

      {/* COHORT ROSTER SECTION */}
      {hasCohort && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* SEARCH & VIEW TOGGLE CONTROLS */}
          <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search cohort brothers by name, birthday, phone..."
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={() => setViewStyle('cards')}
                style={{
                  background: viewStyle === 'cards' ? '#10233F' : '#f1f5f9',
                  color: viewStyle === 'cards' ? '#fff' : '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                🗂️ Cards
              </button>
              <button
                onClick={() => setViewStyle('table')}
                style={{
                  background: viewStyle === 'table' ? '#10233F' : '#f1f5f9',
                  color: viewStyle === 'table' ? '#fff' : '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                📋 Table
              </button>
            </div>
          </div>

          {/* VIEW 1: CARDS */}
          {viewStyle === 'cards' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {filteredMembers.map(brother => {
                const phoneNum = brother.phone || brother.mobile;
                const waNum = phoneNum ? sanitizePhoneForWa(phoneNum) : null;

                return (
                  <div
                    key={brother.id}
                    style={{
                      background: brother.isCurrentUser ? '#fffdf5' : '#ffffff',
                      borderRadius: '12px',
                      border: brother.isCurrentUser ? '2px solid #D4AF37' : '1px solid #e2e8f0',
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: brother.isCurrentUser ? '0 4px 12px rgba(212, 175, 55, 0.2)' : '0 2px 6px rgba(0,0,0,0.03)',
                      position: 'relative'
                    }}
                  >
                    {/* Logged in member badge */}
                    {brother.isCurrentUser && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          background: '#D4AF37',
                          color: '#0f172a',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 800,
                          letterSpacing: '0.5px'
                        }}
                      >
                        ⭐ YOU
                      </div>
                    )}

                    <div>
                      {/* Avatar & Name Header */}
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                        {brother.photoUrl ? (
                          <img
                            src={brother.photoUrl}
                            alt={brother.fullName}
                            style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0' }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '48px',
                              height: '48px',
                              borderRadius: '50%',
                              background: brother.isCurrentUser ? '#10233F' : '#f1f5f9',
                              color: brother.isCurrentUser ? '#D4AF37' : '#475569',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '16px',
                              fontWeight: 800,
                              border: '1px solid #cbd5e1'
                            }}
                          >
                            {(brother.firstName?.[0] || '') + (brother.surname?.[0] || 'B')}
                          </div>
                        )}

                        <div style={{ paddingRight: brother.isCurrentUser ? '50px' : '0' }}>
                          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a', lineHeight: '1.3' }}>
                            {brother.fullName}
                          </h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                            {brother.entryNo && (
                              <span style={{ fontSize: '11px', background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                #{brother.entryNo}
                              </span>
                            )}
                            <StandingBadge status={brother.status} isDeceased={brother.isDeceased} transferTo={brother.transferTo} />
                          </div>
                        </div>
                      </div>

                      {/* Details: Birthday, Phone, Residence, Occupation */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px', color: '#334155', marginTop: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                        {/* Birthday */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '15px' }}>🎂</span>
                          <span style={{ fontWeight: 600 }}>
                            {brother.formattedBirthday ? (
                              <span style={{ color: '#0f172a' }}>{brother.formattedBirthday}</span>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>Birthday not specified</span>
                            )}
                          </span>
                        </div>

                        {/* Phone */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '15px' }}>📞</span>
                          {phoneNum ? (
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>
                              {brother.phone}
                              {brother.mobile && brother.mobile !== brother.phone ? ` / ${brother.mobile}` : ''}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>Phone not listed</span>
                          )}
                        </div>

                        {/* Residence */}
                        {brother.residence && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '15px' }}>📍</span>
                            <span>{brother.residence}</span>
                          </div>
                        )}

                        {/* Occupation */}
                        {brother.occupation && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '15px' }}>💼</span>
                            <span>{brother.occupation}</span>
                          </div>
                        )}

                        {/* Deceased / Memorial notice */}
                        {brother.isDeceased && (
                          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '6px', padding: '6px 10px', fontSize: '11.5px', color: '#c2410c', fontWeight: 600 }}>
                            🕊️ Roll of Honour • Rest in Peace
                          </div>
                        )}

                        {/* Transfer notice */}
                        {brother.transferTo && (
                          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px', padding: '6px 10px', fontSize: '11.5px', color: '#0369a1', fontWeight: 600 }}>
                            🔄 Transferred to {brother.transferTo}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Action Buttons: Call / WhatsApp */}
                    {phoneNum && !brother.isDeceased && (
                      <div className="no-print" style={{ display: 'flex', gap: '8px', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                        <a
                          href={`tel:${phoneNum}`}
                          style={{
                            flex: 1,
                            textDecoration: 'none',
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            textAlign: 'center',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#1e293b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          <span>📞</span> Call
                        </a>
                        {waNum && (
                          <a
                            href={`https://wa.me/${waNum}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              flex: 1,
                              textDecoration: 'none',
                              background: '#25D366',
                              border: '1px solid #22c55e',
                              borderRadius: '6px',
                              padding: '6px 10px',
                              textAlign: 'center',
                              fontSize: '12px',
                              fontWeight: 700,
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}
                          >
                            <span>💬</span> WhatsApp
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW 2: TABLE */}
          {viewStyle === 'table' && (
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflowX: 'auto', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    <th style={{ padding: '10px 16px', width: '50px' }}>Entry</th>
                    <th style={{ padding: '10px 16px' }}>Brother Full Name</th>
                    <th style={{ padding: '10px 16px' }}>Standing / Status</th>
                    <th style={{ padding: '10px 16px' }}>🎂 Birthday</th>
                    <th style={{ padding: '10px 16px' }}>📞 Phone</th>
                    <th style={{ padding: '10px 16px' }}>📍 Residence</th>
                    <th style={{ padding: '10px 16px' }}>💼 Occupation</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }} className="no-print">Quick Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((brother, idx) => {
                    const phoneNum = brother.phone || brother.mobile;
                    const waNum = phoneNum ? sanitizePhoneForWa(phoneNum) : null;

                    return (
                      <tr
                        key={brother.id}
                        style={{
                          borderBottom: idx === filteredMembers.length - 1 ? 'none' : '1px solid #f1f5f9',
                          background: brother.isCurrentUser ? '#fefce8' : (idx % 2 === 0 ? '#ffffff' : '#fcfcfd')
                        }}
                      >
                        {/* Entry Number */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                          {brother.entryNo ? (
                            <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 7px', borderRadius: '4px', fontWeight: 700, fontSize: '11.5px' }}>
                              #{brother.entryNo}
                            </span>
                          ) : (
                            <span style={{ color: '#cbd5e1' }}>—</span>
                          )}
                        </td>

                        {/* Name */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ fontWeight: 800, color: '#0f172a' }}>
                              {brother.fullName}
                            </div>
                            {brother.isCurrentUser && (
                              <span style={{ background: '#D4AF37', color: '#0f172a', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>
                                YOU
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                          <StandingBadge status={brother.status} isDeceased={brother.isDeceased} transferTo={brother.transferTo} />
                        </td>

                        {/* Birthday */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                          {brother.formattedBirthday ? (
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>🎂 {brother.formattedBirthday}</span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          )}
                        </td>

                        {/* Phone */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                          {phoneNum ? (
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{phoneNum}</span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          )}
                        </td>

                        {/* Residence */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'middle', color: '#475569' }}>
                          {brother.residence || <span style={{ color: '#94a3b8' }}>—</span>}
                        </td>

                        {/* Occupation */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'middle', color: '#475569' }}>
                          {brother.occupation || <span style={{ color: '#94a3b8' }}>—</span>}
                        </td>

                        {/* Contact Action */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'right' }} className="no-print">
                          {phoneNum && !brother.isDeceased && (
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <a
                                href={`tel:${phoneNum}`}
                                style={{
                                  textDecoration: 'none',
                                  background: '#f8fafc',
                                  border: '1px solid #cbd5e1',
                                  padding: '4px 8px',
                                  borderRadius: '5px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  color: '#334155'
                                }}
                              >
                                📞 Call
                              </a>
                              {waNum && (
                                <a
                                  href={`https://wa.me/${waNum}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    textDecoration: 'none',
                                    background: '#25D366',
                                    padding: '4px 8px',
                                    borderRadius: '5px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: '#ffffff'
                                  }}
                                >
                                  💬 WhatsApp
                                </a>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* FRATERNAL SOLIDARITY FOOTER NOTE */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '12.5px',
              color: '#64748b',
              lineHeight: '1.5'
            }}
          >
            <span style={{ fontSize: '22px' }}>🤝</span>
            <div>
              <strong style={{ color: '#1e293b' }}>Fraternal Solidarity & Class Check-ins:</strong> Use this roster to celebrate birthdays, check in on your cohort brothers, and offer prayers for departed members of your initiation class. Contact the Registrar if any telephone numbers or contact details need updating.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StandingBadge({ status, isDeceased, transferTo }: { status: string; isDeceased: boolean; transferTo?: string | null }) {
  if (isDeceased || status === 'Deceased') {
    return (
      <span style={{ background: '#ffedd5', color: '#c2410c', border: '1px solid #fdba74', borderRadius: '999px', padding: '1px 8px', fontSize: '11px', fontWeight: 700 }}>
        🕊️ Roll of Honour
      </span>
    );
  }
  if (status === 'Transfer-Out' || transferTo) {
    return (
      <span style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '999px', padding: '1px 8px', fontSize: '11px', fontWeight: 700 }}>
        🔄 Transferred
      </span>
    );
  }
  if (status === 'Dismissed') {
    return (
      <span style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '999px', padding: '1px 8px', fontSize: '11px', fontWeight: 700 }}>
        🚫 Dismissed
      </span>
    );
  }
  if (status === 'Archived Roll') {
    return (
      <span style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', borderRadius: '999px', padding: '1px 8px', fontSize: '11px', fontWeight: 700 }}>
        📜 Roll Book
      </span>
    );
  }
  return (
    <span style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', borderRadius: '999px', padding: '1px 8px', fontSize: '11px', fontWeight: 700 }}>
      🟢 Active
    </span>
  );
}
