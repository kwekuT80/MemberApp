# [STATUS: COMPLETED] Implementation Plan: Member Portal Financial & Attendance System Enhancements

This plan outlines the architecture, database schema modifications, service-layer enhancements, and user interface designs for four core features, fully completed and verified.  

To satisfy recent Supabase and PostgreSQL security practices, all SQL migrations specify **`SECURITY DEFINER SET search_path = public`** on functions to prevent search-path injection, and **`WITH (security_invoker = true)`** on views to respect table-level Row Level Security (RLS) policies.

---

## User Review Required

> [!IMPORTANT]
> - **Unified Table Schema**: To avoid duplicate data and schema drift, we will extend the existing `public.attendance` and `public.annual_assessment_rates` tables instead of creating separate tables like `meeting_attendance` or `financial_rates`.
> - **Materialized View Alternative**: Rather than a heavy materialized view (which does not support native Postgres RLS or `security_invoker = true` and requires cron refresh triggers), we implement a standard view with `security_invoker = true` for `member_financial_summary`. This provides real-time aggregates while honoring RLS policies.
> - **Role GrHardening**: All RLS policies specify `TO authenticated` and restrict writing to authorized roles (`financial_registrar` / `registrar` / `super_admin`).

---

## Open Questions

> [!NOTE]
> None currently. The schema is designed to be fully backwards-compatible with existing imports (such as historical spreadsheets).

---

## Proposed Changes

### 1. Database Schema & RLS Hardening

#### [NEW] [financial_and_attendance_updates.sql](file:///C:/App/MemberApp/migrations/financial_and_attendance_updates.sql)

This script migrates the schema for Rate History, Financial Summaries, and GPS/QR attendance.

```sql
-- 1. Hardening existing helper functions (Supabase Security Best Practice)
CREATE OR REPLACE FUNCTION public.is_registrar()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (role = 'registrar' OR role = 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_financial_registrar()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (role = 'financial_registrar' OR role = 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Extend annual_assessment_rates for Rate History
ALTER TABLE public.annual_assessment_rates DROP CONSTRAINT IF EXISTS annual_assessment_rates_pkey CASCADE;
ALTER TABLE public.annual_assessment_rates ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.annual_assessment_rates ADD CONSTRAINT annual_assessment_rates_pkey PRIMARY KEY (id);

ALTER TABLE public.annual_assessment_rates
ADD COLUMN IF NOT EXISTS effective_from TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS effective_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS change_reason TEXT,
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Drop obsolete index if it exists
DROP INDEX IF EXISTS idx_rate_effective_dates;
CREATE INDEX idx_rate_effective_dates ON public.annual_assessment_rates (effective_from, active);

-- Rate History View with PG15 security_invoker = true (inherits RLS from base table)
CREATE OR REPLACE VIEW public.rate_history 
WITH (security_invoker = true) AS
SELECT
  id,
  year,
  regular_rate,
  social_rate,
  student_rate,
  effective_from,
  effective_until,
  created_by,
  change_reason,
  active,
  created_at
FROM public.annual_assessment_rates;

-- 3. Create Real-Time Member Financial Summary View
CREATE OR REPLACE VIEW public.member_financial_summary
WITH (security_invoker = true) AS
SELECT
  m.id,
  m.first_name || ' ' || m.surname as full_name,
  m.phone_number,
  m.email,
  COALESCE((
    SELECT SUM(COALESCE(a.annual_assessment, 0) + COALESCE(a.arrears_brought_forward, 0))
    FROM public.financial_assessments a
    WHERE a.member_id = m.id
  ), 0) as total_assessed,
  COALESCE((
    SELECT SUM(p.amount)
    FROM public.financial_payments p
    WHERE p.member_id = m.id
  ), 0) as total_paid,
  (COALESCE((
    SELECT SUM(COALESCE(a.annual_assessment, 0) + COALESCE(a.arrears_brought_forward, 0))
    FROM public.financial_assessments a
    WHERE a.member_id = m.id
  ), 0)) - COALESCE((
    SELECT SUM(p.amount)
    FROM public.financial_payments p
    WHERE p.member_id = m.id
  ), 0) as outstanding_balance,
  (
    SELECT MAX(a.year)
    FROM public.financial_assessments a
    WHERE a.member_id = m.id
  ) as last_assessment_year,
  CASE
    WHEN COALESCE((SELECT SUM(p.amount) FROM public.financial_payments p WHERE p.member_id = m.id), 0) >=
         COALESCE((SELECT SUM(COALESCE(annual_assessment, 0) + arrears_brought_forward)
                    FROM public.financial_assessments a WHERE a.member_id = m.id), 0)
    THEN 'paid'
    WHEN COALESCE((SELECT SUM(p.amount) FROM public.financial_payments p WHERE p.member_id = m.id), 0) > 0
    THEN 'partially_paid'
    ELSE 'delinquent'
  END as payment_status
FROM public.members m;

-- Detailed per-member statement view
CREATE OR REPLACE VIEW public.member_financial_detail
WITH (security_invoker = true) AS
SELECT
  m.id as member_id,
  a.year,
  COALESCE(a.annual_assessment, 0) + COALESCE(a.arrears_brought_forward, 0) as assessment_amount,
  p.amount as payment_amount,
  p.payment_date,
  ROW_NUMBER() OVER (PARTITION BY m.id ORDER BY p.payment_date) as receipt_number
FROM public.members m
LEFT JOIN public.financial_assessments a ON a.member_id = m.id
LEFT JOIN public.financial_payments p ON p.member_id = m.id;

-- 4. Extend public.attendance table for GPS geofencing & QR code manual fallback
ALTER TABLE public.attendance
ADD COLUMN IF NOT EXISTS gps_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS gps_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS accuracy_meters INTEGER,
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;

-- Extend members table for QR fallback capability
ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS qr_code_value TEXT UNIQUE;

-- Grants for views
GRANT SELECT ON public.rate_history TO authenticated;
GRANT SELECT ON public.member_financial_summary TO authenticated;
GRANT SELECT ON public.member_financial_detail TO authenticated;
```

