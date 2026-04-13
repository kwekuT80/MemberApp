import Link from 'next/link';
export interface SidebarItem { href: string; label: string; }
export default function Sidebar({ items }: { items: SidebarItem[] }) {
  return <nav style={{ display:'grid', gap:8 }}>{items.map((item)=><Link key={item.href} href={item.href} style={{ padding:'10px 12px', borderRadius:10, color:'#10233f', textDecoration:'none', background:'#eef3f9', fontWeight:600 }}>{item.label}</Link>)}</nav>;
}
