-- Suppress notice/warnings
SET client_min_messages = warning;

-- ==========================================
-- 1. Create Commanderies Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.commanderies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    number INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on commanderies
ALTER TABLE public.commanderies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflict
DROP POLICY IF EXISTS "Allow public read access to commanderies" ON public.commanderies;

-- Allow public read access (necessary for registration screen dropdown fetch)
CREATE POLICY "Allow public read access to commanderies" 
    ON public.commanderies FOR SELECT 
    USING (true);

-- ==========================================
-- 2. Add New Columns to Profiles Table
-- ==========================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS commandery_id UUID REFERENCES public.commanderies(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES public.members(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS surname TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- ==========================================
-- 3. Add New Columns to Members Table
-- ==========================================
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS commandery_id UUID REFERENCES public.commanderies(id) ON DELETE SET NULL;

-- ==========================================
-- 4. Create Role & Tenant Logic Helper Functions
-- ==========================================

-- is_registrar() helper checks if the current authenticated user has the registrar role
CREATE OR REPLACE FUNCTION public.is_registrar()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'registrar'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 5. Access Hardening: Positions & Members RLS
-- ==========================================

-- A. RLS Policies on 'positions' table
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Registrars can modify positions" ON public.positions;
DROP POLICY IF EXISTS "Members can view positions" ON public.positions;

-- "Ensure only Registrars can add/edit the positions table."
CREATE POLICY "Registrars can modify positions"
    ON public.positions
    FOR ALL
    TO authenticated
    USING (public.is_registrar())
    WITH CHECK (public.is_registrar());

-- Everyone authenticated can view positions
CREATE POLICY "Members can view positions"
    ON public.positions
    FOR SELECT
    TO authenticated
    USING (true);

-- B. RLS Policies on 'members' table
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can only see others within their commandery" ON public.members;

-- "Ensure users can only see other members within their own commandery_id."
-- Note: Registrars bypass this constraint so they can see all members (or can registrars also be scoped? Usually registrars are global or per commandery. If scoped, remove is_registrar() bypass).
CREATE POLICY "Members can only see others within their commandery"
    ON public.members
    FOR SELECT
    TO authenticated
    USING (
        public.is_registrar() OR
        commandery_id = (
            SELECT commandery_id FROM public.profiles 
            WHERE id = auth.uid()
        )
    );
