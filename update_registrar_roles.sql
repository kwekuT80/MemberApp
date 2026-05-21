-- ========================================================
-- UPDATE REGISTRAR ROLES FOR SEPARATION OF DUTIES
-- ========================================================
-- Run this in your Supabase SQL Editor to:
--   1. Update the role CHECK constraint to include new roles
--   2. Update security functions for RBAC
-- ========================================================

-- 1. Update the profiles role CHECK constraint to allow all valid roles
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('member', 'registrar', 'financial_registrar', 'super_admin'));

-- 2. Update is_registrar() security helper
-- Allows 'registrar' (Admin) and 'super_admin' roles.
CREATE OR REPLACE FUNCTION public.is_registrar()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (role = 'registrar' OR role = 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update is_financial_registrar() security helper
-- Allows 'financial_registrar' and 'super_admin' roles.
CREATE OR REPLACE FUNCTION public.is_financial_registrar()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (role = 'financial_registrar' OR role = 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Promote a user to super_admin (run separately, replace email as needed)
-- UPDATE public.profiles SET role = 'super_admin' WHERE email = 'YOUR_EMAIL@example.com';

SELECT 'Registrar security functions and role constraint updated successfully!' AS status;
