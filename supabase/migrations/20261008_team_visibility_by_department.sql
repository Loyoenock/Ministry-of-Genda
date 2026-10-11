-- Migration: 20261008_team_visibility_by_department.sql
-- Description: Enables dynamic department-level team visibility for interviews, answers, checklists, notes, files, and storage objects.

-- 1. Helper function to check if target_profile_id belongs to the same department_unit as auth.uid()
CREATE OR REPLACE FUNCTION public.same_department(target_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_dept TEXT;
  v_target_dept TEXT;
BEGIN
  IF auth.uid() IS NULL OR target_profile_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get auth user's department_unit
  SELECT department_unit INTO v_user_dept
  FROM public.profiles
  WHERE id = auth.uid();

  -- Get target profile's department_unit
  SELECT department_unit INTO v_target_dept
  FROM public.profiles
  WHERE id = target_profile_id;

  IF v_user_dept IS NOT NULL AND v_target_dept IS NOT NULL AND LOWER(TRIM(v_user_dept)) = LOWER(TRIM(v_target_dept)) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- 2. Helper function to check if auth.uid() is allowed to view an interview
CREATE OR REPLACE FUNCTION public.can_view_interview(p_interviewer_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Admins can view everything
  IF public.is_admin() THEN
    RETURN TRUE;
  END IF;

  -- Interviewer can view their own interviews
  IF p_interviewer_id = auth.uid() THEN
    RETURN TRUE;
  END IF;

  -- Teammates sharing the exact same profiles.department_unit can view
  RETURN public.same_department(p_interviewer_id);
END;
$$;

-- 3. Replace SELECT Policy on public.interviews
DROP POLICY IF EXISTS "Interviews viewable by creator or admin" ON public.interviews;
DROP POLICY IF EXISTS "Interviews viewable by creator, team, or admin" ON public.interviews;

CREATE POLICY "Interviews viewable by creator, team, or admin"
  ON public.interviews FOR SELECT
  TO authenticated
  USING (public.can_view_interview(interviewer_id));

-- 4. Replace SELECT Policy on public.answers
DROP POLICY IF EXISTS "Answers viewable by interview owner or admin" ON public.answers;
DROP POLICY IF EXISTS "Answers viewable by interview owner, team, or admin" ON public.answers;

CREATE POLICY "Answers viewable by interview owner, team, or admin"
  ON public.answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.interviews
      WHERE id = answers.interview_id AND public.can_view_interview(interviewer_id)
    )
  );

-- 5. Replace SELECT Policy on public.documents_checklist
DROP POLICY IF EXISTS "Documents viewable by interview owner or admin" ON public.documents_checklist;
DROP POLICY IF EXISTS "Documents viewable by interview owner, team, or admin" ON public.documents_checklist;

CREATE POLICY "Documents viewable by interview owner, team, or admin"
  ON public.documents_checklist FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.interviews
      WHERE id = documents_checklist.interview_id AND public.can_view_interview(interviewer_id)
    )
  );

-- 6. Replace SELECT Policy on public.interviewer_notes
DROP POLICY IF EXISTS "Notes viewable by interview owner or admin" ON public.interviewer_notes;
DROP POLICY IF EXISTS "Notes viewable by interview owner, team, or admin" ON public.interviewer_notes;

CREATE POLICY "Notes viewable by interview owner, team, or admin"
  ON public.interviewer_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.interviews
      WHERE id = interviewer_notes.interview_id AND public.can_view_interview(interviewer_id)
    )
  );

-- 7. Replace SELECT Policy on public.interview_files
DROP POLICY IF EXISTS "Files viewable by interview owner or admin" ON public.interview_files;
DROP POLICY IF EXISTS "Files viewable by interview owner, team, or admin" ON public.interview_files;

CREATE POLICY "Files viewable by interview owner, team, or admin"
  ON public.interview_files FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.interviews
      WHERE id = interview_files.interview_id AND public.can_view_interview(interviewer_id)
    )
  );

-- 8. Replace SELECT Policy on storage.objects for interview-documents bucket
DROP POLICY IF EXISTS "Interview documents viewable by interview owner or admin" ON storage.objects;
DROP POLICY IF EXISTS "Interview documents viewable by interview owner, team, or admin" ON storage.objects;

CREATE POLICY "Interview documents viewable by interview owner, team, or admin"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'interview-documents' AND (
      public.is_admin() OR
      EXISTS (
        SELECT 1 FROM public.interviews
        WHERE id::text = (storage.foldername(name))[1]
          AND public.can_view_interview(interviewer_id)
      )
    )
  );
