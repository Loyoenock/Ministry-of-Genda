-- pgTAP Database Policy & Integrity Tests
-- File: supabase/tests/questions_rls.test.sql
-- Description: Verifies RLS policies on public.questions and foreign key restrict behavior on public.answers.

BEGIN;
SELECT plan(8);

-- Sanity check: Ensure questions table exists
SELECT has_table('public', 'questions', 'Table public.questions exists');

-- 1. Setup mock profiles for testing
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
VALUES ('00000000-0000-0000-0000-000000000002'::uuid, 'interviewer@mglsd.go.ug', 'Interviewer Officer', 'interviewer')
ON CONFLICT (id) DO UPDATE SET role = 'interviewer';

-- TEST 1: anon SELECT denied
SET LOCAL ROLE anon;
SET LOCAL "request.jwt.claim.sub" TO '';
SELECT is_empty(
    'SELECT * FROM public.questions',
    'Anonymous users cannot SELECT any questions under RLS'
);

-- TEST 2: authenticated SELECT allowed
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '00000000-0000-0000-0000-000000000002';
SELECT isnt_empty(
    'SELECT * FROM public.questions',
    'Authenticated interviewers can SELECT questions'
);

-- TEST 3: interviewer INSERT denied
SELECT throws_ok(
    $$INSERT INTO public.questions (id, section_code, section_title, question_text, who_to_ask, applicable_tiers, response_type, sort_order)
      VALUES ('TEST-INT-1', 'A', 'Section A', 'Interviewer question', 'Target', ARRAY['Leadership'], 'text', 99)$$,
    '42501',
    NULL,
    'Interviewer INSERT on public.questions is denied by RLS (42501)'
);

-- TEST 4: interviewer UPDATE denied
SELECT throws_ok(
    $$UPDATE public.questions SET question_text = 'Updated by interviewer' WHERE id = 'A1'$$,
    '42501',
    NULL,
    'Interviewer UPDATE on public.questions is denied by RLS (42501)'
);

-- TEST 5: interviewer DELETE denied
SELECT throws_ok(
    $$DELETE FROM public.questions WHERE id = 'A1'$$,
    '42501',
    NULL,
    'Interviewer DELETE on public.questions is denied by RLS (42501)'
);

-- TEST 6: admin INSERT and UPDATE allowed
SET LOCAL "request.jwt.claim.sub" TO '00000000-0000-0000-0000-000000000001';
SELECT lives_ok(
    $$INSERT INTO public.questions (id, section_code, section_title, question_text, who_to_ask, applicable_tiers, response_type, sort_order)
      VALUES ('TEST-ADM-1', 'A', 'Section A', 'Admin question', 'Target', ARRAY['Leadership'], 'text', 100)$$,
    'Admin INSERT on public.questions succeeds'
);

-- TEST 7: deleting a question that has answers fails (ON DELETE RESTRICT)
-- Create a test interview and test answer linked to TEST-ADM-1
INSERT INTO public.interviews (id, interviewee_name, role_title, department_unit, interviewer_id, tier, status)
VALUES ('00000000-0000-0000-0000-000000000010'::uuid, 'Test Subject', 'Role', 'Unit', '00000000-0000-0000-0000-000000000001'::uuid, 'Leadership', 'Draft')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.answers (interview_id, question_id, answer_text)
VALUES ('00000000-0000-0000-0000-000000000010'::uuid, 'TEST-ADM-1', 'Test answer content')
ON CONFLICT (interview_id, question_id) DO NOTHING;

SELECT throws_ok(
    $$DELETE FROM public.questions WHERE id = 'TEST-ADM-1'$$,
    '23503',
    NULL,
    'Deleting a question that has linked answers is blocked by foreign key constraint (23503 ON DELETE RESTRICT)'
);

SELECT * FROM finish();
ROLLBACK;
