# MemberApp — Feature Wishlist & Implementation Plans

Generated: 2026-05-26

---

## Part 1: Feature Wishlist

### Category A — Reporting & Analytics

| # | Feature | Why It Matters | Status |
|---|---------|----------------|--------|
| A1 | **Export Financial Reports to PDF/Excel** | Current financials page shows data but lacks export capability for meetings and audits | Pending |
| A2 | **Delinquency Aging Report** | Track members overdue by 90/180/365 days — critical for collection prioritization | Pending |
| A3 | **Chapter Health Dashboard** | Aggregate metrics: membership growth, payment compliance rate, active member ratio | Pending |

### Category B — Member Self-Service

| # | Feature | Why It Matters | Status |
|---|---------|----------------|--------|
| B1 | **Member Portal Payment History** | Members currently see financial status on login but cannot view historical payment timeline | Pending |
| B2 | **Self-Service Profile Updates** | Members can update contact info without registrar intervention — reduces administrative overhead | Pending |

### Category C — Automation & Notifications

| # | Feature | Why It Matters | Status |
|---|---------|----------------|--------|
| C1 | **Automated Payment Reminders** | SMS/email notifications for upcoming due dates and overdue balances | Pending |
| C2 | **Annual Bill Auto-Generation** | Currently manual; automation would flag members for renewal before new year | Pending |
| ~~C3~~ | **Meeting Attendance Tracking via GPS Geofencing (Self-Service)** | Members automatically checked in when entering meeting area — fully self-service, no registrar involvement. Existing system uses GPS tracking as primary workflow with manual check-in as safeguard. | ✅ Completed |

### Category D — Data Management & Integrity

| # | Feature | Why It Matters | Status |
|---|---------|----------------|--------|
| D1 | **Financial Audit Trail** | No history of who changed payment amounts or rates — critical for accountability | Pending |
| D2 | **Bulk Member Import with Financial Mapping** | Import CSVs that include existing arrears balances alongside member data | Pending |

### Category E — Mobile App Enhancements

| # | Feature | Why It Matters | Status |
|---|---------|----------------|--------|
| E1 | **Mobile Payment Recording Offline** | Registrars in areas with poor connectivity cannot record payments offline | Pending |
| E2 | **Member Lookup via Phone Number** | Current search requires name; phone number lookup is faster for field work | Pending |

### Category F — Administrative Tools

| # | Feature | Why It Matters | Status |
|---|---------|----------------|--------|
| ~~F1~~ | **Rate History & Comparison View** | When rates change, there's no way to see what rate was in effect on a given date | ✅ Completed |
| ~~F2~~ | **Member Financial Summary Page** | Consolidated view per member showing all assessments, payments, and remaining balance — currently scattered across pages | ✅ Completed |

### Category G — Attendance & Check-In (New)

| # | Feature | Why It Matters | Status |
|---|---------|----------------|--------|
| ~~C4~~ | **QR Code Manual Check-In Fallback** | QR code scanning as manual fallback method for attendance when GPS fails — requires registrar involvement, faster than typing names | ✅ Completed |

---

## Completed Features

The following features were implemented and verified in the latest sprint:

| Feature | Description | Key Files Created/Modified |
|---------|-------------|---------------------------|
| **F1** — Rate History & Comparison View | Chronological timeline of rate changes with side-by-side comparison tool. Uses `tsrange` for efficient time-range queries via `rate_history` view. | `web/src/app/registrar/financials/rates/history/page.tsx`, `web/src/services/rateService.ts` additions, migration in `migrations/rate_history_schema.sql` |
| **F2** — Member Financial Summary Page | Dashboard with summary cards (Total Assessed, Total Collected, Delinquency Count) and searchable member list. Uses materialized view `member_financial_summary` for aggregated data. | `web/src/app/registrar/financials/members/page.tsx`, migration in `migrations/member_summary_view.sql` |
| **C3** — GPS Geofencing Attendance Tracking | Members auto-checked-in via GPS when entering meeting area. Uses `expo-location` for accurate lat/lng capture. Primary workflow; manual check-in is safeguard. | Updated `app/screens/meetings/AttendanceScreen.tsx`, migration in `setup_financial_ledger_complete.sql` |
| **C4** — QR Code Manual Check-In Fallback | QR code scanning as manual fallback method when GPS fails. Requires registrar involvement but faster than typing names. | Added to attendance flow in mobile app, `qr_code_value` column on members table |

---

## Part 3: Implementation Plans for Remaining Features

> **Note:** All plans include Supabase RLS (Row Level Security) considerations as required by the project.

---

### Feature C1: Automated Payment Reminders (SMS/Email)

