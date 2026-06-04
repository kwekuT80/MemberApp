-- ============================================================
-- COMMUNICATIONS ORCHESTRATION (C1b) SCHEMA
-- For: Automated Payment Reminders — Orchestration Layer
-- Provider: Resend (via RESEND_API_KEY in Supabase secrets)
-- Note: SMS fallback excluded per user budget constraints;
--       channel selection simplified to Email → Registrar Queue
-- IMPORTANT: Extends existing frontend's member_communications table
--             while adding new orchestration infrastructure
-- SAFETY: Idempotent — safe to re-run on existing Supabase DB
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 0. MEMBER COMMUNICATIONS TABLE (EXTEND)
-- Extends existing frontend schema — backward compatible
-- This table is used by the current web/src/services/communicationService.ts
-- New orchestration layer adds separate tables for advanced tracking
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.member_communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES public.members(id),
    type VARCHAR(20) NOT NULL,                    -- email or sms
    subject TEXT,                                -- email subject line
    content_preview TEXT(255),                   -- truncated preview of content sent
    status VARCHAR(30) DEFAULT 'pending',        -- pending, delivered, failed, bounced
    provider_message_id VARCHAR(255),            -- Resend message ID for tracking
    template_id VARCHAR(100),                    -- Which template was used (payment_reminder, etc.)

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_member_comm_member ON member_communications(member_id);
CREATE INDEX IF NOT EXISTS idx_member_comm_status ON member_communications(status);
CREATE INDEX IF NOT EXISTS idx_member_comm_created ON member_communications(created_at);

-- Enable RLS (safe to re-run)
DO $$
BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'member_communications' AND rowsecurity IS TRUE) THEN
ALTER TABLE public.member_communications ENABLE ROW LEVEL SECURITY;
END IF;
END $$;

-- Explicit grants — narrowly scoped, not GRANT ALL
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.member_communications TO authenticated;

-- Idempotent policy creation
DO $$
BEGIN
IF NOT EXISTS (
SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'member_communications' AND policyname = 'all_registrars_can_manage_member_comms'
) THEN
CREATE POLICY "all_registrars_can_manage_member_comms"
    ON public.member_communications FOR ALL
    USING (EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role IN ('registrar', 'financial_registrar', 'super_admin')
    ));
END IF;
END $$;

-- ──────────────────────────────────────────────────────────────
-- SCHEMA ARCHITECTURE NOTE — READ BEFORE MODIFYING
-- ──────────────────────────────────────────────────────────────
--
-- Two communication tables exist in parallel for migration compatibility:
--
-- 1. member_communications (EXTENSION)
--    - Used by EXISTING frontend: web/src/services/communicationService.ts
--    - Simple model: send → record id/status → done
--    - Columns: type, subject, content_preview, status, provider_message_id, template_id
--    - Template IDs used here: 'payment_reminder', 'meeting_notice', 'general' (frontend)
--
-- 2. communication_requests + communication_delivery_states (ORCHESTRATION LAYER — NEW)
--    - Used by Phase 2 orchestrator service (not yet integrated with frontend)
--    - Advanced model: request → dispatch → track delivery events → escalate if needed
--    - Columns: event_type, context JSONB, status lifecycle, provider tracking per event
--    - Template IDs used here: 'invoice_due', 'invoice_overdue', 'meeting_reminder' (orchestrator)
--
-- MIGRATION PATH: Phase 2+ will gradually integrate frontend to use orchestration layer.
-- The orchestration layer provides richer delivery state tracking and escalation capabilities.
--
-- ──────────────────────────────────────────────────────────────

