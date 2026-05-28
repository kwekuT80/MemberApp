export const dynamic = 'force-dynamic';

import React from 'react';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { requireFinancialRegistrar } from '@/lib/auth/requireFinancialRegistrar';
import AuditLogClient from './AuditLogClient';

export default async function AuditLogPage() {
  await requireFinancialRegistrar();

  return (
    <RegistrarShell title="Financial Audit Trail" subtitle="Track all payment and rate changes">
      <AuditLogClient />
    </RegistrarShell>
  );
}
