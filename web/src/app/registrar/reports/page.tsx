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

  return (
    <RegistrarShell title="Reporting Hub" subtitle="Generate and export official commandery records">
      <div className="card">
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }} className="no-print">
          <button className={`btn-outline ${reportType === 'master' ? 'active' : ''}`} onClick={() => generateReport('master')}>Master Roll</button>
          <button className={`btn-outline ${reportType === 'final' ? 'active' : ''}`} onClick={() => generateReport('final')}>Final Roll (Deceased)</button>
          <button className={`btn-outline ${reportType === 'suspended' ? 'active' : ''}`} onClick={() => generateReport('suspended')}>Suspended List</button>
          <button className={`btn-outline ${reportType === 'dismissed' ? 'active' : ''}`} onClick={() => generateReport('dismissed')}>Dismissed List</button>
          {data.length > 0 && (
            <button className="btn-primary" onClick={handlePrint} style={{ marginLeft: 'auto' }}>🖨️ Print to PDF</button>
          )}
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>Loading report data...</div>
        ) : data.length > 0 ? (
          <div id="report-content">
            <div className="report-header" style={{ textAlign: 'center', marginBottom: 30 }}>
              <h1 style={{ color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: 2 }}>Official Registrar Report</h1>
              <p style={{ color: 'var(--gold)', fontWeight: 700 }}>{reportType?.toUpperCase()} | Generated {new Date().toLocaleDateString()}</p>
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