-- ──────────────────────────────────────────────────────────────
-- 1. COMMUNICATION REQUESTS TABLE (ORCHESTRATION)
-- New table — stores incoming requests from workflows for orchestration
-- Not used by existing frontend; consumed by Phase 2 orchestrator service
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.communication_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,           -- invoice_due, invoice_overdue, meeting_reminder
    member_id UUID REFERENCES public.members(id),
    priority VARCHAR(20) DEFAULT 'normal',     -- normal or urgent
    context JSONB,                             -- request-specific data (amount, due_date, etc.)

    -- Request lifecycle status
    status VARCHAR(30) DEFAULT 'PENDING' NOT NULL,  -- PENDING, SENDING, SENT, FAILED, ESCALATED
    error_message TEXT,                        -- last error if failed

    -- Provider tracking
    provider_id VARCHAR(255),                  -- Resend message ID
    channel VARCHAR(20) DEFAULT 'email',       -- email (SMS excluded per budget constraints)

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_comm_requests_member ON communication_requests(member_id);
CREATE INDEX IF NOT EXISTS idx_comm_requests_status ON communication_requests(status);
CREATE INDEX IF NOT EXISTS idx_comm_requests_event_type ON communication_requests(event_type);
CREATE INDEX IF NOT EXISTS idx_comm_requests_created ON communication_requests(created_at);

-- Enable RLS (safe to re-run)
DO $$
BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'communication_requests' AND rowsecurity IS TRUE) THEN
ALTER TABLE public.communication_requests ENABLE ROW LEVEL SECURITY;
END IF;
END $$;

-- Explicit grants — narrowly scoped for orchestration layer
GRANT SELECT, INSERT, UPDATE ON TABLE public.communication_requests TO authenticated;
GRANT DELETE ON TABLE public.communication_requests TO authenticated WHERE status IN ('FAILED', 'ESCALATED');

-- Idempotent policy creation
DO $$
BEGIN
IF NOT EXISTS (
SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'communication_requests' AND policyname = 'financial_registrars_can_manage_requests'
) THEN
CREATE POLICY "financial_registrars_can_manage_requests"
    ON public.communication_requests FOR ALL
    USING (EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role IN ('financial_registrar', 'super_admin')
    ));
END IF;
END $$;

-- ──────────────────────────────────────────────────────────────
-- 2. COMMUNICATION DELIVERY STATES TABLE
-- Tracks message delivery lifecycle per provider event
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.communication_delivery_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES public.communication_requests(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL DEFAULT 'email',  -- email

    -- Provider event tracking
    provider_event_id VARCHAR(255),                -- Resend webhook event ID
    status VARCHAR(30) NOT NULL,                   -- CREATED, QUEUED, SENT, DELIVERED, OPENED, FAILED, BOUNCED
    error_message TEXT,                            -- if status is FAILED or BOUNCED

    -- State timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT chk_delivery_status CHECK (status IN ('CREATED', 'QUEUED', 'SENT', 'DELIVERED', 'OPENED', 'FAILED', 'BOUNCED'))
);

-- Indexes for lookup and reporting
CREATE INDEX IF NOT EXISTS idx_delivery_request ON communication_delivery_states(request_id);
CREATE INDEX IF NOT EXISTS idx_delivery_status ON communication_delivery_states(status);
CREATE INDEX IF NOT EXISTS idx_delivery_created ON communication_delivery_states(created_at);

-- Enable RLS (safe to re-run)
DO $$
BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'communication_delivery_states' AND rowsecurity IS TRUE) THEN
ALTER TABLE public.communication_delivery_states ENABLE ROW LEVEL SECURITY;
END IF;
END $$;

-- Explicit grants — mostly read access for UI, write via webhook handler
GRANT SELECT ON TABLE public.communication_delivery_states TO authenticated;
GRANT INSERT ON TABLE public.communication_delivery_states TO authenticated;

-- Idempotent policy creation
DO $$
BEGIN
IF NOT EXISTS (
SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'communication_delivery_states' AND policyname = 'financial_registrars_can_view_delivery_states'
) THEN
CREATE POLICY "financial_registrars_can_view_delivery_states"
    ON public.communication_delivery_states FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role IN ('financial_registrar', 'super_admin')
    ));
END IF;

IF NOT EXISTS (
SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'communication_delivery_states' AND policyname = 'webhook_handler_can_insert_delivery_states'
) THEN
CREATE POLICY "webhook_handler_can_insert_delivery_states"
    ON public.communication_delivery_states FOR INSERT
    USING (true);  -- Webhook function handles auth externally
END IF;
END $$;

