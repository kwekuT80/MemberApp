export const dynamic = 'force-dynamic';

import { requireFinancialRegistrar } from '@/lib/auth/requireFinancialRegistrar';
import { getActiveMembers, getPaymentsForYear } from '@/services/financialService';
import PaymentsClient from './PaymentsClient';
import RegistrarShell from '@/components/layout/RegistrarShell';

export default async function PaymentsPage() {
  const { user } = await requireFinancialRegistrar();
  const currentYear = new Date().getFullYear();

  const [members, payments] = await Promise.all([
    getActiveMembers(),
    getPaymentsForYear(currentYear),
  ]);

  return (
    <RegistrarShell title="Record Payments" subtitle="Log monthly payment receipts for members">
      <PaymentsClient
        initialYear={currentYear}
        initialMembers={members as any}
        initialPayments={payments as any}
        currentUserId={user!.id}
      />
    </RegistrarShell>
  );
}
