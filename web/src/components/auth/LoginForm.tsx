'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginForm() {
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Registration-specific fields
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [phone, setPhone] = useState('');
  const [commanderies, setCommanderies] = useState<any[]>([]);
  const [commanderySearch, setCommanderySearch] = useState('');
  const [selectedCommandery, setSelectedCommandery] = useState<any | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  // Matching/Reconciliation flag
  const [matchFlag, setMatchFlag] = useState(false);
  const [matchedMemberName, setMatchedMemberName] = useState('');

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const supabase = createClient();

  // Load commanderies on mount
  useEffect(() => {
    async function loadCommanderies() {
      const { data, error } = await supabase
        .from('commanderies')
        .select('*')
        .order('number');
      if (!error && data) {
        setCommanderies(data);
      }
    }
    loadCommanderies();
  }, []);

  // Automatic Reconciliation Check
  useEffect(() => {
    if (mode !== 'register' || !selectedCommandery || (!email && !phone)) {
      setMatchFlag(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      let query = supabase
        .from('members')
        .select('id, first_name, surname')
        .eq('commandery_id', selectedCommandery.id);

      if (email && phone) {
        query = query.or(`email.eq.${email.trim()},phone.eq.${phone.trim()},mobile.eq.${phone.trim()}`);
      } else if (email) {
        query = query.eq('email', email.trim());
      } else if (phone) {
        query = query.or(`phone.eq.${phone.trim()},mobile.eq.${phone.trim()}`);
      }

      const { data, error } = await query.limit(1);
      if (!error && data && data.length > 0) {
        setMatchFlag(true);
        setMatchedMemberName(`${data[0].first_name} ${data[0].surname}`);
      } else {
        setMatchFlag(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [email, phone, selectedCommandery, mode]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        setMessage('Signed in successfully. Redirecting...');
        window.location.href = '/';
      } else {
        if (!selectedCommandery) {
          throw new Error('Please select your local Commandery.');
        }

        // 1. Sign up user in Auth
        const { data: authResult, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              surname: surname,
              phone: phone
            }
          }
        });
        if (signUpError) throw signUpError;

        if (authResult?.user) {
          // 2. Set profile fields with status 'pending' and correct commandery_id
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: authResult.user.id,
              email: email.trim(),
              first_name: firstName.trim(),
              surname: surname.trim(),
              phone: phone.trim(),
              commandery_id: selectedCommandery.id,
              status: 'pending',
              role: 'member'
            });

          if (profileError) throw profileError;

          setMessage('🎉 Registration successful! Your profile status is pending. A registrar will link and approve your account.');
          
          // Clear inputs
          setEmail('');
          setPassword('');
          setFirstName('');
          setSurname('');
          setPhone('');
          setSelectedCommandery(null);
          setCommanderySearch('');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setBusy(false);
    }
  }

  const filteredCommanderies = commanderies.filter(c =>
    c.name.toLowerCase().includes(commanderySearch.toLowerCase()) ||
    c.number.toString().includes(commanderySearch)
  );

  return (
    <div style={{ maxWidth: 440, width: '100%' }}>
      {/* Tab Selectors */}
      <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', padding: 4, borderRadius: 12, marginBottom: 20 }}>
        <button 
          onClick={() => { setMode('signin'); setError(null); setMessage(null); }}
          style={{ flex: 1, padding: '10px 16px', border: 0, borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', background: mode === 'signin' ? '#fff' : 'transparent', color: mode === 'signin' ? '#10233f' : '#64748b', boxShadow: mode === 'signin' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}
        >
          Sign In
        </button>
        <button 
          onClick={() => { setMode('register'); setError(null); setMessage(null); }}
          style={{ flex: 1, padding: '10px 16px', border: 0, borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', background: mode === 'register' ? '#fff' : 'transparent', color: mode === 'register' ? '#10233f' : '#64748b', boxShadow: mode === 'register' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}
        >
          Register Portal
        </button>
      </div>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 16, background: '#fff', padding: 32, borderRadius: 20, boxShadow: '0 10px 30px rgba(16, 35, 63, 0.06)', border: '1px solid #f1f5f9' }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 20, color: 'var(--navy)', fontWeight: 800 }}>
            {mode === 'signin' ? 'Welcome Back' : 'Member Onboarding'}
          </h2>
          <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
            {mode === 'signin' ? 'Enter credentials to access your bio.' : 'Create an online profile for the Commandery registry.'}
          </p>
        </div>

        {mode === 'register' && (
          <>
            <div style={{ display: 'flex', gap: 12 }}>
              <label style={label}>
                <span>First Name</span>
                <input value={firstName} onChange={e => setFirstName(e.target.value)} required style={input} placeholder="John" />
              </label>
              <label style={label}>
                <span>Surname</span>
                <input value={surname} onChange={e => setSurname(e.target.value)} required style={input} placeholder="Doe" />
              </label>
            </div>

            <label style={label}>
              <span>Phone / Mobile</span>
              <input value={phone} onChange={e => setPhone(e.target.value)} required style={input} placeholder="e.g. 0244123456" />
            </label>

            {/* Searchable Commandery Dropdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, position: 'relative' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>Select Commandery</span>
              <input 
                value={commanderySearch} 
                onChange={e => {
                  setCommanderySearch(e.target.value);
                  setDropdownOpen(true);
                  if (!e.target.value) setSelectedCommandery(null);
                }}
                onFocus={() => setDropdownOpen(true)}
                required
                style={input} 
                placeholder="Type Commandery Name or No..." 
              />
              {dropdownOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 10, maxHeight: 200, overflowY: 'auto', zIndex: 100, boxShadow: '0 8px 20px rgba(0,0,0,0.1)', marginTop: 4 }}>
                  {filteredCommanderies.length === 0 ? (
                    <div style={{ padding: 12, fontSize: 12, color: '#64748b', textAlign: 'center' }}>No commanderies found</div>
                  ) : (
                    filteredCommanderies.map(c => (
                      <div 
                        key={c.id} 
                        onClick={() => {
                          setSelectedCommandery(c);
                          setCommanderySearch(`${c.name} (No. ${c.number})`);
                          setDropdownOpen(false);
                        }}
                        style={{ padding: '10px 14px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                        onMouseDown={(e) => e.preventDefault()} // Prevents input blur before select
                      >
                        <strong>{c.name}</strong> <span style={{ color: 'var(--gold)', fontWeight: 600 }}>No. {c.number}</span>
                        {c.location && <span style={{ display: 'block', fontSize: 11, color: '#64748b' }}>📍 {c.location}</span>}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Reconciliation Auto-Match Alert Panel */}
            {matchFlag && (
              <div style={{ padding: '12px 16px', background: 'rgba(212, 175, 55, 0.08)', borderRadius: 10, border: '1px solid var(--gold)', display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 20 }}>✨</span>
                <div style={{ fontSize: 12, color: '#856404' }}>
                  <strong>Registry Match Found:</strong> We matched your email/phone to <strong>{matchedMemberName}</strong> in our records! A Registrar will automatically link your account on approval.
                </div>
              </div>
            )}
          </>
        )}

        <label style={label}>
          <span>Email Address</span>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" required style={input} placeholder="yourname@gmail.com" />
        </label>

        <label style={label}>
          <span>Password</span>
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" required style={input} placeholder="••••••••" />
        </label>

        <button type="submit" disabled={busy} style={button}>
          {busy ? (mode === 'signin' ? 'Signing in…' : 'Creating Profile…') : (mode === 'signin' ? 'Sign In' : 'Submit Registration')}
        </button>

        {message && (
          <div style={{ padding: '12px 16px', borderRadius: 10, background: '#e6f4ea', color: '#1f6f43', fontSize: 13, fontWeight: 600 }}>
            {message}
          </div>
        )}
        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 10, background: '#fdeaea', color: 'crimson', fontSize: 13, fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}
      </form>
    </div>
  );
}

const label: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--navy)' }; 
const input: React.CSSProperties = { padding: '11px 14px', borderRadius: 10, border: '1px solid #cfd8e3', outline: 'none', fontSize: 14, width: '100%', boxSizing: 'border-box' }; 
const button: React.CSSProperties = { padding: '12px 16px', borderRadius: 10, border: 0, background: 'var(--navy)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14, boxShadow: '0 4px 12px rgba(16, 35, 63, 0.15)', marginTop: 8 };
