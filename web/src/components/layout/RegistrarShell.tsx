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
      { href: '/registrar', label: 'Dashboard' },
      { href: '/registrar/members', label: 'Members' },
      { href: '/registrar/members/new', label: 'Create Member' },
      { href: '/registrar/reports', label: 'Reporting Hub' },
      { href: '/registrar/meetings', label: 'Meetings' }
    );
  }

  // Super Admin gets Financial Ledger tab on main admin shell
  if (role === 'super_admin') {
    navItems.push(
      { href: '/registrar/financials', label: '💰 Financial Ledger' }
    );
  }

  // Financial Registrar gets custom navigation
  if (role === 'financial_registrar') {
    // If they aren't super_admin but are financial_registrar, they only see these options
    navItems.push(
      { href: '/registrar/financials', label: 'Dashboard' },
      { href: '/registrar/financials/rates', label: '⚙️ Rates & Billing' },
      { href: '/registrar/financials/payments', label: '💳 Record Payments' }
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
