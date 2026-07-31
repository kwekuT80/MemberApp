'use client';

import React from 'react';

export default function PrintReportButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        background: '#0F172A',
        color: '#FFFFFF',
        border: 'none',
        padding: '10px 18px',
        borderRadius: 10,
        fontWeight: 700,
        fontSize: 13,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        boxShadow: '0 2px 6px rgba(15,23,42,0.15)'
      }}
    >
      <span>🖨️</span> Print / Save PDF
    </button>
  );
}
