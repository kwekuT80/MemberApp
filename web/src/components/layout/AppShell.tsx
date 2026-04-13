import Sidebar, { SidebarItem } from './Sidebar';

export default function AppShell({ children, title, subtitle, navItems }: { children: React.ReactNode; title: string; subtitle?: string; navItems: SidebarItem[]; }) {
  return (
    <div style={{ minHeight: '100vh' }}>
      <header className="premium-header">
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <p className="title-gold">Official Registry Portal</p>
          <h1 className="main-title">{title}</h1>
          {subtitle && <p style={{ opacity: 0.8, marginTop: 8 }}>{subtitle}</p>}
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: '-40px auto 0 auto', padding: '0 24px 60px 24px', display: 'grid', gridTemplateColumns: '260px 1fr', gap: 32 }}>
        <aside>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 24, color: 'var(--navy)' }}>KSJI Registry</div>
            <Sidebar items={navItems} />
          </div>
        </aside>

        <main>
          {children}
        </main>
      </div>
    </div>
  );
}
