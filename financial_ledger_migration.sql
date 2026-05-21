-- ========================================================
-- FINANCIAL LEDGER MIGRATION SCRIPT
-- ========================================================
-- Run this script in your Supabase SQL Editor to set up
-- dynamic membership categories, aged discounts, security permissions,
-- and updated Row-Level Security (RLS) policies.
-- ========================================================

-- 1. Extend Members Table with Membership Type
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS membership_type TEXT DEFAULT 'Regular' CHECK (membership_type IN ('Regular', 'Social', 'Student'));

-- 2. Create Annual Assessment Rates Table
CREATE TABLE IF NOT EXISTS public.annual_assessment_rates (
    year INT PRIMARY KEY,
    regular_rate NUMERIC(10, 2) NOT NULL DEFAULT 1050.00,
    social_rate NUMERIC(10, 2) NOT NULL DEFAULT 700.00,
    student_rate NUMERIC(10, 2) NOT NULL DEFAULT 350.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create/Update Permission Group Security Function
CREATE OR REPLACE FUNCTION public.is_financial_registrar()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (role = 'financial_registrar' OR role = 'registrar')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.annual_assessment_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_payments ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------
-- 5. RLS Policies for annual_assessment_rates
-- --------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can select annual rates" ON public.annual_assessment_rates;
DROP POLICY IF EXISTS "Financial registrars can manage annual rates" ON public.annual_assessment_rates;

CREATE POLICY "Authenticated users can select annual rates"
    ON public.annual_assessment_rates FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Financial registrars can manage annual rates"
    ON public.annual_assessment_rates FOR ALL
    TO authenticated
    USING (public.is_financial_registrar())
    WITH CHECK (public.is_financial_registrar());

-- --------------------------------------------------------
-- 6. RLS Policies for financial_assessments
-- --------------------------------------------------------
DROP POLICY IF EXISTS "Members can view their own assessments" ON public.financial_assessments;
DROP POLICY IF EXISTS "Registrars can manage all assessments" ON public.financial_assessments;
DROP POLICY IF EXISTS "Financial registrars can manage all assessments" ON public.financial_assessments;

CREATE POLICY "Members can view their own assessments"
    ON public.financial_assessments FOR SELECT
    TO authenticated
    USING (
        public.is_financial_registrar() OR
        member_id = (SELECT member_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Financial registrars can manage all assessments"
    ON public.financial_assessments FOR ALL
    TO authenticated
    USING (public.is_financial_registrar())
    WITH CHECK (public.is_financial_registrar());

-- --------------------------------------------------------
-- 7. RLS Policies for financial_payments
-- --------------------------------------------------------
DROP POLICY IF EXISTS "Members can view their own payments" ON public.financial_payments;
DROP POLICY IF EXISTS "Registrars can manage all payments" ON public.financial_payments;
DROP POLICY IF EXISTS "Financial registrars can manage all payments" ON public.financial_payments;

CREATE POLICY "Members can view their own payments"
    ON public.financial_payments FOR SELECT
    TO authenticated
    USING (
        public.is_financial_registrar() OR
        member_id = (SELECT member_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Financial registrars can manage all payments"
    ON public.financial_payments FOR ALL
    TO authenticated
    USING (public.is_financial_registrar())
    WITH CHECK (public.is_financial_registrar());

-- --------------------------------------------------------
-- 8. Grant Privileges
-- --------------------------------------------------------
GRANT ALL ON TABLE public.annual_assessment_rates TO authenticated;
GRANT ALL ON TABLE public.annual_assessment_rates TO service_role;
GRANT ALL ON TABLE public.financial_assessments TO authenticated;
GRANT ALL ON TABLE public.financial_assessments TO service_role;
GRANT ALL ON TABLE public.financial_payments TO authenticated;
GRANT ALL ON TABLE public.financial_payments TO service_role;

-- Verification query
SELECT 'Financial Ledger database schema successfully upgraded!' as status;