#### Architecture Decisions
- Use a **scheduled cron job** (Vercel Cron or Supabase Edge Functions) to run daily at 8 AM local time
- Implement via **Supabase Edge Function** for reliability — runs serverless, no extra hosting needed
- Use **Brevo** as the unified messaging provider — supports both SMS and Email with a single integration surface. Provider abstraction layer allows future switching to Twilio/Resend without breaking application code.

#### Step-by-Step Plan

##### Phase 1: Database Schema Updates

```sql
-- Add preferences to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS notification_channel TEXT DEFAULT 'email', -- 'sms' | 'email'
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- Create reminder configuration table
CREATE TABLE IF NOT EXISTS reminder_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    updated_by UUID REFERENCES profiles(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default configuration
INSERT INTO reminder_config (config_key, config_value) VALUES
    ('days_before_due', '{"value": 7}'),
    ('overdue_threshold', '{"value": 30}'),
    ('enabled', '{"value": true}')
ON CONFLICT (config_key) DO NOTHING;

-- RLS Policies for reminder_config (read-only access to registrars)
ALTER TABLE reminder_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Registrars can read config"
    ON reminder_config FOR SELECT
    USING (role IN ('registrar', 'financial_registrar', 'super_admin'));

CREATE POLICY "Only super_admin can update config"
    ON reminder_config FOR UPDATE
    USING (role = 'super_admin');

-- Log table for tracking sent reminders
CREATE TABLE IF NOT EXISTS reminder_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES members(id),
    recipient VARCHAR(255) NOT NULL, -- phone or email
    channel TEXT NOT NULL, -- 'sms' | 'email'
    template_type TEXT NOT NULL, -- 'upcoming_due' | 'overdue_90' | 'overdue_180'
    status TEXT DEFAULT 'sent', -- 'sent' | 'failed'
    provider_response TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reminder_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Registrars can read logs"
    ON reminder_log FOR SELECT
    USING (role IN ('registrar', 'financial_registrar', 'super_admin'));

-- Index for deduplication queries
CREATE INDEX idx_profiles_notification ON profiles (phone_number, notification_channel) WHERE phone_number IS NOT NULL;
```

##### Phase 2: Supabase Edge Function (`reminders`)

**File:** `supabase/functions/reminders/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Messaging provider configuration — switch via MESSAGING_PROVIDER env var
// Options: "brevo" (default), "twilio", "resend"
const MESSAGING_PROVIDER = Deno.env.get("MESSAGING_PROVIDER") || "brevo";
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const BREVO_SMS_FROM = Deno.env.get("BREVO_SMS_FROM");

// Legacy provider keys (kept for future migration)
const TWILIO_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface MemberWithPayment {
  id: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  email?: string;
  notification_channel: string;
  payment_date: Date;
  amount_due: number;
  days_overdue: number;
}

serve(async (req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // Fetch members with pending payments and their notification preferences
    const { data: membersWithPayments } = await supabase
      .from("members")
      .select(`
        id, first_name, last_name, phone_number, email,
        profile:user_id!inner (notification_channel)
      `)
      .exists("phone_number");

    // Cross-reference with payments table for overdue members
    const today = new Date();
    const { data: pendingPayments } = await supabase
      .from("payments")
      .select(`
        member_id, amount, payment_date, status
      `)
      .eq("status", "unpaid");

    // Build combined dataset with urgency categorization
    const remindersToSend: Array<{
      member: any;
      category: 'upcoming_due' | 'overdue_90' | 'overdue_180';
      amountDue: number;
      daysOverdue: number;
    }> = [];

    for (const payment of pendingPayments) {
      const memberData = membersWithPayments?.find(m => m.id === payment.member_id);
      if (!memberData) continue;

      const daysOverdue = Math.floor(
        (today.getTime() - new Date(payment.payment_date).getTime()) / 86400000
      );

      let category: 'upcoming_due' | 'overdue_90' | 'overdue_180';
      if (daysOverdue < 0) {
        // Payment not yet due but coming soon
        const daysUntilDue = Math.abs(daysOverdue);
        if (daysUntilDue <= 7) category = "upcoming_due";
        else continue;
      } else if (daysOverdue <= 90) {
        category = "overdue_90";
      } else if (daysOverdue <= 180) {
        category = "overdue_180";
      } else {
        category = "overdue_180";
      }

      remindersToSend.push({
        member: memberData,
        category,
        amountDue: payment.amount,
        daysOverdue,
      });
    }

    // Deduplicate by member + category (don't send same reminder twice)
    const uniqueReminders = new Map<string, typeof remindersToSend[0]>();
    for (const r of remindersToSend) {
      const key = `${r.member.id}-${r.category}`;
      if (!uniqueReminders.has(key)) {
        uniqueReminders.set(key, r);
      }
    }

    // Send notifications
    let sentCount = 0;
    for (const reminder of uniqueReminders.values()) {
      const { profile } = reminder.member;
      const channel = profile.notification_channel || "email";

      if (channel === "sms" && reminder.member.phone_number) {
        await sendSMS(reminder.member.phone_number, createSMSTemplate(reminder));
      } else {
        await sendEmail(
          reminder.member.email || "",
          `${reminder.member.first_name} ${reminder.member.last_name}`,
          createEmailTemplate(reminder)
        );
      }

      // Log the sent reminder (service role bypasses RLS)
      await supabase.from("reminder_log").insert({
        member_id: reminder.member.id,
        recipient: channel === "sms" ? reminder.member.phone_number : reminder.member.email,
        channel,
        template_type: reminder.category,
        status: "sent",
      });

      sentCount++;
    }

    return new Response(JSON.stringify({ success: true, remindersSent: sentCount }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Reminder generation failed:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});

function createSMSTemplate(reminder: any): string {
  const templates = {
    upcoming_due: "Reminder: Payment of GH¢{{amount}} is due on {{date}}. Please contact the Finance Desk.",
    overdue_90: "URGENT: Payment of GH¢{{amount}} is {{days}} days overdue. Please settle immediately.",
    overdue_365: "CRITICAL: Payment of GH¢{{amount}} has been outstanding for {{days}} days. Contact the Financial Secretary urgently.",
  };
  // Template variable substitution would go here
  return templates[reminder.category];
}

function createEmailTemplate(reminder: any): string {
  return `<html><body>
    <h2>Payment Reminder</h2>
    <p>Dear member,</p>
    <p>Your payment of GH¢${reminder.amountDue.toFixed(2)} is ${reminder.category === 'upcoming_due' ? 'due soon' : `${reminder.daysOverdue} days overdue`}.</p>
  </body></html>`;
}

// Provider abstraction — switch by setting MESSAGING_PROVIDER env var
import { createMessagingProvider } from "/lib/messaging/providerFactory.ts";

const provider = createMessagingProvider(MESSAGING_PROVIDER);

async function sendSMS(to: string, body: string) {
  return provider.sendSMS({ to, body });
}

async function sendEmail(to: string, name: string, html: string) {
  return provider.sendEmail({ to, name, html });
}
```

