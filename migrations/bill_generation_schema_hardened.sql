-- ============================================================
-- BILL GENERATION SCHEMA (C2)
-- For: Annual Bill Auto-Generation
-- Revised to avoid conflicts with existing annual_assessment_rates
-- ============================================================

-- ============================================================
-- Bills table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.bills (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
assessment_year INTEGER NOT NULL,
rate_type TEXT NOT NULL CHECK (
rate_type IN ('regular', 'social', 'student')
),
base_amount NUMERIC(12,2) NOT NULL,
arrears_brought_forward NUMERIC(12,2) DEFAULT 0,
total_due NUMERIC(12,2) NOT NULL,
status TEXT DEFAULT 'unpaid'
CHECK (
status IN (
'pending',
'generated',
'billed',
'partially_paid',
'paid'
)
),
generated_by TEXT,
generated_at TIMESTAMPTZ DEFAULT NOW(),
created_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE
ON TABLE public.bills
TO authenticated;

ALTER TABLE public.bills
ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
IF NOT EXISTS (
SELECT 1
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'bills'
AND policyname = 'Registrars can read bills'
) THEN
CREATE POLICY "Registrars can read bills"
ON public.bills
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
AND tablename = 'bills'
AND policyname = 'Registrars can insert bills'
) THEN
CREATE POLICY "Registrars can insert bills"
ON public.bills
FOR INSERT
WITH CHECK (
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
AND tablename = 'bills'
AND policyname = 'Registrars can update bills'
) THEN
CREATE POLICY "Registrars can update bills"
ON public.bills
FOR UPDATE
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
)
WITH CHECK (
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

CREATE INDEX IF NOT EXISTS idx_bills_year_status
ON public.bills (assessment_year, status);

-- ============================================================
-- Bill generation log
-- ============================================================

CREATE TABLE IF NOT EXISTS public.bill_generation_log (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
run_date TIMESTAMPTZ DEFAULT NOW(),
year_generated INTEGER NOT NULL,
members_processed INTEGER DEFAULT 0,
bills_created INTEGER DEFAULT 0,
status TEXT CHECK (
status IN ('running', 'completed', 'failed')
),
error_message TEXT,
created_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE
ON TABLE public.bill_generation_log
TO authenticated;

ALTER TABLE public.bill_generation_log
ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
IF NOT EXISTS (
SELECT 1
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'bill_generation_log'
AND policyname = 'Registrars can read logs'
) THEN
CREATE POLICY "Registrars can read logs"
ON public.bill_generation_log
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
AND tablename = 'bill_generation_log'
AND policyname = 'Registrars can insert logs'
) THEN
CREATE POLICY "Registrars can insert logs"
ON public.bill_generation_log
FOR INSERT
WITH CHECK (
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
AND tablename = 'bill_generation_log'
AND policyname = 'Registrars can update logs'
) THEN
CREATE POLICY "Registrars can update logs"
ON public.bill_generation_log
FOR UPDATE
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
)
WITH CHECK (
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