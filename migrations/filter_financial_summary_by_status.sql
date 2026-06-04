-- ============================================================
-- FIX: Filter Financial Summary by Member Status (Issue)
-- Excludes dismissed, transferred-out, and deceased members
-- from financial summaries and dashboards.
-- ============================================================

-- Recreate the view with status filtering applied
DROP VIEW IF EXISTS public.member_financial_summary CASCADE;

CREATE OR REPLACE VIEW public.member_financial_summary
WITH (security_invoker = true) AS
WITH member_financial_base AS (
  SELECT
    m.id,
    m.first_name || ' ' || m.surname AS full_name,
    m.phone_number,
    m.email,
    -- Sum of all annual assessments + arrears of the earliest year (prevents double-billing cumulative arrears)
    COALESCE((
      SELECT SUM(COALESCE(a.annual_assessment, 0))
      FROM public.financial_assessments a WHERE a.member_id = m.id
    ), 0) +
    COALESCE((
      SELECT a.arrears_brought_forward
      FROM public.financial_assessments a WHERE a.member_id = m.id
      ORDER BY a.year ASC LIMIT 1
    ), 0) AS total_assessed,
    -- Sum of all payments
    COALESCE((
      SELECT SUM(p.amount) FROM public.financial_payments p WHERE p.member_id = m.id
    ), 0) AS total_paid,
    (SELECT MAX(a.year) FROM public.financial_assessments a WHERE a.member_id = m.id)
      AS last_assessment_year
  FROM public.members m
  -- FIX: Exclude dismissed, transferred-out, or deceased members from financial summaries
  WHERE m.status NOT IN ('Dismissed', 'Transfer-Out', 'Deceased')
)
SELECT
  id,
  full_name,
  phone_number,
  email,
  total_assessed,
  total_paid,
  (total_assessed - total_paid) AS outstanding_balance,
  last_assessment_year,
  CASE
    WHEN total_paid >= total_assessed THEN 'paid'
    WHEN total_paid > 0 THEN 'partially_paid'
    ELSE 'delinquent'
  END AS payment_status
FROM member_financial_base;

-- Grant SELECT on the updated view
GRANT SELECT ON VIEW public.member_financial_summary TO authenticated;
