'use client';

import { useState, useEffect } from 'react';
import AppShell from './AppShell';
import { SidebarSection } from './Sidebar';
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

  const isSuperAdmin = role === 'super_admin';
  const isFinancial = role === 'financial_registrar' || isSuperAdmin;
  const isWelfare = role === 'welfare_treasurer' || isSuperAdmin;

  const navSections: SidebarSection[] = [
    {
      title: 'OVERVIEW',
      items: [
        { href: '/registrar', label: '🏠 Dashboard' },
        ...(isFinancial ? [
          { href: '/registrar/financials/dashboards', label: '🏥 Health Dashboard' }
        ] : []),
      ]
    },
    {
      title: 'MEMBERSHIP',
      items: [
        { href: '/registrar/members', label: '👥 Members' },
        { href: '/registrar/presidents', label: '👑 Worthy Presidents' },
        { href: '/registrar/meetings', label: '📅 Meetings' },
        { href: '/registrar/communications', label: '📣 Communications' },
      ]
    },
    ...(isFinancial ? [{
      title: 'FINANCE',
      items: [
        { href: '/registrar/financials', label: '💰 Financial Dashboard' },
        { href: '/registrar/financials/rates', label: '⚙️ Rates & Billing' },
        { href: '/registrar/financials/delinquency', label: '📉 Delinquency Report' },
      ]
    }] : []),
    ...(isWelfare ? [{
      title: 'WELFARE',
      items: [
        { href: '/registrar/welfare', label: '🤝 Welfare Hub' },
        { href: '/registrar/welfare/contributions', label: '💳 Welfare Dues' },
        { href: '/registrar/welfare/disbursements', label: '🛡️ Benefit Payouts' },
      ]
    }] : []),
    {
      title: 'REPORTING',
      items: [
        { href: '/registrar/reports', label: '📊 Reporting Hub' },
      ]
    },
    ...(isFinancial ? [{
      title: 'GOVERNANCE & SYSTEM',
      items: [
        { href: '/registrar/financials/audit', label: '📋 Audit Trail' }
      ]
    }] : []),
    {
      title: 'ACCOUNT',
      items: [
        { href: '/me', label: '👤 Member Portal' }
      ]
    }
  ];

  return (
    <AppShell title={title} subtitle={subtitle} navItems={navSections as any}>
      {children}
    </AppShell>
  );
}
