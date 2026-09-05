'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isSystemMember, sanitizePhoneNumber, getPhoneQueryVariants } from '@/lib/utils/ksji-logic';

type ImportType = 'assessments' | 'payments' | 'welfare' | 'members';

interface ParsedRow {
  index: number;
  raw: Record<string, string>;
  memberId: string | null;
  memberName: string | null;
  year?: number;
  month?: string;
  amount?: number;
  arrearsBf?: number;
  assessment?: number;
  paymentDate?: string;
  paymentMethod?: string;
  referenceNo?: string;
  isValid: boolean;
  validationError?: string;
}

export default function ImportClient() {
  const supabase = createClient();
  const [importType, setImportType] = useState<ImportType>('assessments');
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<{ success: number; failed: number; logs: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load living members for fuzzy/exact matching
  useEffect(() => {
    async function loadMembers() {
      setLoadingMembers(true);
      const { data, error } = await supabase
        .from('members')
        .select('id, first_name, surname, other_names, title, phone, mobile, email, status, is_deceased')
        .not('status', 'in', '("Dismissed","Transfer-Out","Deceased","System")')
        .neq('id', 'f0000000-0000-0000-0000-000000000000')
        .order('surname', { ascending: true });

      if (!error && data) {
        setMembers(data.filter(m => !isSystemMember(m) && !m.is_deceased));
      }
      setLoadingMembers(false);
    }
    loadMembers();
  }, [supabase]);

  // Match identifier to a brother in the registry
  const matchMember = (identifier: string): any | null => {
    if (!identifier) return null;
    const cleanId = String(identifier).trim().toLowerCase();

    // 1. Exact UUID match
    const uuidMatch = members.find(m => m.id.toLowerCase() === cleanId);
    if (uuidMatch) return uuidMatch;

    // 2. Phone match using sanitized variants
    const phoneVariants = getPhoneQueryVariants(cleanId);
    if (phoneVariants.length > 0) {
      const phoneMatch = members.find(m => {
        const mPhone = sanitizePhoneNumber(m.phone);
        const mMobile = sanitizePhoneNumber(m.mobile);
        return phoneVariants.some(v => v === mPhone || v === mMobile);
      });
      if (phoneMatch) return phoneMatch;
    }

    // 3. Email match
    const emailMatch = members.find(m => m.email && m.email.trim().toLowerCase() === cleanId);
    if (emailMatch) return emailMatch;

    // 4. Exact full name match (first + surname or surname + first)
    const nameMatch = members.find(m => {
      const f1 = `${m.first_name || ''} ${m.surname || ''}`.trim().toLowerCase();
      const f2 = `${m.surname || ''} ${m.first_name || ''}`.trim().toLowerCase();
      const f3 = `${m.title || ''} ${m.first_name || ''} ${m.surname || ''}`.trim().toLowerCase();
      return f1 === cleanId || f2 === cleanId || f3 === cleanId;
    });
    if (nameMatch) return nameMatch;

    // 5. Fuzzy match: contains surname and first name
    const fuzzy = members.find(m => {
      const s = (m.surname || '').toLowerCase().trim();
      const f = (m.first_name || '').toLowerCase().trim();
      return (s && cleanId.includes(s)) && (f && cleanId.includes(f));
    });
    if (fuzzy) return fuzzy;

    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      parseCsv(e.target.files[0], importType);
    }
  };

  const parseCsv = (fileToParse: File, type: ImportType) => {
    setParsing(true);
    setError(null);
    setResults(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) {
          setError('CSV file must have a header row and at least one data row.');
          setParsing(false);
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[\s_-]/g, ''));
        const rows: ParsedRow[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const raw: Record<string, string> = {};
          headers.forEach((h, idx) => {
            raw[h] = values[idx] || '';
          });

          const rowData = processRow(raw, type, i);
          rows.push(rowData);
        }

        setParsedRows(rows);
      } catch (err: any) {
        setError(`Failed to parse CSV: ${err.message}`);
      } finally {
        setParsing(false);
      }
    };
    reader.onerror = () => {
      setError('Could not read file.');
      setParsing(false);
    };
    reader.readAsText(fileToParse);
  };

  const processRow = (raw: Record<string, string>, type: ImportType, index: number): ParsedRow => {
    if (type === 'members') {
      const surname = raw['surname'] || raw['lastname'] || '';
      const firstName = raw['firstname'] || raw['first'] || '';
      const isValid = Boolean(surname && firstName);
      return {
        index,
        raw,
        memberId: null,
        memberName: isValid ? `${firstName} ${surname}` : null,
        isValid,
        validationError: isValid ? undefined : 'Missing First Name or Surname'
      };
    }

    // For assessments, payments, and welfare: find the member
    const identifier = raw['member'] || raw['membername'] || raw['name'] || raw['phone'] || raw['email'] || raw['memberid'] || raw['id'] || '';
    const matched = matchMember(identifier);

    if (type === 'assessments') {
      const year = parseInt(raw['year'] || raw['assessmentyear'] || new Date().getFullYear().toString(), 10);
      const assessment = parseFloat(raw['annualassessment'] || raw['assessment'] || raw['annual'] || '0');
      const arrearsBf = parseFloat(raw['arrearsbroughtforward'] || raw['arrearsbf'] || raw['arrears'] || '0');
      const isValid = Boolean(matched && !isNaN(year) && year >= 1990 && !isNaN(assessment));

      return {
        index,
        raw,
        memberId: matched?.id || null,
        memberName: matched ? `${matched.title ? matched.title + ' ' : ''}${matched.first_name} ${matched.surname}` : `Unmatched: "${identifier}"`,
        year,
        assessment,
        arrearsBf,
        isValid,
        validationError: !matched ? `Brother "${identifier}" not found in Commandery roll` : isNaN(year) ? 'Invalid Year' : undefined
      };
    }

    if (type === 'payments') {
      const year = parseInt(raw['year'] || raw['assessmentyear'] || new Date().getFullYear().toString(), 10);
      const amount = parseFloat(raw['amount'] || raw['paid'] || '0');
      const paymentDate = raw['paymentdate'] || raw['date'] || new Date().toISOString().split('T')[0];
      const month = raw['month'] || raw['period'] || undefined;
      const isValid = Boolean(matched && !isNaN(year) && !isNaN(amount) && amount > 0);

      return {
        index,
        raw,
        memberId: matched?.id || null,
        memberName: matched ? `${matched.title ? matched.title + ' ' : ''}${matched.first_name} ${matched.surname}` : `Unmatched: "${identifier}"`,
        year,
        amount,
        paymentDate,
        month,
        isValid,
        validationError: !matched ? `Brother "${identifier}" not found in Commandery roll` : isNaN(amount) || amount <= 0 ? 'Invalid Amount' : undefined
      };
    }

    if (type === 'welfare') {
      const year = parseInt(raw['year'] || raw['periodyear'] || new Date().getFullYear().toString(), 10);
      const monthNum = parseInt(raw['month'] || raw['periodmonth'] || '1', 10);
      const amount = parseFloat(raw['amount'] || raw['paid'] || '25');
      const paymentDate = raw['paymentdate'] || raw['date'] || new Date().toISOString().split('T')[0];
      const paymentMethod = raw['paymentmethod'] || raw['method'] || 'cash';
      const referenceNo = raw['referenceno'] || raw['reference'] || raw['receipt'] || `IMPORT-${year}`;
      const isValid = Boolean(matched && !isNaN(year) && !isNaN(amount) && amount > 0);

      return {
        index,
        raw,
        memberId: matched?.id || null,
        memberName: matched ? `${matched.title ? matched.title + ' ' : ''}${matched.first_name} ${matched.surname}` : `Unmatched: "${identifier}"`,
        year,
        month: monthNum.toString(),
        amount,
        paymentDate,
        paymentMethod,
        referenceNo,
        isValid,
        validationError: !matched ? `Brother "${identifier}" not found in Commandery roll` : isNaN(amount) || amount <= 0 ? 'Invalid Amount' : undefined
      };
    }

    return { index, raw, memberId: null, memberName: null, isValid: false };
  };

  const executeImport = async () => {
    if (parsedRows.length === 0) return;
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      setError('No valid rows to import. Please resolve the errors highlighted below.');
      return;
    }

    setImporting(true);
    setProgress({ current: 0, total: validRows.length });
    const logs: string[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      setProgress({ current: i + 1, total: validRows.length });

      try {
        if (importType === 'assessments') {
          const { error: insErr } = await supabase
            .from('financial_assessments')
            .upsert({
              member_id: row.memberId,
              year: row.year,
              annual_assessment: row.assessment,
              arrears_brought_forward: row.arrearsBf
            }, { onConflict: 'member_id,year' });

          if (insErr) throw insErr;
          logs.push(`✓ Row ${row.index}: Saved ${row.year} assessment for ${row.memberName} (Assessment: GH¢ ${row.assessment}, Arrears B/F: GH¢ ${row.arrearsBf})`);
          successCount++;
        } else if (importType === 'payments') {
          const { error: insErr } = await supabase
            .from('financial_payments')
            .insert([{
              member_id: row.memberId,
              assessment_year: row.year,
              amount: row.amount,
              payment_date: row.paymentDate ? new Date(row.paymentDate).toISOString() : new Date().toISOString(),
              month: row.month || null
            }]);

          if (insErr) throw insErr;
          logs.push(`✓ Row ${row.index}: Recorded GH¢ ${row.amount} dues payment for ${row.memberName} (Year ${row.year})`);
          successCount++;
        } else if (importType === 'welfare') {
          const { error: insErr } = await supabase
            .from('welfare_contributions')
            .insert([{
              member_id: row.memberId,
              amount: row.amount,
              payment_date: row.paymentDate || new Date().toISOString().split('T')[0],
              period_year: row.year,
              period_month: parseInt(row.month || '1', 10),
              payment_method: row.paymentMethod || 'cash',
              reference_no: row.referenceNo || 'HISTORICAL-IMPORT'
            }]);

          if (insErr) throw insErr;
          logs.push(`✓ Row ${row.index}: Recorded GH¢ ${row.amount} welfare contribution for ${row.memberName} (${row.year} Month ${row.month})`);
          successCount++;
        } else if (importType === 'members') {
          const { error: insErr } = await supabase
            .from('members')
            .insert([{
              surname: row.raw['surname'] || '',
              first_name: row.raw['firstname'] || '',
              other_names: row.raw['othernames'] || null,
              title: row.raw['title'] || 'Bro.',
              occupation: row.raw['occupation'] || null,
              phone: sanitizePhoneNumber(row.raw['phone']) || null,
              email: row.raw['email'] ? row.raw['email'].trim().toLowerCase() : null,
              status: 'Active',
              commandery_id: 'b31c4884-9518-4fdf-bc55-98e3425189cc'
            }]);

          if (insErr) throw insErr;
          logs.push(`✓ Row ${row.index}: Onboarded member ${row.memberName}`);
          successCount++;
        }
      } catch (err: any) {
        failedCount++;
        logs.push(`❌ Row ${row.index} (${row.memberName || 'Unknown'}): ${err.message}`);
      }
    }

    setResults({ success: successCount, failed: failedCount, logs });
    setImporting(false);
  };

  // Download Sample Template CSV
  const downloadSampleCsv = () => {
    let content = '';
    let filename = '';

    if (importType === 'assessments') {
      filename = 'sample_annual_assessments_template.csv';
      content = `Year,Member,Annual Assessment,Arrears B/F
2025,Bro. Henry Adotey,1050,0
2025,Bro. Randolf Adu-Gyamfi,1050,-150
2024,N/B Paul Amati,950,50
2024,Bro. Lancelot Laryea,950,0`;
    } else if (importType === 'payments') {
      filename = 'sample_dues_payments_template.csv';
      content = `Year,Member,Amount,Payment Date,Month
2025,Bro. Henry Adotey,500,2025-03-15,March
2025,Bro. Randolf Adu-Gyamfi,1050,2025-06-20,June
2024,Bro. Lancelot Laryea,950,2024-05-10,Annual Payment`;
    } else if (importType === 'welfare') {
      filename = 'sample_welfare_contributions_template.csv';
      content = `Year,Month,Member,Amount,Payment Date,Payment Method,Reference No
2025,1,Bro. Henry Adotey,25,2025-01-15,momo,MOMO-REF-01
2025,2,Bro. Henry Adotey,25,2025-02-15,cash,CASH-RECEIPT
2024,1,Bro. Lancelot Laryea,25,2024-01-10,bank_transfer,BNK-4421`;
    } else {
      filename = 'sample_new_members_template.csv';
      content = `surname,first_name,other_names,title,phone,email,occupation
Mensah,Kwame,Ebenezer,Bro.,0244123456,kwame@example.com,Accountant
Quaye,Joseph,Nii,Bro.,0501234567,joseph@example.com,Engineer`;
    }

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <div style={{ maxWidth: 1050, margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      
      {/* ── Type Switcher Tabs ── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
        {[
          { id: 'assessments', label: '📑 Annual Dues Assessments', desc: 'Upload historical annual assessments & arrears B/F' },
          { id: 'payments', label: '💳 Dues Payments Ledger', desc: 'Upload historical dues payments by year & date' },
          { id: 'welfare', label: '🤝 Welfare Fund Contributions', desc: 'Upload historical welfare payments & receipts' },
          { id: 'members', label: '👥 Member Roster', desc: 'Onboard new members to Commandery #500' }
        ].map(tab => {
          const isActive = importType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setImportType(tab.id as ImportType);
                setFile(null);
                setParsedRows([]);
                setResults(null);
                setError(null);
              }}
              style={{
                flex: '1 1 200px',
                textAlign: 'left',
                padding: '16px 20px',
                borderRadius: 14,
                border: isActive ? '2px solid var(--gold, #C9A84C)' : '1px solid #E2E8F0',
                background: isActive ? '#0F172A' : '#FFFFFF',
                color: isActive ? '#FFFFFF' : '#1E293B',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isActive ? '0 8px 20px rgba(15, 23, 42, 0.25)' : 'none'
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 15, color: isActive ? '#FDE047' : '#0F172A' }}>
                {tab.label}
              </div>
              <div style={{ fontSize: 12, marginTop: 4, color: isActive ? '#94A3B8' : '#64748B' }}>
                {tab.desc}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Instructions & Template Downloader ── */}
      <div style={{
        background: '#F8FAFC',
        border: '1px solid #E2E8F0',
        borderRadius: 16,
        padding: '24px 28px',
        marginBottom: 24,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 20
      }}>
        <div style={{ maxWidth: 650 }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: 18, color: '#0F172A', fontWeight: 800 }}>
            {importType === 'assessments' && 'Historical Annual Dues Assessments Uploader'}
            {importType === 'payments' && 'Historical Dues Payments Ledger Uploader'}
            {importType === 'welfare' && 'Historical Welfare Fund Contributions Uploader'}
            {importType === 'members' && 'Bulk Member Roster Onboarding'}
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
            {importType === 'assessments' && 'Upload past years (e.g. 2021–2025). The system matches brothers by Full Name, Phone, or Email, and sets both Annual Dues and Arrears B/F.'}
            {importType === 'payments' && 'Upload past payments for any assessment year. Payments are immediately credited to the brother’s digitized ledger and reflected on his personal portal.'}
            {importType === 'welfare' && 'Upload monthly welfare subscriptions. Populates subscriber history, welfare compliance metrics, and member standing.'}
            {importType === 'members' && 'Add new brothers to Commandery #500. Automatically assigns Commandery ID and active standing.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={downloadSampleCsv}
            style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              padding: '10px 18px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              color: '#1E293B',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            📥 Download Sample CSV
          </button>

          <a
            href="/api/export/members"
            style={{
              background: '#10B981',
              color: '#FFFFFF',
              padding: '10px 18px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)'
            }}
          >
            📤 Export Active Members CSV
          </a>
        </div>
      </div>

      {/* ── File Upload Box ── */}
      <div style={{
        background: '#FFFFFF',
        border: '2px dashed #CBD5E1',
        borderRadius: 16,
        padding: '32px 24px',
        textAlign: 'center',
        marginBottom: 24
      }}>
        <input
          type="file"
          accept=".csv"
          id="csv-file-upload"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <label
          htmlFor="csv-file-upload"
          style={{
            background: '#0F172A',
            color: '#FFFFFF',
            padding: '12px 28px',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 800,
            cursor: 'pointer',
            display: 'inline-block',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)'
          }}
        >
          📂 Select CSV Spreadsheet
        </label>
        {file && (
          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: '#10B981' }}>
            ✓ Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </div>
        )}
      </div>

      {error && (
        <div style={{
          background: '#FEF2F2',
          border: '1px solid #FCA5A5',
          borderRadius: 12,
          padding: '14px 18px',
          color: '#991B1B',
          fontSize: 13,
          fontWeight: 700,
          marginBottom: 24
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Parsed Data Preview Table ── */}
      {parsedRows.length > 0 && (
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, color: '#0F172A', fontWeight: 800 }}>
                Data Validation & Preview ({parsedRows.length} rows)
              </h3>
              <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
                <span style={{ color: '#10B981', fontWeight: 700 }}>✓ {validCount} valid & ready to import</span>
                {invalidCount > 0 && <span style={{ color: '#EF4444', fontWeight: 700, marginLeft: 12 }}>⚠️ {invalidCount} unmatched / invalid</span>}
              </div>
            </div>

            <button
              onClick={executeImport}
              disabled={importing || validCount === 0}
              style={{
                background: validCount > 0 ? '#0F172A' : '#94A3B8',
                color: '#FFFFFF',
                border: 'none',
                padding: '12px 32px',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 900,
                cursor: validCount > 0 ? 'pointer' : 'not-allowed',
                boxShadow: validCount > 0 ? '0 4px 14px rgba(15, 23, 42, 0.3)' : 'none'
              }}
            >
              {importing ? `Importing ${progress.current} / ${progress.total}...` : `⚡ Execute Import (${validCount} Records)`}
            </button>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto', maxHeight: 400, borderRadius: 8, border: '1px solid #E2E8F0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px', width: 50 }}>#</th>
                  <th style={{ padding: '10px 14px' }}>Brother / Member Match</th>
                  {importType === 'assessments' && (
                    <>
                      <th style={{ padding: '10px 14px' }}>Year</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Annual Assessment</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Arrears B/F</th>
                    </>
                  )}
                  {importType === 'payments' && (
                    <>
                      <th style={{ padding: '10px 14px' }}>Assessment Year</th>
                      <th style={{ padding: '10px 14px' }}>Date</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Amount</th>
                    </>
                  )}
                  {importType === 'welfare' && (
                    <>
                      <th style={{ padding: '10px 14px' }}>Period</th>
                      <th style={{ padding: '10px 14px' }}>Date</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Amount</th>
                    </>
                  )}
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.map((row) => (
                  <tr key={row.index} style={{ borderBottom: '1px solid #F1F5F9', background: row.isValid ? '#FFFFFF' : '#FFF5F5' }}>
                    <td style={{ padding: '10px 14px', color: '#94A3B8', fontWeight: 600 }}>{row.index}</td>
                    <td style={{ padding: '10px 14px' }}>
                      {row.isValid ? (
                        <div style={{ fontWeight: 700, color: '#0F172A' }}>
                          ✓ {row.memberName}
                        </div>
                      ) : (
                        <div>
                          <div style={{ color: '#EF4444', fontWeight: 700 }}>⚠️ {row.memberName || 'Unmatched'}</div>
                          <div style={{ fontSize: 11, color: '#DC2626' }}>{row.validationError}</div>
                        </div>
                      )}
                    </td>

                    {importType === 'assessments' && (
                      <>
                        <td style={{ padding: '10px 14px', fontWeight: 800 }}>{row.year}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                          GH¢ {Number(row.assessment || 0).toFixed(2)}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: (row.arrearsBf || 0) < 0 ? '#10B981' : (row.arrearsBf || 0) > 0 ? '#F59E0B' : '#64748B' }}>
                          GH¢ {Number(row.arrearsBf || 0).toFixed(2)}
                        </td>
                      </>
                    )}

                    {importType === 'payments' && (
                      <>
                        <td style={{ padding: '10px 14px', fontWeight: 800 }}>{row.year}</td>
                        <td style={{ padding: '10px 14px', color: '#64748B' }}>{row.paymentDate}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#10B981' }}>
                          GH¢ {Number(row.amount || 0).toFixed(2)}
                        </td>
                      </>
                    )}

                    {importType === 'welfare' && (
                      <>
                        <td style={{ padding: '10px 14px', fontWeight: 800 }}>{row.year} Month {row.month}</td>
                        <td style={{ padding: '10px 14px', color: '#64748B' }}>{row.paymentDate}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#8B5CF6' }}>
                          GH¢ {Number(row.amount || 0).toFixed(2)}
                        </td>
                      </>
                    )}

                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      {row.isValid ? (
                        <span style={{ background: '#DCFCE7', color: '#166534', padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 800 }}>
                          Ready
                        </span>
                      ) : (
                        <span style={{ background: '#FEE2E2', color: '#991B1B', padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 800 }}>
                          Skip
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Import Execution Results Log ── */}
      {results && (
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 4px 16px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 18, color: '#0F172A', fontWeight: 800 }}>
              Import Results: {results.success} Succeeded, {results.failed} Failed
            </h3>
            <a
              href="/registrar/financials"
              style={{
                background: '#0F172A',
                color: '#FFFFFF',
                padding: '8px 18px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                textDecoration: 'none'
              }}
            >
              Go to Financials Dashboard →
            </a>
          </div>

          <div style={{
            background: '#0F172A',
            color: '#A7F3D0',
            fontFamily: 'monospace',
            fontSize: 12,
            padding: 16,
            borderRadius: 10,
            maxHeight: 250,
            overflowY: 'auto',
            lineHeight: 1.6
          }}>
            {results.logs.map((log, idx) => (
              <div key={idx}>{log}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
