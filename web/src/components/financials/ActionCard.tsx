'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

interface ActionCardProps {
  href: string;
  icon: string;
  title: string;
  description: string;
  buttonText: string;
  buttonBg: string;
  textColor: string;
  borderColor: string;
}

export default function ActionCard({ href, icon, title, description, buttonText, buttonBg, textColor, borderColor }: ActionCardProps) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div className="card" style={{
        cursor: 'pointer',
        borderLeft: `5px solid ${borderColor}`,
        transition: 'transform 0.15s, box-shadow 0.15s',
        padding: 28,
      }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(10,22,40,0.12)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
      >
        <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
        <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--navy)', marginBottom: 8 }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.6 }}>
          {description}
        </div>
        <div style={{
          marginTop: 16, display: 'inline-block',
          background: buttonBg, color: textColor,
          padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 800,
        }}>
          {buttonText}
        </div>
      </div>
    </Link>
  );
}