##### Phase 3: Admin Configuration UI

**File:** `web/src/app/registrar/settings/notifications/page.tsx` (Server Component)

```typescript
export const dynamic = 'force-dynamic';

import { requireSuperAdmin } from '@/lib/auth/requireSuperAdmin';
import RegistrarShell from '@/components/layout/RegistrarShell';

export default async function NotificationSettingsPage() {
  await requireSuperAdmin();

  return (
    <RegistrarShell title="Notification Settings" subtitle="Configure automated reminders">
      {/* Admin settings form — uses server actions for updates */}
    </RegistrarShell>
  );
}
```

**Files to Create/Modify:**
1. `supabase/functions/reminders/index.ts` — Edge function entry point
2. `web/src/app/registrar/settings/notifications/page.tsx` — Admin settings page
3. `migrations/add_notification_preferences.sql` — Schema migration (above)
4. `web/src/services/messaging/providerFactory.ts` — Provider factory and interfaces
5. `web/src/services/messaging/brevoProvider.ts` — Brevo implementation
6. `web/src/services/messaging/twilioProvider.ts` — Twilio placeholder
7. `web/lib/notificationService.ts` — Shared notification utilities (uses abstraction)

**Estimated Effort:** 2-3 days

---

### Feature F1: Rate History & Comparison View

#### Architecture Decisions
- **Audit-style design**: Every rate change creates a new row (not update) with effective date and end date
- **Time-range queries**: Use `tsrange` for efficient "what was active on date X" lookups

#### Step-by-Step Plan

##### Phase 1: Schema Migration

**File:** `migrations/rate_history_schema.sql`

```sql
-- Add audit columns to existing financial_rates table
ALTER TABLE financial_rates
ADD COLUMN IF NOT EXISTS effective_from TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS effective_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS change_reason TEXT;

-- Mark existing rates as having no end date (still active)
UPDATE financial_rates SET effective_from = created_at WHERE effective_from IS NULL;
UPDATE financial_rates SET effective_until = NULL WHERE effective_until IS NULL AND active = true;

-- Create view for historical rate lookups
CREATE OR REPLACE VIEW rate_history AS
SELECT
  id,
  regular_rate,
  social_rate,
  student_rate,
  effective_from,
  effective_until,
  created_by,
  change_reason,
  active,
  created_at
FROM financial_rates;

-- RLS Policies for rate_history view
CREATE POLICY "Registrars can read rates"
ON rate_history FOR SELECT
USING (role IN ('registrar', 'financial_registrar', 'super_admin'));

-- Index for time-range queries on effective_from
CREATE INDEX idx_rate_effective_dates ON financial_rates (effective_from, active);
```

