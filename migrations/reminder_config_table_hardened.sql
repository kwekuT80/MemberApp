-- ============================================================
-- REMINDER CONFIGURATION TABLE (C1b)
-- For: Automated Payment Reminders — Admin Settings
-- ============================================================

-- Configuration table for reminder thresholds and settings
CREATE TABLE IF NOT EXISTS public.reminder_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    updated_by UUID REFERENCES profiles(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default configuration values
INSERT INTO public.reminder_config (config_key, config_value) VALUES
    ('days_before_due', '{"value": 7}'),
    ('overdue_threshold_90', '{"value": true}'),
    ('overdue_threshold_180', '{"value": true}'),
    ('enabled', '{"value": true}')
ON CONFLICT (config_key) DO NOTHING;

-- CRITICAL: Grant access after creating new table (required with RLS)
GRANT INSERT, SELECT, UPDATE ON TABLE public.reminder_config TO authenticated;

-- Enable RLS on reminder_config
ALTER TABLE public.reminder_config ENABLE ROW LEVEL SECURITY;


DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'reminder_config'
          AND policyname = 'Registrars can read config'
    ) THEN
        CREATE POLICY "Registrars can read config"
        ON public.reminder_config FOR SELECT
        USING (EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('registrar', 'financial_registrar', 'super_admin')
        ));
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'reminder_config'
          AND policyname = 'Financial registrars can update config'
    ) THEN
        CREATE POLICY "Financial registrars can update config"
        ON public.reminder_config FOR UPDATE
        USING (EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('financial_registrar', 'super_admin')
        ))
        WITH CHECK (EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('financial_registrar', 'super_admin')
        ));
    END IF;
END $$;


-- Index for performance
CREATE INDEX IF NOT EXISTS idx_reminder_config_key ON reminder_config (config_key);
