import AppShell from './AppShell';
const registrarNav = [
  { href: '/registrar', label: 'Dashboard' },
  { href: '/registrar/members', label: 'Members' },
  { href: '/registrar/members/new', label: 'Create Member' },
];
export default function RegistrarShell({ children, title='Registrar Portal', subtitle }: { children: React.ReactNode; title?: string; subtitle?: string }) { return <AppShell title={title} subtitle={subtitle} navItems={registrarNav}>{children}</AppShell>; }
