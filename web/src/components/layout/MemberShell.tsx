import AppShell from './AppShell';

const memberNav = [
  { href: '/me', label: 'Overview' },
  { href: '/me/edit', label: 'Edit Main Record' },
  { href: '/me/family', label: 'Family' },
  { href: '/me/education', label: 'Degree' },
  { href: '/me/positions', label: 'Positions' },
  { href: '/me/military', label: 'Military' },
  { href: '/me/emergency', label: 'Emergency' },
];

export default function MemberShell({ children, title = 'Member Portal', subtitle }: { children: React.ReactNode; title?: string; subtitle?: string }) {
  return <AppShell title={title} subtitle={subtitle} navItems={memberNav}>{children}</AppShell>;
}
