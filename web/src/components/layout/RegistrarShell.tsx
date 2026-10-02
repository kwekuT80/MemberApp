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

  // Build Treasury & Welfare items based on role
  const treasuryWelfareItems = [
    ...(isFinancial ? [
      { href: '/registrar/financials', label: '💰 Financial Ledger' },
      { href: '/registrar/financials/rates', label: '⚙️ Rates & Dues Engine' },
      { href: '/registrar/financials/delinquency', label: '📉 Delinquency Tracker' },
      { href: '/registrar/financials/audit', label: '📋 Financial Audit Trail' },
    ] : []),
    ...(isWelfare ? [
      { href: '/registrar/welfare', label: '🤝 Welfare Scheme Hub' },
      { href: '/registrar/welfare/contributions', label: '💳 Welfare Dues' },
      { href: '/registrar/welfare/disbursements', label: '🛡️ Benefit Payouts' },
    ] : []),
  ];

  const navSections: SidebarSection[] = [
    {
      title: 'COMMANDERY DESK',
      items: [
        { href: '/registrar', label: '🏠 Overview Dashboard' },
        ...(isFinancial ? [
          { href: '/registrar/financials/dashboards', label: '🏥 Financial Health' }
        ] : []),
      ]
    },
    {
      title: '🏛️ GOVERNANCE & LEADERSHIP',
      items: [
        { href: '/registrar/officers', label: '⚔️ Commandery Officers' },
        { href: '/registrar/presidents', label: '👑 Worthy Presidents' },
      ]
    },
    {
      title: '⚔️ FRATERNAL LIFE & OPERATIONS',
      items: [
        { href: '/registrar/members', label: '👥 Member Roll & Dossiers' },
        { href: '/registrar/initiation-cohorts', label: '🏛️ Initiation Cohorts' },
        { href: '/registrar/meetings', label: '📅 Meetings & Attendance' },
        { href: '/registrar/communications', label: '📣 Broadcasts (SMS & Email)' },
      ]
    },
    ...(treasuryWelfareItems.length > 0 ? [{
      title: '💰 TREASURY & WELFARE',
      items: treasuryWelfareItems,
    }] : []),
    {
      title: '📜 ARCHIVES & SYSTEM VAULT',
      items: [
        { href: '/registrar/historical-members', label: '📜 Roll Book & Memorial Roll' },
        ...(isSuperAdmin ? [
          { href: '/registrar/transfers', label: '🔄 Member Transfers Out' },
        ] : []),
        { href: '/registrar/reports', label: '📊 Executive Reports Hub' },
        { href: '/registrar/backup', label: '🛡️ Database Vault & Backups' },
      ]
    },
    {
      title: 'MEMBER ACCESS',
      items: [
        { href: '/me', label: '👤 Personal Portal (/me)' }
      ]
    }
  ];

  return (
    <AppShell title={title} subtitle={subtitle} navItems={navSections as any}>
      {children}
    </AppShell>
  );
}
