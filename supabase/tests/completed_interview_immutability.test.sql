-- pgTAP Database Policy & Immutability Trigger Tests
-- File: supabase/tests/completed_interview_immutability.test.sql
-- Description: Verifies that Completed interviews and their child records (answers, notes, checklist, files)
--              are immutable for non-admin interviewers (42501), while administrators retain full access,
--              and completed_at timestamp is properly populated and managed.

BEGIN;
SELECT plan(13);

-- Setup test users & profiles
INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'admin@mglsd.go.ug')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, full_name, role)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'admin@mglsd.go.ug', 'Admin Officer', 'admin')
ON CONFLICT (id) DO UPDATE SET role = 'admin';

INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-000000000002'::uuid, 'interviewer@mglsd.go.ug')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, full_name, role)
VALUES ('00000000-0000-0000-0000-000000000002'::uuid, 'interviewer@mglsd.go.ug', 'Field Interviewer', 'interviewer')
ON CONFLICT (id) DO UPDATE SET role = 'interviewer';

-- Setup test Completed interview owned by interviewer
INSERT INTO public.interviews (id, interviewee_name, role_title, department_unit, interviewer_id, tier, status)
VALUES ('11111111-1111-4000-8000-000000000001'::uuid, 'Completed Subject', 'Director', 'Labour', '00000000-0000-0000-0000-000000000002'::uuid, 'Leadership', 'Completed')
ON CONFLICT (id) DO UPDATE SET status = 'Completed';

-- Setup test In-Progress interview owned by interviewer
INSERT INTO public.interviews (id, interviewee_name, role_title, department_unit, interviewer_id, tier, status)
VALUES ('22222222-2222-4000-8000-000000000002'::uuid, 'InProgress Subject', 'Manager', 'Labour', '00000000-0000-0000-0000-000000000002'::uuid, 'Management', 'In Progress')
ON CONFLICT (id) DO UPDATE SET status = 'In Progress';

-- Setup baseline answer on Completed interview
INSERT INTO public.answers (interview_id, question_id, answer_text)
VALUES ('11111111-1111-4000-8000-000000000001'::uuid, 'A1', 'Original completed answer')
ON CONFLICT (interview_id, question_id) DO NOTHING;

-- Setup baseline note on Completed interview
INSERT INTO public.interviewer_notes (interview_id, observations)
VALUES ('11111111-1111-4000-8000-000000000001'::uuid, 'Original completed observations')
ON CONFLICT (interview_id) DO NOTHING;

-- Setup baseline checklist on Completed interview
INSERT INTO public.documents_checklist (interview_id, item_number, document_title, category, collected_status)
VALUES ('11111111-1111-4000-8000-000000000001'::uuid, 1, 'National Employment Policy', 'Statutory Policy', 'Collected')
ON CONFLICT (interview_id, item_number) DO NOTHING;

-- Switch to authenticated non-admin interviewer context
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '00000000-0000-0000-0000-000000000002';

-- TEST 1: Non-admin UPDATE on Completed interview is blocked (42501)
SELECT throws_ok(
    $$UPDATE public.interviews SET interviewee_name = 'Hacked Name' WHERE id = '11111111-1111-4000-8000-000000000001'$$,
    '42501',
    NULL,
    'Interviewer UPDATE on Completed interview is blocked (42501)'
);

-- TEST 2: Non-admin INSERT on answers for Completed interview is blocked (42501)
SELECT throws_ok(
    $$INSERT INTO public.answers (interview_id, question_id, answer_text)
      VALUES ('11111111-1111-4000-8000-000000000001'::uuid, 'A2', 'New answer after completion')$$,
    '42501',
    NULL,
    'Interviewer INSERT on answers for Completed interview is blocked (42501)'
);

-- TEST 3: Non-admin UPDATE on answers for Completed interview is blocked (42501)
SELECT throws_ok(
    $$UPDATE public.answers SET answer_text = 'Tampered answer' WHERE interview_id = '11111111-1111-4000-8000-000000000001' AND question_id = 'A1'$$,
    '42501',
    NULL,
    'Interviewer UPDATE on answers for Completed interview is blocked (42501)'
);