-- ──────────────────────────────────────────────────────────────
-- 3. REGISTRAR QUEUE TABLE
-- Escalated items requiring manual registrar intervention
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.registrar_queues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES public.communication_requests(id),
    member_id UUID REFERENCES public.members(id),
    event_type VARCHAR(50) NOT NULL,               -- reason for escalation

    -- Queue item lifecycle
    status VARCHAR(30) DEFAULT 'AVAILABLE' NOT NULL,  -- AVAILABLE, LOCKED, IN_PROGRESS, COMPLETE
    assigned_registrar_id UUID REFERENCES profiles(id),
    lock_expires_at TIMESTAMPTZ,                   -- auto-release after 15 minutes

    -- Heartbeat for lock management (60-second intervals while active)
    heartbeat_at TIMESTAMPTZ,

    -- Registrar resolution
    resolution_action VARCHAR(100),                -- what registrar did: "whatsapp", "sms", "call"
    resolution_notes TEXT,                         -- notes on outcome
    completed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for finding available queue items
CREATE INDEX IF NOT EXISTS idx_queue_status ON registrar_queues(status);
CREATE INDEX IF NOT EXISTS idx_queue_member ON registrar_queues(member_id);
CREATE INDEX IF NOT EXISTS idx_queue_assigned ON registrar_queues(assigned_registrar_id);
CREATE INDEX IF NOT EXISTS idx_queue_lock_expire ON registrar_queues(lock_expires_at) WHERE status = 'LOCKED';

-- Enable RLS (safe to re-run)
DO $$
BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'registrar_queues' AND rowsecurity IS TRUE) THEN
ALTER TABLE public.registrar_queues ENABLE ROW LEVEL SECURITY;
END IF;
END $$;

-- Explicit grants — all registrars can manage their assigned queues
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.registrar_queues TO authenticated;

-- Idempotent policy creation
DO $$
BEGIN
IF NOT EXISTS (
SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'registrar_queues' AND policyname = 'all_registrars_can_manage_queues'
) THEN
CREATE POLICY "all_registrars_can_manage_queues"
    ON public.registrar_queues FOR ALL
    USING (EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role IN ('registrar', 'financial_registrar', 'super_admin')
    ));
END IF;
END $$;

-- ──────────────────────────────────────────────────────────────
-- 4. COMMUNICATION TEMPLATES TABLE
-- Stores email/SMS templates by event type with variable support
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.communication_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) UNIQUE NOT NULL,        -- invoice_due, meeting_reminder, etc.
    subject TEXT NOT NULL,                         -- email subject line with {{variables}}
    html_body TEXT NOT NULL,                       -- HTML email body
    text_body TEXT,                              -- plain text fallback (mustache variables same format)

    -- Version tracking for template changes
    version INTEGER DEFAULT 1,
    last_modified_by UUID REFERENCES profiles(id),
    modified_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (safe to re-run)
DO $$
BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'communication_templates' AND rowsecurity IS TRUE) THEN
ALTER TABLE public.communication_templates ENABLE ROW LEVEL SECURITY;
END IF;
END $$;

-- Explicit grants — read for all registrars, write for super_admin only
GRANT SELECT ON TABLE public.communication_templates TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.communication_templates TO authenticated WHERE last_modified_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin');

-- Idempotent policy creation
DO $$
BEGIN
IF NOT EXISTS (
SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'communication_templates' AND policyname = 'all_registrars_can_read_templates'
) THEN
CREATE POLICY "all_registrars_can_read_templates"
    ON public.communication_templates FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role IN ('registrar', 'financial_registrar', 'super_admin')
    ));
END IF;

IF NOT EXISTS (
SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'communication_templates' AND policyname = 'only_super_admin_can_modify_templates'
) THEN
CREATE POLICY "only_super_admin_can_modify_templates"
    ON public.communication_templates FOR ALL
    USING (EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'super_admin'
    ));
END IF;
END $$;

-- ──────────────────────────────────────────────────────────────
-- 5. DEFAULT COMMUNICATION TEMPLATES (IDEMPOTENT SEED)
-- Includes both frontend-compatible AND orchestration-layer templates
-- Frontend uses: payment_reminder, meeting_notice, general
-- Orchestrator uses: invoice_due, invoice_overdue, meeting_reminder
-- ──────────────────────────────────────────────────────────────