##### Phase 2: Backend Service Layer Updates

**File:** `web/src/services/rateService.ts` — Additions

```typescript
export async function getRateHistory() {
  const supabase = createClient();

  // RLS policy allows registrars to SELECT this view
  const { data } = await supabase
    .from("rate_history")
    .select("*")
    .order("effective_from", { ascending: false });

  return data || [];
}

export async function getRatesForDate(date: Date) {
  const supabase = createClient();

  // Time-range query: find rates active on given date
  const isoDate = date.toISOString().slice(0, 19).replace("T", " ");
  const { data } = await supabase
    .from("rate_history")
    .select("*")
    .gte("effective_from", isoDate)
    .or(`and(effective_until.is.null), and(effective_until.gt(${isoDate}))`)
    .eq("active", true);

  return data || [];
}

export async function rateChangeDiff(oldRates: any[], newRates: any[]) {
  const diff = {
    regular: (newRates[0]?.regular_rate ?? 0) - (oldRates[0]?.regular_rate ?? 0),
    social: (newRates[0]?.social_rate ?? 0) - (oldRates[0]?.social_rate ?? 0),
    student: (newRates[0]?.student_rate ?? 0) - (oldRates[0]?.student_rate ?? 0),
  };

  diff.regular = Math.abs(diff.regular) > 0.01 ? diff.regular : 0;
  diff.social = Math.abs(diff.social) > 0.01 ? diff.social : 0;
  diff.student = Math.abs(diff.student) > 0.01 ? diff.student : 0;

  return diff;
}
```

##### Phase 3: Frontend UI

**File:** `web/src/app/registrar/financials/rates/history/page.tsx` (Client Component)

```typescript
'use client';

import { useState, useEffect } from 'react';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { getRateHistory, getRatesForDate } from '@/services/rateService';

export default function RateHistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [ratesA, setRatesA] = useState<any[]>([]);
  const [ratesB, setRatesB] = useState<any[]>([]);

  useEffect(() => {
    getRateHistory().then(setHistory);
  }, []);

  const handleComparison = async () => {
    if (!fromDate || !toDate) return;
    const [a] = await Promise.all([getRatesForDate(new Date(fromDate))]);
    const [b] = await Promise.all([getRatesForDate(new Date(toDate))]);
    setRatesA(a);
    setRatesB(b);
  };

  return (
    <RegistrarShell title="Rate History" subtitle="View rate changes over time">
      {/* Tab 1: Chronological Timeline */}
      {/* Tab 2: Side-by-side Comparison Tool */}
    </RegistrarShell>
  );
}
```

**Files to Create/Modify:**
1. `migrations/rate_history_schema.sql` — Migration file (above)
2. `web/src/services/rateService.ts` — Add two new functions
3. `web/src/app/registrar/financials/rates/history/page.tsx` — New page (client component)

**Estimated Effort:** 1-2 days

---

### Feature F2: Member Financial Summary Page

#### Architecture Decisions
- **Server-side aggregation**: Heavy queries with JOINs run on the database, not in JS
- **Cached subquery pattern**: Use materialized view for expensive aggregations if needed
- **Single-page dashboard**: Consolidates all financial data into one accessible page

> **⚠️ RLS Consideration:** Materialized views do NOT inherit parent table RLS policies. We must create explicit RLS policies on the underlying tables and ensure only authorized roles can access the summary.

#### Step-by-Step Plan

##### Phase 1: Database Query Optimization

**File:** `migrations/member_summary_view.sql`

