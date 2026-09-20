-- =====================================================================
-- MGLSD Labour Directorate Diagnostic Interview Application
-- TRANSFORMATIVE Programme – Ministry of Gender, Labour and Social Development
-- Security Hardening: Profiles Role Escalation Prevention
-- Migration: 20260920_harden_profiles_role_update.sql
-- =====================================================================

-- 1. DROP INSECURE UPDATE POLICY
-- The original policy "Users can update own profile" allowed any authenticated user
-- to update their own row without column-level restrictions, enabling privilege escalation:
--   UPDATE public.profiles SET role = 'admin' WHERE id = auth.uid();
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 2. CREATE HARDENED ROW-LEVEL SECURITY (RLS) POLICIES FOR PROFILES

-- Policy 2a: Non-admins may update only their own profile, with an enforced
-- check ensuring the 'role' column cannot be altered from its existing database value.
CREATE POLICY "Users update own non-role fields"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id
        AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    );

-- Policy 2b: Only users for whom public.is_admin() returns true may update any column
-- on any profile (including promoting or demoting roles).
CREATE POLICY "Admins can update any profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 3. DEFENSIVE TRIGGER: PREVENT NON-ADMIN ROLE ESCALATION
-- Provides defense-in-depth at the engine level. If an authenticated non-admin
-- client attempts an UPDATE that alters the 'role' column, this trigger aborts the
-- transaction with a 42501 (insufficient_privilege) exception before committing.
CREATE OR REPLACE FUNCTION public.prevent_non_admin_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
    -- Guard: Enforce when executing in an authenticated client session context (auth.uid() is not null)
    IF auth.uid() IS NOT NULL THEN
        -- If attempting to alter the role column without administrative privileges
        IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin() THEN
            RAISE EXCEPTION 'Unauthorized: Non-admin users are strictly prohibited from modifying the role attribute.'
                USING ERRCODE = '42501'; -- insufficient_privilege
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_non_admin_role_escalation();

-- Document the security model on the table
COMMENT ON TABLE public.profiles IS 'User profiles with role-based access control. Non-admin users are restricted to editing personal non-role metadata; role escalation is strictly blocked via RLS and trigger trg_prevent_role_escalation.';