-- Helper function to upsert templates safely
CREATE OR REPLACE FUNCTION public.upsert_communication_template(
    p_event_type VARCHAR(50),
    p_subject TEXT,
    p_html_body TEXT,
    p_text_body TEXT
)
RETURNS VOID AS $$
BEGIN
INSERT INTO public.communication_templates (event_type, subject, html_body, text_body)
VALUES (p_event_type, p_subject, p_html_body, p_text_body)
ON CONFLICT (event_type) DO UPDATE SET
    subject = EXCLUDED.subject,
    html_body = EXCLUDED.html_body,
    text_body = COALESCE(EXCLUDED.text_body, public.communication_templates.text_body),
    modified_at = NOW()
WHERE public.communication_templates.html_body IS DISTINCT FROM EXCLUDED.html_body;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed all templates (frontend + orchestrator)
SELECT public.upsert_communication_template(
    'payment_reminder',  -- Frontend template ID
    'Payment Reminder - {{due_date}}',
    '<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Payment Reminder</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
<div style="background: #eff6ff; border-radius: 12px; padding: 32px; border-left: 4px solid #3b82f6;">
<h2 style="color: #1e40af; margin-top: 0;">Payment Reminder</h2>
<p>Hello {{member_name}},</p>
<p>This is a reminder that your payment of <strong>GHS {{amount}}</strong> is due on <strong>{{due_date}}</strong>.</p>
<div style="background: white; padding: 20px; border-radius: 8px; margin: 24px 0;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="color: #64748b; padding: 8px 0;">Amount Due:</td><td style="font-weight: 600; color: #3b82f6; padding: 8px 0;"><strong>GHS {{amount}}</strong></td></tr>
<tr><td style="color: #64748b; padding: 8px 0;">Due Date:</td><td style="font-weight: 600; color: #ef4444; padding: 8px 0;"><strong>{{due_date}}</strong></td></tr>
</table>
</div>
<p style="color: #64748b;">Please visit the Member App to record your payment or contact a financial registrar for assistance.</p>
<p style="color: #94a3b8; font-size: 12px; margin-top: 32px;">KSJI Commandery — Financial Office</p>
</div></body></html>',
    'Payment Reminder - {{due_date}}\n\nHello {{member_name}},\n\nThis is a reminder that your payment of GHS {{amount}} is due on {{due_date}}.\n\nAmount Due: GHS {{amount}}\nDue Date: {{due_date}}\n\nPlease visit the Member App to record your payment or contact a financial registrar for assistance.\n\nKSJI Commandery — Financial Office'
);

SELECT public.upsert_communication_template(
    'meeting_notice',  -- Frontend template ID
    'Meeting Notice - {{meeting_title}}',
    '<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Meeting Notice</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
<div style="background: #f0fdf4; border-radius: 12px; padding: 32px; border-left: 4px solid #22c55e;">
<h2 style="color: #16a34a; margin-top: 0;">Meeting Notice</h2>
<p>Hello {{member_name}},</p>
<p>You are invited to attend the <strong>{{meeting_title}}</strong> meeting on <strong>{{meeting_date}}</strong>.</p>
<div style="background: white; padding: 20px; border-radius: 8px; margin: 24px 0;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="color: #64748b; padding: 8px 0;"><strong>Date:</strong></td><td style="font-weight: 600; padding: 8px 0;">{{meeting_date}}</td></tr>
<tr><td style="color: #64748b; padding: 8px 0;"><strong>Time:</strong></td><td style="font-weight: 600; padding: 8px 0;">{{meeting_time}}</td></tr>
<tr><td style="color: #64748b; padding: 8px 0;"><strong>Venue:</strong></td><td style="font-weight: 600; padding: 8px 0;">{{venue}}</td></tr>
</table>
</div>
<p style="color: #15803d;">Please make every effort to attend. Check-in will be available via GPS or QR code.</p>
<p style="color: #94a3b8; font-size: 12px; margin-top: 32px;">KSJI Commandery</p>
</div></body></html>',
    'Meeting Notice - {{meeting_title}}\n\nHello {{member_name}},\n\nYou are invited to attend the {{meeting_title}} meeting on {{meeting_date}} at {{venue}}.\n\nDate: {{meeting_date}}\nTime: {{meeting_time}}\nVenue: {{venue}}\n\nPlease make every effort to attend. Check-in will be available via GPS or QR code.\n\nKSJI Commandery'
);

