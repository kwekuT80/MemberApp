'use server';
import { createClient } from '@/lib/supabase/server';

export type AuditAction = 'payment_amount_change' | 'rate_change' | 'assessment_edit' | 'payment_delete';
export type EntityType = 'payment' | 'rate' | 'assessment';

interface LogEntryParams {
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  memberId?: string;
  oldValues: Record<string, any>;
  newValues: Record<string, any>;
}

export async function logFinancialChange(params: LogEntryParams) {
  const supabase = await createClient();

  // Get current user from session
  const { data: { user } } = await supabase.auth.getUser();

  const entry = {
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId,
    member_id: params.memberId ?? null,
    old_values: params.oldValues,
    new_values: params.newValues,
    changed_by: user?.id ?? null,
    changed_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('financial_audit_log').insert(entry);
  if (error) throw error;
}

export async function getAuditLog(filters?: {
  action?: string;
  memberId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  const supabase = await createClient();

  let query = supabase
    .from('financial_audit_log')
    .select(`
      *,
      members:member_id (first_name, surname),
      profiles:changed_by (email)
    `);

  if (filters?.action) {
    query = query.eq('action', filters.action);
  }
  if (filters?.memberId) {
    query = query.eq('member_id', filters.memberId);
  }
  if (filters?.startDate) {
    query = query.gte('changed_at', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('changed_at', filters.endDate);
  }

  const limit = filters?.limit ?? 100;
  const { data, error } = await query.order('changed_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}
