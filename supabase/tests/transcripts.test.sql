-- ============================================================================
-- pgTAP Database Policy & Security Tests
-- File: supabase/tests/transcripts.test.sql
-- Description: Verifies RLS, consent enforcement trigger, completed interview
--              immutability, deleted_at filtering, and purge authorization
--              for interview_transcripts and transcript_segments.
-- ============================================================================

BEGIN;
SELECT plan(23);

-- Setup test users & profiles
INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'admin@mglsd.go.ug')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, full_name, role)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'admin@mglsd.go.ug', 'Admin Officer', 'admin')
ON CONFLICT (id) DO UPDATE SET role = 'admin';

INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-000000000002'::uuid, 'owner@mglsd.go.ug')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, full_name, role)
VALUES ('00000000-0000-0000-0000-000000000002'::uuid, 'owner@mglsd.go.ug', 'Owner Interviewer', 'interviewer')
ON CONFLICT (id) DO UPDATE SET role = 'interviewer';

INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-000000000003'::uuid, 'other@mglsd.go.ug')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, full_name, role)
VALUES ('00000000-0000-0000-0000-000000000003'::uuid, 'other@mglsd.go.ug', 'Other Interviewer', 'interviewer')
ON CONFLICT (id) DO UPDATE SET role = 'interviewer';

-- Setup test In-Progress interview owned by Interviewer 1 (Owner)
INSERT INTO public.interviews (id, interviewee_name, role_title, department_unit, interviewer_id, tier, status)
VALUES ('22222222-2222-4000-8000-000000000002'::uuid, 'Active Officer', 'Senior Labour Officer', 'Labour Standards', '00000000-0000-0000-0000-000000000002'::uuid, 'Management', 'In Progress')
ON CONFLICT (id) DO UPDATE SET status = 'In Progress';

-- Setup test Completed interview owned by Interviewer 1 (Owner)
INSERT INTO public.interviews (id, interviewee_name, role_title, department_unit, interviewer_id, tier, status)
VALUES ('11111111-1111-4000-8000-000000000001'::uuid, 'Completed Director', 'Director', 'Industrial Relations', '00000000-0000-0000-0000-000000000002'::uuid, 'Leadership', 'Completed')
ON CONFLICT (id) DO UPDATE SET status = 'Completed';