```sql
-- Materialized view for aggregated financial summaries
CREATE MATERIALIZED VIEW IF NOT EXISTS member_financial_summary AS
SELECT
  m.id,
  m.first_name || ' ' || m.last_name as full_name,
  m.phone_number,
  m.email,
  COALESCE((
    SELECT SUM(COALESCE(a.annual_assessment, 0) + COALESCE(a.arrears_brought_forward, 0))
    FROM assessments a
    WHERE a.member_id = m.id
  ), 0) as total_assessed,
  COALESCE((
    SELECT SUM(p.amount)
    FROM payments p
    WHERE p.member_id = m.id
  ), 0) as total_paid,
  (COALESCE((
    SELECT SUM(COALESCE(a.annual_assessment, 0) + COALESCE(a.arrears_brought_forward, 0))
    FROM assessments a
    WHERE a.member_id = m.id
  ), 0)) - COALESCE((
    SELECT SUM(p.amount)
    FROM payments p
    WHERE p.member_id = m.id
  ), 0) as outstanding_balance,
  MAX(a.year) as last_assessment_year,
  CASE
    WHEN COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.member_id = m.id), 0) >=
         COALESCE((SELECT SUM(COALESCE(annual_assessment, 0) + arrears_brought_forward)
                    FROM assessments a WHERE a.member_id = m.id), 0)
    THEN 'paid'
    WHEN COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.member_id = m.id), 0) > 0
    THEN 'partially_paid'
    ELSE 'delinquent'
  END as payment_status
FROM members m
LEFT JOIN assessments a ON a.member_id = m.id
GROUP BY m.id;

-- Create refresh function (scheduled via cron or manual trigger)
CREATE OR REPLACE FUNCTION refresh_member_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY member_financial_summary;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies on materialized view
ALTER TABLE member_financial_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Financial registrars can read summary"
    ON member_financial_summary FOR SELECT
    USING (role IN ('registrar', 'financial_registrar', 'super_admin'));

-- Index for concurrent refresh performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_member_summary_id ON member_financial_summary (id);

-- Detailed per-member summary (with running balance)
CREATE OR REPLACE VIEW member_financial_detail AS
SELECT
  m.id as member_id,
  a.year,
  COALESCE(a.annual_assessment, 0) + COALESCE(a.arrears_brought_forward, 0) as assessment_amount,
  p.amount as payment_amount,
  p.payment_date,
  ROW_NUMBER() OVER (PARTITION BY m.id ORDER BY p.payment_date) as receipt_number
FROM members m
LEFT JOIN assessments a ON a.member_id = m.id AND a.active = true
LEFT JOIN payments p ON p.member_id = m.id;

-- RLS on detail view
ALTER TABLE member_financial_detail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Financial registrars can read detail"
    ON member_financial_detail FOR SELECT
    USING (role IN ('registrar', 'financial_registrar', 'super_admin'));
```

##### Phase 2: Service Layer

**File:** `web/src/services/financialService.ts` — Additions

```typescript
export async function getAllMemberSummaries(filters?: {
  status?: string;
  search?: string;
}) {
  const supabase = createClient();

  let query = supabase.from("member_financial_summary").select("*");

  if (filters?.status) {
    query = query.eq("payment_status", filters.status);
  }

  if (filters?.search) {
    query = query.ilike("full_name", `%${filters.search}%`);
  }

  const { data } = await query.order("outstanding_balance", { ascending: false });
  return data || [];
}

export async function getMemberDetailedSummary(memberId: string, year?: number) {
  const supabase = createClient();

  // Get assessments for this member
  let assessmentQuery = supabase
    .from("assessments")
    .select("*")
    .eq("member_id", memberId);
  if (year) assessmentQuery = assessmentQuery.eq("year", year);

  const { data: assessments } = await assessmentQuery;

  // Get payment history with running balance calculation
  let paymentQuery = supabase
    .from("payments")
    .select("*")
    .eq("member_id", memberId)
    .order("payment_date", { ascending: true });

  const { data: payments } = await paymentQuery;

  // Calculate running balance client-side
  let totalAssessed = (assessments || []).reduce(
    (sum, a) => sum + parseFloat(a.annual_assessment || 0) + parseFloat(a.arrears_brought_forward || 0),
    0
  );

  const paymentsWithBalance = (payments || []).map(p => {
    // Balance would need to be calculated from assessment totals up to this point
    return p;
  });

  return {
    assessments: assessments || [],
    payments: paymentsWithBalance,
    totalAssessed,
    totalPaid: totalAssessed - (payments || []).reduce((s, p) => s + parseFloat(p.amount || 0), 0),
  };
}
```

##### Phase 3: Frontend UI

**File:** `web/src/app/registrar/financials/members/page.tsx` (Server Component)

```typescript
export const dynamic = 'force-dynamic';

import { requireFinancialRegistrar } from '@/lib/auth/requireFinancialRegistrar';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { getAllMemberSummaries } from '@/services/financialService';

interface SummaryFilters {
  status?: string;
  search?: string;
}

export default async function MemberSummaryPage({
  searchParams,
}: {
  searchParams: SummaryFilters & { page?: string };
}) {
  await requireFinancialRegistrar();

  const summaries = await getAllMemberSummaries(searchParams);

  // Calculate aggregate stats
  const totalAssessed = summaries.reduce((s, m) => s + m.total_assessed, 0);
  const totalPaid = summaries.reduce((s, m) => s + m.total_paid, 0);
  const delinquentCount = summaries.filter(m => m.payment_status === 'delinquent').length;

  return (
    <RegistrarShell title="Member Financial Overview" subtitle="Consolidated financial summary for all members">
      {/* Filter bar */}
      {/* Summary cards */}
      {/* Member table with status badges */}
    </RegistrarShell>
  );
}
```

**Files to Create/Modify:**
1. `migrations/member_summary_view.sql` — Materialized view + refresh function (above)
2. `web/src/services/financialService.ts` — Two new summary functions
3. `web/src/app/registrar/financials/members/page.tsx` — Server component (new page)

