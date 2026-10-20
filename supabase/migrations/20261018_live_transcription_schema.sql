-- ============================================================================
-- Migration: 20261018_live_transcription_schema.sql
-- Description: Schema, RLS, DB consent gate, immutability triggers, audit events
--              extension, and purge function for live transcription suite.
-- ============================================================================

-- 1. Create interview_transcripts table
CREATE TABLE IF NOT EXISTS public.interview_transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE RESTRICT,
    status TEXT NOT NULL CHECK (status IN ('idle', 'recording', 'stopped', 'completed', 'failed')) DEFAULT 'idle',
    consent_confirmed_at TIMESTAMPTZ,
    consent_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    session_duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (session_duration_seconds >= 0),
    language_code TEXT NOT NULL DEFAULT 'en-UG',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create transcript_segments table
CREATE TABLE IF NOT EXISTS public.transcript_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transcript_id UUID NOT NULL REFERENCES public.interview_transcripts(id) ON DELETE RESTRICT,
    seq INTEGER NOT NULL CHECK (seq >= 0),
    start_time NUMERIC(10,3) NOT NULL DEFAULT 0.000,
    end_time NUMERIC(10,3) NOT NULL DEFAULT 0.000,
    raw_text TEXT NOT NULL DEFAULT '',
    edited_text TEXT,
    speaker_label TEXT NOT NULL DEFAULT 'Speaker',
    confidence NUMERIC(4,3) CHECK (confidence IS NULL OR (confidence >= 0.0 AND confidence <= 1.0)),
    is_final BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_transcript_segments_transcript_seq UNIQUE (transcript_id, seq)
);

-- 3. Indexes for query and join performance
CREATE INDEX IF NOT EXISTS idx_interview_transcripts_interview_id ON public.interview_transcripts(interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_transcripts_deleted_at ON public.interview_transcripts(deleted_at);
CREATE INDEX IF NOT EXISTS idx_transcript_segments_transcript_seq ON public.transcript_segments(transcript_id, seq);
CREATE INDEX IF NOT EXISTS idx_transcript_segments_deleted_at ON public.transcript_segments(deleted_at);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.interview_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcript_segments ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for interview_transcripts
-- SELECT: owner or admin can read, only non-deleted rows
DROP POLICY IF EXISTS "Transcripts viewable by interview owner or admin" ON public.interview_transcripts;
CREATE POLICY "Transcripts viewable by interview owner or admin"
    ON public.interview_transcripts FOR SELECT
    TO authenticated
    USING (
        deleted_at IS NULL
        AND EXISTS (
            SELECT 1 FROM public.interviews
            WHERE id = interview_transcripts.interview_id
              AND (interviewer_id = auth.uid() OR public.is_admin())
        )
    );

-- INSERT: owner or admin can insert
DROP POLICY IF EXISTS "Transcripts insertable by interview owner or admin" ON public.interview_transcripts;
CREATE POLICY "Transcripts insertable by interview owner or admin"
    ON public.interview_transcripts FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.interviews
            WHERE id = interview_transcripts.interview_id
              AND (interviewer_id = auth.uid() OR public.is_admin())
        )
    );

-- UPDATE: owner or admin can update
DROP POLICY IF EXISTS "Transcripts updatable by interview owner or admin" ON public.interview_transcripts;
CREATE POLICY "Transcripts updatable by interview owner or admin"
    ON public.interview_transcripts FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.interviews
            WHERE id = interview_transcripts.interview_id
              AND (interviewer_id = auth.uid() OR public.is_admin())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.interviews
            WHERE id = interview_transcripts.interview_id
              AND (interviewer_id = auth.uid() OR public.is_admin())
        )
    );

-- 6. RLS Policies for transcript_segments (inherits access via parent transcript)
-- SELECT: owner or admin can read, only non-deleted rows on non-deleted transcripts
DROP POLICY IF EXISTS "Segments viewable by interview owner or admin via transcript" ON public.transcript_segments;
CREATE POLICY "Segments viewable by interview owner or admin via transcript"
    ON public.transcript_segments FOR SELECT
    TO authenticated
    USING (
        deleted_at IS NULL
        AND EXISTS (
            SELECT 1 FROM public.interview_transcripts t
            JOIN public.interviews i ON i.id = t.interview_id
            WHERE t.id = transcript_segments.transcript_id
              AND t.deleted_at IS NULL
              AND (i.interviewer_id = auth.uid() OR public.is_admin())
        )
    );

-- INSERT: owner or admin can insert
DROP POLICY IF EXISTS "Segments insertable by interview owner or admin via transcript" ON public.transcript_segments;
CREATE POLICY "Segments insertable by interview owner or admin via transcript"
    ON public.transcript_segments FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.interview_transcripts t
            JOIN public.interviews i ON i.id = t.interview_id
            WHERE t.id = transcript_segments.transcript_id
              AND (i.interviewer_id = auth.uid() OR public.is_admin())
        )
    );

