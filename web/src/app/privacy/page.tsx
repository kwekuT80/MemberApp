export const dynamic = 'force-dynamic';

import React from 'react';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import PrivacyPolicyClient from '@/components/privacy/PrivacyPolicyClient';

export const metadata: Metadata = {
  title: 'Privacy Policy & Statutory Data Protection (Act 843)',
  description: 'Official Data Governance and Privacy Policy for KSJI St. Margaret-Mary Commandery No. 500, compliant with the Ghana Data Protection Act 2012 (Act 843).',
};

export default async function PrivacyPage() {
  let isAuthenticated = false;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    isAuthenticated = !!user;
  } catch {
    isAuthenticated = false;
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      <PrivacyPolicyClient isAuthenticated={isAuthenticated} />
    </main>
  );
}
