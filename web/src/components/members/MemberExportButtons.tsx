'use client';

import React from 'react';
import { formatDisplayDate } from '@/lib/utils/ksji-logic';

interface MemberExportButtonsProps {
  members: any[];
}

export default function MemberExportButtons({ members }: MemberExportButtonsProps) {
  const downloadCSV = () => {
    if (!members.length) return;

    const headers = [
      'Title',
      'First Name',
      'Surname',
      'Status',
      'Phone',
      'Mobile',
      'Email',
      'Occupation',
      'Latest Position',
      'Date Joined'
    ];

    const rows = members.map(m => {
      const latestPos = (m.positions || []).sort((a: any, b: any) => 
        String(b.date_from || '').localeCompare(String(a.date_from || ''))
      )[0]?.position_title || '—';

      return [
        m.title || '',
        m.first_name || '',
        m.surname || '',
        m.status || 'Active',
        m.phone || '',
        m.mobile || '',
        m.email || '',
        m.occupation || '',
        latestPos,
        m.date_joined ? new Date(m.date_joined).toLocaleDateString() : ''
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `members_list_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print this report.');
      return;
    }

    const rowsHtml = members.map(m => {
      const latestPos = (m.positions || []).sort((a: any, b: any) => 
        String(b.date_from || '').localeCompare(String(a.date_from || ''))
      )[0]?.position_title || '—';

      return `
        <tr>
          <td><strong>${[m.title, m.first_name, m.surname].filter(Boolean).join(' ') || 'Unnamed'}</strong></td>
          <td>${m.status || 'Active'}</td>
          <td>${m.phone || m.mobile || '—'}</td>
          <td>${m.email || '—'}</td>
          <td>${latestPos}</td>
          <td>${m.date_joined ? formatDisplayDate(m.date_joined) : '—'}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>KSJI Member Directory</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #10233f; }
            .report-header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #C9A84C; padding-bottom: 20px; }
            .report-header h1 { text-transform: uppercase; letter-spacing: 2px; margin: 0; font-size: 24px; color: #10233f; }
            .report-header p { color: #C9A84C; font-weight: 700; margin: 5px 0 0 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; padding: 12px; border-bottom: 2px solid #10233f; font-size: 13px; text-transform: uppercase; background: #f1f5f9; }
            td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; }
            .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #64748b; }
            @page { margin: 1.5cm; }
          </style>
        </head>
        <body onload="window.print(); window.onafterprint = function() { window.close(); }">
          <div class="report-header">
            <h1>Knight St. John International</h1>
            <p>Official Member Directory — Generated ${new Date().toLocaleDateString()}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Brother Name</th>
                <th>Status</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Latest Position</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="footer">
            <p>Confidential — For Official KSJI Registrar Use Only</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button 
        onClick={downloadCSV}
        className="btn btn-secondary"
        style={{ padding: '6px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
      >
        📥 Export CSV
      </button>
      <button 
        onClick={handlePrint}
        className="btn btn-primary"
        style={{ padding: '6px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--gold)', color: 'var(--navy)', border: 'none' }}
      >
        🖨️ Print PDF
      </button>
    </div>
  );
}
