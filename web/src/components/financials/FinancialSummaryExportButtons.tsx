'use client';

import React from 'react';

interface SummaryMember {
  id: string;
  full_name: string;
  phone_number?: string;
  email?: string;
  total_assessed: string | number;
  total_paid: string | number;
  outstanding_balance: string | number;
  payment_status: string;
}

interface FinancialSummaryExportButtonsProps {
  summaries: SummaryMember[];
  totalAssessed: number;
  totalPaid: number;
  totalOutstanding: number;
  delinquentCount: number;
  collectionRate: number;
}

export default function FinancialSummaryExportButtons({
  summaries,
  totalAssessed,
  totalPaid,
  totalOutstanding,
  delinquentCount,
  collectionRate
}: FinancialSummaryExportButtonsProps) {
  const downloadCSV = () => {
    if (!summaries.length) return;

    const headers = [
      'Brother\'s Name',
      'Phone Number',
      'Email',
      'Total Assessed (₵)',
      'Total Paid (₵)',
      'Outstanding Balance (₵)',
      'Payment Status'
    ];

    const rows = summaries.map(m => [
      m.full_name || '',
      m.phone_number || '',
      m.email || '',
      parseFloat(m.total_assessed as string || '0').toFixed(2),
      parseFloat(m.total_paid as string || '0').toFixed(2),
      parseFloat(m.outstanding_balance as string || '0').toFixed(2),
      m.payment_status === 'paid' ? 'Fully Paid' : m.payment_status === 'partially_paid' ? 'Partially Paid' : 'Delinquent'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `financial_summaries_${new Date().toISOString().split('T')[0]}.csv`);
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

    const rowsHtml = summaries.map(m => {
      const balance = parseFloat(m.outstanding_balance as string || '0');
      const statusLabel = m.payment_status === 'paid' ? 'Fully Paid' : m.payment_status === 'partially_paid' ? 'Partially Paid' : 'Delinquent';
      const statusColor = m.payment_status === 'paid' ? '#16a34a' : m.payment_status === 'partially_paid' ? '#d97706' : '#dc2626';

      return `
        <tr>
          <td>
            <strong>${m.full_name}</strong>
            <div style="font-size: 9px; color: #64748b; margin-top: 2px;">ID: ${m.id.substring(0, 8).toUpperCase()}</div>
          </td>
          <td>${m.phone_number || '—'}<br/><span style="font-size: 11px; color: #64748b;">${m.email || '—'}</span></td>
          <td style="text-align: right; font-weight: 600;">₵${parseFloat(m.total_assessed as string || '0').toFixed(2)}</td>
          <td style="text-align: right; font-weight: 600; color: #16a34a;">₵${parseFloat(m.total_paid as string || '0').toFixed(2)}</td>
          <td style="text-align: right; font-weight: 700; color: ${balance > 0 ? '#d97706' : '#16a34a'};">₵${balance.toFixed(2)}</td>
          <td style="text-align: center;"><span style="color: ${statusColor}; font-weight: 700;">${statusLabel}</span></td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>KSJI Member Financial Summaries</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #10233f; }
            .report-header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #C9A84C; padding-bottom: 20px; }
            .report-header h1 { text-transform: uppercase; letter-spacing: 2px; margin: 0; font-size: 24px; color: #10233f; }
            .report-header p { color: #C9A84C; font-weight: 700; margin: 5px 0 0 0; }
            
            .summary-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; text-align: center; }
            .card h3 { margin: 0 0 5px; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
            .card .val { font-size: 18px; font-weight: 700; color: #10233f; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; padding: 10px; border-bottom: 2px solid #10233f; font-size: 12px; text-transform: uppercase; background: #f1f5f9; }
            td { padding: 10px; border-bottom: 1px solid #eee; font-size: 12px; }
            .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #64748b; }
            @page { margin: 1.5cm; }
          </style>
        </head>
        <body onload="window.print(); window.onafterprint = function() { window.close(); }">
          <div class="report-header">
            <h1>Knight St. John International</h1>
            <p>Member Financial Summaries — Generated ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div class="summary-cards">
            <div class="card">
              <h3>Total Assessed</h3>
              <div class="val">₵${totalAssessed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div class="card">
              <h3>Total Collected (${collectionRate.toFixed(1)}%)</h3>
              <div class="val" style="color: #16a34a;">₵${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div class="card">
              <h3>Outstanding</h3>
              <div class="val" style="color: #d97706;">₵${totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div class="card">
              <h3>Delinquent Members</h3>
              <div class="val" style="color: #dc2626;">${delinquentCount}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Brother Name</th>
                <th>Contact Info</th>
                <th style="text-align: right">Assessed</th>
                <th style="text-align: right">Paid</th>
                <th style="text-align: right">Outstanding</th>
                <th style="text-align: center">Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="footer">
            <p>Confidential — For Official KSJI Financial Registrar Use Only</p>
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
        style={{ padding: '8px 16px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
      >
        📥 Download CSV
      </button>
      <button 
        onClick={handlePrint}
        className="btn btn-primary"
        style={{ padding: '8px 16px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--gold)', color: 'var(--navy)', border: 'none' }}
      >
        🖨️ Print Financial Statement
      </button>
    </div>
  );
}
