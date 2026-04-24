'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { createClient } from '@/lib/supabase/client';
import { formatMemberTitle, formatExemplification } from '@/lib/utils/ksji-logic';

export default function MemberDossierPage() {
  const { id } = useParams();
  const router = useRouter();
  const [member, setMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('members')
        .select('*, spouse(*), children(*), positions(*), degrees(*)')
        .eq('id', id)
        .single();
      
      if (data) setMember(data);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <RegistrarShell title="Loading Dossier..." subtitle="Preparing full record."><div style={center}>Preparing Member Dossier...</div></RegistrarShell>;
  if (!member) return <RegistrarShell title="Error" subtitle="Member not found."><div>Record not found.</div></RegistrarShell>;

  const displayTitle = formatMemberTitle(member.title);
  const firstName = String(member.first_name || '').trim();
  const otherNames = String(member.other_names || '').trim();
  const surname = String(member.surname || '').trim();

  // Extreme Safety Formatting
  const formatDate = (dateStr: any) => {
    if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === '') return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
    } catch (e) { return '—'; }
  };

  // Cast Iron Array Handling
  const safeDegrees = Array.isArray(member.degrees) ? [...member.degrees] : [];
  const safePositions = Array.isArray(member.positions) ? [...member.positions] : [];
  const safeSpouse = Array.isArray(member.spouse) ? member.spouse : [];
  const safeChildren = Array.isArray(member.children) ? member.children : [];

  const sortedDegrees = safeDegrees.sort((a, b) => {
    const da = a.degree_date ? new Date(a.degree_date).getTime() : 0;
    const db = b.degree_date ? new Date(b.degree_date).getTime() : 0;
    return (isNaN(da) ? 0 : da) - (isNaN(db) ? 0 : db);
  });

  const sortedPositions = safePositions.sort((a, b) => {
    const da = a.date_from ? new Date(a.date_from).getTime() : 0;
    const db = b.date_from ? new Date(b.date_from).getTime() : 0;
    return (isNaN(da) ? 0 : da) - (isNaN(db) ? 0 : db);
  });

  return (
    <RegistrarShell title="Master Member Record" subtitle={`Full Dossier for ${displayTitle} ${surname}`}>
      <div style={container}>
        {/* ACTIONS */}
        <div className="no-print" style={actions}>
          <button onClick={() => window.print()} style={printBtn}>Print Master Record</button>
          <button onClick={() => router.back()} style={backBtn}>Back</button>
        </div>

        {/* THE DOSSIER */}
        <div id="dossier-print" style={paper}>
          <div style={header}>
            <div style={topLogo}>KSJI REGISTRAR SUITE</div>
            <h1 style={title}>OFFICIAL MASTER RECORD</h1>
            <p style={subtitle}>Personal & Service Dossier</p>
          </div>

          {/* PERSONAL INFO */}
          <section style={section}>
            <h2 style={sectionLabel}>I. Personal Information</h2>
            <table style={table} className="dossier-table">
              <tbody>
                <tr>
                  <th style={th}>Full Name</th>
                  <td style={td} colSpan={3}>{displayTitle} {firstName} {otherNames} {surname}</td>
                </tr>
                <tr>
                  <th style={th}>Date of Birth</th>
                  <td style={td}>{formatDate(member.date_of_birth)}</td>
                  <th style={th}>Place of Birth</th>
                  <td style={td}>{member.birth_town || 'N/A'} {member.birth_region ? `(${member.birth_region})` : ''}</td>
                </tr>
                <tr>
                  <th style={th}>Nationality</th>
                  <td style={td}>{member.nationality || 'N/A'}</td>
                  <th style={th}>Home Town</th>
                  <td style={td}>{member.home_town || 'N/A'}</td>
                </tr>
                <tr>
                  <th style={th}>Email</th>
                  <td style={td}>{member.email || 'N/A'}</td>
                  <th style={th}>Phone / Mobile</th>
                  <td style={td}>{member.phone || member.mobile || 'N/A'}</td>
                </tr>
                <tr>
                  <th style={th}>Residential Address</th>
                  <td colSpan={3} style={td}>{member.residential_address || 'N/A'}</td>
                </tr>
                <tr>
                  <th style={th}>Occupation</th>
                  <td style={td}>{member.occupation || 'N/A'}</td>
                  <th style={th}>Workplace</th>
                  <td style={td}>{member.workplace || 'N/A'}</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* FAMILY INFO */}
          <section style={section}>
            <h2 style={sectionLabel}>II. Family & Next of Kin</h2>
            <table style={table}>
              <thead>
                <tr>
                  <th style={tableH}>Relationship</th>
                  <th style={tableH}>Name</th>
                  <th style={tableH}>Details</th>
                </tr>
              </thead>
              <tbody>
                {safeSpouse.map((s: any, idx: number) => (
                  <tr key={idx}>
                    <td style={td}>Spouse</td>
                    <td style={td}>{s.spouse_name || 'N/A'}</td>
                    <td style={td}>{s.spouse_parish ? `Parish: ${s.spouse_parish}` : 'N/A'}</td>
                  </tr>
                ))}
                {safeChildren.map((c: any, idx: number) => (
                  <tr key={idx}>
                    <td style={td}>Child</td>
                    <td style={td}>{c.child_name || 'N/A'}</td>
                    <td style={td}>{c.birth_date ? `Born: ${formatDate(c.birth_date)}` : 'N/A'}</td>
                  </tr>
                ))}
                {safeSpouse.length === 0 && safeChildren.length === 0 && (
                  <tr><td colSpan={3} style={{ ...td, textAlign: 'center', color: '#718096' }}>No family records on file.</td></tr>
                )}
              </tbody>
            </table>
          </section>

          {/* EXEMPLIFICATION HISTORY */}
          <section style={section}>
            <h2 style={sectionLabel}>III. Exemplification History</h2>
            <table style={table}>
              <thead>
                <tr>
                  <th style={tableH}>Date</th>
                  <th style={tableH}>Degree / Milestone</th>
                  <th style={tableH}>Location</th>
                </tr>
              </thead>
              <tbody>
                {sortedDegrees.map((d: any, idx: number) => (
                  <tr key={idx}>
                    <td style={td}>{formatDate(d.degree_date)}</td>
                    <td style={td}>{d.degree_type || 'N/A'}</td>
                    <td style={td}>{d.degree_place || 'N/A'}</td>
                  </tr>
                ))}
                {sortedDegrees.length === 0 && (
                  <tr><td colSpan={3} style={{ ...td, textAlign: 'center', color: '#718096' }}>No exemplification history records on file.</td></tr>
                )}
              </tbody>
            </table>
          </section>

          {/* SERVICE HISTORY */}
          <section style={section}>
            <h2 style={sectionLabel}>IV. Record of Service & Positions</h2>
            <table style={table}>
              <thead>
                <tr>
                  <th style={tableH}>Period</th>
                  <th style={tableH}>Position Title</th>
                  <th style={tableH}>Level</th>
                  <th style={tableH}>Rank</th>
                </tr>
              </thead>
              <tbody>
                {sortedPositions.map((p: any, idx: number) => (
                  <tr key={idx}>
                    <td style={td}>{formatDate(p.date_from)} - {p.date_to ? formatDate(p.date_to) : 'Present'}</td>
                    <td style={td}>{p.position_title || 'N/A'}</td>
                    <td style={td}>{p.level || 'Local'}</td>
                    <td style={td}>{p.rank || 'N/A'}</td>
                  </tr>
                ))}
                {sortedPositions.length === 0 && (
                  <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: '#718096' }}>No position records on file.</td></tr>
                )}
              </tbody>
            </table>
          </section>

          <div style={footer}>
            <p>End of Official Record</p>
            <p style={finePrint}>Generated by KSJI Registrar Suite • {new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>
    </RegistrarShell>
  );
}