-- UPDATE: owner or admin can update
DROP POLICY IF EXISTS "Segments updatable by interview owner or admin via transcript" ON public.transcript_segments;
CREATE POLICY "Segments updatable by interview owner or admin via transcript"
    ON public.transcript_segments FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.interview_transcripts t
            JOIN public.interviews i ON i.id = t.interview_id
            WHERE t.id = transcript_segments.transcript_id
              AND (i.interviewer_id = auth.uid() OR public.is_admin())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.interview_transcripts t
            JOIN public.interviews i ON i.id = t.interview_id
            WHERE t.id = transcript_segments.transcript_id
              AND (i.interviewer_id = auth.uid() OR public.is_admin())
        )
    );

-- 7. Database-level Consent Gate on transcript_segments
--    BEFORE INSERT raises 42501 unless parent transcript has consent_confirmed_at IS NOT NULL
CREATE OR REPLACE FUNCTION public.enforce_transcript_segment_consent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_consent_confirmed_at TIMESTAMPTZ;
BEGIN
    SELECT consent_confirmed_at INTO v_consent_confirmed_at
    FROM public.interview_transcripts
    WHERE id = NEW.transcript_id;

    IF v_consent_confirmed_at IS NULL THEN
        RAISE EXCEPTION 'Cannot insert transcript segments without confirmed consent (consent_confirmed_at is NULL).'
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_transcript_segment_consent ON public.transcript_segments;
CREATE TRIGGER trg_enforce_transcript_segment_consent
    BEFORE INSERT ON public.transcript_segments
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_transcript_segment_consent();

-- 8. Immutability Triggers for Completed Interviews
--    Block segment/transcript writes by non-admins when the parent interview is 'Completed'
CREATE OR REPLACE FUNCTION public.enforce_completed_interview_transcript_immutability()
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
            RAISE EXCEPTION 'Parent interview % is Completed and immutable. Transcript modifications are restricted to administrators.', v_interview_id
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

DROP TRIGGER IF EXISTS trg_enforce_transcripts_immutability ON public.interview_transcripts;
CREATE TRIGGER trg_enforce_transcripts_immutability
    BEFORE INSERT OR UPDATE OR DELETE ON public.interview_transcripts
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_completed_interview_transcript_immutability();

CREATE OR REPLACE FUNCTION public.enforce_completed_interview_segment_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_transcript_id UUID;
    v_interview_id UUID;
    v_status TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_transcript_id := OLD.transcript_id;
    ELSE
        v_transcript_id := NEW.transcript_id;
    END IF;

    IF v_transcript_id IS NOT NULL THEN
        SELECT interview_id INTO v_interview_id
        FROM public.interview_transcripts
        WHERE id = v_transcript_id;

        IF v_interview_id IS NOT NULL THEN
            SELECT status INTO v_status
            FROM public.interviews
            WHERE id = v_interview_id;

            IF v_status = 'Completed' AND NOT public.is_admin() THEN
                RAISE EXCEPTION 'Parent interview % is Completed and immutable. Transcript segment modifications are restricted to administrators.', v_interview_id
                    USING ERRCODE = '42501';
            END IF;
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_segments_immutability ON public.transcript_segments;
CREATE TRIGGER trg_enforce_segments_immutability
    BEFORE INSERT OR UPDATE OR DELETE ON public.transcript_segments
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_completed_interview_segment_immutability();

-- 9. Extend audit_events.event_type CHECK constraint idempotently
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.audit_events'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%event_type%'
    ) LOOP
        EXECUTE 'ALTER TABLE public.audit_events DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END;
$$;

ALTER TABLE public.audit_events
ADD CONSTRAINT audit_events_event_type_check CHECK (
    event_type IN (
        'profile_role_change',
        'interview_status_change',
        'document_upload',
        'transcription_started',
        'transcription_stopped',
        'transcript_edited',
        'transcript_exported',
        'transcription_consent'
    )
);

-- 10. Audit Triggers for Transcripts
--     SECURITY DEFINER triggers on status transitions, consent confirmation, and edited_text changes.
--     Payloads: IDs, durations, and counts ONLY. Never log audio, text, or tokens.
CREATE OR REPLACE FUNCTION public.log_transcript_lifecycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_segment_count INTEGER;
    v_event_type TEXT;
    v_actor_id UUID;
