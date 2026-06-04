-- ============================================================
-- FINANCIAL AUDIT TRAIL
-- Hardened / Idempotent Version
-- ============================================================

CREATE TABLE IF NOT EXISTS public.financial_audit_log (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
action TEXT NOT NULL,
entity_type TEXT NOT NULL,
entity_id UUID NOT NULL,
member_id UUID REFERENCES public.members(id),
old_values JSONB,
new_values JSONB,
changed_by UUID REFERENCES public.profiles(id),
changed_at TIMESTAMPTZ DEFAULT NOW(),
created_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE
ON TABLE public.financial_audit_log
TO authenticated;

ALTER TABLE public.financial_audit_log
ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
IF NOT EXISTS (
SELECT 1
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'financial_audit_log'
AND policyname = 'Financial registrars can read audit log'
) THEN
CREATE POLICY "Financial registrars can read audit log"
ON public.financial_audit_log
FOR SELECT
USING (
EXISTS (
SELECT 1
FROM public.profiles
WHERE id = auth.uid()
AND role IN (
'registrar',
'financial_registrar',
'super_admin'
)
)
);
END IF;
END $$;

DO $$
BEGIN
IF NOT EXISTS (
SELECT 1
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'financial_audit_log'
AND policyname = 'Service role can insert audit entries'
) THEN
CREATE POLICY "Service role can insert audit entries"
ON public.financial_audit_log
FOR INSERT
WITH CHECK (true);
END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_audit_member_changed_at
ON public.financial_audit_log (member_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_entity
ON public.financial_audit_log (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_action
ON public.financial_audit_log (action, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_changed_by
ON public.financial_audit_log (changed_by, changed_at DESC);

CREATE OR REPLACE VIEW public.audit_recent_activity
WITH (security_invoker = true) AS
SELECT
fal.id,
fal.action,
fal.entity_type,
fal.member_id,
m.first_name || ' ' || m.surname AS member_name,
p.email AS changed_by_email,
pr.role AS changed_by_role,
fal.changed_at,
jsonb_build_object(
'old', fal.old_values,
'new', fal.new_values
) AS value_changes
FROM public.financial_audit_log fal
LEFT JOIN public.members m
ON fal.member_id = m.id
LEFT JOIN public.profiles p
ON fal.changed_by = p.id
LEFT JOIN public.profiles pr
ON fal.changed_by = pr.id
ORDER BY fal.changed_at DESC;

GRANT SELECT
ON public.audit_recent_activity
TO authenticated;