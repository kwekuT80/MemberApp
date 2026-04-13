'use client';
import { createClient } from '@/lib/supabase/client';
export default function SignOutButton() { return <button onClick={async()=>{ const supabase=createClient(); await supabase.auth.signOut(); window.location.href='/login'; }} style={{ padding:'10px 14px', borderRadius:10, border:'1px solid #cfd8e3', background:'#fff', cursor:'pointer' }}>Sign out</button>; }