BEGIN
    v_actor_id := auth.uid();

    -- 1. Check for consent confirmation
    IF (TG_OP = 'INSERT' AND NEW.consent_confirmed_at IS NOT NULL) OR
       (TG_OP = 'UPDATE' AND OLD.consent_confirmed_at IS NULL AND NEW.consent_confirmed_at IS NOT NULL) THEN
        INSERT INTO public.audit_events (
            actor_id,
            event_type,
            entity_id,
            old_value,
            new_value
        ) VALUES (
            COALESCE(v_actor_id, NEW.consent_by),
            'transcription_consent',
            NEW.id,
            CASE WHEN TG_OP = 'UPDATE' THEN jsonb_build_object('consent_confirmed_at', OLD.consent_confirmed_at) ELSE NULL END,
            jsonb_build_object(
                'transcript_id', NEW.id,
                'interview_id', NEW.interview_id,
                'consent_confirmed_at', NEW.consent_confirmed_at
            )
        );
    END IF;

    -- 2. Check for status transitions
    IF (TG_OP = 'INSERT' AND NEW.status IN ('recording', 'stopped', 'completed')) OR
       (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN

        IF NEW.status = 'recording' THEN
            v_event_type := 'transcription_started';
        ELSIF NEW.status IN ('stopped', 'completed') THEN
            v_event_type := 'transcription_stopped';
        ELSE
            v_event_type := NULL;
        END IF;

        IF v_event_type IS NOT NULL THEN
            SELECT count(*)::int INTO v_segment_count
            FROM public.transcript_segments
            WHERE transcript_id = NEW.id AND deleted_at IS NULL;

            INSERT INTO public.audit_events (
                actor_id,
                event_type,
                entity_id,
                old_value,
                new_value
            ) VALUES (
                v_actor_id,
                v_event_type,
                NEW.id,
                CASE WHEN TG_OP = 'UPDATE' THEN jsonb_build_object(
                    'status', OLD.status,
                    'session_duration_seconds', OLD.session_duration_seconds
                ) ELSE NULL END,
                jsonb_build_object(
                    'transcript_id', NEW.id,
                    'interview_id', NEW.interview_id,
                    'status', NEW.status,
                    'session_duration_seconds', NEW.session_duration_seconds,
                    'segment_count', COALESCE(v_segment_count, 0)
                )
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_transcript_lifecycle ON public.interview_transcripts;
CREATE TRIGGER audit_transcript_lifecycle
    AFTER INSERT OR UPDATE ON public.interview_transcripts
    FOR EACH ROW
    EXECUTE FUNCTION public.log_transcript_lifecycle();

CREATE OR REPLACE FUNCTION public.log_transcript_edited()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF (OLD.edited_text IS DISTINCT FROM NEW.edited_text) THEN
        INSERT INTO public.audit_events (
            actor_id,
            event_type,
            entity_id,
            old_value,
            new_value
        ) VALUES (
            auth.uid(),
            'transcript_edited',
            NEW.id,
            jsonb_build_object(
                'segment_id', OLD.id,
                'transcript_id', OLD.transcript_id,
                'seq', OLD.seq,
                'char_count', length(COALESCE(OLD.edited_text, ''))
            ),
            jsonb_build_object(
                'segment_id', NEW.id,
                'transcript_id', NEW.transcript_id,
                'seq', NEW.seq,
                'char_count', length(COALESCE(NEW.edited_text, '')),
                'duration_seconds', (NEW.end_time - NEW.start_time)
            )
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_transcript_edited ON public.transcript_segments;
CREATE TRIGGER audit_transcript_edited
    AFTER UPDATE OF edited_text ON public.transcript_segments
    FOR EACH ROW
    EXECUTE FUNCTION public.log_transcript_edited();

-- 11. Admin-only Purge Function: purge_transcripts(older_than interval)
--     Soft-deletes transcripts and segments older than the specified retention interval.
CREATE OR REPLACE FUNCTION public.purge_transcripts(older_than INTERVAL)
RETURNS TABLE (
    purged_transcripts_count INTEGER,
    purged_segments_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_transcripts_count INTEGER := 0;
    v_segments_count INTEGER := 0;
    v_cutoff TIMESTAMPTZ;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only administrators can purge transcripts'
            USING ERRCODE = '42501';
    END IF;

    v_cutoff := now() - older_than;

    -- Soft-delete transcript_segments associated with transcripts older than cutoff
    WITH updated_segments AS (
        UPDATE public.transcript_segments s
        SET deleted_at = now()
        FROM public.interview_transcripts t
        WHERE s.transcript_id = t.id
          AND s.deleted_at IS NULL
          AND t.created_at < v_cutoff
        RETURNING s.id
    )
    SELECT count(*)::int INTO v_segments_count FROM updated_segments;

    -- Soft-delete interview_transcripts older than cutoff
    WITH updated_transcripts AS (
        UPDATE public.interview_transcripts
        SET deleted_at = now()
        WHERE deleted_at IS NULL
          AND created_at < v_cutoff
        RETURNING id
    )
    SELECT count(*)::int INTO v_transcripts_count FROM updated_transcripts;

    RETURN QUERY SELECT v_transcripts_count, v_segments_count;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_transcripts(INTERVAL) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_transcripts(INTERVAL) TO authenticated;

-- 12. updated_at triggers
DROP TRIGGER IF EXISTS update_interview_transcripts_updated_at ON public.interview_transcripts;
CREATE TRIGGER update_interview_transcripts_updated_at
    BEFORE UPDATE ON public.interview_transcripts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_transcript_segments_updated_at ON public.transcript_segments;
CREATE TRIGGER update_transcript_segments_updated_at
    BEFORE UPDATE ON public.transcript_segments
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
