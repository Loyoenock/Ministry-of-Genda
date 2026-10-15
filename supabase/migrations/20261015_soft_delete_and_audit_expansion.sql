-- =====================================================================
-- Migration: 20261015_soft_delete_and_audit_expansion.sql
-- Description:
-- 1. Adds soft-delete (deleted_at) to public.profiles and public.interviews.
-- 2. Restores ON DELETE RESTRICT on foreign keys to protect interview data.
-- 3. Updates RLS SELECT policies to exclude soft-deleted rows.
-- 4. Prevents soft-deleted users from signing in or recreating profiles.
-- 5. Extends audit_events event_type CHECK and adds triggers for deletes,
--    question changes, answer updates, and document download RPC.
-- 6. Adds admin-only purge_deleted(older_than interval) function.
-- =====================================================================

-- 1. ADD DELETED_AT COLUMNS
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON public.profiles(deleted_at);
CREATE INDEX IF NOT EXISTS idx_interviews_deleted_at ON public.interviews(deleted_at);

-- 2. RESTORE ON DELETE RESTRICT ON FOREIGN KEYS
ALTER TABLE public.interviews
  DROP CONSTRAINT IF EXISTS interviews_interviewer_id_fkey;

ALTER TABLE public.interviews
  ADD CONSTRAINT interviews_interviewer_id_fkey
  FOREIGN KEY (interviewer_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.interview_files
  DROP CONSTRAINT IF EXISTS interview_files_uploaded_by_fkey;

ALTER TABLE public.interview_files
  ADD CONSTRAINT interview_files_uploaded_by_fkey
  FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;

-- 3. UPDATE RLS SELECT POLICIES TO EXCLUDE SOFT-DELETED ROWS

-- Ensure is_admin excludes soft-deleted administrators
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin' AND deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Exclude soft-deleted profiles from SELECT
DROP POLICY IF EXISTS "Profiles viewable by self or admin" ON public.profiles;
CREATE POLICY "Profiles viewable by self or admin"
    ON public.profiles FOR SELECT
    USING ((auth.uid() = id OR public.is_admin()) AND deleted_at IS NULL);

-- Interviews: Exclude soft-deleted interviews from SELECT
DROP POLICY IF EXISTS "Interviews viewable by creator or admin" ON public.interviews;
DROP POLICY IF EXISTS "Interviews viewable by creator, team, or admin" ON public.interviews;
CREATE POLICY "Interviews viewable by creator, team, or admin"
  ON public.interviews FOR SELECT
  TO authenticated
  USING (public.can_view_interview(interviewer_id) AND deleted_at IS NULL);

-- Answers: Exclude answers belonging to soft-deleted interviews
DROP POLICY IF EXISTS "Answers viewable by interview owner or admin" ON public.answers;
DROP POLICY IF EXISTS "Answers viewable by interview owner, team, or admin" ON public.answers;
CREATE POLICY "Answers viewable by interview owner, team, or admin"
  ON public.answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.interviews
      WHERE id = answers.interview_id
        AND public.can_view_interview(interviewer_id)
        AND deleted_at IS NULL
    )
  );

-- Documents checklist: Exclude checklist items belonging to soft-deleted interviews
DROP POLICY IF EXISTS "Documents viewable by interview owner or admin" ON public.documents_checklist;
DROP POLICY IF EXISTS "Documents viewable by interview owner, team, or admin" ON public.documents_checklist;
CREATE POLICY "Documents viewable by interview owner, team, or admin"
  ON public.documents_checklist FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.interviews
      WHERE id = documents_checklist.interview_id
        AND public.can_view_interview(interviewer_id)
        AND deleted_at IS NULL
    )
  );

-- Interviewer notes: Exclude notes belonging to soft-deleted interviews
DROP POLICY IF EXISTS "Notes viewable by interview owner or admin" ON public.interviewer_notes;
DROP POLICY IF EXISTS "Notes viewable by interview owner, team, or admin" ON public.interviewer_notes;
CREATE POLICY "Notes viewable by interview owner, team, or admin"
  ON public.interviewer_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.interviews
      WHERE id = interviewer_notes.interview_id
        AND public.can_view_interview(interviewer_id)
        AND deleted_at IS NULL
    )
  );

