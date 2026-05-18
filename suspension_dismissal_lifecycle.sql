-- =======================================================
-- MIGRATION: Add Suspension, Dismissal & Reinstatement Fields
-- =======================================================

ALTER TABLE public.members ADD COLUMN IF NOT EXISTS date_of_suspension DATE;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS date_of_dismissal DATE;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS date_of_reinstatement DATE;

-- Comment for documentation
COMMENT ON COLUMN public.members.date_of_suspension IS 'The date on which the member was suspended.';
COMMENT ON COLUMN public.members.date_of_dismissal IS 'The date on which the member was dismissed.';
COMMENT ON COLUMN public.members.date_of_reinstatement IS 'The date on which the suspended/dismissed member was reinstated to Active status.';
