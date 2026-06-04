-- ============================================================
-- NOTIFICATION PREFERENCES & REMINDER LOG MIGRATION (C1b)
-- For: Automated Payment Reminders — SMS/Email Orchestration
-- ============================================================

-- 1. Add notification preferences to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notification_channel TEXT DEFAULT 'email', -- 'sms' | 'email'
ADD COLUMN IF NOT EXISTS phone_number_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- CRITICAL: Grant access after schema changes (required with RLS)
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;

-- 2. Create reminder_log table for tracking sent reminders
CREATE TABLE IF NOT EXISTS public.reminder_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES public.members(id),
    recipient VARCHAR(255) NOT NULL, -- phone or email
    channel TEXT NOT NULL CHECK (channel IN ('sms', 'email')),
    template_type TEXT NOT NULL CHECK (template_type IN ('upcoming_due', 'overdue_90', 'overdue_180')),
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
    provider_response TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CRITICAL: Grant access after creating new table (required with RLS)
GRANT SELECT, INSERT ON TABLE public.reminder_log TO authenticated;

-- Enable RLS on reminder_log
ALTER TABLE public.reminder_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Registrars can read logs"
    ON public.reminder_log FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('registrar', 'financial_registrar', 'super_admin')
    ));

-- Index for deduplication queries
CREATE INDEX IF NOT EXISTS idx_profiles_notification ON public.profiles (phone_number, notification_channel) WHERE phone_number IS NOT NULL;

-- Index for reminder log queries
CREATE INDEX IF NOT EXISTS idx_reminder_log_member_channel ON public.reminder_log (member_id, channel);
CREATE INDEX IF NOT EXISTS idx_reminder_log_sent_at ON public.reminder_log (sent_at DESC);
