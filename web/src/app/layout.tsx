import './globals.css';
export const metadata = { title: 'Registrar Dashboard | KSJI', description: 'Official Web Registry for the Commandery.' };
export default function RootLayout({ children }: { children: React.ReactNode }) { 
  return (
    <html lang='en'>
      <body>{children}</body>
    </html>
  ); 
}
