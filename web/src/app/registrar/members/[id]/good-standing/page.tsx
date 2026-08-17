'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import RegistrarShell from '@/components/layout/RegistrarShell';
import StandingCertificateCard from '@/components/reports/StandingCertificateCard';
import { getMemberPersonalReport, PersonalReportData } from '@/services/memberService';
import { formatMemberTitle } from '@/lib/utils/ksji-logic';

export default function MemberGoodStandingPage() {
  const { id } = useParams();
  const router = useRouter();
  const [report, setReport] = useState<PersonalReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const data = await getMemberPersonalReport(id as string);
        setReport(data);
      } catch (err) {
        console.error('Failed to load good standing report:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <RegistrarShell title="Generating Statement..." subtitle="Compiling personal good standing records.">
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B', fontSize: 16, fontWeight: 700 }}>
          ⏳ Loading member standing, dues assessment & attendance records...
        </div>
      </RegistrarShell>
    );
  }

  if (!report) {
    return (
      <RegistrarShell title="Record Not Found" subtitle="Could not generate standing statement.">
        <div style={{ maxWidth: 600, margin: '40px auto', textAlign: 'center', background: 'white', padding: 32, borderRadius: 16, border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>Member Record Not Found</h2>
          <p style={{ fontSize: 14, color: '#64748B', marginBottom: 20 }}>
            Unable to compile the Good Standing report for the requested member ID.
          </p>
          <button
            onClick={() => router.back()}
            style={{
              background: '#0F172A',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: 8,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            ← Go Back
          </button>
        </div>
      </RegistrarShell>
    );
  }

  const { member } = report;
  const displayTitle = formatMemberTitle(member.title);

  return (
    <RegistrarShell
      title="Personal Good Standing Statement"
      subtitle={`Official audit and standing record for ${displayTitle} ${member.first_name} ${member.surname}`}
    >
      <div style={{ maxWidth: 960, margin: '0 auto', paddingBottom: 60 }}>
        {/* Navigation & Action Bar */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link
              href="/registrar/members"
              style={{ textDecoration: 'none', color: '#475569', fontWeight: 700, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              ← Member Directory
            </Link>
            <span style={{ color: '#CBD5E1' }}>•</span>
            <Link
              href={`/registrar/members/${id}`}
              style={{ textDecoration: 'none', color: '#2563EB', fontWeight: 700, fontSize: 13 }}
            >
              View Profile
            </Link>
            <span style={{ color: '#CBD5E1' }}>•</span>
            <Link
              href={`/registrar/members/${id}/dossier`}
              style={{ textDecoration: 'none', color: '#2563EB', fontWeight: 700, fontSize: 13 }}
            >
              Master Dossier
            </Link>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <Link
              href="/registrar/reports/good-standing"
              style={{
                background: '#FFFFFF',
                color: '#0F172A',
                border: '1px solid #CBD5E1',
                padding: '9px 16px',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <span>📋</span> Batch Generator
            </Link>

            <button
              onClick={() => window.print()}
              style={{
                background: '#0F172A',
                color: '#FFFFFF',
                border: 'none',
                padding: '9px 18px',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 6px rgba(15,23,42,0.15)'
              }}
            >
              <span>🖨️</span> Print Official Statement
            </button>
          </div>
        </div>

        {/* Certificate Card Component */}
        <StandingCertificateCard report={report} />
      </div>
    </RegistrarShell>
  );
}