SELECT public.upsert_communication_template(
    'general',  -- Frontend template ID
    '{{subject}}',
    '<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>{{subject}}</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
<div style="background: #fafafa; border-radius: 12px; padding: 32px; border-left: 4px solid #6b7280;">
<h2 style="color: #374151; margin-top: 0;">{{subject}}</h2>
<p>{{content}}</p>
<p style="color: #94a3b8; font-size: 12px; margin-top: 32px;">KSJI Commandery</p>
</div></body></html>',
    '{{subject}}\n\n{{content}}\n\nKSJI Commandery'
);

SELECT public.upsert_communication_template(
    'invoice_due',  -- Orchestrator template ID
    '<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Payment Due</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
<div style="background: #f8fafc; border-radius: 12px; padding: 32px; border-left: 4px solid #3b82f6;">
<h2 style="color: #1e293b; margin-top: 0;">Payment Due — {{due_date}}</h2>
<p>Hello {{member_name}},</p>
<p>Your annual assessment payment of <strong>GHS {{amount}}</strong> is due on <strong>{{due_date}}</strong>.</p>
<div style="background: white; padding: 20px; border-radius: 8px; margin: 24px 0;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="color: #64748b; padding: 8px 0;">Assessment Year:</td><td style="font-weight: 600; padding: 8px 0;">{{year}}</td></tr>
<tr><td style="color: #64748b; padding: 8px 0;">Amount Due:</td><td style="font-weight: 600; color: #3b82f6; padding: 8px 0;"><strong>GHS {{amount}}</strong></td></tr>
<tr><td style="color: #64748b; padding: 8px 0;">Due Date:</td><td style="font-weight: 600; color: #ef4444; padding: 8px 0;"><strong>{{due_date}}</strong></td></tr>
</table>
</div>
<p style="color: #64748b;">Please visit the Member App to record your payment or contact a financial registrar for assistance.</p>
<p style="color: #94a3b8; font-size: 12px; margin-top: 32px;">KSJI Commandery — Financial Office</p>
</div></body></html>',
    'Payment Due — {{due_date}}\n\nHello {{member_name}},\n\nYour annual assessment payment of GHS {{amount}} is due on {{due_date}}.\n\nAssessment Year: {{year}}\nAmount Due: GHS {{amount}}\nDue Date: {{due_date}}\n\nPlease visit the Member App to record your payment or contact a financial registrar for assistance.\n\nKSJI Commandery — Financial Office'
);

SELECT public.upsert_communication_template(
    'invoice_overdue',  -- Orchestrator template ID
    '<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Payment Overdue</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
<div style="background: #fef2f2; border-radius: 12px; padding: 32px; border-left: 4px solid #ef4444;">
<h2 style="color: #dc2626; margin-top: 0;">⚠️ Payment Overdue — {{days_overdue}} Days Past Due</h2>
<p>Hello {{member_name}},</p>
<p>Your payment of <strong>GHS {{amount}}</strong> was due on <strong>{{due_date}}</strong>. This is now {{days_overdue}} days overdue.</p>
<div style="background: white; padding: 20px; border-radius: 8px; margin: 24px 0;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="color: #64748b; padding: 8px 0;">Amount Due:</td><td style="font-weight: 600; color: #dc2626; padding: 8px 0;"><strong>GHS {{amount}}</strong></td></tr>
<tr><td style="color: #64748b; padding: 8px 0;">Was Due:</td><td style="font-weight: 600; color: #dc2626; padding: 8px 0;"><strong>{{due_date}}</strong></td></tr>
<tr><td style="color: #64748b; padding: 8px 0;">Days Overdue:</td><td style="font-weight: 600; color: #dc2626; padding: 8px 0;"><strong>{{days_overdue}}</strong></td></tr>
</table>
</div>
<p style="color: #991b1b;">Please settle this outstanding balance promptly or contact a financial registrar.</p>
<p style="color: #94a3b8; font-size: 12px; margin-top: 32px;">KSJI Commandery — Financial Office</p>
</div></body></html>',
    'Payment Overdue — {{days_overdue}} Days Past Due\n\nHello {{member_name}},\n\nYour payment of GHS {{amount}} was due on {{due_date}}. This is now {{days_overdue}} days overdue.\n\nAmount Due: GHS {{amount}}\nWas Due: {{due_date}}\nDays Overdue: {{days_overdue}}\n\nPlease settle this outstanding balance promptly or contact a financial registrar.\n\nKSJI Commandery — Financial Office'
);

