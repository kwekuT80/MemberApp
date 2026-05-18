-- ==========================================
-- Create Dependents Table Schema
-- ==========================================

CREATE TABLE IF NOT EXISTS public.dependents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    dependent_name TEXT NOT NULL,
    relationship TEXT, -- 'Parent', 'In-Law', 'Child', 'Other'
    birth_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.dependents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Members can view dependents" ON public.dependents;
DROP POLICY IF EXISTS "Registrars can modify dependents" ON public.dependents;

-- 1. Policy: Authenticated users can view dependents in their commandery
CREATE POLICY "Members can view dependents"
    ON public.dependents
    FOR SELECT
    TO authenticated
    USING (
        public.is_registrar() OR
        member_id IN (
            SELECT id FROM public.members
            WHERE commandery_id = (
                SELECT commandery_id FROM public.profiles
                WHERE id = auth.uid()
            )
        )
    );

-- 2. Policy: Only Registrars can modify dependents
CREATE POLICY "Registrars can modify dependents"
    ON public.dependents
    FOR ALL
    TO authenticated
    USING (public.is_registrar())
    WITH CHECK (public.is_registrar());
