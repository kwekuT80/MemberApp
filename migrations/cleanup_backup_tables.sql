-- =====================================================================
-- CLEANUP MIGRATION: Remove Backup/Development Tables
-- =====================================================================
--
-- PURPOSE: Remove tables created during development that are not part
-- of the production schema. These tables lack proper RLS policies and
-- pose a security risk as "rls_disabled_in_public" warnings indicate.
--
-- WARNING: Ensure you have backed up any data in these tables BEFORE running!
-- Run the dump queries first (see Step 2 above).
--
-- =====================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- DROP ALL BACKUP/DEVELOPMENT TABLES
-- Uncomment only the tables that exist in your database
-- ----------------------------------------------------------------------------

-- Example patterns to check and uncomment if present:
-- DROP TABLE IF EXISTS public._old_financial_payments CASCADE;
-- DROP TABLE IF EXISTS public.backup_members CASCADE;
-- DROP TABLE IF EXISTS public.temp_communication_requests CASCADE;
-- DROP TABLE IF EXISTS public.bk_financial_summary CASCADE;
-- DROP TABLE IF EXISTS public.archive_2024_payments CASCADE;

-- ----------------------------------------------------------------------------
-- CLEANUP ORPHANED FUNCTIONS (if any were created during testing)
-- ----------------------------------------------------------------------------

-- Example: Remove test functions
-- DROP FUNCTION IF EXISTS public.test_payment_calculation();
-- DROP FUNCTION IF EXISTS public.generate_sample_communications();

-- ----------------------------------------------------------------------------
-- VERIFY REMAINING TABLES HAVE RLS ENABLED
-- ----------------------------------------------------------------------------

SELECT
    schemaname || '.' || tablename AS table_name,
    rowsecurity AS has_rls
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false;

-- If any rows are returned above, those tables need:
-- ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- COMMIT (remove if you want to review first)
-- ----------------------------------------------------------------------------
COMMIT;
