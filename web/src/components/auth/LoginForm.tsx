'use client';
import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: React.FormEvent) { e.preventDefault(); setBusy(true); setError(null); setMessage(null); const supabase=createClient(); const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) setError(error.message); else { setMessage('Signed in. Redirecting...'); window.location.href='/'; } setBusy(false); }
  return <form onSubmit={onSubmit} style={{ display:'grid', gap:14, maxWidth:420, background:'#fff', padding:24, borderRadius:16, boxShadow:'0 8px 24px rgba(16,35,63,0.08)' }}><label style={label}><span>Email</span><input value={email} onChange={e=>setEmail(e.target.value)} type="email" required style={input} /></label><label style={label}><span>Password</span><input value={password} onChange={e=>setPassword(e.target.value)} type="password" required style={input} /></label><button type="submit" disabled={busy} style={button}>{busy?'Signing in…':'Sign in'}</button>{message?<span style={{ color:'#1f6f43' }}>{message}</span>:null}{error?<span style={{ color:'crimson' }}>{error}</span>:null}</form>;
}
const label: React.CSSProperties={ display:'grid', gap:6, fontWeight:600 }; const input: React.CSSProperties={ padding:'11px 12px', borderRadius:10, border:'1px solid #cfd8e3' }; const button: React.CSSProperties={ padding:'12px 16px', borderRadius:10, border:0, background:'#10233f', color:'#fff', fontWeight:700, cursor:'pointer' };
