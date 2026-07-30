import React from 'react';
import RegistrarShell from '@/components/layout/RegistrarShell';
import WelfareAuditClient from './AuditClient';

export default async function WelfareAuditPage() {
  return (
    <RegistrarShell title="Welfare Audit Trail" subtitle="Immutable journal log of all welfare contributions, benefit payouts, and rule changes">
      <div style={{ padding: '24px 0' }}>
        <WelfareAuditClient />
      </div>
    </RegistrarShell>
  );
}
