import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { 
  title: {
    default: 'Registrar Dashboard | KSJI',
    template: '%s | KSJI',
  }, 
  description: 'Official Web Registry for the Commandery.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) { 
  return (
    <html lang='en'>
      <body>{children}</body>
    </html>
  ); 
}