-- Interview files: Exclude files belonging to soft-deleted interviews
DROP POLICY IF EXISTS "Files viewable by interview owner or admin" ON public.interview_files;
DROP POLICY IF EXISTS "Files viewable by interview owner, team, or admin" ON public.interview_files;
CREATE POLICY "Files viewable by interview owner, team, or admin"
  ON public.interview_files FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.interviews
      WHERE id = interview_files.interview_id
        AND public.can_view_interview(interviewer_id)
        AND deleted_at IS NULL
    )
  );

-- 4. PREVENT SOFT-DELETED USERS FROM RE-CREATING PROFILES
CREATE OR REPLACE FUNCTION public.prevent_soft_deleted_profile_recreation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = NEW.id AND deleted_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'This user account has been deactivated.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_soft_deleted_profile_recreation ON public.profiles;
CREATE TRIGGER trg_prevent_soft_deleted_profile_recreation
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_soft_deleted_profile_recreation();

-- 5. EXTEND AUDIT_EVENTS AND TRIGGERS

-- Update entity_id column type to TEXT so question IDs (e.g. 'A1') and file paths can be logged alongside UUIDs
ALTER TABLE public.audit_events
  ALTER COLUMN entity_id TYPE TEXT USING entity_id::TEXT;

-- Expand event_type CHECK constraint
ALTER TABLE public.audit_events
  DROP CONSTRAINT IF EXISTS audit_events_event_type_check;

ALTER TABLE public.audit_events
  ADD CONSTRAINT audit_events_event_type_check
  CHECK (event_type IN (
    'profile_role_change',
    'interview_status_change',
    'document_upload',
    'interview_deleted',
    'profile_deleted',
    'answer_changed',
    'question_changed',
    'document_downloaded'
  ));

