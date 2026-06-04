-- ============================================================
-- FINANCIAL AND ATTENDANCE SYSTEM ENHANCEMENTS MIGRATION
-- Run this script in your Supabase SQL Editor.
-- ============================================================

-- IMPORTANT: In PostgreSQL/Supabase, enabling RLS alone doesn't grant access.
-- Without explicit GRANT statements, even with policies in place, tables are inaccessible.
-- Always include both RLS POLICIES and EXPLICIT GRANTS together.

-- 1. Hardening existing helper functions (Supabase Security Best Practice)
CREATE OR REPLACE FUNCTION public.is_registrar()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (role = 'registrar' OR role = 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_financial_registrar()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (role = 'financial_registrar' OR role = 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Extend annual_assessment_rates for Rate History
-- Existing primary key on year retained; no schema change required.

ALTER TABLE public.annual_assessment_rates
ADD COLUMN IF NOT EXISTS effective_from TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS effective_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS change_reason TEXT,
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Explicit grants required for RLS to work — without these, table is inaccessible
GRANT SELECT, INSERT, UPDATE ON TABLE public.annual_assessment_rates TO authenticated;

-- Recreate index safely
CREATE INDEX IF NOT EXISTS idx_rate_effective_dates ON public.annual_assessment_rates (effective_from, active);

-- Rate History View with PG15 security_invoker = true (inherits RLS from base table)
CREATE OR REPLACE VIEW public.rate_history
WITH (security_invoker = true) AS
SELECT
    year,
  regular_rate,
  social_rate,
  student_rate,
  effective_from,
  effective_until,
  created_by,
  change_reason,
  active,
  created_at
FROM public.annual_assessment_rates;

-- 3. Create Real-Time Member Financial Summary View
-- NOTE: Updated to exclude dismissed, transferred-out, and deceased members
CREATE OR REPLACE VIEW public.member_financial_summary
WITH (security_invoker = true) AS
WITH member_financial_base AS (
  SELECT
    m.id,
    m.first_name || ' ' || m.surname AS full_name,
    m.phone,
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
  -- Exclude dismissed, transferred-out, or deceased members from financial summaries
  WHERE m.status NOT IN ('Dismissed', 'Transfer-Out', 'Deceased')
)
SELECT
  id,
  full_name,
  phone,
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


-- Detailed per-member statement view
CREATE OR REPLACE VIEW public.member_financial_detail
WITH (security_invoker = true) AS
SELECT
  m.id as member_id,
  a.year,
  COALESCE(a.annual_assessment, 0) + COALESCE(a.arrears_brought_forward, 0) as assessment_amount,
  p.amount as payment_amount,
  p.payment_date,
  ROW_NUMBER() OVER (PARTITION BY m.id ORDER BY p.payment_date) as receipt_number
FROM public.members m
LEFT JOIN public.financial_assessments a ON a.member_id = m.id
LEFT JOIN public.financial_payments p ON p.member_id = m.id;

-- Explicit grants required for RLS to work — without these, tables are inaccessible
GRANT SELECT, INSERT, UPDATE ON TABLE public.financial_assessments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.financial_payments TO authenticated;

-- 4. Extend public.attendance table for GPS geofencing & QR code manual fallback
ALTER TABLE public.attendance
ADD COLUMN IF NOT EXISTS gps_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS gps_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS accuracy_meters INTEGER,
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;

-- Explicit grants for attendance table (required with RLS)
GRANT SELECT, INSERT, UPDATE ON TABLE public.attendance TO authenticated;

-- Extend members table for QR fallback capability
ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS qr_code_value TEXT UNIQUE;

-- Grants for views
GRANT SELECT ON public.rate_history TO authenticated;
GRANT SELECT ON public.member_financial_summary TO authenticated;
GRANT SELECT ON public.member_financial_detail TO authenticated;