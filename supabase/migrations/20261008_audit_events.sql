-- Migration: 20261008_audit_events.sql
-- Description: Server-side audit log table and triggers for role changes, interview status transitions, and document uploads.

-- 1. AUDIT EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.audit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'profile_role_change',
    'interview_status_change',
    'document_upload'
  )),
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing for server-side / operator query efficiency
CREATE INDEX IF NOT EXISTS idx_audit_events_event_type ON public.audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor_id ON public.audit_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity_id ON public.audit_events(entity_id);

-- RLS: only service_role / admins can read; no client INSERT/UPDATE/DELETE policies
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read audit_events" ON public.audit_events;
CREATE POLICY "Admins can read audit_events"
  ON public.audit_events FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- 2. TRIGGER FUNCTIONS AND TRIGGERS

-- a. Profile Role Change Trigger
CREATE OR REPLACE FUNCTION public.log_profile_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (OLD.role IS DISTINCT FROM NEW.role) THEN
    INSERT INTO public.audit_events (
      actor_id,
      event_type,
      entity_id,
      old_value,
      new_value
    ) VALUES (
      COALESCE(auth.uid(), NEW.id),
      'profile_role_change',
      NEW.id,
      jsonb_build_object('role', OLD.role),
      jsonb_build_object('role', NEW.role)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_profile_role_change ON public.profiles;
CREATE TRIGGER audit_profile_role_change
  AFTER UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_profile_role_change();

-- b. Interview Status Change Trigger
CREATE OR REPLACE FUNCTION public.log_interview_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.audit_events (
      actor_id,
      event_type,
      entity_id,
      old_value,
      new_value
    ) VALUES (
      COALESCE(auth.uid(), NEW.interviewer_id),
      'interview_status_change',
      NEW.id,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_interview_status_change ON public.interviews;
CREATE TRIGGER audit_interview_status_change
  AFTER UPDATE OF status ON public.interviews
  FOR EACH ROW
  EXECUTE FUNCTION public.log_interview_status_change();

-- c. Document Upload Trigger
CREATE OR REPLACE FUNCTION public.log_document_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.audit_events (
    actor_id,
    event_type,
    entity_id,
    old_value,
    new_value
  ) VALUES (
    COALESCE(auth.uid(), NEW.uploaded_by),
    'document_upload',
    NEW.id,
    NULL,
    jsonb_build_object(
      'file_name', NEW.file_name,
      'storage_path', NEW.storage_path,
      'interview_id', NEW.interview_id,
      'document_item_id', NEW.document_item_id,
      'file_size_bytes', NEW.file_size_bytes,
      'mime_type', NEW.mime_type
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_document_upload ON public.interview_files;
CREATE TRIGGER audit_document_upload
  AFTER INSERT ON public.interview_files
  FOR EACH ROW
  EXECUTE FUNCTION public.log_document_upload();