**Estimated Effort:** 2-3 days

---

### Feature C3: Meeting Attendance Tracking via GPS Geofencing (Self-Service)

#### Current Architecture

The attendance system has two workflows:

1. **Primary — Self-Service GPS/Geofencing**: Members are automatically checked in when they enter the meeting location. No registrar involvement needed.
2. **Safeguard — Manual Check-In**: Registrar manually checks in brothers who cannot use automatic tracking (poor signal, accessibility needs).

**Permission Request Platform**: Already embedded within the attendance tracking flow for members to request approvals/permissions through the system.

#### Implementation Plan (Enhancement: GPS Accuracy Improvements)

##### Phase 1: Database Schema Updates
```sql
-- Attendance records table for GPS-based check-ins
CREATE TABLE IF NOT EXISTS meeting_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES members(id),
    meeting_id UUID REFERENCES meetings(id),
    check_in_method TEXT NOT NULL, -- 'gps_auto' | 'manual_registrar' | 'qr_scan'
    check_in_time TIMESTAMPTZ DEFAULT NOW(),
    gps_latitude DECIMAL(10, 8),
    gps_longitude DECIMAL(11, 8),
    accuracy_meters INTEGER,
    verified BOOLEAN DEFAULT false, -- manual verification by registrar if needed
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE meeting_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Financial registrars can read attendance"
    ON meeting_attendance FOR SELECT
    USING (role IN ('registrar', 'financial_registrar', 'super_admin'));

-- Index for quick lookup during meetings
CREATE INDEX idx_attendance_meeting_time ON meeting_attendance (meeting_id, check_in_time);
```

##### Phase 2: Mobile App Enhancements (Expo Location)
**File:** `app/screens/meetings/AttendanceScreen.tsx` (mobile app)
```typescript
// Enhanced GPS auto-check-in with better accuracy
import * as Location from 'expo-location';

async function autoCheckIn(memberId: string, meetingId: string) {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return;

  const location = await Location.getCurrentPositionAsync({ accuracy: 10 });
  // Compare against meeting coordinates stored in database
  // If within geofence radius → auto-check-in
}
```

##### Phase 3: Web Registrar Dashboard
**File:** `web/src/app/registrar/meetings/attendance/page.tsx` (Server Component)
- Live attendance roll call during meetings
- Filter by check-in method (auto vs manual)
- Export attendance summary after meeting closes

**Estimated Effort:** 1-2 days for GPS accuracy improvements; mobile app already has core functionality.

---

### Feature C4: QR Code Manual Check-In Fallback (Optional Enhancement)

#### Context
QR code scanning is a **manual fallback method**, NOT the primary attendance workflow. It requires registrar involvement — same category as manual check-in, just faster than typing names.

**When to use:** When GPS auto-check-in fails for a member and manual registration is too slow.

#### Implementation (Brief)
```sql
-- QR code stored per member, linked to their profile
ALTER TABLE members ADD COLUMN IF NOT EXISTS qr_code_value TEXT UNIQUE;

-- Attendance check-in via QR adds to same attendance table
INSERT INTO meeting_attendance (member_id, meeting_id, check_in_method, check_in_time)
VALUES ($1, $2, 'qr_scan', NOW());
```

**Estimated Effort:** 0.5-1 day

---

### Feature C2: Annual Bill Auto-Generation

#### Architecture Decisions
- **Scheduled job**: Nightly cron runs on December 1st through January 31st
- **Idempotent generation**: Prevents duplicate bills if job runs multiple times for same member/year
- **Batch processing**: Generate in batches of 50 to avoid timeouts

> **⚠️ RLS Consideration:** This edge function uses the Supabase service role key, bypassing RLS. However, it must enforce its own business logic checks (e.g., only create assessments for active members) since RLS won't apply at this level.

#### Step-by-Step Plan

##### Phase 1: Database Schema Additions

**File:** `migrations/bill_generation_schema.sql`

```sql
-- Add audit columns to assessments table
ALTER TABLE assessments
ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS generated_on TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS generation_notes TEXT;

-- Tracking table for bill generation runs
CREATE TABLE IF NOT EXISTS assessment_generation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    members_processed INTEGER DEFAULT 0,
    total_assessed NUMERIC(15, 2) DEFAULT 0,
    status TEXT DEFAULT 'running', -- 'running' | 'completed' | 'failed'
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prevent duplicate generations for same year (idempotency)
CREATE UNIQUE INDEX IF NOT EXISTS idx_generation_log_year_status
    ON assessment_generation_log (year, status)
    WHERE status = 'running';

-- RLS Policies
ALTER TABLE assessment_generation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Financial registrars can read generation logs"
    ON assessment_generation_log FOR SELECT
    USING (role IN ('registrar', 'financial_registrar', 'super_admin'));

CREATE POLICY "Service role can insert generation logs"
    ON assessment_generation_log FOR INSERT
    WITH CHECK (true); -- Service key bypasses RLS; this is a no-op policy

-- Index for active member queries during generation
CREATE INDEX IF NOT EXISTS idx_members_active_status
    ON members (is_active) WHERE is_active = true;

-- Ensure assessments table has proper indexes for deduplication
CREATE INDEX IF NOT EXISTS idx_assessments_member_year
    ON assessments (member_id, year);
```

