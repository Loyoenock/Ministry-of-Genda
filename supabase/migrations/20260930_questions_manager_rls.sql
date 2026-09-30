-- Migration: 20260930_questions_manager_rls.sql
-- Description: Enables authenticated users (interviewers and admins) to insert & update diagnostic questions, while restricting deletion strictly to administrators.

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Questions readable by everyone" ON public.questions;
DROP POLICY IF EXISTS "Questions readable by authenticated users" ON public.questions;
DROP POLICY IF EXISTS "Questions manageable only by admins" ON public.questions;
DROP POLICY IF EXISTS "Questions insertable by authenticated users" ON public.questions;
DROP POLICY IF EXISTS "Questions updatable by authenticated users" ON public.questions;
DROP POLICY IF EXISTS "Questions deletable by admins only" ON public.questions;

-- 1. Everyone / Authenticated users can SELECT questions
CREATE POLICY "Questions readable by everyone"
    ON public.questions FOR SELECT
    TO public
    USING (true);

-- 2. Authenticated users (Admins and Interviewers) can INSERT new questions
CREATE POLICY "Questions insertable by authenticated users"
    ON public.questions FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 3. Authenticated users (Admins and Interviewers) can UPDATE questions
CREATE POLICY "Questions updatable by authenticated users"
    ON public.questions FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 4. ONLY Administrators can DELETE questions
CREATE POLICY "Questions deletable by admins only"
    ON public.questions FOR DELETE
    TO authenticated
    USING (
        (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'admin'
    );
