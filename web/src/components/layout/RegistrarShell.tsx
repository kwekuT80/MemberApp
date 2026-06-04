'use client';

import { useState, useEffect } from 'react';
import AppShell from './AppShell';
import { createClient } from '@/lib/supabase/client';

export default function RegistrarShell({ 
  children, 
  title = 'Registrar Portal', 
  subtitle 
}: { 
  children: React.ReactNode; 
  title?: string; 
  subtitle?: string; 
}) {
  const [role, setRole] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function loadRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if (profile) {
        setRole(profile.role);
      }
    }
    loadRole();
  }, []);

  const navItems = [];

  // Super Admin / Registrar (Admin) navigation items
  // During loading, show basic registrar nav so layout doesn't jump aggressively
  if (role === 'registrar' || role === 'super_admin' || !role) {
    navItems.push(
      { href: '/registrar', label: '🏠 Dashboard' },
      { href: '/registrar/members', label: '👥 Members' },
      { href: '/registrar/members/new', label: '➕ Create Member' },
      { href: '/registrar/reports', label: '📊 Reporting Hub' },
      { href: '/registrar/meetings', label: '📅 Meetings' },
      { href: '/registrar/communications', label: '📣 Communications' }
    );
  }

  // Super Admin gets Financial Ledger tab + all financial sub-pages
  if (role === 'super_admin') {
    navItems.push(
      { href: '/registrar/financials', label: '💰 Financial Ledger' },
      { href: '/registrar/financials/rates', label: '⚙️ Rates & Billing' },
      { href: '/registrar/financials/rates/history', label: '📉 Rate History' },
      { href: '/registrar/financials/payments', label: '💳 Record Payments' },
      { href: '/registrar/financials/members', label: '👥 Member Summaries' },
      { href: '/registrar/financials/dashboards', label: '🏥 Health Dashboard' },
      { href: '/registrar/financials/delinquency', label: '📉 Delinquency Report' },
      { href: '/registrar/financials/audit', label: '📋 Audit Trail' }
    );
  }

  // Financial Registrar gets full financial navigation suite
  if (role === 'financial_registrar') {
    navItems.push(
      { href: '/registrar/financials', label: '💰 Financial Dashboard' },
      { href: '/registrar/financials/rates', label: '⚙️ Rates & Billing' },
      { href: '/registrar/financials/rates/history', label: '📉 Rate History' },
      { href: '/registrar/financials/payments', label: '💳 Record Payments' },
      { href: '/registrar/financials/members', label: '👥 Member Summaries' },
      { href: '/registrar/financials/dashboards', label: '🏥 Health Dashboard' },
      { href: '/registrar/financials/delinquency', label: '📉 Delinquency Report' },
      { href: '/registrar/financials/audit', label: '📋 Audit Trail' }
    );
  }

  // Common item
  navItems.push(
    { href: '/me', label: '👤 My Member Portal (Personal)' }
  );

  return (
    <AppShell title={title} subtitle={subtitle} navItems={navItems}>
      {children}
    </AppShell>
  );
}
