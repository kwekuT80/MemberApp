import SignOutButton from '@/components/auth/SignOutButton';
export default function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  return <div style={{ display:'flex', justifyContent:'space-between', gap:16, alignItems:'start', flexWrap:'wrap' }}><div><h1 style={{ margin:'0 0 6px' }}>{title}</h1>{subtitle ? <p style={{ margin:0, color:'#53657d' }}>{subtitle}</p>:null}</div><SignOutButton /></div>;
}
