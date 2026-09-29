-- Migration: 20260930_allow_admin_profile_deletion.sql
-- Description: Enables administrators to delete user profiles from public.profiles and updates foreign keys to CASCADE or SET NULL on delete.

-- 1. Create RLS DELETE policy on public.profiles for Administrators
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

CREATE POLICY "Admins can delete profiles"
    ON public.profiles FOR DELETE
    TO authenticated
    USING (
        (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'admin'
    );

-- 2. Update foreign key constraints on public.interviews to CASCADE on profile deletion
ALTER TABLE public.interviews
    DROP CONSTRAINT IF EXISTS interviews_interviewer_id_fkey;

ALTER TABLE public.interviews
    ADD CONSTRAINT interviews_interviewer_id_fkey
    FOREIGN KEY (interviewer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Update foreign key constraints on public.answers (updated_by)
ALTER TABLE public.answers
    DROP CONSTRAINT IF EXISTS answers_updated_by_fkey;

ALTER TABLE public.answers
    ADD CONSTRAINT answers_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 4. Update foreign key constraints on public.interview_files (uploaded_by)
ALTER TABLE public.interview_files
    DROP CONSTRAINT IF EXISTS interview_files_uploaded_by_fkey;

ALTER TABLE public.interview_files
    ADD CONSTRAINT interview_files_uploaded_by_fkey
    FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE CASCADE;
