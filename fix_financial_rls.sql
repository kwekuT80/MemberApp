-- ========================================================
-- FIX RLS POLICIES FOR FINANCIAL LEDGER TABLES
-- ========================================================
-- Run this script in your Supabase SQL Editor to apply the
-- fixed, highly robust policies for both the assessments and
-- payments tables.
--
-- This script replaces the old policies which incorrectly verified
-- ownership via "members.user_id" (which is null or corrupted for
-- most records) with the canonical "profiles" mapping table
-- (just like the attendance and absence tables do).
-- ========================================================

-- Enable Row Level Security (RLS) just in case
ALTER TABLE public.financial_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_payments ENABLE ROW LEVEL SECURITY;

-- 1. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Members can view their own assessments" ON public.financial_assessments;
DROP POLICY IF EXISTS "Members can view their own payments" ON public.financial_payments;

-- 2. Create fixed, robust policy for financial_assessments
CREATE POLICY "Members can view their own assessments"
    ON public.financial_assessments
    FOR SELECT
    TO authenticated
    USING (
        public.is_registrar() OR
        member_id = (SELECT member_id FROM public.profiles WHERE id = auth.uid())
    );

-- 3. Create fixed, robust policy for financial_payments
CREATE POLICY "Members can view their own payments"
    ON public.financial_payments
    FOR SELECT
    TO authenticated
    USING (
        public.is_registrar() OR
        member_id = (SELECT member_id FROM public.profiles WHERE id = auth.uid())
    );

-- 4. Grant privileges just in case
GRANT SELECT, INSERT, UPDATE ON TABLE public.financial_assessments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.financial_assessments TO service_role;

GRANT SELECT, INSERT, UPDATE ON TABLE public.financial_payments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.financial_payments TO service_role;

-- Verification notice (this will print in Supabase SQL logs)
SELECT 'Financial Ledger RLS policies successfully updated!' as status;