-- TEST 4: Non-admin DELETE on answers for Completed interview is blocked (42501)
SELECT throws_ok(
    $$DELETE FROM public.answers WHERE interview_id = '11111111-1111-4000-8000-000000000001' AND question_id = 'A1'$$,
    '42501',
    NULL,
    'Interviewer DELETE on answers for Completed interview is blocked (42501)'
);

-- TEST 5: Non-admin UPDATE on interviewer_notes for Completed interview is blocked (42501)
SELECT throws_ok(
    $$UPDATE public.interviewer_notes SET observations = 'Modified notes' WHERE interview_id = '11111111-1111-4000-8000-000000000001'$$,
    '42501',
    NULL,
    'Interviewer UPDATE on notes for Completed interview is blocked (42501)'
);

-- TEST 6: Non-admin UPDATE on documents_checklist for Completed interview is blocked (42501)
SELECT throws_ok(
    $$UPDATE public.documents_checklist SET collected_status = 'Pending' WHERE interview_id = '11111111-1111-4000-8000-000000000001'$$,
    '42501',
    NULL,
    'Interviewer UPDATE on checklist for Completed interview is blocked (42501)'
);

-- TEST 7: Non-admin INSERT on interview_files for Completed interview is blocked (42501)
SELECT throws_ok(
    $$INSERT INTO public.interview_files (interview_id, file_name, file_path, file_size)
      VALUES ('11111111-1111-4000-8000-000000000001'::uuid, 'doc.pdf', 'interviews/111/doc.pdf', 1024)$$,
    '42501',
    NULL,
    'Interviewer INSERT on interview_files for Completed interview is blocked (42501)'
);

-- TEST 8: Non-admin UPDATE on In-Progress interview succeeds
SELECT lives_ok(
    $$UPDATE public.interviews SET interviewee_name = 'Updated InProgress Name' WHERE id = '22222222-2222-4000-8000-000000000002'$$,
    'Interviewer UPDATE on In Progress interview succeeds'
);

-- Switch to administrator context
SET LOCAL "request.jwt.claim.sub" TO '00000000-0000-0000-0000-000000000001';

-- TEST 9: Admin UPDATE on Completed interview succeeds
SELECT lives_ok(
    $$UPDATE public.interviews SET interviewee_name = 'Admin Corrected Name' WHERE id = '11111111-1111-4000-8000-000000000001'$$,
    'Administrator UPDATE on Completed interview succeeds'
);

-- TEST 10: Admin UPDATE on answers for Completed interview succeeds
SELECT lives_ok(
    $$UPDATE public.answers SET answer_text = 'Admin verified answer' WHERE interview_id = '11111111-1111-4000-8000-000000000001' AND question_id = 'A1'$$,
    'Administrator UPDATE on answers for Completed interview succeeds'
);

-- TEST 11: Transition to Completed populates completed_at timestamp
SELECT lives_ok(
    $$UPDATE public.interviews SET status = 'Completed' WHERE id = '22222222-2222-4000-8000-000000000002'$$,
    'Transition from In Progress to Completed succeeds'
);

SELECT isnt_empty(
    $$SELECT id FROM public.interviews WHERE id = '22222222-2222-4000-8000-000000000002' AND completed_at IS NOT NULL$$,
    'completed_at timestamp is automatically populated on transition to Completed'
);

-- TEST 13: Administrator reopening interview to In Progress clears completed_at
SELECT lives_ok(
    $$UPDATE public.interviews SET status = 'In Progress' WHERE id = '22222222-2222-4000-8000-000000000002'$$,
    'Administrator reopening interview to In Progress succeeds'
);

SELECT is_empty(
    $$SELECT id FROM public.interviews WHERE id = '22222222-2222-4000-8000-000000000002' AND completed_at IS NOT NULL$$,
    'reopening an interview to In Progress resets completed_at to NULL'
);

SELECT * FROM finish();
ROLLBACK;