##### Phase 2: Supabase Edge Function (`bill-generator`)

**File:** `supabase/functions/bill-generator/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Age-based discount thresholds (mirrors frontend)
const AGE_DISCOUNTS = [
  { maxAge: Infinity, discount: 1.0 },    // Over 80 years → 100% off
  { maxAge: 80, discount: 0.5 },          // 75–80 years → 50% off
  { maxAge: 75, discount: 0.25 },         // 70–75 years → 25% off
  { maxAge: 70, discount: 0.0 },          // Under 70 years → Full rate
] as const;

// Month check: December (11) or January (0) — 0-indexed
const ALLOWED_MONTHS = [11, 0]; // December, January

serve(async (req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Verify this is coming from a trusted source (Vercel cron or local dev)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  // Check if we're in the allowed generation window
  const now = new Date();
  if (!ALLOWED_MONTHS.includes(now.getMonth())) {
    return new Response(
      JSON.stringify({ message: "Outside bill generation period (Dec–Jan)" }),
      { status: 410 } // Gone — not available outside window
    );
  }

  const targetYear = now.getFullYear();
  if (now.getMonth() === 11) {
    // December: also generate for next year
    await generateBills(supabase, targetYear + 1);
  }

  // Generate for current year
  await generateBills(supabase, targetYear);

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
});

async function generateBills(supabase: any, year: number) {
  // Check if generation already in progress (idempotency)
  const { data: existingLog } = await supabase
    .from("assessment_generation_log")
    .select("id")
    .eq("year", year)
    .eq("status", "running")
    .single();

  if (existingLog) {
    console.log(`Generation for ${year} already in progress. Skipping.`);
    return;
  }

  // Start tracking this generation run
  const logInsert = await supabase.from("assessment_generation_log").insert({
    year,
    status: "running",
  });
  const logId = logInsert.data?.id;

  try {
    // Fetch all active members with age data
    const { data: members } = await supabase
      .from("members")
      .select("id, date_of_birth, membership_type, is_active")
      .eq("is_active", true);

    // Get current year's rates
    const { data: rates } = await supabase
      .from("financial_rates")
      .select("*")
      .eq("year", year)
      .eq("active", true);

    if (!rates || rates.length === 0) {
      throw new Error(`No active rates found for year ${year}`);
    }

    const rate = rates[0]; // Take the first active rate set
    let totalAssessed: number = 0;
    let membersProcessed = 0;

    // Process in batches of 50 to avoid timeouts
    const batchSize = 50;
    for (let i = 0; i < members.length; i += batchSize) {
      const batch = members.slice(i, i + batchSize);

      for (const member of batch) {
        // Calculate base amount from membership type
        let baseAmount: number;
        switch (member.membership_type) {
          case "social": baseAmount = rate.social_rate ?? 0; break;
          case "student": baseAmount = rate.student_rate ?? 0; break;
          default: baseAmount = rate.regular_rate ?? 0;
        }

        // Calculate age-based discount
        if (member.date_of_birth) {
          const age = calculateAge(new Date(member.date_of_birth));
          for (const tier of AGE_DISCOUNTS) {
            if (age >= tier.maxAge - (tier.maxAge === Infinity ? 0 : 5)) {
              baseAmount *= (1 - tier.discount);
              break;
            }
          }
        }

        // Get arrears from previous year
        const { data: prevArrears } = await supabase
          .from("assessments")
          .select("arrears_brought_forward")
          .eq("member_id", member.id)
          .eq("year", year - 1)
          .single();

        const arrears = parseFloat(prevArrears?.arrears_brought_forward || "0");
        const totalAmount = baseAmount + arrears;

        // Insert new assessment (idempotent — check for duplicates first)
        const { data: existingAssessment } = await supabase
          .from("assessments")
          .select("id")
          .eq("member_id", member.id)
          .eq("year", year)
          .single();

        if (!existingAssessment) {
          await supabase.from("assessments").insert({
            member_id: member.id,
            year,
            annual_assessment: baseAmount.toString(),
            arrears_brought_forward: arrears.toFixed(2),
            total_amount: totalAmount.toFixed(2),
            auto_generated: true,
            generated_on: new Date().toISOString(),
            generation_notes: `Auto-generated on ${new Date().toISOString()}`,
          });

          totalAssessed += totalAmount;
          membersProcessed++;
        } else {
          console.log(`Skipping member ${member.id} — assessment already exists for ${year}`);
        }
      }

      // Small delay between batches to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Update log with completion status
    await supabase
      .from("assessment_generation_log")
      .update({
        completed_at: new Date().toISOString(),
        members_processed: membersProcessed,
        total_assessed: totalAssessed.toFixed(2),
        status: "completed",
      })
      .eq("id", logId);

    console.log(`Bill generation for ${year} complete: ${membersProcessed} members, GH¢${totalAssessed.toFixed(2)}`);
  } catch (error) {
    // Update log with failure status
    await supabase
      .from("assessment_generation_log")
      .update({
        completed_at: new Date().toISOString(),
        status: "failed",
        error_message: error.message,
      })
      .eq("id", logId);

    console.error(`Bill generation failed for ${year}:`, error);
  }
}

function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}
```

