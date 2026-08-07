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
        .maybeSingle();
      if (profile) {
        setRole(profile.role);
      }
    }
    loadRole();
  }, []);

  const navItems = [];

  // Base navigation items (Dashboard, Members, Reports, Meetings, Communications)
  if (
    role === 'super_admin' ||
    role === 'registrar' ||
    role === 'financial_registrar' ||
    role === 'welfare_treasurer' ||
    !role
  ) {
    navItems.push(
      { href: '/registrar', label: '🏠 Dashboard' },
      { href: '/registrar/members', label: '👥 Members' },
      { href: '/registrar/members/new', label: '➕ Create Member' },
      { href: '/registrar/members/id-cards', label: '🪪 Batch ID Cards' },
      { href: '/registrar/reports', label: '📊 Reporting Hub' },
      { href: '/registrar/meetings', label: '📅 Meetings' },
      { href: '/registrar/communications', label: '📣 Communications' }
    );
  }

  // Financial Hub navigation items (Super Admin, Financial Registrar)
  if (role === 'super_admin' || role === 'financial_registrar') {
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

  // Welfare Hub navigation items (Super Admin, Welfare Treasurer)
  if (role === 'super_admin' || role === 'welfare_treasurer') {
    navItems.push(
      { href: '/registrar/welfare', label: '🤝 Welfare Hub' },
      { href: '/registrar/welfare/contributions', label: '💳 Welfare Dues' },
      { href: '/registrar/welfare/disbursements', label: '🎁 Benefit Payouts' },
      { href: '/registrar/welfare/categories', label: '⚙️ Benefit Rules' },
      { href: '/registrar/welfare/rates', label: '📐 Contribution Rates' },
      { href: '/registrar/welfare/audit', label: '📋 Welfare Audit' }
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
