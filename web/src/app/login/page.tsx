import Link from 'next/link';
import LoginForm from '@/components/auth/LoginForm';
import { getCurrentProfile } from '@/lib/auth/getCurrentProfile';
import { redirect } from 'next/navigation';
export default async function LoginPage() { const { user } = await getCurrentProfile(); if (user) redirect('/'); return <div style={{ minHeight:'100vh', display:'grid', placeItems:'center', padding:24 }}><div style={{ display:'grid', gap:16 }}><div><h1 style={{ margin:'0 0 8px' }}>Member App</h1><p style={{ margin:0, color:'#53657d' }}>Sign in to access the member portal.</p></div><LoginForm /><Link href='/forgot-password' style={{ color:'#10233f', fontWeight:700 }}>Forgot password?</Link></div></div>; }
