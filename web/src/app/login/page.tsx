import type { Metadata } from 'next';
import Link from 'next/link';
import LoginForm from '@/components/auth/LoginForm';
import { getCurrentProfile } from '@/lib/auth/getCurrentProfile';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: 'Sign In' };

export default async function LoginPage() {
  const { user } = await getCurrentProfile();
  if (user) redirect('/');

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#F8FAFC' }}>
      <div style={{ width: '100%', maxWidth: 420, display: 'grid', gap: 20 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E3A8A', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
            ⚔️ Official Member Registry
          </div>
          <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 900, color: '#0F172A' }}>Commandery #500</h1>
          <p style={{ margin: 0, color: '#53657D', fontSize: 14 }}>Sign in to access your official member records and dues ledger.</p>
        </div>

        <LoginForm />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
          <Link href="/forgot-password" style={{ color: '#10233F', fontWeight: 700, textDecoration: 'none' }}>
            Forgot password?
          </Link>
          <Link href="/privacy" style={{ color: '#047857', fontWeight: 700, textDecoration: 'none' }}>
            🛡️ Privacy Policy (Act 843)
          </Link>
        </div>

        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 16, textAlign: 'center', fontSize: 12, color: '#64748B' }}>
          <div>Knights of St. John International • St. Margaret-Mary Parish</div>
          <div style={{ marginTop: 4, fontSize: 11, color: '#94A3B8' }}>
            🔒 TLS 1.3 & AES-256 Encrypted • Ghana Data Protection Act 2012 Certified
          </div>
        </div>
      </div>
    </div>
  );
}
