'use client';

import { useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface PrintViewProps {
  buckets: Array<{ key: string; label: string; members: any[]; totalOutstanding: number }>;
  totalOutstanding: number;
  currentYear: number;
}

export default function DelinquencyPrintView({ buckets, totalOutstanding, currentYear }: PrintViewProps) {
  const printContentRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const handlePrint = () => {
    // Create a new window with styled content for printing
    const printWindow = window.open('', '_blank', 'width=1024,height=768');

    if (!printWindow) {
      alert('Please allow popups to print this report.');
      return;
    }

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>KSJI Delinquency Aging Report - ${currentYear}</title>
  <style>
    @page { margin: 2cm; }

    * { box-sizing: border-box; }

    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      margin: 0;
      padding: 40px;
      color: #1a202c;
      line-height: 1.5;
    }

    .header {
      text-align: center;
      border-bottom: 3px solid #d4af37;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }

    .header h1 {
      font-size: 28px;
      color: #1a365d;
      margin: 0 0 8px 0;
      font-weight: 700;
    }

    .header p {
      margin: 4px 0;
      color: #64748b;
      font-size: 14px;
    }

    .summary-cards {
      display: flex;
      gap: 20px;
      margin-bottom: 30px;
    }

    .card {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
    }

    .card h3 {
      margin: 0 0 8px 0;
      font-size: 14px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .card .count {
      font-size: 32px;
      font-weight: 700;
      color: #dc2626;
    }

    .card .amount {
      font-size: 18px;
      font-weight: 600;
      color: #dc2626;
      margin-top: 4px;
    }

    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }

    .section-header {
      background: linear-gradient(to right, #fef2f2, white);
      padding: 15px 20px;
      border-left: 4px solid #dc2626;
      font-weight: 700;
      color: #1a365d;
      margin-bottom: 0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      page-break-inside: auto;
    }

    th {
      background: #f1f5f9;
      padding: 12px 16px;
      text-align: left;
      font-weight: 600;
      font-size: 13px;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #e2e8f0;
    }

    td {
      padding: 12px 16px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 14px;
    }

    tr:hover { background-color: #fafafa; }

    .balance { text-align: right; color: #dc2626; font-weight: 700; }

    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      color: #94a3b8;
      font-size: 12px;
    }

    @media print {
      body { padding: 0; margin: 0; }
      .section { page-break-inside: avoid; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body onload="window.print()">
  <div id="print-content">
    <div class="header">
      <h1>KSJI Delinquency Aging Report</h1>
      <p>${currentYear} Assessment Year</p>
      <p>Generated on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>

    <div class="summary-cards">
      <div class="card">
        <h3>Total Members</h3>
        <div class="count">${buckets.reduce((sum, b) => sum + b.members.length, 0)}</div>
      </div>
      <div class="card">
        <h3>Total Outstanding</h3>
        <div class="amount">GH¢ ${totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      </div>
    </div>

    ${buckets.map(bucket => `
      <div class="section">
        <h2 class="section-header">${bucket.label} — ${bucket.members.length} members</h2>
        <table>
          <thead>
            <tr>
              <th>Member Name</th>
              <th>Contact</th>
              <th style="text-align: right">Outstanding Balance</th>
            </tr>
          </thead>
          <tbody>
            ${bucket.members.map(m => `
              <tr>
                <td><strong>${m.full_name}</strong></td>
                <td>${m.phone_number || 'N/A'}${m.email ? ' • ' + m.email : ''}</td>
                <td class="balance">GH¢ ${parseFloat(m.outstanding_balance || 0).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `).join('\n\n')}

    <div class="footer">
      <p>Knight St. John International — Registrar Financial System</p>
      <p>This report is confidential and intended for official use only.</p>
    </div>
  </div>
</body>
</html>`;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const downloadCSV = () => {
    const allMembers = buckets.flatMap(b => 
      b.members.map(m => ({
        bucketLabel: b.label,
        fullName: m.full_name,
        phone: m.phone_number || 'N/A',
        email: m.email || 'N/A',
        outstanding: parseFloat(m.outstanding_balance || 0).toFixed(2)
      }))
    );

    if (!allMembers.length) {
      alert('No delinquent records to export.');
      return;
    }

    const headers = ['Severity Bucket', 'Brother\'s Name', 'Phone Number', 'Email', 'Outstanding Balance (₵)'];
    
    const rows = allMembers.map(m => [
      m.bucketLabel,
      m.fullName,
      m.phone,
      m.email,
      m.outstanding
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `delinquent_members_${currentYear}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Auto-trigger print when window opens
  useEffect(() => {
    return () => {};
  }, []);

  const fmt = (n: number) => `GH¢ ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="flex gap-3 no-print" style={{ display: 'flex', gap: 12 }}>
      <button
        onClick={handlePrint}
        style={{ background: '#10233f', color: 'white', border: 'none', padding: '14px 28px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 16 }}
      >
        📄 Print PDF Report
      </button>
      <button
        onClick={downloadCSV}
        style={{ background: '#f8fafc', color: '#10233f', border: '1px solid #cbd5e1', padding: '14px 28px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 16 }}
      >
        📥 Download CSV
      </button>
    </div>
  );
}