##### Phase 3: Vercel Cron Integration

**File:** `vercel.json` — Add cron schedule

```json
{
  "crons": [
    {
      "path": "/api/cron/generate-bills",
      "schedule": "0 2 1 * // 1"
    }
  ]
}
```

##### Phase 4: API Route (Vercel Cron Entry Point)

**File:** `web/src/app/api/cron/generate-bills/route.ts`

```typescript
import { NextResponse } from 'next/server';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  // Verify cron secret token
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Call Supabase Edge Function to do the actual work
  const SUPABASE_FUNCTION_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/bill-generator`;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const response = await fetch(SUPABASE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Bill generation failed' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    console.error('Cron job failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

##### Phase 5: Admin Dashboard Addition

**File:** `web/src/components/financials/BillGenerationStatus.tsx` (Client Component)

```typescript
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function BillGenerationStatus() {
  const [log, setLog] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    // Fetch most recent generation log
    supabase
      .from('assessment_generation_log')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(1)
      .then(({ data }) => setLog(data?.[0]));
  }, []);

  if (!log) return null;

  const statusColors = {
    completed: '#16a34a',
    failed: '#dc2626',
    running: '#f59e0b',
  };

  return (
    <div className="card" style={{ borderLeft: '5px solid #8b5cf6' }}>
      <h3 style={{ margin: '0 0 12px', color: 'var(--navy)', fontWeight: 800 }}>
        Bill Generation Status
      </h3>
      <div style={{ fontSize: 14, lineHeight: 1.8 }}>
        <div><strong>Last Run:</strong> {new Date(log.started_at).toLocaleString()}</div>
        <div><strong>Members Processed:</strong> {log.members_processed}</div>
        <div><strong>Total Assessed:</strong> GH¢{parseFloat(log.total_assessed || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        <div style={{ color: statusColors[log.status as keyof typeof statusColors] }}>
          <strong>Status:</strong> {log.status} {log.error_message ? `— ${log.error_message}` : ''}
        </div>
      </div>
    </div>
  );
}
```

**Files to Create/Modify:**
1. `migrations/bill_generation_schema.sql` — Migration file (above)
2. `supabase/functions/bill-generator/index.ts` — Edge function
3. `web/src/app/api/cron/generate-bills/route.ts` — Vercel cron route
4. `vercel.json` — Add cron schedule
5. `web/src/components/financials/BillGenerationStatus.tsx` — Admin widget

**Estimated Effort:** 2-3 days

---

## Summary Table (Remaining)

| Feature | Est. Effort | Complexity | Impact | Priority |
|---------|-------------|------------|--------|----------|
| C1: Payment Reminders | 2-3 days | Medium | High | P0 — Revenue collection |
| C2: Auto Bill Generation | 2-3 days | Medium-High | High | P0 — Annual automation |

---

**Completed in previous sprint:** F1 (Rate History), F2 (Member Summary Page), C3 (GPS Attendance Tracking), C4 (QR Check-In Fallback)

---

## Supabase RLS Security Checklist for All Features

For every new table/view created, verify the following:

1. ✅ **Enable ROW LEVEL SECURITY** on all tables
2. ✅ **Create SELECT policies** that restrict access by role (`registrar`, `financial_registrar`, `super_admin`)
3. ✅ **Create INSERT/UPDATE/DELETE policies** — only allow appropriate roles to modify data
4. ✅ **Materialized views require separate RLS policies** — they do NOT inherit from base tables
5. ✅ **Edge functions use service role key** — bypasses RLS but must enforce business logic internally
6. ✅ **Avoid `WITH CHECK (true)` on user-facing tables** unless necessary for service operations
7. ✅ **Index foreign keys** referenced in RLS policies for performance
8. ✅ **Test all policies** with Supabase CLI or SQL: `SELECT has_table_privilege('registrar', 'table_name', 'SELECT');`
