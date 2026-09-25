-- =====================================================================
-- MGLSD Labour Directorate Diagnostic Interview Application
-- TRANSFORMATIVE Programme – Ministry of Gender, Labour and Social Development
-- Security Hardening: Profile Role Escalation Prevention on Signup and Insert
-- Migration: 20260925_prevent_profile_role_escalation.sql
-- =====================================================================

-- 1. HARDEN AUTO-CREATE PROFILE TRIGGER FUNCTION (handle_new_user)
-- Ensure newly created auth users always receive the least-privileged 'interviewer'
-- role regardless of user-supplied raw_user_meta_data.
-- Preserves user-supplied metadata for full_name and department_unit.
-- Sets an explicit, safe search_path to prevent search_path hijacking in SECURITY DEFINER context.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, department_unit)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
        'interviewer',
        COALESCE(NEW.raw_user_meta_data->>'department_unit', 'Labour Directorate')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. HARDEN ROW-LEVEL SECURITY (RLS) INSERT POLICIES FOR PROFILES
-- Drop the insecure insert policy "Admins can insert profiles" which allowed
-- any user to insert their own profile with arbitrary roles via WITH CHECK (public.is_admin() OR auth.uid() = id).
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile as interviewer" ON public.profiles;

-- Policy 2a: Only authenticated users who are administrators may insert profiles for any user
-- with any valid role (preserving admin staff provisioning workflows).
CREATE POLICY "Admins can insert profiles"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

-- Policy 2b: Authenticated non-admin users may only insert their own profile,
-- strictly constrained to the least-privileged 'interviewer' role.
CREATE POLICY "Users can insert own profile as interviewer"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = id
        AND role = 'interviewer'
    );
