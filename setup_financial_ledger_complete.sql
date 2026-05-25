-- ============================================================
-- MASTER FINANCIAL LEDGER SETUP SCRIPT
-- Run this ENTIRE script in your Supabase SQL Editor.
-- It is safe to re-run (idempotent).
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
-- │  STEP 2: Create security helper functions                │
-- └─────────────────────────────────────────────────────────┘
CREATE OR REPLACE FUNCTION public.is_registrar()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (role = 'registrar' OR role = 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_financial_registrar()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (role = 'financial_registrar' OR role = 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ┌─────────────────────────────────────────────────────────┐
-- │  STEP 3: Extend members table with membership_type       │
-- └─────────────────────────────────────────────────────────┘
ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS membership_type TEXT DEFAULT 'Regular'
CHECK (membership_type IN ('Regular', 'Social', 'Student'));

-- ┌─────────────────────────────────────────────────────────┐
-- │  STEP 4: Create financial tables                         │
-- └─────────────────────────────────────────────────────────┘

-- Annual assessment base rates per membership category
CREATE TABLE IF NOT EXISTS public.annual_assessment_rates (
    year INT PRIMARY KEY,
    regular_rate NUMERIC(10, 2) NOT NULL DEFAULT 1050.00,
    social_rate  NUMERIC(10, 2) NOT NULL DEFAULT 700.00,
    student_rate NUMERIC(10, 2) NOT NULL DEFAULT 350.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- Individual member assessment records per year
CREATE TABLE IF NOT EXISTS public.financial_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    year INT NOT NULL,
    arrears_brought_forward NUMERIC(10, 2) DEFAULT 0.00,
    annual_assessment NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    UNIQUE(member_id, year)
);

-- Monthly payment logs
CREATE TABLE IF NOT EXISTS public.financial_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    assessment_year INT NOT NULL,
    month TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_financial_assessments_member_year
    ON public.financial_assessments(member_id, year);
CREATE INDEX IF NOT EXISTS idx_financial_payments_member_year
    ON public.financial_payments(member_id, assessment_year);

-- ┌─────────────────────────────────────────────────────────┐
-- │  STEP 5: Enable Row Level Security                       │
-- └─────────────────────────────────────────────────────────┘
ALTER TABLE public.annual_assessment_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_assessments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_payments      ENABLE ROW LEVEL SECURITY;

-- ┌─────────────────────────────────────────────────────────┐
-- │  STEP 6: Drop old policies (clean slate)                 │
-- └─────────────────────────────────────────────────────────┘
DROP POLICY IF EXISTS "Authenticated users can select annual rates"    ON public.annual_assessment_rates;
DROP POLICY IF EXISTS "Financial registrars can manage annual rates"   ON public.annual_assessment_rates;
DROP POLICY IF EXISTS "Members can view their own assessments"         ON public.financial_assessments;
DROP POLICY IF EXISTS "Registrars can manage all assessments"          ON public.financial_assessments;
DROP POLICY IF EXISTS "Financial registrars can manage all assessments" ON public.financial_assessments;
DROP POLICY IF EXISTS "Members can view their own payments"            ON public.financial_payments;
DROP POLICY IF EXISTS "Registrars can manage all payments"             ON public.financial_payments;
DROP POLICY IF EXISTS "Financial registrars can manage all payments"   ON public.financial_payments;

-- ┌─────────────────────────────────────────────────────────┐
-- │  STEP 7: Apply updated RLS policies                      │
-- └─────────────────────────────────────────────────────────┘

-- annual_assessment_rates: anyone authenticated can read; only fin. registrar can write
CREATE POLICY "Authenticated users can select annual rates"
    ON public.annual_assessment_rates FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Financial registrars can manage annual rates"
    ON public.annual_assessment_rates FOR ALL TO authenticated
    USING (public.is_financial_registrar())
    WITH CHECK (public.is_financial_registrar());

-- financial_assessments: members see own; financial registrars see/manage all
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

-- financial_payments: members see own; financial registrars see/manage all
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

-- ┌─────────────────────────────────────────────────────────┐
-- │  STEP 8: Grant table access                              │
-- └─────────────────────────────────────────────────────────┘
GRANT ALL ON TABLE public.annual_assessment_rates TO authenticated;
GRANT ALL ON TABLE public.annual_assessment_rates TO service_role;
GRANT ALL ON TABLE public.financial_assessments   TO authenticated;
GRANT ALL ON TABLE public.financial_assessments   TO service_role;
GRANT ALL ON TABLE public.financial_payments      TO authenticated;
GRANT ALL ON TABLE public.financial_payments      TO service_role;

-- ┌─────────────────────────────────────────────────────────┐
-- │  STEP 9: Promote yourself to super_admin                 │
-- │  Replace the email below with yours before running.      │
-- └─────────────────────────────────────────────────────────┘
UPDATE public.profiles
SET role = 'super_admin'
WHERE email = 'niiarmahtagoe@gmail.com';

-- Verification
SELECT
    (SELECT COUNT(*) FROM public.annual_assessment_rates) AS rates_rows,
    (SELECT COUNT(*) FROM public.financial_assessments)   AS assessments_rows,
    (SELECT COUNT(*) FROM public.financial_payments)      AS payments_rows,
    (SELECT role FROM public.profiles WHERE email = 'niiarmahtagoe@gmail.com') AS your_role;
