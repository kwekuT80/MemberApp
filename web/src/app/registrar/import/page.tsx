export const dynamic = 'force-dynamic';

import React from 'react';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { requireRegistrar } from '@/lib/auth/requireRegistrar';
import ImportClient from './ImportClient';

export default async function BulkImportPage() {
  await requireRegistrar();

  return (
    <RegistrarShell title="Bulk Member Import" subtitle="Onboard entire Commanderies using a CSV spreadsheet.">
      <ImportClient />
    </RegistrarShell>
  );
}