-- a. Profile Deleted Trigger (logs on soft delete)
CREATE OR REPLACE FUNCTION public.log_profile_deleted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) THEN
    INSERT INTO public.audit_events (
      actor_id,
      event_type,
      entity_id,
      old_value,
      new_value
    ) VALUES (
      COALESCE(auth.uid(), NEW.id),
      'profile_deleted',
      NEW.id::TEXT,
      jsonb_build_object('email', OLD.email, 'full_name', OLD.full_name, 'role', OLD.role),
      jsonb_build_object('deleted_at', NEW.deleted_at)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_profile_deleted ON public.profiles;
CREATE TRIGGER audit_profile_deleted
  AFTER UPDATE OF deleted_at ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_profile_deleted();

-- b. Interview Deleted Trigger (logs on soft delete)
CREATE OR REPLACE FUNCTION public.log_interview_deleted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) THEN
    INSERT INTO public.audit_events (
      actor_id,
      event_type,
      entity_id,
      old_value,
      new_value
    ) VALUES (
      COALESCE(auth.uid(), NEW.interviewer_id),
      'interview_deleted',
      NEW.id::TEXT,
      jsonb_build_object('interviewee_name', OLD.interviewee_name, 'role_title', OLD.role_title, 'status', OLD.status),
      jsonb_build_object('deleted_at', NEW.deleted_at)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_interview_deleted ON public.interviews;
CREATE TRIGGER audit_interview_deleted
  AFTER UPDATE OF deleted_at ON public.interviews
  FOR EACH ROW
  EXECUTE FUNCTION public.log_interview_deleted();

-- c. Question Changed Trigger
CREATE OR REPLACE FUNCTION public.log_question_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (OLD.question_text IS DISTINCT FROM NEW.question_text OR
      OLD.section_title IS DISTINCT FROM NEW.section_title OR
      OLD.prompt_hints IS DISTINCT FROM NEW.prompt_hints OR
      OLD.who_to_ask IS DISTINCT FROM NEW.who_to_ask OR
      OLD.applicable_tiers IS DISTINCT FROM NEW.applicable_tiers) THEN
    INSERT INTO public.audit_events (
      actor_id,
      event_type,
      entity_id,
      old_value,
      new_value
    ) VALUES (
      auth.uid(),
      'question_changed',
      NEW.id,
      jsonb_build_object(
        'question_text', OLD.question_text,
        'section_title', OLD.section_title,
        'prompt_hints', OLD.prompt_hints
      ),
      jsonb_build_object(
        'question_text', NEW.question_text,
        'section_title', NEW.section_title,
        'prompt_hints', NEW.prompt_hints
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_question_changed ON public.questions;
CREATE TRIGGER audit_question_changed
  AFTER UPDATE ON public.questions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_question_changed();

-- d. Answer Changed Trigger (mitigates volume growth by logging ONLY on actual value change)
CREATE OR REPLACE FUNCTION public.log_answer_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (OLD.answer_text IS DISTINCT FROM NEW.answer_text OR
      OLD.structured_data IS DISTINCT FROM NEW.structured_data) THEN
    INSERT INTO public.audit_events (
      actor_id,
      event_type,
      entity_id,
      old_value,
      new_value
    ) VALUES (
      COALESCE(auth.uid(), NEW.updated_by),
      'answer_changed',
      NEW.id::TEXT,
      jsonb_build_object(
        'interview_id', OLD.interview_id,
        'question_id', OLD.question_id,
        'answer_text', OLD.answer_text,
        'structured_data', OLD.structured_data
      ),
      jsonb_build_object(
        'interview_id', NEW.interview_id,
        'question_id', NEW.question_id,
        'answer_text', NEW.answer_text,
        'structured_data', NEW.structured_data
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_answer_changed ON public.answers;
CREATE TRIGGER audit_answer_changed
  AFTER UPDATE ON public.answers
  FOR EACH ROW
  EXECUTE FUNCTION public.log_answer_changed();

-- e. Document Downloaded RPC Function
CREATE OR REPLACE FUNCTION public.log_document_download(storage_path TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_file_id UUID;
  v_interview_id UUID;
BEGIN
  -- Attempt to resolve file metadata
  SELECT id, interview_id INTO v_file_id, v_interview_id
  FROM public.interview_files
  WHERE interview_files.storage_path = log_document_download.storage_path
  LIMIT 1;

  INSERT INTO public.audit_events (
    actor_id,
    event_type,
    entity_id,
    old_value,
    new_value
  ) VALUES (
    auth.uid(),
    'document_downloaded',
    COALESCE(v_file_id::TEXT, log_document_download.storage_path),
    NULL,
    jsonb_build_object(
      'storage_path', log_document_download.storage_path,
      'interview_id', v_interview_id
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_document_download(TEXT) TO authenticated;

-- 6. ADMIN-ONLY PURGE FUNCTION
CREATE OR REPLACE FUNCTION public.purge_deleted(older_than INTERVAL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cutoff TIMESTAMPTZ;
  v_purged_interviews INT := 0;
  v_purged_profiles INT := 0;
BEGIN
  -- Strict administrator permission check
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Only administrators can purge soft-deleted records.';
  END IF;

  v_cutoff := NOW() - older_than;

  -- 1. Purge soft-deleted interviews older than cutoff
  WITH deleted_interviews AS (
    DELETE FROM public.interviews
    WHERE deleted_at IS NOT NULL AND deleted_at < v_cutoff
    RETURNING id
  )
  SELECT count(*) INTO v_purged_interviews FROM deleted_interviews;

  -- 2. Purge soft-deleted profiles older than cutoff
  WITH deleted_profiles AS (
    DELETE FROM public.profiles
    WHERE deleted_at IS NOT NULL AND deleted_at < v_cutoff
    RETURNING id
  )
  SELECT count(*) INTO v_purged_profiles FROM deleted_profiles;

  RETURN jsonb_build_object(
    'cutoff', v_cutoff,
    'purged_interviews', v_purged_interviews,
    'purged_profiles', v_purged_profiles
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_deleted(INTERVAL) TO authenticated;
