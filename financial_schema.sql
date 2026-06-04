-- ==========================================
-- Create Financial Ledger Tables Schema
-- ==========================================

-- 1. Financial Assessments Table
CREATE TABLE IF NOT EXISTS public.financial_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    year INT NOT NULL,
    arrears_brought_forward NUMERIC(10, 2) DEFAULT 0.00,
    annual_assessment NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(member_id, year)
);

-- 2. Financial Payments Table
CREATE TABLE IF NOT EXISTS public.financial_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    assessment_year INT NOT NULL,
    month TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- Enable Row Level Security (RLS)
-- ==========================================
ALTER TABLE public.financial_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Members can view their own assessments" ON public.financial_assessments;
DROP POLICY IF EXISTS "Registrars can manage all assessments" ON public.financial_assessments;
DROP POLICY IF EXISTS "Members can view their own payments" ON public.financial_payments;
DROP POLICY IF EXISTS "Registrars can manage all payments" ON public.financial_payments;

-- ==========================================
-- RLS Policies for Assessments
-- ==========================================
CREATE POLICY "Members can view their own assessments"
    ON public.financial_assessments
    FOR SELECT
    TO authenticated
    USING (
        public.is_registrar() OR
        member_id IN (
            SELECT id FROM public.members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Registrars can manage all assessments"
    ON public.financial_assessments
    FOR ALL
    TO authenticated
    USING (public.is_registrar())
    WITH CHECK (public.is_registrar());

-- ==========================================
-- RLS Policies for Payments
-- ==========================================
CREATE POLICY "Members can view their own payments"
    ON public.financial_payments
    FOR SELECT
    TO authenticated
    USING (
        public.is_registrar() OR
        member_id IN (
            SELECT id FROM public.members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Registrars can manage all payments"
    ON public.financial_payments
    FOR ALL
    TO authenticated
    USING (public.is_registrar())
    WITH CHECK (public.is_registrar());

-- Index for rapid reads
CREATE INDEX IF NOT EXISTS idx_financial_payments_member_year ON public.financial_payments(member_id, assessment_year);
CREATE INDEX IF NOT EXISTS idx_financial_assessments_member_year ON public.financial_assessments(member_id, year);

-- ==========================================
-- Grant Privileges
-- ==========================================
GRANT SELECT, INSERT, UPDATE ON TABLE public.financial_assessments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.financial_assessments TO service_role;

GRANT SELECT, INSERT, UPDATE ON TABLE public.financial_payments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.financial_payments TO service_role;
