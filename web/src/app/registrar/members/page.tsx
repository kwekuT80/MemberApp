import Link from 'next/link';
import RegistrarShell from '@/components/layout/RegistrarShell';
import MemberSearchTable from '@/components/members/MemberSearchTable';
import RegistrarSearchBar from '@/components/members/RegistrarSearchBar';
import MemberExportButtons from '@/components/members/MemberExportButtons';
import { requireRegistrar } from '@/lib/auth/requireRegistrar';
import { searchMembers } from '@/services/memberService';

export default async function RegistrarMembersPage({ 
  searchParams 
}: { 
  searchParams?: Promise<{ q?: string }> 
}) {
  await requireRegistrar();
  const params = searchParams ? await searchParams : {};
  const query = params?.q || '';
  const members = await searchMembers(query);

  return (
    <RegistrarShell title="Members" subtitle="Search, browse, and open any member record.">
      <div style={{ display: 'grid', gap: 18 }}>
        <RegistrarSearchBar defaultQuery={query} />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>{query ? `Results for "${query}"` : 'All members'}</h2>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ color: '#53657d', fontSize: 13 }}>
              {members.length} record{members.length === 1 ? '' : 's'}
            </span>
            <MemberExportButtons members={members} />
            <Link
              href="/registrar/members/new"
              style={{
                backgroundColor: 'var(--navy, #0f172a)',
                color: '#d4af37',
                padding: '9px 16px',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13.5,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                border: '1px solid #d4af37',
                boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
              }}
            >
              <span>➕</span>
              <span>Create Member</span>
            </Link>
          </div>
        </div>

        <MemberSearchTable members={members} emptyMessage="No members match this search yet." />
      </div>
    </RegistrarShell>
  );
}
