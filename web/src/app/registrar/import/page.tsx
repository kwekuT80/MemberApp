'use client';

import React, { useState } from 'react';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function BulkImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const processImport = async () => {
    if (!file) return;
    setImporting(true);
    setResults([]);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      // Expected headers: surname, first_name, other_names, title, occupation, phone, email
      const supabase = createClient();
      const newResults: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(',').map(v => v.trim());
        const entry: any = {};
        
        headers.forEach((h, idx) => {
          entry[h] = values[idx];
        });

        // Basic validation
        if (!entry.surname || !entry.first_name) {
          newResults.push(`Line ${i+1}: Skipped (Missing Name)`);
          continue;
        }

        const { error: insertError } = await supabase
          .from('members')
          .insert([{
            surname: entry.surname,
            first_name: entry.first_name,
            other_names: entry.other_names || null,
            title: entry.title || 'Bro.',
            occupation: entry.occupation || null,
            phone: entry.phone || null,
            email: entry.email || null,
            status: 'Active'
          }]);

        if (insertError) {
          newResults.push(`Line ${i+1}: Failed (${insertError.message})`);
        } else {
          newResults.push(`Line ${i+1}: Imported ✓ (${entry.first_name} ${entry.surname})`);
        }
      }

      setResults(newResults);
      setImporting(false);
    };

    reader.onerror = () => {
      setError('Failed to read file.');
      setImporting(false);
    };

    reader.readAsText(file);
  };

  return (
    <RegistrarShell title="Bulk Member Import" subtitle="Onboard entire Commanderies using a CSV spreadsheet.">
      <div style={container}>
        <div className="card" style={cardStyle}>
          <h3>Step 1: Prepare your CSV</h3>
          <p style={helpText}>
            Ensure your file has the following headers in the first row:<br />
            <code>surname, first_name, other_names, title, occupation, phone, email</code>
          </p>
          
          <div style={uploadBox}>
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleFileChange} 
              style={fileInput}
              id="csv-upload"
            />
            <label htmlFor="csv-upload" style={fileLabel}>
              {file ? file.name : "Select CSV File"}
            </label>
          </div>

          <button 
            onClick={processImport} 
            disabled={!file || importing} 
            style={{ ...importBtn, opacity: (!file || importing) ? 0.5 : 1 }}
          >
            {importing ? "Importing Records..." : "Begin Import"}
          </button>
        </div>

        {results.length > 0 && (
          <div className="card" style={{ ...cardStyle, marginTop: 24 }}>
            <h3>Import Results</h3>
            <div style={logBox}>
              {results.map((res, i) => (
                <div key={i} style={{ 
                  padding: '8px 0', 
                  borderBottom: '1px solid #eee',
                  color: res.includes('Failed') || res.includes('Skipped') ? '#e53e3e' : '#38a169',
                  fontSize: 14
                }}>
                  {res}
                </div>
              ))}
            </div>
            <button onClick={() => router.push('/registrar')} style={doneBtn}>Return to Dashboard</button>
          </div>
        )}

        {error && <div style={errorBanner}>{error}</div>}
      </div>
    </RegistrarShell>
  );
}

const container = { maxWidth: 600, margin: '0 auto' };
const cardStyle = { padding: 32 };
const helpText = { fontSize: 14, color: '#666', lineHeight: 1.6, marginBottom: 24 };
const uploadBox = { marginBottom: 24 };
const fileInput = { display: 'none' };
const fileLabel = {
  display: 'block',
  padding: '16px',
  border: '2px dashed #cbd5e0',
  borderRadius: '12px',
  textAlign: 'center' as const,
  cursor: 'pointer',
  color: '#4a5568',
  fontWeight: 600
};
const importBtn = {
  width: '100%',
  padding: '14px',
  backgroundColor: '#10233f',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontWeight: 700,
  cursor: 'pointer'
};
const logBox = {
  maxHeight: 300,
  overflowY: 'auto' as const,
  backgroundColor: '#f7fafc',
  padding: '16px',
  borderRadius: '8px',
  marginBottom: 20
};
const doneBtn = {
  background: 'none',
  border: '1px solid #10233f',
  color: '#10233f',
  padding: '10px 20px',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: 600
};
const errorBanner = {
  backgroundColor: '#fff5f5',
  color: '#c53030',
  padding: '16px',
  borderRadius: '8px',
  marginTop: 16,
  textAlign: 'center' as const
};
