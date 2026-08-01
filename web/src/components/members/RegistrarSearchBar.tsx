'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';

export default function RegistrarSearchBar({ defaultQuery='' }: { defaultQuery?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus search on '/' or 'Ctrl+K' / 'Cmd+K'
      if (
        (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <form action='/registrar/members' method='get' style={{ display:'flex', flexWrap:'wrap', gap:12, alignItems:'center', background:'#fff', padding:16, borderRadius:16, boxShadow:'0 8px 24px rgba(16,35,63,0.08)' }}>
      <div style={{ position: 'relative', flex: '1 1 320px', minWidth: 220 }}>
        <input
          ref={inputRef}
          type='search'
          name='q'
          defaultValue={defaultQuery}
          placeholder='Search by name, email, phone... (Press "/" or Ctrl+K)'
          style={{ width: '100%', padding:'11px 70px 11px 12px', borderRadius:10, border:'1px solid #cfd8e3', fontSize:14, boxSizing: 'border-box' }}
        />
        <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 4, padding: '2px 6px', fontSize: 11, color: '#64748b', pointerEvents: 'none', fontWeight: 600 }}>
          / or ⌘K
        </span>
      </div>
      <button type='submit' style={{ padding:'11px 16px', borderRadius:10, border:0, background:'#10233f', color:'#fff', fontWeight:700, cursor:'pointer' }}>
        Search
      </button>
      <Link href='/registrar/members' style={{ padding:'10px 14px', borderRadius:10, border:'1px solid #cfd8e3', color:'#10233f', textDecoration:'none', fontWeight:600 }}>
        Clear
      </Link>
      <Link href='/registrar/members/new' style={{ padding:'10px 14px', borderRadius:10, background:'#1f6f43', color:'#fff', textDecoration:'none', fontWeight:700 }}>
        Create Member
      </Link>
    </form>
  );
}

