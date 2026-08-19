'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface SidebarItem {
  href: string;
  label: string;
  icon?: string;
  badge?: string;
}

export interface SidebarSection {
  title?: string;
  items: SidebarItem[];
}

function isSection(item: SidebarItem | SidebarSection): item is SidebarSection {
  return 'items' in item && Array.isArray((item as SidebarSection).items);
}

export default function Sidebar({ items }: { items: (SidebarItem | SidebarSection)[] }) {
  const pathname = usePathname();

  // Normalize into sections
  const sections: SidebarSection[] = [];
  let currentAnonymousSection: SidebarItem[] = [];

  items.forEach((entry) => {
    if (isSection(entry)) {
      if (currentAnonymousSection.length > 0) {
        sections.push({ items: currentAnonymousSection });
        currentAnonymousSection = [];
      }
      sections.push(entry);
    } else {
      currentAnonymousSection.push(entry);
    }
  });

  if (currentAnonymousSection.length > 0) {
    sections.push({ items: currentAnonymousSection });
  }

  return (
    <nav style={{ display: 'grid', gap: 14 }}>
      {sections.map((sec, sIdx) => (
        <div key={sec.title || sIdx} style={{ display: 'grid', gap: 4 }}>
          {sec.title && (
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: 1.1,
                color: '#64748b',
                textTransform: 'uppercase',
                padding: '6px 10px 2px',
                marginTop: sIdx > 0 ? 8 : 0,
              }}
            >
              {sec.title}
            </div>
          )}
          {sec.items.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/registrar' && item.href !== '/me' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: 8,
                  color: isActive ? '#d4af37' : '#1e293b',
                  backgroundColor: isActive ? '#0f172a' : '#f1f5f9',
                  fontWeight: isActive ? 700 : 600,
                  fontSize: 13.5,
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                  borderLeft: isActive ? '3px solid #d4af37' : '3px solid transparent',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.label}
                </span>
                {item.badge && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      backgroundColor: isActive ? '#d4af37' : '#e2e8f0',
                      color: isActive ? '#0f172a' : '#475569',
                      padding: '2px 6px',
                      borderRadius: 999,
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