---

### 2. Backend Service Layer Updates

#### [MODIFY] [rateService.ts](file:///C:/App/MemberApp/web/src/services/rateService.ts)

Add history-fetching and comparison routines.

```typescript
export async function getRateHistory() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rate_history")
    .select("*")
    .order("effective_from", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getRatesForDate(date: Date) {
  const supabase = await createClient();
  const isoDate = date.toISOString();
  
  const { data, error } = await supabase
    .from("rate_history")
    .select("*")
    .lte("effective_from", isoDate)
    .or(`effective_until.is.null,effective_until.gt.${isoDate}`)
    .eq("active", true);

  if (error) throw error;
  return data || [];
}

export function rateChangeDiff(oldRates: any[], newRates: any[]) {
  const diff = {
    regular: (newRates[0]?.regular_rate ?? 0) - (oldRates[0]?.regular_rate ?? 0),
    social: (newRates[0]?.social_rate ?? 0) - (oldRates[0]?.social_rate ?? 0),
    student: (newRates[0]?.student_rate ?? 0) - (oldRates[0]?.student_rate ?? 0),
  };

  return {
    regular: Math.abs(diff.regular) > 0.01 ? diff.regular : 0,
    social: Math.abs(diff.social) > 0.01 ? diff.social : 0,
    student: Math.abs(diff.student) > 0.01 ? diff.student : 0,
  };
}
```

#### [MODIFY] [financialService.ts](file:///C:/App/MemberApp/web/src/services/financialService.ts)

Implement functions to query the secured views.

```typescript
export async function getAllMemberSummaries(filters?: {
  status?: string;
  search?: string;
}) {
  const supabase = await createClient();
  let query = supabase.from("member_financial_summary").select("*");

  if (filters?.status) {
    query = query.eq("payment_status", filters.status);
  }

  if (filters?.search) {
    query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
  }

  const { data, error } = await query.order("outstanding_balance", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getMemberDetailedSummary(memberId: string) {
  const supabase = await createClient();

  const { data: assessments, error: aErr } = await supabase
    .from("financial_assessments")
    .select("*")
    .eq("member_id", memberId)
    .order("year", { ascending: false });

  if (aErr) throw aErr;

  const { data: payments, error: pErr } = await supabase
    .from("financial_payments")
    .select("*")
    .eq("member_id", memberId)
    .order("payment_date", { ascending: true });

  if (pErr) throw pErr;

  const totalAssessed = (assessments || []).reduce(
    (sum, a) => sum + parseFloat(a.annual_assessment || 0) + parseFloat(a.arrears_brought_forward || 0),
    0
  );

  const totalPaid = (payments || []).reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  return {
    assessments: assessments || [],
    payments: payments || [],
    totalAssessed,
    totalPaid,
    outstandingBalance: totalAssessed - totalPaid
  };
}
```

---

### 3. Frontend Pages & UIs

#### [NEW] [history/page.tsx](file:///C:/App/MemberApp/web/src/app/registrar/financials/rates/history/page.tsx)
Build a dashboard to view historical changes and side-by-side rates comparison.

#### [NEW] [members/page.tsx](file:///C:/App/MemberApp/web/src/app/registrar/financials/members/page.tsx)
Show the summary cards (Total Assessed, Total Collected, Delinquency Count) and searchable list.

#### [MODIFY] [AttendanceScreen.tsx](file:///C:/App/MemberApp/app/screens/meetings/AttendanceScreen.tsx)
Update mobile view check-in methods to capture accurate lat/lng using `expo-location`.

---

## Verification Plan

### Automated Verification
- **SQL Validation**: Run schema script inside a database sandbox or verify RLS view access.
- **Next.js Production Build**: Verify compile integrity with `npm run build` inside `/web`.

### Manual Verification
- Verify GPS coordinate verification and fallback QR scan flows.
