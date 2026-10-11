-- Migration: 20261011_restrict_questions_write_to_admins.sql
-- Description: Restrict public.questions write operations (INSERT, UPDATE, DELETE) strictly to administrators,
-- ensure public.questions SELECT is allowed for authenticated users, and prevent deleting questions with historical answers.

-- 1. Ensure RLS is enabled on public.questions
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to prevent conflicts or legacy permissions
DROP POLICY IF EXISTS "Questions readable by everyone" ON public.questions;
DROP POLICY IF EXISTS "Questions readable by authenticated users" ON public.questions;
DROP POLICY IF EXISTS "Questions manageable only by admins" ON public.questions;
DROP POLICY IF EXISTS "Questions insertable by authenticated users" ON public.questions;
DROP POLICY IF EXISTS "Questions updatable by authenticated users" ON public.questions;
DROP POLICY IF EXISTS "Questions deletable by admins only" ON public.questions;
DROP POLICY IF EXISTS "Questions insertable by admins only" ON public.questions;
DROP POLICY IF EXISTS "Questions updatable by admins only" ON public.questions;

-- 3. Read access: Authenticated users can SELECT questions
CREATE POLICY "Questions readable by authenticated users"
    ON public.questions FOR SELECT
    TO authenticated
    USING (true);

-- 4. Write access: ONLY Administrators can INSERT new questions
CREATE POLICY "Questions insertable by admins only"
    ON public.questions FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

-- 5. Write access: ONLY Administrators can UPDATE questions
CREATE POLICY "Questions updatable by admins only"
    ON public.questions FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 6. Write access: ONLY Administrators can DELETE questions
CREATE POLICY "Questions deletable by admins only"
    ON public.questions FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- 7. Change answers_question_id_fkey from ON DELETE CASCADE to ON DELETE RESTRICT
-- This prevents deleting any question that has historical answers linked to it.
ALTER TABLE public.answers
    DROP CONSTRAINT IF EXISTS answers_question_id_fkey;

ALTER TABLE public.answers
    ADD CONSTRAINT answers_question_id_fkey
    FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE RESTRICT;
