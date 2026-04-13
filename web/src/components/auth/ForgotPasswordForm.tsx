'use client';
import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
export default function ForgotPasswordForm() {
  const [email, setEmail] = useState(''); const [message, setMessage] = useState<string | null>(null); const [error, setError] = useState<string | null>(null);
  async function onSubmit(e: React.FormEvent) { e.preventDefault(); setMessage(null); setError(null); const supabase=createClient(); const { error } = await supabase.auth.resetPasswordForEmail(email); if (error) setError(error.message); else setMessage('Password reset email sent.'); }
  return <form onSubmit={onSubmit} style={{ display:'grid', gap:14, maxWidth:420, background:'#fff', padding:24, borderRadius:16, boxShadow:'0 8px 24px rgba(16,35,63,0.08)' }}><label style={{ display:'grid', gap:6, fontWeight:600 }}><span>Email</span><input value={email} onChange={e=>setEmail(e.target.value)} type='email' required style={{ padding:'11px 12px', borderRadius:10, border:'1px solid #cfd8e3' }} /></label><button type='submit' style={{ padding:'12px 16px', borderRadius:10, border:0, background:'#10233f', color:'#fff', fontWeight:700 }}>Send reset email</button>{message?<span style={{ color:'#1f6f43' }}>{message}</span>:null}{error?<span style={{ color:'crimson' }}>{error}</span>:null}</form>;
}