-- Pre-seed a Completed transcript for completed interview tests
INSERT INTO public.interview_transcripts (id, interview_id, status, consent_confirmed_at)
VALUES ('33333333-3333-4000-8000-000000000001'::uuid, '11111111-1111-4000-8000-000000000001'::uuid, 'completed', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.transcript_segments (id, transcript_id, seq, start_time, end_time, raw_text)
VALUES ('44444444-4444-4000-8000-000000000001'::uuid, '33333333-3333-4000-8000-000000000001'::uuid, 0, 0.0, 5.0, 'Historical locked segment')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- CONTEXT 1: Authenticated as Owner Interviewer
-- ----------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '00000000-0000-0000-0000-000000000002';

-- TEST 1: Owner can INSERT a transcript for their own active interview
SELECT lives_ok(
    $$INSERT INTO public.interview_transcripts (id, interview_id, status)
      VALUES ('55555555-5555-4000-8000-000000000001'::uuid, '22222222-2222-4000-8000-000000000002'::uuid, 'idle')$$,
    'Owner can INSERT transcript for their own active interview'
);

-- TEST 2: Owner can SELECT their own transcript
SELECT isnt_empty(
    $$SELECT id FROM public.interview_transcripts WHERE id = '55555555-5555-4000-8000-000000000001'$$,
    'Owner can SELECT their own transcript'
);

-- TEST 3: Owner can UPDATE their own transcript (status, consent_confirmed_at)
SELECT lives_ok(
    $$UPDATE public.interview_transcripts
      SET status = 'recording', consent_confirmed_at = now()
      WHERE id = '55555555-5555-4000-8000-000000000001'$$,
    'Owner can UPDATE their own transcript'
);

-- Setup a second transcript on the active interview with NO consent
INSERT INTO public.interview_transcripts (id, interview_id, status, consent_confirmed_at)
VALUES ('66666666-6666-4000-8000-000000000001'::uuid, '22222222-2222-4000-8000-000000000002'::uuid, 'idle', NULL)
ON CONFLICT (id) DO NOTHING;

-- TEST 4: Consent Gate: INSERT segment into transcript without consent is blocked (42501)
SELECT throws_ok(
    $$INSERT INTO public.transcript_segments (transcript_id, seq, start_time, end_time, raw_text)
      VALUES ('66666666-6666-4000-8000-000000000001'::uuid, 0, 0.0, 3.5, 'Attempt without consent')$$,
    '42501',
    NULL,
    'INSERT segment without confirmed consent is blocked (42501)'
);

-- TEST 5: Owner can INSERT segment when consent is confirmed
SELECT lives_ok(
    $$INSERT INTO public.transcript_segments (id, transcript_id, seq, start_time, end_time, raw_text)
      VALUES ('77777777-7777-4000-8000-000000000001'::uuid, '55555555-5555-4000-8000-000000000001'::uuid, 0, 0.0, 4.2, 'Valid consented segment')$$,
    'Owner can INSERT segment when consent is confirmed'
);

-- TEST 6: Owner can SELECT their own segment
SELECT isnt_empty(
    $$SELECT id FROM public.transcript_segments WHERE id = '77777777-7777-4000-8000-000000000001'$$,
    'Owner can SELECT their own segment'
);

-- TEST 7: Owner can UPDATE their own segment (edited_text)
SELECT lives_ok(
    $$UPDATE public.transcript_segments
      SET edited_text = 'Reviewed text for segment'
      WHERE id = '77777777-7777-4000-8000-000000000001'$$,
    'Owner can UPDATE their own segment edited_text'
);

-- ----------------------------------------------------------------------------
-- CONTEXT 2: Authenticated as Other Interviewer (Interviewer 2)
-- ----------------------------------------------------------------------------
SET LOCAL "request.jwt.claim.sub" TO '00000000-0000-0000-0000-000000000003';

-- TEST 8: Other interviewer cannot SELECT owner transcript (RLS filter)
SELECT is_empty(
    $$SELECT id FROM public.interview_transcripts WHERE id = '55555555-5555-4000-8000-000000000001'$$,
    'Other interviewer cannot SELECT owner transcript'
);

-- TEST 9: Other interviewer cannot INSERT transcript on owner interview (RLS WITH CHECK)
SELECT throws_ok(
    $$INSERT INTO public.interview_transcripts (interview_id, status)
      VALUES ('22222222-2222-4000-8000-000000000002'::uuid, 'idle')$$,
    '42501',
    NULL,
    'Other interviewer cannot INSERT transcript for another officer interview'
);

-- TEST 10: Other interviewer cannot SELECT owner transcript segments (RLS filter)
SELECT is_empty(
    $$SELECT id FROM public.transcript_segments WHERE id = '77777777-7777-4000-8000-000000000001'$$,
    'Other interviewer cannot SELECT owner transcript segments'
);

-- TEST 11: Other interviewer cannot INSERT segment on owner transcript (RLS WITH CHECK)
SELECT throws_ok(
    $$INSERT INTO public.transcript_segments (transcript_id, seq, start_time, end_time, raw_text)
      VALUES ('55555555-5555-4000-8000-000000000001'::uuid, 1, 4.2, 8.0, 'Unauthorized segment')$$,
    '42501',
    NULL,
    'Other interviewer cannot INSERT segment into another officer transcript'
);

-- ----------------------------------------------------------------------------
-- CONTEXT 3: Authenticated as Administrator
-- ----------------------------------------------------------------------------
SET LOCAL "request.jwt.claim.sub" TO '00000000-0000-0000-0000-000000000001';

-- TEST 12: Admin can SELECT any transcript
SELECT isnt_empty(
    $$SELECT id FROM public.interview_transcripts WHERE id = '55555555-5555-4000-8000-000000000001'$$,
    'Admin can SELECT any transcript'
);

-- TEST 13: Admin can UPDATE any transcript
SELECT lives_ok(
    $$UPDATE public.interview_transcripts
      SET status = 'completed', session_duration_seconds = 180
      WHERE id = '55555555-5555-4000-8000-000000000001'$$,
    'Admin can UPDATE any transcript'
);

-- ----------------------------------------------------------------------------
-- CONTEXT 4: Completed Interview Immutability (Non-Admin Blocked)
-- ----------------------------------------------------------------------------
SET LOCAL "request.jwt.claim.sub" TO '00000000-0000-0000-0000-000000000002';

-- TEST 14: Non-admin INSERT on transcript for Completed interview is blocked (42501)
SELECT throws_ok(
    $$INSERT INTO public.interview_transcripts (interview_id, status)
      VALUES ('11111111-1111-4000-8000-000000000001'::uuid, 'idle')$$,
    '42501',
    NULL,
    'Non-admin INSERT transcript for Completed interview is blocked (42501)'
);

-- TEST 15: Non-admin UPDATE on transcript for Completed interview is blocked (42501)
SELECT throws_ok(
    $$UPDATE public.interview_transcripts
      SET status = 'recording'
      WHERE id = '33333333-3333-4000-8000-000000000001'$$,
    '42501',
    NULL,
    'Non-admin UPDATE transcript for Completed interview is blocked (42501)'
);

-- TEST 16: Non-admin INSERT on segments for Completed interview is blocked (42501)
SELECT throws_ok(
    $$INSERT INTO public.transcript_segments (transcript_id, seq, start_time, end_time, raw_text)
      VALUES ('33333333-3333-4000-8000-000000000001'::uuid, 1, 5.0, 10.0, 'Blocked segment')$$,
    '42501',
    NULL,
    'Non-admin INSERT segment for Completed interview is blocked (42501)'
);

-- TEST 17: Non-admin UPDATE on segments for Completed interview is blocked (42501)
SELECT throws_ok(
    $$UPDATE public.transcript_segments
      SET edited_text = 'Tampered text'
      WHERE id = '44444444-4444-4000-8000-000000000001'$$,
    '42501',
    NULL,
    'Non-admin UPDATE segment for Completed interview is blocked (42501)'
);

-- TEST 18: Non-admin DELETE on segments for Completed interview is blocked (42501)
SELECT throws_ok(
    $$DELETE FROM public.transcript_segments
      WHERE id = '44444444-4444-4000-8000-000000000001'$$,
    '42501',
    NULL,
    'Non-admin DELETE segment for Completed interview is blocked (42501)'
);

-- ----------------------------------------------------------------------------
-- CONTEXT 5: Admin Writes on Completed Interview Succeed
-- ----------------------------------------------------------------------------
SET LOCAL "request.jwt.claim.sub" TO '00000000-0000-0000-0000-000000000001';

-- TEST 19: Admin UPDATE on Completed interview transcript succeeds
SELECT lives_ok(
    $$UPDATE public.interview_transcripts
      SET session_duration_seconds = 300
      WHERE id = '33333333-3333-4000-8000-000000000001'$$,
    'Admin UPDATE on Completed interview transcript succeeds'
);

-- ----------------------------------------------------------------------------
-- CONTEXT 6: deleted_at Filtering
-- ----------------------------------------------------------------------------
-- Set deleted_at timestamp on one transcript and segment
UPDATE public.interview_transcripts
SET deleted_at = now()
WHERE id = '66666666-6666-4000-8000-000000000001';

UPDATE public.transcript_segments
SET deleted_at = now()
WHERE id = '77777777-7777-4000-8000-000000000001';

-- Switch back to owner
SET LOCAL "request.jwt.claim.sub" TO '00000000-0000-0000-0000-000000000002';

-- TEST 20: Transcript with deleted_at IS NOT NULL is hidden from SELECT
SELECT is_empty(
    $$SELECT id FROM public.interview_transcripts WHERE id = '66666666-6666-4000-8000-000000000001'$$,
    'Transcript with deleted_at is hidden from SELECT'
);

-- TEST 21: Segment with deleted_at IS NOT NULL is hidden from SELECT
SELECT is_empty(
    $$SELECT id FROM public.transcript_segments WHERE id = '77777777-7777-4000-8000-000000000001'$$,
    'Segment with deleted_at is hidden from SELECT'
);

-- ----------------------------------------------------------------------------
-- CONTEXT 7: purge_transcripts Authorization
-- ----------------------------------------------------------------------------
-- TEST 22: Non-admin calling purge_transcripts is blocked (42501)
SELECT throws_ok(
    $$SELECT * FROM public.purge_transcripts(INTERVAL '30 days')$$,
    '42501',
    NULL,
    'Non-admin calling purge_transcripts is blocked (42501)'
);

-- Switch to admin
SET LOCAL "request.jwt.claim.sub" TO '00000000-0000-0000-0000-000000000001';

-- TEST 23: Admin calling purge_transcripts succeeds
SELECT lives_ok(
    $$SELECT * FROM public.purge_transcripts(INTERVAL '30 days')$$,
    'Admin calling purge_transcripts succeeds'
);

SELECT * FROM finish();
ROLLBACK;
