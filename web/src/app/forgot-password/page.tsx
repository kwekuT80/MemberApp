import Link from 'next/link';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
export default function ForgotPasswordPage() { return <div style={{ minHeight:'100vh', display:'grid', placeItems:'center', padding:24 }}><div style={{ display:'grid', gap:16 }}><div><h1 style={{ margin:'0 0 8px' }}>Reset password</h1><p style={{ margin:0, color:'#53657d' }}>Enter your email to request a password reset.</p></div><ForgotPasswordForm /><Link href='/login' style={{ color:'#10233f', fontWeight:700 }}>Back to login</Link></div></div>; }
