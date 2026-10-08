# KSJI Commandery #500 — Database Performance Indexes & RPC Migration

## Purpose
This migration provides high-performance B-Tree indexes and server-side aggregation functions for PostgreSQL on Supabase.
Applying these indexes eliminates full table sequential scans (`Seq Scan`) and accelerates filtered queries across transactions, attendance, roll book entries, and member profiles.

---

## Instructions to Apply
1. Open your **[Supabase Dashboard](https://supabase.com/dashboard)**.
2. Select your project (`pcsslgufwjzvolbtygwc`).
3. Click on the **SQL Editor** tab on the left sidebar.
4. Click **New query**, paste the SQL script below, and click **Run**.

---

## SQL Migration Script

```sql
-- ==============================================================================
-- KSJI Commandery #500: Database Performance Optimization & Index Migration
-- ==============================================================================

-- 1. Financial Transactions & Assessments Indexes
-- Accelerates dues tracking, balance rollover, and annual statement generation
CREATE INDEX IF NOT EXISTS idx_financial_payments_member_year 
  ON financial_payments(member_id, assessment_year);

CREATE INDEX IF NOT EXISTS idx_financial_payments_year 
  ON financial_payments(assessment_year);

CREATE INDEX IF NOT EXISTS idx_financial_assessments_year 
  ON financial_assessments(year);

CREATE INDEX IF NOT EXISTS idx_financial_payments_date 
  ON financial_payments(payment_date DESC);

-- 2. Welfare Transactions Indexes
-- Accelerates Welfare Hub ledger loads, annual contribution summaries, and disbursements
CREATE INDEX IF NOT EXISTS idx_welfare_contributions_member_year 
  ON welfare_contributions(member_id, period_year);

CREATE INDEX IF NOT EXISTS idx_welfare_contributions_year 
  ON welfare_contributions(period_year);

CREATE INDEX IF NOT EXISTS idx_welfare_disbursements_member 
  ON welfare_disbursements(member_id);

CREATE INDEX IF NOT EXISTS idx_welfare_disbursements_date 
  ON welfare_disbursements(disbursement_date DESC);

-- 3. Meeting Attendance & Excuse Requests Indexes
-- Accelerates Meeting Dashboard, GPS/QR check-in verifications, and turnout analytics
CREATE INDEX IF NOT EXISTS idx_attendance_meeting_member 
  ON attendance(meeting_id, member_id);

CREATE INDEX IF NOT EXISTS idx_attendance_member 
  ON attendance(member_id);

CREATE INDEX IF NOT EXISTS idx_absence_requests_meeting_member 
  ON absence_requests(meeting_id, member_id);

CREATE INDEX IF NOT EXISTS idx_meetings_commandery_date 
  ON meetings(commandery_id, date DESC);

-- 4. Members Lookups & Partial Indexes
-- Speeds up unlinked profile matching, active member listing, and birthday reminders
CREATE INDEX IF NOT EXISTS idx_members_unlinked 
  ON members(id) WHERE user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_members_commandery_status 
  ON members(commandery_id, status);

CREATE INDEX IF NOT EXISTS idx_members_birth_month_day 
  ON members(birth_month, birth_day) WHERE status = 'Active';

CREATE INDEX IF NOT EXISTS idx_members_status_active 
  ON members(status) WHERE status = 'Active';

-- 5. Sub-form Foreign Key Indexes
-- Speeds up dossier and member profile loading across sub-tables
CREATE INDEX IF NOT EXISTS idx_positions_member_id 
  ON positions(member_id);

CREATE INDEX IF NOT EXISTS idx_children_member_id 
  ON children(member_id);

CREATE INDEX IF NOT EXISTS idx_dependents_member_id 
  ON dependents(member_id);

CREATE INDEX IF NOT EXISTS idx_degrees_member_id 
  ON degrees(member_id);

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_member_id 
  ON emergency_contacts(member_id);

CREATE INDEX IF NOT EXISTS idx_uniformed_rank_records_member_id 
  ON uniformed_rank_records(member_id);

-- 6. High-Performance Welfare Aggregation RPC
-- Replaces client-side row downloading with direct database-level calculation
CREATE OR REPLACE FUNCTION get_welfare_summary_stats(p_year int DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::int)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'totalContributions', COALESCE((SELECT SUM(amount) FROM welfare_contributions), 0),
    'contributionsThisYear', COALESCE((SELECT SUM(amount) FROM welfare_contributions WHERE period_year = p_year), 0),
    'totalDisbursements', COALESCE((SELECT SUM(amount) FROM welfare_disbursements), 0),
    'disbursementsThisYear', COALESCE((SELECT SUM(amount) FROM welfare_disbursements WHERE EXTRACT(YEAR FROM disbursement_date) = p_year), 0),
    'categoriesCount', (SELECT COUNT(*) FROM welfare_categories WHERE is_active = true)
  );
$$;
```
