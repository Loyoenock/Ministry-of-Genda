-- ============================================================================
-- Migration: 20261017_completed_interview_immutability.sql
-- Description: Enforces database-level immutability for Completed interviews
--              and their related records (answers, interviewer_notes, 
--              documents_checklist, interview_files) for non-admin users.
--              Adds nullable completed_at column to public.interviews.
-- ============================================================================

-- 1. Add completed_at column to public.interviews
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 2. Trigger function to enforce immutability on public.interviews
--    - Sets completed_at = now() when transitioned to Completed
--    - Clears completed_at if an administrator re-opens the interview
--    - Raises error 42501 if a non-admin attempts to update a Completed interview
CREATE OR REPLACE FUNCTION public.enforce_completed_interview_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- If the interview was already Completed, only administrators may modify it
    IF TG_OP = 'UPDATE' AND OLD.status = 'Completed' AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Completed interviews are immutable and cannot be modified by non-admin users'
            USING ERRCODE = '42501';
    END IF;

    -- Automatically set completed_at timestamp on transition to Completed
    IF NEW.status = 'Completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'Completed' OR NEW.completed_at IS NULL) THEN
        NEW.completed_at := COALESCE(NEW.completed_at, now());
    END IF;

    -- If reopened by administrator from Completed to In Progress / Draft, reset completed_at
    IF TG_OP = 'UPDATE' AND OLD.status = 'Completed' AND NEW.status IS DISTINCT FROM 'Completed' THEN
        NEW.completed_at := NULL;
    END IF;

    RETURN NEW;
END;
$$;

-- 3. Bind trigger to public.interviews
DROP TRIGGER IF EXISTS trg_enforce_interview_immutability ON public.interviews;
CREATE TRIGGER trg_enforce_interview_immutability
    BEFORE INSERT OR UPDATE ON public.interviews
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_completed_interview_immutability();

-- 4. Trigger function for child tables (answers, interviewer_notes, documents_checklist, interview_files)
--    Raises error 42501 when parent interview.status = 'Completed' AND NOT public.is_admin()
CREATE OR REPLACE FUNCTION public.enforce_completed_interview_child_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_interview_id UUID;
    v_status TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_interview_id := OLD.interview_id;
    ELSE
        v_interview_id := NEW.interview_id;
    END IF;

    IF v_interview_id IS NOT NULL THEN
        SELECT status INTO v_status
        FROM public.interviews
        WHERE id = v_interview_id;

        IF v_status = 'Completed' AND NOT public.is_admin() THEN
            RAISE EXCEPTION 'Parent interview % is Completed and immutable. Modifications are restricted to administrators.', v_interview_id
                USING ERRCODE = '42501';
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- 5. Bind triggers to child tables
DROP TRIGGER IF EXISTS trg_enforce_answers_immutability ON public.answers;
CREATE TRIGGER trg_enforce_answers_immutability
    BEFORE INSERT OR UPDATE OR DELETE ON public.answers
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_completed_interview_child_immutability();

DROP TRIGGER IF EXISTS trg_enforce_notes_immutability ON public.interviewer_notes;
CREATE TRIGGER trg_enforce_notes_immutability
    BEFORE INSERT OR UPDATE OR DELETE ON public.interviewer_notes
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_completed_interview_child_immutability();

DROP TRIGGER IF EXISTS trg_enforce_checklist_immutability ON public.documents_checklist;
CREATE TRIGGER trg_enforce_checklist_immutability
    BEFORE INSERT OR UPDATE OR DELETE ON public.documents_checklist
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_completed_interview_child_immutability();

DROP TRIGGER IF EXISTS trg_enforce_files_immutability ON public.interview_files;
CREATE TRIGGER trg_enforce_files_immutability
    BEFORE INSERT OR UPDATE OR DELETE ON public.interview_files
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_completed_interview_child_immutability();