SELECT public.upsert_communication_template(
    'meeting_reminder',  -- Orchestrator template ID
    '<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Meeting Reminder</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
<div style="background: #f0fdf4; border-radius: 12px; padding: 32px; border-left: 4px solid #22c55e;">
<h2 style="color: #16a34a; margin-top: 0;">📅 Meeting Reminder</h2>
<p>Hello {{member_name}},</p>
<p>This is a reminder for the upcoming KSJI Commandery meeting.</p>
<div style="background: white; padding: 20px; border-radius: 8px; margin: 24px 0;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="color: #64748b; padding: 8px 0;"><strong>Date:</strong></td><td style="font-weight: 600; padding: 8px 0;">{{meeting_date}}</td></tr>
<tr><td style="color: #64748b; padding: 8px 0;"><strong>Time:</strong></td><td style="font-weight: 600; padding: 8px 0;">{{meeting_time}}</td></tr>
<tr><td style="color: #64748b; padding: 8px 0;"><strong>Venue:</strong></td><td style="font-weight: 600; padding: 8px 0;">{{venue}}</td></tr>
</table>
</div>
<p style="color: #15803d;">Please make every effort to attend. Check-in will be available via GPS or QR code.</p>
<p style="color: #94a3b8; font-size: 12px; margin-top: 32px;">KSJI Commandery</p>
</div></body></html>',
    'Meeting Reminder\n\nHello {{member_name}},\n\nThis is a reminder for the upcoming KSJI Commandery meeting.\n\nDate: {{meeting_date}}\nTime: {{meeting_time}}\nVenue: {{venue}}\n\nPlease make every effort to attend. Check-in will be available via GPS or QR code.\n\nKSJI Commandery'
);

SELECT public.upsert_communication_template(
    'membership_expiry',  -- Orchestrator template ID
    '<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Membership Renewal</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
<div style="background: #fffbeb; border-radius: 12px; padding: 32px; border-left: 4px solid #f59e0b;">
<h2 style="color: #d97706; margin-top: 0;">Membership Renewal Required</h2>
<p>Hello {{member_name}},</p>
<p>Your membership is due for renewal on <strong>{{expiry_date}}</strong>.</p>
<div style="background: white; padding: 20px; border-radius: 8px; margin: 24px 0;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="color: #64748b; padding: 8px 0;">Current Term:</td><td style="font-weight: 600; padding: 8px 0;">{{start_date}} — {{expiry_date}}</td></tr>
<tr><td style="color: #64748b; padding: 8px 0;">Renewal Deadline:</td><td style="font-weight: 600; color: #d97706; padding: 8px 0;"><strong>{{expiry_date}}</strong></td></tr>
</table>
</div>
<p style="color: #92400e;">Please contact a registrar to complete your renewal and update your details.</p>
<p style="color: #94a3b8; font-size: 12px; margin-top: 32px;">KSJI Commandery — Membership Office</p>
</div></body></html>',
    'Membership Renewal Required\n\nHello {{member_name}},\n\nYour membership is due for renewal on {{expiry_date}}.\n\nCurrent Term: {{start_date}} — {{expiry_date}}\nRenewal Deadline: {{expiry_date}}\n\nPlease contact a registrar to complete your renewal and update your details.\n\nKSJI Commandery — Membership Office'
);