const center: React.CSSProperties = { textAlign: 'center', padding: 40, fontSize: 18 };
const container: React.CSSProperties = { maxWidth: 1000, margin: '0 auto', paddingBottom: 60 };
const actions: React.CSSProperties = { display: 'flex', gap: 12, marginBottom: 24 };
const printBtn: React.CSSProperties = { background: '#10233f', color: '#fff', border: 0, padding: '12px 24px', borderRadius: 10, fontWeight: 700, cursor: 'pointer' };
const backBtn: React.CSSProperties = { background: '#fff', border: '1px solid #cfd8e3', padding: '12px 24px', borderRadius: 10, cursor: 'pointer' };

const paper: React.CSSProperties = { background: '#fff', padding: '40px 60px', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' };
const header: React.CSSProperties = { textAlign: 'center', marginBottom: 40, borderBottom: '2px solid #10233f', paddingBottom: 20 };
const topLogo: React.CSSProperties = { fontSize: 12, fontWeight: 800, color: '#d4af37', letterSpacing: '2px', marginBottom: 8 };
const title: React.CSSProperties = { fontSize: 28, margin: 0, color: '#10233f' };
const subtitle: React.CSSProperties = { fontSize: 14, color: '#53657d', margin: '4px 0 0' };

const section: React.CSSProperties = { marginBottom: 40 };
const sectionLabel: React.CSSProperties = { fontSize: 16, color: '#10233f', fontWeight: 800, marginBottom: 12, borderLeft: '4px solid #d4af37', paddingLeft: 12 };
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const th: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#53657d', width: '20%' };
const td: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', border: '1px solid #e2e8f0', color: '#1e293b' };
const tableH: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', background: '#10233f', color: '#fff', border: '1px solid #10233f', fontWeight: 700 };

const footer: React.CSSProperties = { marginTop: 60, textAlign: 'center', color: '#94a3b8', fontSize: 12 };
const finePrint: React.CSSProperties = { marginTop: 4, fontStyle: 'italic' };
