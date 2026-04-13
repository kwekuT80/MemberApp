import Link from 'next/link';

export default function RegistrarMemberActions({ memberId }: { memberId: string }) {
  const sections = [
    ['Edit main record', `/registrar/members/${memberId}/edit`],
    ['Family', `/registrar/members/${memberId}/family`],
    ['Degree', `/registrar/members/${memberId}/education`],
    ['Positions', `/registrar/members/${memberId}/positions`],
    ['Military', `/registrar/members/${memberId}/military`],
    ['Emergency', `/registrar/members/${memberId}/emergency`],
  ] as const;

  return <div style={{ display: 'grid', gap: 12 }}><h3 style={{ margin: 0 }}>Registrar actions</h3><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>{sections.map(([label, href]) => <Link key={href} href={href} style={{ background: '#fff', padding: 16, borderRadius: 14, boxShadow: '0 8px 24px rgba(16,35,63,0.08)', textDecoration: 'none', color: '#10233f', fontWeight: 700 }}>{label}</Link>)}</div></div>;
}
