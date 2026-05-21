-- ========================================================
-- UPDATE REGISTRAR ROLES FOR SEPARATION OF DUTIES
-- ========================================================
-- Run this in your Supabase SQL Editor to update security functions
-- and establish clear role-based access control.
-- ========================================================

-- 1. Update is_registrar() security helper
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

-- 2. Update is_financial_registrar() security helper
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

-- 3. (Optional) SQL to set your account to super_admin (superuser)
-- UPDATE public.profiles SET role = 'super_admin' WHERE email = 'YOUR_EMAIL@example.com';

SELECT 'Registrar security functions updated successfully!' AS status;
