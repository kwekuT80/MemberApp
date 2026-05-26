-- ============================================================
-- FINANCIAL AND ATTENDANCE SYSTEM ENHANCEMENTS MIGRATION
-- Run this script in your Supabase SQL Editor.
-- ============================================================

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
ALTER TABLE public.annual_assessment_rates DROP CONSTRAINT IF EXISTS annual_assessment_rates_pkey CASCADE;
ALTER TABLE public.annual_assessment_rates ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.annual_assessment_rates ADD CONSTRAINT annual_assessment_rates_pkey PRIMARY KEY (id);

ALTER TABLE public.annual_assessment_rates
ADD COLUMN IF NOT EXISTS effective_from TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS effective_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS change_reason TEXT,
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Recreate index safely
DROP INDEX IF EXISTS idx_rate_effective_dates;
CREATE INDEX idx_rate_effective_dates ON public.annual_assessment_rates (effective_from, active);

-- Rate History View with PG15 security_invoker = true (inherits RLS from base table)
CREATE OR REPLACE VIEW public.rate_history 
WITH (security_invoker = true) AS
SELECT
  id,
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
CREATE OR REPLACE VIEW public.member_financial_summary
WITH (security_invoker = true) AS
SELECT
  m.id,
  m.first_name || ' ' || m.surname as full_name,
  m.phone_number,
  m.email,
  COALESCE((
    SELECT SUM(COALESCE(a.annual_assessment, 0) + COALESCE(a.arrears_brought_forward, 0))
    FROM public.financial_assessments a
    WHERE a.member_id = m.id
  ), 0) as total_assessed,
  COALESCE((
    SELECT SUM(p.amount)
    FROM public.financial_payments p
    WHERE p.member_id = m.id
  ), 0) as total_paid,
  (COALESCE((
    SELECT SUM(COALESCE(a.annual_assessment, 0) + COALESCE(a.arrears_brought_forward, 0))
    FROM public.financial_assessments a
    WHERE a.member_id = m.id
  ), 0)) - COALESCE((
    SELECT SUM(p.amount)
    FROM public.financial_payments p
    WHERE p.member_id = m.id
  ), 0) as outstanding_balance,
  (
    SELECT MAX(a.year)
    FROM public.financial_assessments a
    WHERE a.member_id = m.id
  ) as last_assessment_year,
  CASE
    WHEN COALESCE((SELECT SUM(p.amount) FROM public.financial_payments p WHERE p.member_id = m.id), 0) >=
         COALESCE((SELECT SUM(COALESCE(annual_assessment, 0) + arrears_brought_forward)
                    FROM public.financial_assessments a WHERE a.member_id = m.id), 0)
    THEN 'paid'
    WHEN COALESCE((SELECT SUM(p.amount) FROM public.financial_payments p WHERE p.member_id = m.id), 0) > 0
    THEN 'partially_paid'
    ELSE 'delinquent'
  END as payment_status
FROM public.members m;

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

-- 4. Extend public.attendance table for GPS geofencing & QR code manual fallback
ALTER TABLE public.attendance
ADD COLUMN IF NOT EXISTS gps_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS gps_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS accuracy_meters INTEGER,
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;

-- Extend members table for QR fallback capability
ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS qr_code_value TEXT UNIQUE;

-- Grants for views
GRANT SELECT ON public.rate_history TO authenticated;
GRANT SELECT ON public.member_financial_summary TO authenticated;
GRANT SELECT ON public.member_financial_detail TO authenticated;
