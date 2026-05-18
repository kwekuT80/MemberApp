-- ========================================================
-- RLS POLICIES FOR MEETINGS, ATTENDANCE & ABSENCE REQUESTS
-- Run this in your Supabase SQL Editor to grant permissions.
-- ========================================================

-- --------------------------------------------------------
-- 1. Meetings Table Policies
-- --------------------------------------------------------
DROP POLICY IF EXISTS "Allow select on meetings for authenticated users" ON public.meetings;
DROP POLICY IF EXISTS "Allow write on meetings for registrars" ON public.meetings;

-- Allow all logged-in users to view scheduled meetings
CREATE POLICY "Allow select on meetings for authenticated users" 
    ON public.meetings FOR SELECT 
    TO authenticated 
    USING (true);

-- Allow only registrars to schedule or edit meetings
CREATE POLICY "Allow write on meetings for registrars" 
    ON public.meetings FOR ALL 
    TO authenticated 
    USING (public.is_registrar()) 
    WITH CHECK (public.is_registrar());


-- --------------------------------------------------------
-- 2. Attendance Table Policies
-- --------------------------------------------------------
DROP POLICY IF EXISTS "Allow select on attendance for authenticated users" ON public.attendance;
DROP POLICY IF EXISTS "Allow insert on attendance for members" ON public.attendance;
DROP POLICY IF EXISTS "Allow write on attendance for registrars" ON public.attendance;

-- Allow all logged-in users to view attendance logs
CREATE POLICY "Allow select on attendance for authenticated users" 
    ON public.attendance FOR SELECT 
    TO authenticated 
    USING (true);

-- Allow members to log their own self check-ins (GPS)
CREATE POLICY "Allow insert on attendance for members" 
    ON public.attendance FOR INSERT 
    TO authenticated 
    WITH CHECK (
        member_id = (SELECT member_id FROM public.profiles WHERE id = auth.uid())
    );

-- Allow registrars to fully manage all attendance records
CREATE POLICY "Allow write on attendance for registrars" 
    ON public.attendance FOR ALL 
    TO authenticated 
    USING (public.is_registrar()) 
    WITH CHECK (public.is_registrar());


-- --------------------------------------------------------
-- 3. Absence Requests Table Policies
-- --------------------------------------------------------
DROP POLICY IF EXISTS "Allow select on absence_requests for authenticated users" ON public.absence_requests;
DROP POLICY IF EXISTS "Allow insert on absence_requests for members" ON public.absence_requests;
DROP POLICY IF EXISTS "Allow write on absence_requests for registrars" ON public.absence_requests;

-- Allow all logged-in users to see excuse requests
CREATE POLICY "Allow select on absence_requests for authenticated users" 
    ON public.absence_requests FOR SELECT 
    TO authenticated 
    USING (true);

-- Allow members to submit excuse requests for themselves
CREATE POLICY "Allow insert on absence_requests for members" 
    ON public.absence_requests FOR INSERT 
    TO authenticated 
    WITH CHECK (
        member_id = (SELECT member_id FROM public.profiles WHERE id = auth.uid())
    );

-- Allow registrars to fully manage and review excuse requests
CREATE POLICY "Allow write on absence_requests for registrars" 
    ON public.absence_requests FOR ALL 
    TO authenticated 
    USING (public.is_registrar()) 
    WITH CHECK (public.is_registrar());
