-- ============================================================
-- MASTER FINANCIAL LEDGER SETUP SCRIPT
-- Run this ENTIRE script in your Supabase SQL Editor.
-- It is safe to re-run (idempotent). Last updated: 2026-05.
-- ============================================================

-- ┌─────────────────────────────────────────────────────────┐
-- │  STEP 1: Update profiles role CHECK constraint           │
-- └─────────────────────────────────────────────────────────┘
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('member', 'registrar', 'financial_registrar', 'super_admin'));

-- ┌─────────────────────────────────────────────────────────┐
-- │  STEP 2: Security helper functions                       │
-- │  SET search_path = public prevents search-path injection │
-- │  (Supabase security advisory — required for SECURITY     │
-- │   DEFINER functions)                                     │
-- └─────────────────────────────────────────────────────────┘
CREATE OR REPLACE FUNCTION public.is_registrar()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND (role = 'registrar' OR role = 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_financial_registrar()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND (role = 'financial_registrar' OR role = 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ┌─────────────────────────────────────────────────────────┐
-- │  STEP 3: Extend members table                            │
-- └─────────────────────────────────────────────────────────┘
ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS membership_type TEXT DEFAULT 'Regular'
CHECK (membership_type IN ('Regular', 'Social', 'Student'));

-- QR code value for manual attendance fallback
ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS qr_code_value TEXT UNIQUE;

-- ┌─────────────────────────────────────────────────────────┐
-- │  STEP 4: Create financial tables (idempotent)            │
-- └─────────────────────────────────────────────────────────┘

-- Annual assessment base rates (supports full rate history)
CREATE TABLE IF NOT EXISTS public.annual_assessment_rates (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year          INT NOT NULL,
    regular_rate  NUMERIC(10, 2) NOT NULL DEFAULT 1050.00,
    social_rate   NUMERIC(10, 2) NOT NULL DEFAULT 700.00,
    student_rate  NUMERIC(10, 2) NOT NULL DEFAULT 350.00,
    effective_from  TIMESTAMPTZ DEFAULT NOW(),
    effective_until TIMESTAMPTZ,
    created_by    UUID REFERENCES public.profiles(id),
    change_reason TEXT,
    active        BOOLEAN DEFAULT true,
    created_at    TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Add history columns in case table already existed with the old INT PK schema
ALTER TABLE public.annual_assessment_rates ADD COLUMN IF NOT EXISTS effective_from  TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.annual_assessment_rates ADD COLUMN IF NOT EXISTS effective_until TIMESTAMPTZ;
ALTER TABLE public.annual_assessment_rates ADD COLUMN IF NOT EXISTS created_by      UUID REFERENCES public.profiles(id);
ALTER TABLE public.annual_assessment_rates ADD COLUMN IF NOT EXISTS change_reason   TEXT;
ALTER TABLE public.annual_assessment_rates ADD COLUMN IF NOT EXISTS active          BOOLEAN DEFAULT true;

-- Individual member assessment records per year
CREATE TABLE IF NOT EXISTS public.financial_assessments (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id               UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    year                    INT NOT NULL,
    arrears_brought_forward NUMERIC(10, 2) DEFAULT 0.00,
    annual_assessment       NUMERIC(10, 2) DEFAULT 0.00,
    created_at              TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    UNIQUE(member_id, year)
);

-- Monthly payment logs
CREATE TABLE IF NOT EXISTS public.financial_payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id       UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    assessment_year INT NOT NULL,
    month           TEXT NOT NULL,
    amount          NUMERIC(10, 2) NOT NULL,
    recorded_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    payment_date    TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Immutable audit log for payment and rate changes
CREATE TABLE IF NOT EXISTS public.financial_audit_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action      TEXT NOT NULL,       -- 'payment_amount_change','rate_change','assessment_edit','payment_delete'
    entity_type TEXT NOT NULL,       -- 'payment', 'rate', 'assessment'
    entity_id   UUID NOT NULL,
    member_id   UUID REFERENCES public.members(id),
    old_values  JSONB,
    new_values  JSONB,
    changed_by  UUID REFERENCES public.profiles(id),
    changed_at  TIMESTAMPTZ DEFAULT NOW(),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ┌─────────────────────────────────────────────────────────┐
-- │  STEP 5: Extend attendance table (GPS geofencing + QR)   │
-- └─────────────────────────────────────────────────────────┘
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS gps_latitude    DECIMAL(10, 8);
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS gps_longitude   DECIMAL(11, 8);
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS accuracy_meters INTEGER;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS verified        BOOLEAN DEFAULT false;

-- ┌─────────────────────────────────────────────────────────┐
-- │  STEP 6: Indexes                                         │
-- └─────────────────────────────────────────────────────────┘
CREATE INDEX IF NOT EXISTS idx_financial_assessments_member_year
    ON public.financial_assessments(member_id, year);
CREATE INDEX IF NOT EXISTS idx_financial_payments_member_year
    ON public.financial_payments(member_id, assessment_year);
CREATE INDEX IF NOT EXISTS idx_rate_effective_dates
    ON public.annual_assessment_rates(effective_from, active);
CREATE INDEX IF NOT EXISTS idx_audit_member_changed_at
    ON public.financial_audit_log(member_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity
    ON public.financial_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_action
    ON public.financial_audit_log(action, changed_at DESC);

-- ┌─────────────────────────────────────────────────────────┐
-- │  STEP 7: Views (security_invoker = true)                 │
-- │  This makes views inherit the RLS of their base tables   │
-- │  automatically — no separate view-level policies needed. │
-- └─────────────────────────────────────────────────────────┘

-- Rate history timeline
CREATE OR REPLACE VIEW public.rate_history
WITH (security_invoker = true) AS
SELECT id, year, regular_rate, social_rate, student_rate,
       effective_from, effective_until, created_by,
       change_reason, active, created_at
FROM public.annual_assessment_rates;

-- Per-member financial summary (replaces old materialized view)
CREATE OR REPLACE VIEW public.member_financial_summary
WITH (security_invoker = true) AS
WITH member_financial_base AS (
  SELECT
    m.id,
    m.first_name || ' ' || m.surname AS full_name,
    m.phone_number,
    m.email,
    -- Sum of all annual assessments + arrears of the earliest year (prevents double-billing cumulative arrears)
    COALESCE((
      SELECT SUM(COALESCE(a.annual_assessment, 0))
      FROM public.financial_assessments a WHERE a.member_id = m.id
    ), 0) +
    COALESCE((
      SELECT a.arrears_brought_forward
      FROM public.financial_assessments a WHERE a.member_id = m.id
      ORDER BY a.year ASC LIMIT 1
    ), 0) AS total_assessed,
    -- Sum of all payments
    COALESCE((
      SELECT SUM(p.amount) FROM public.financial_payments p WHERE p.member_id = m.id
    ), 0) AS total_paid,
    (SELECT MAX(a.year) FROM public.financial_assessments a WHERE a.member_id = m.id)
      AS last_assessment_year
  FROM public.members m
)
SELECT
  id,
  full_name,
  phone_number,
  email,
  total_assessed,
  total_paid,
  (total_assessed - total_paid) AS outstanding_balance,
  last_assessment_year,
  CASE
    WHEN total_paid >= total_assessed THEN 'paid'
    WHEN total_paid > 0 THEN 'partially_paid'
    ELSE 'delinquent'
  END AS payment_status
FROM member_financial_base;

-- Per-member, per-year statement detail
CREATE OR REPLACE VIEW public.member_financial_detail
WITH (security_invoker = true) AS
SELECT
  m.id AS member_id,
  a.year,
  COALESCE(a.annual_assessment, 0) + COALESCE(a.arrears_brought_forward, 0) AS assessment_amount,
  p.amount AS payment_amount,
  p.payment_date,
  ROW_NUMBER() OVER (PARTITION BY m.id ORDER BY p.payment_date) AS receipt_number
FROM public.members m
LEFT JOIN public.financial_assessments a ON a.member_id = m.id
LEFT JOIN public.financial_payments    p ON p.member_id = m.id;

-- Audit trail with joined context (security_invoker means financial_audit_log RLS applies)
CREATE OR REPLACE VIEW public.audit_recent_activity
WITH (security_invoker = true) AS
SELECT
  fal.id,
  fal.action,
  fal.entity_type,
  fal.member_id,
  m.first_name || ' ' || m.surname  AS member_name,
  p.email                            AS changed_by_email,
  p.role                             AS changed_by_role,
  fal.changed_at,
  jsonb_build_object('old', fal.old_values, 'new', fal.new_values) AS value_changes
FROM public.financial_audit_log fal
LEFT JOIN public.members  m ON fal.member_id  = m.id
LEFT JOIN public.profiles p ON fal.changed_by = p.id
ORDER BY fal.changed_at DESC;

-- ┌─────────────────────────────────────────────────────────┐
-- │  STEP 8: Enable Row Level Security                       │
-- └─────────────────────────────────────────────────────────┘
ALTER TABLE public.annual_assessment_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_assessments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_payments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_audit_log     ENABLE ROW LEVEL SECURITY;

-- ┌─────────────────────────────────────────────────────────┐
-- │  STEP 9: Drop old policies (clean slate)                 │
-- └─────────────────────────────────────────────────────────┘
DROP POLICY IF EXISTS "Authenticated users can select annual rates"       ON public.annual_assessment_rates;
DROP POLICY IF EXISTS "Financial registrars can manage annual rates"      ON public.annual_assessment_rates;
DROP POLICY IF EXISTS "Members can view their own assessments"            ON public.financial_assessments;
DROP POLICY IF EXISTS "Registrars can manage all assessments"             ON public.financial_assessments;
DROP POLICY IF EXISTS "Financial registrars can manage all assessments"   ON public.financial_assessments;
DROP POLICY IF EXISTS "Members can view their own payments"               ON public.financial_payments;
DROP POLICY IF EXISTS "Registrars can manage all payments"                ON public.financial_payments;
DROP POLICY IF EXISTS "Financial registrars can manage all payments"      ON public.financial_payments;
DROP POLICY IF EXISTS "Financial registrars can read audit log"           ON public.financial_audit_log;
DROP POLICY IF EXISTS "Service role can insert audit entries"             ON public.financial_audit_log;

-- ┌─────────────────────────────────────────────────────────┐
-- │  STEP 10: RLS policies                                   │
-- └─────────────────────────────────────────────────────────┘

-- annual_assessment_rates: all authenticated can read; fin. registrars can write
CREATE POLICY "Authenticated users can select annual rates"
    ON public.annual_assessment_rates FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Financial registrars can manage annual rates"
    ON public.annual_assessment_rates FOR ALL TO authenticated
    USING (public.is_financial_registrar())
    WITH CHECK (public.is_financial_registrar());

-- financial_assessments: members see own row; fin. registrars see/manage all
CREATE POLICY "Members can view their own assessments"
    ON public.financial_assessments FOR SELECT TO authenticated
    USING (
        public.is_financial_registrar() OR
        member_id = (SELECT member_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Financial registrars can manage all assessments"
    ON public.financial_assessments FOR ALL TO authenticated
    USING (public.is_financial_registrar())
    WITH CHECK (public.is_financial_registrar());

-- financial_payments: members see own; fin. registrars manage all
CREATE POLICY "Members can view their own payments"
    ON public.financial_payments FOR SELECT TO authenticated
    USING (
        public.is_financial_registrar() OR
        member_id = (SELECT member_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Financial registrars can manage all payments"
    ON public.financial_payments FOR ALL TO authenticated
    USING (public.is_financial_registrar())
    WITH CHECK (public.is_financial_registrar());

-- financial_audit_log: fin. registrars read; service_role inserts (automated logging)
CREATE POLICY "Financial registrars can read audit log"
    ON public.financial_audit_log FOR SELECT TO authenticated
    USING (public.is_financial_registrar());

CREATE POLICY "Service role can insert audit entries"
    ON public.financial_audit_log FOR INSERT
    WITH CHECK (true);

-- ┌─────────────────────────────────────────────────────────┐
-- │  STEP 11: GRANT schema usage                             │
-- │  Required by Supabase for every role accessing the       │
-- │  public schema (enforced by new Supabase project rules)  │
-- └─────────────────────────────────────────────────────────┘
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- ┌─────────────────────────────────────────────────────────┐
-- │  STEP 12: GRANT table privileges                         │
-- │  Use explicit verbs — not ALL — for authenticated role.  │
-- │  RLS policies then restrict which rows are accessible.   │
-- └─────────────────────────────────────────────────────────┘
GRANT SELECT, INSERT, UPDATE ON TABLE public.annual_assessment_rates TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.annual_assessment_rates TO service_role;

GRANT SELECT, INSERT, UPDATE ON TABLE public.financial_assessments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.financial_assessments TO service_role;

GRANT SELECT, INSERT, UPDATE ON TABLE public.financial_payments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.financial_payments TO service_role;

-- Audit log: authenticated can only read; writes are via service_role or trusted DB functions
GRANT SELECT ON TABLE public.financial_audit_log TO authenticated;
GRANT SELECT, INSERT ON TABLE public.financial_audit_log TO service_role;

-- ┌─────────────────────────────────────────────────────────┐
-- │  STEP 13: GRANT view privileges                          │
-- │  Views use security_invoker = true so base-table RLS     │
-- │  applies automatically — no view-level policies needed.  │
-- └─────────────────────────────────────────────────────────┘
GRANT SELECT ON public.rate_history             TO authenticated, service_role;
GRANT SELECT ON public.member_financial_summary TO authenticated, service_role;
GRANT SELECT ON public.member_financial_detail  TO authenticated, service_role;
GRANT SELECT ON public.audit_recent_activity    TO authenticated, service_role;

-- ┌─────────────────────────────────────────────────────────┐
-- │  STEP 14: GRANT function execute privileges              │
-- │  SECURITY DEFINER functions require explicit EXECUTE     │
-- │  grants so RLS policies that call them can resolve.      │
-- └─────────────────────────────────────────────────────────┘
GRANT EXECUTE ON FUNCTION public.is_registrar()           TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_financial_registrar() TO authenticated;

-- ┌─────────────────────────────────────────────────────────┐
-- │  STEP 15: Promote to super_admin                         │
-- │  Replace email if needed before running.                 │
-- └─────────────────────────────────────────────────────────┘
UPDATE public.profiles
SET role = 'super_admin'
WHERE email = 'niiarmahtagoe@gmail.com';

-- ┌─────────────────────────────────────────────────────────┐
-- │  Verification query                                      │
-- └─────────────────────────────────────────────────────────┘
SELECT
    (SELECT COUNT(*) FROM public.annual_assessment_rates) AS rates_rows,
    (SELECT COUNT(*) FROM public.financial_assessments)   AS assessments_rows,
    (SELECT COUNT(*) FROM public.financial_payments)      AS payments_rows,
    (SELECT COUNT(*) FROM public.financial_audit_log)     AS audit_rows,
    (SELECT role FROM public.profiles WHERE email = 'niiarmahtagoe@gmail.com') AS your_role;
