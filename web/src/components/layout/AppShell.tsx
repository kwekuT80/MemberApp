import Sidebar, { SidebarItem } from './Sidebar';

export default function AppShell({ children, title, subtitle, navItems }: { children: React.ReactNode; title: string; subtitle?: string; navItems: SidebarItem[]; }) {
  return (
    <div style={{ minHeight: '100vh' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          main { width: 100% !important; margin: 0 !important; padding: 0 !important; }
          .premium-header { display: none !important; }
          aside { display: none !important; }
          .card { border: none !important; box-shadow: none !important; }
        }
      `}</style>
      <header className="premium-header no-print">
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <p className="title-gold">Official Registry Portal</p>
          <h1 className="main-title">{title}</h1>
          {subtitle && <p style={{ opacity: 0.8, marginTop: 8 }}>{subtitle}</p>}
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: '-40px auto 0 auto', padding: '0 24px 60px 24px', display: 'grid', gridTemplateColumns: '260px 1fr', gap: 32 }} className="print-layout">
        <aside className="no-print">
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 24, color: 'var(--navy)' }}>KSJI Registry</div>
            <Sidebar items={navItems} />
          </div>
        </aside>

        <main className="print-main">
          {children}
        </main>
      </div>
    </div>
  );
}
