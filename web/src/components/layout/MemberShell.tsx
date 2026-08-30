import AppShell from './AppShell';

const memberNav = [
  {
    title: 'MY PROFILE',
    items: [
      { href: '/me', label: '🏠 Overview' },
      { href: '/me/id-card', label: '🪪 Digital ID Card' },
      { href: '/me/edit', label: '✏️ Edit Main Record' },
      { href: '/me/family', label: '👨‍👩‍👧 Family' },
      { href: '/me/emergency', label: '🚨 Emergency Contacts' },
    ]
  },
  {
    title: 'ORDERS & HONORS',
    items: [
      { href: '/me/presidents', label: '👑 Worthy Presidents' },
      { href: '/me/education', label: '🎓 Exemplification' },
      { href: '/me/positions', label: '🎖️ Positions' },
      { href: '/me/military', label: '⚔️ Uniform & Ranks' },
      { href: '/me/attendance', label: '📅 Attendance' },
    ]
  },
  {
    title: 'FINANCES & WELFARE',
    items: [
      { href: '/me/financials', label: '💰 Financials & Dues' },
      { href: '/me/welfare', label: '🤝 Welfare Scheme' },
      { href: '/me/report', label: '📄 Standing Report' },
    ]
  },
  {
    title: 'OFFICER ACCESS',
    items: [
      { href: '/registrar', label: '🏛️ Registrar Portal' },
    ]
  }
];

export default function MemberShell({ 
  children, 
  title = 'Member Portal', 
  subtitle 
}: { 
  children: React.ReactNode; 
  title?: string; 
  subtitle?: string 
}) {
  return <AppShell title={title} subtitle={subtitle} navItems={memberNav as any}>{children}</AppShell>;
}
