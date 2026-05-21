import AppShell from './AppShell';
const registrarNav = [
  { href: '/registrar', label: 'Dashboard' },
  { href: '/registrar/members', label: 'Members' },
  { href: '/registrar/members/new', label: 'Create Member' },
  { href: '/registrar/reports', label: 'Reporting Hub' },
  { href: '/registrar/meetings', label: 'Meetings' },
  { href: '/registrar/financials', label: '💰 Financial Ledger' },
  { href: '/me', label: '👤 My Member Portal (Personal)' },
];
export default function RegistrarShell({ children, title='Registrar Portal', subtitle }: { children: React.ReactNode; title?: string; subtitle?: string }) { return <AppShell title={title} subtitle={subtitle} navItems={registrarNav}>{children}</AppShell>; }
