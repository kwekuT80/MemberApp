'use client';

import React, { useState } from 'react';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { createClient } from '@/lib/supabase/client';

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<string | null>(null);
  const [data, setData] = useState<any[]>([]);
  const supabase = createClient();

  async function generateReport(type: string) {
    setLoading(true);
    setReportType(type);
    let query = supabase.from('members').select('*');

    if (type === 'master') {
      query = query.eq('status', 'Active').order('surname');
    } else if (type === 'final') {
      query = query.eq('status', 'Deceased').order('date_of_death', { ascending: false });
    } else if (type === 'suspended') {
      query = query.eq('status', 'Suspended').order('surname');
    } else if (type === 'dismissed') {
      query = query.eq('status', 'Dismissed').order('surname');
    }

    const { data: res, error } = await query;
    if (!error) setData(res || []);
    setLoading(false);
  }

  const handlePrint = () => {
    window.print();
  };

  const downloadCSV = () => {
    if (!data.length) return;
    
    // Create CSV header
    const headers = reportType === 'final' 
      ? ['Title', 'First Name', 'Surname', 'Date of Death', 'Burial Date', 'Burial Place']
      : ['Title', 'First Name', 'Surname', 'Occupation', 'Phone', 'Mobile', 'Email'];
    
    // Create CSV rows
    const rows = data.map(m => reportType === 'final' 
      ? [m.title, m.first_name, m.surname, m.date_of_death, m.burial_date, m.burial_place]
      : [m.title, m.first_name, m.surname, m.occupation, m.phone, m.mobile, m.email]
    );

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <RegistrarShell title="Reporting Hub" subtitle="Generate and export official commandery records">
      <div className="card">
        <div style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap' }} className="no-print">
          {[
            { id: 'master', label: 'Master Roll' },
            { id: 'final', label: 'Final Roll (Deceased)' },
            { id: 'suspended', label: 'Suspended List' },
            { id: 'dismissed', label: 'Dismissed List' },
          ].map((type) => (
            <button 
              key={type.id}
              onClick={() => generateReport(type.id)}
              style={{
                background: reportType === type.id ? 'var(--navy)' : 'transparent',
                color: reportType === type.id ? 'var(--gold)' : 'var(--navy)',
                border: reportType === type.id ? '2px solid var(--navy)' : '2px solid #eee',
                padding: '10px 20px',
                borderRadius: 100,
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {type.label}
            </button>
          ))}
          {data.length > 0 && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
              <button 
                onClick={downloadCSV}
                style={{
                  background: '#f8fafc',
                  color: 'var(--navy)',
                  border: '2px solid #eee',
                  padding: '10px 24px',
                  borderRadius: 100,
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                📥 Download CSV
              </button>
              <button 
                onClick={handlePrint}
                style={{
                  background: 'var(--gold)',
                  color: 'var(--navy)',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: 100,
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)'
                }}
              >
                🖨️ Print Official PDF
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>Loading report data...</div>
        ) : data.length > 0 ? (
          <div id="report-content">
            <div className="report-header" style={{ textAlign: 'center', marginBottom: 40, borderBottom: '3px solid var(--gold)', paddingBottom: 20 }}>
              <img src="/logo.png" alt="KSJI Logo" style={{ width: 80, height: 80, marginBottom: 15, objectFit: 'contain' }} />
              <h1 style={{ color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: 2, margin: 0 }}>Official Registrar Report</h1>
              <p style={{ color: 'var(--gold)', fontWeight: 700, margin: '5px 0 0 0' }}>{reportType?.toUpperCase()} | Generated {new Date().toLocaleDateString()}</p>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--navy)' }}>
                  <th style={{ textAlign: 'left', padding: 12 }}>Name</th>
                  {reportType === 'final' ? (
                    <>
                      <th style={{ textAlign: 'left', padding: 12 }}>Died</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>Burial</th>
                    </>
                  ) : (
                    <>
                      <th style={{ textAlign: 'left', padding: 12 }}>Occupation</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>Phone</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.map((m) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: 12, fontWeight: 600 }}>{m.title} {m.first_name} {m.surname}</td>
                    {reportType === 'final' ? (
                      <>
                        <td style={{ padding: 12 }}>{m.date_of_death || '---'}</td>
                        <td style={{ padding: 12 }}>{m.burial_date || '---'}</td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: 12 }}>{m.occupation || '---'}</td>
                        <td style={{ padding: 12 }}>{m.phone || m.mobile || '---'}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: 60, textAlign: 'center', color: '#666' }}>
            Select a report type above to preview data.
          </div>
        )}
      </div>
    </RegistrarShell>
  );
}
