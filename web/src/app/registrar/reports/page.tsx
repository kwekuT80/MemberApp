'use client';

import React, { useState } from 'react';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { createClient } from '@/lib/supabase/client';
import { formatDisplayDate } from '@/lib/utils/ksji-logic';

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<string | null>(null);
  const [data, setData] = useState<any[]>([]);
  const supabase = createClient();

  async function generateReport(type: string) {
    setLoading(true);
    setReportType(type);
    
    let query = supabase.from('members').select('*');
    
    if (['el_2nd_3rd', 'el_4th', 'el_5th', 'birthdays'].includes(type)) {
      query = supabase.from('members').select('*, degrees(*), military(*)').eq('status', 'Active');
    } else if (type === 'master') {
      query = query.eq('status', 'Active').order('surname');
    } else if (type === 'final') {
      query = query.eq('status', 'Deceased').order('date_of_death', { ascending: false });
    } else if (type === 'suspended') {
      query = query.eq('status', 'Suspended').order('surname');
    } else if (type === 'dismissed') {
      query = query.eq('status', 'Dismissed').order('surname');
    }

    const { data: res, error } = await query;
    let finalData = res || [];

    if (['el_2nd_3rd', 'el_4th', 'el_5th', 'birthdays'].includes(type)) {
      const now = new Date();
      const currentMonth = now.getMonth();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(now.getFullYear() - 1);
      const threeYearsAgo = new Date();
      threeYearsAgo.setFullYear(now.getFullYear() - 3);
      const tenYearsAgo = new Date();
      tenYearsAgo.setFullYear(now.getFullYear() - 10);
      const fifteenYearsAgo = new Date();
      fifteenYearsAgo.setFullYear(now.getFullYear() - 15);

      finalData = finalData.filter((member: any) => {
        const degrees = member.degrees || [];
        const military = Array.isArray(member.military) ? member.military[0] : member.military;
        
        const has2nd = degrees.some((d: any) => d.degree_type?.toLowerCase().includes('2nd') || d.degree_type?.toLowerCase().includes('second'));
        const has3rd = degrees.some((d: any) => d.degree_type?.toLowerCase().includes('3rd') || d.degree_type?.toLowerCase().includes('third'));
        const has4th = degrees.some((d: any) => d.degree_type?.toLowerCase().includes('4th') || d.degree_type?.toLowerCase().includes('fourth'));
        const has5th = degrees.some((d: any) => d.degree_type?.toLowerCase().includes('5th') || d.degree_type?.toLowerCase().includes('fifth'));

        const firstDegreeObj = degrees.find((d: any) => d.degree_type?.toLowerCase().includes('1st') || d.degree_type?.toLowerCase().includes('first'));
        const firstDegreeDate = firstDegreeObj?.degree_date ? new Date(firstDegreeObj.degree_date) : null;
        
        const uniformDate = military?.first_uniform_use_date ? new Date(military.first_uniform_use_date) : null;
        const joinedDate = member.date_joined ? new Date(member.date_joined) : null;

        if (type === 'el_2nd_3rd') {
          if (!has2nd && !has3rd && firstDegreeDate && firstDegreeDate <= oneYearAgo) return true;
        } else if (type === 'el_4th') {
          if (!has4th && uniformDate && uniformDate <= threeYearsAgo) return true;
        } else if (type === 'el_5th') {
          if (!has5th && ((uniformDate && uniformDate <= tenYearsAgo) || (joinedDate && joinedDate <= fifteenYearsAgo))) return true;
        } else if (type === 'birthdays') {
          if (member.date_of_birth) {
            const dob = new Date(member.date_of_birth);
            if (dob.getMonth() === currentMonth) return true;
          }
        }
        return false;
      });

      if (type === 'birthdays') {
        finalData.sort((a: any, b: any) => new Date(a.date_of_birth).getDate() - new Date(b.date_of_birth).getDate());
      } else {
        finalData.sort((a: any, b: any) => (a.surname || '').localeCompare(b.surname || ''));
      }
    }

    if (!error) setData(finalData);
    setLoading(false);
  }

  // Use formatDisplayDate from ksji-logic

  const downloadCSV = () => {
    if (!data.length) return;
    
    // Create CSV header
    let headers = ['Title', 'First Name', 'Surname', 'Occupation', 'Phone', 'Mobile', 'Email'];
    if (reportType === 'final') {
      headers = ['Title', 'First Name', 'Surname', 'Date of Death', 'Burial Date', 'Burial Place'];
    } else if (reportType === 'birthdays') {
      headers = ['Title', 'First Name', 'Surname', 'Date of Birth', 'Phone', 'Mobile', 'Email'];
    }
    
    // Create CSV rows
    const rows = data.map(m => {
      if (reportType === 'final') return [m.title, m.first_name, m.surname, m.date_of_death, m.burial_date, m.burial_place];
      if (reportType === 'birthdays') return [m.title, m.first_name, m.surname, m.date_of_birth, m.phone, m.mobile, m.email];
      return [m.title, m.first_name, m.surname, m.occupation, m.phone, m.mobile, m.email];
    });

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

  const handlePrint = () => {
    const reportHtml = document.getElementById('report-content')?.innerHTML;
    if (!reportHtml) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>KSJI Official Report - ${reportType}</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #10233f; }
            .report-header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #C9A84C; padding-bottom: 20px; }
            .report-header img { width: 80px; height: 80px; margin-bottom: 15px; }
            .report-header h1 { text-transform: uppercase; letter-spacing: 2px; margin: 0; font-size: 24px; }
            .report-header p { color: #C9A84C; font-weight: 700; margin: 5px 0 0 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; padding: 12px; border-bottom: 2px solid #10233f; font-size: 14px; }
            td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; }
            @page { margin: 2cm; }
          </style>
        </head>
        <body>
          ${reportHtml}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
            { id: 'el_2nd_3rd', label: 'Eligible: 2nd/3rd Degree' },
            { id: 'el_4th', label: 'Eligible: 4th Degree' },
            { id: 'el_5th', label: 'Eligible: 5th Degree' },
            { id: 'birthdays', label: 'Birthdays This Month' },
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
              <p style={{ color: 'var(--gold)', fontWeight: 700, margin: '5px 0 0 0' }}>{reportType?.toUpperCase().replace(/_/g, ' ')} | Generated {formatDisplayDate(new Date().toISOString())}</p>
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
                  ) : reportType === 'birthdays' ? (
                    <>
                      <th style={{ textAlign: 'left', padding: 12 }}>Date of Birth</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>Phone</th>
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
                        <td style={{ padding: 12 }}>{formatDisplayDate(m.date_of_death)}</td>
                        <td style={{ padding: 12 }}>{formatDisplayDate(m.burial_date)}</td>
                      </>
                    ) : reportType === 'birthdays' ? (
                      <>
                        <td style={{ padding: 12 }}>
                          {formatDisplayDate(m.date_of_birth)}
                          {new Date(m.date_of_birth).getDate() === new Date().getDate() && (
                            <span style={{ marginLeft: 8, background: '#e53e3e', color: 'white', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 'bold' }}>TODAY! 🎉</span>
                          )}
                        </td>
                        <td style={{ padding: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {m.phone || m.mobile || '---'}
                            {(m.phone || m.mobile) && (
                              <a 
                                href={`https://wa.me/${(m.phone || m.mobile).replace(/\D/g, '')}?text=Happy Birthday, Brother ${m.surname}! Wishing you God's blessings on your special day. 🎉`}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="no-print"
                                style={{ background: '#25D366', color: 'white', padding: '4px 10px', borderRadius: 100, fontSize: 11, textDecoration: 'none', fontWeight: 'bold' }}
                                title="Send WhatsApp Message"
                              >
                                WhatsApp
                              </a>
                            )}
                          </div>
                        </td>
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
