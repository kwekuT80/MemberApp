'use client';

import { useEffect, useState } from 'react';
import Sidebar, { SidebarItem } from './Sidebar';
import SignOutButton from '@/components/auth/SignOutButton';

export default function AppShell({ children, title, subtitle, navItems }: { children: React.ReactNode; title: string; subtitle?: string; navItems: SidebarItem[]; }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (title) {
      document.title = `${title} | KSJI`;
    }
  }, [title]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="premium-header no-print">
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <p className="title-gold">Official Registry Portal</p>
            <h1 className="main-title">{title}</h1>
            {subtitle && <p style={{ opacity: 0.8, marginTop: 8, fontSize: 13 }}>{subtitle}</p>}
          </div>

          <button
            onClick={() => setMobileMenuOpen(prev => !prev)}
            className="mobile-menu-btn"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? '✕ Close' : '☰ Menu'}
          </button>
        </div>
      </header>

      <div className="app-shell-grid print-layout">
        <aside className={`app-shell-sidebar no-print ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 20, color: 'var(--navy)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>KSJI Registry</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="mobile-close-inner"
              >
                ✕
              </button>
            </div>
            <Sidebar items={navItems} />
            <div style={{ borderTop: '1px solid #eef3f9', paddingTop: 20, marginTop: 20, display: 'flex', justifyContent: 'center' }}>
              <SignOutButton />
            </div>
          </div>
        </aside>

        <main className="app-shell-main print-main">
          {children}
        </main>
      </div>
    </div>
  );
}

