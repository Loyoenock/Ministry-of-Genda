-- =====================================================================
-- MGLSD Labour Directorate – Current-State Diagnostic Interview Application
-- TRANSFORMATIVE Programme – Ministry of Gender, Labour and Social Development, Uganda
-- Initial Schema & Row Level Security (RLS) Migration
-- =====================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
-- Roles: 'interviewer', 'admin'
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('interviewer', 'admin')) DEFAULT 'interviewer',
    department_unit TEXT DEFAULT 'Labour Directorate',
    phone_number TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. INTERVIEWS TABLE
-- Tiers: 'Leadership', 'Management', 'Frontline', 'Support/IT'
-- Statuses: 'Draft', 'In Progress', 'Completed'
CREATE TABLE IF NOT EXISTS public.interviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interviewee_name TEXT NOT NULL,
    role_title TEXT NOT NULL,
    department_unit TEXT NOT NULL,
    years_in_role NUMERIC(4,1) DEFAULT 1.0,
    interview_date DATE NOT NULL DEFAULT CURRENT_DATE,
    interview_time TEXT DEFAULT '10:00 AM',
    location TEXT NOT NULL DEFAULT 'Ministry Headquarters, Kampala',
    interviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    tier TEXT NOT NULL CHECK (tier IN ('Leadership', 'Management', 'Frontline', 'Support/IT')),
    status TEXT NOT NULL CHECK (status IN ('Draft', 'In Progress', 'Completed')) DEFAULT 'Draft',
    duration_min INTEGER DEFAULT 60,
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. QUESTIONS MASTER CATALOGUE TABLE
CREATE TABLE IF NOT EXISTS public.questions (
    id TEXT PRIMARY KEY, -- e.g. 'A1', 'B3', 'C1a', 'W1'
    section_code TEXT NOT NULL, -- 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'W'
    section_title TEXT NOT NULL,
    question_text TEXT NOT NULL,
    who_to_ask TEXT NOT NULL, -- guidance e.g. 'Permanent Secretary, Director, Commissioners'
    prompt_hints TEXT,
    applicable_tiers TEXT[] NOT NULL, -- e.g. ARRAY['Leadership', 'Management']
    response_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'structured', 'composite'
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- 4. ANSWERS TABLE
CREATE TABLE IF NOT EXISTS public.answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    answer_text TEXT DEFAULT '',
    structured_data JSONB DEFAULT '{}'::jsonb,
    is_flagged BOOLEAN DEFAULT FALSE,
    updated_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_interview_question UNIQUE (interview_id, question_id)
);

-- 5. SUPPORTING DOCUMENTS CHECKLIST TABLE (20 statutory items)
CREATE TABLE IF NOT EXISTS public.documents_checklist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
    item_number INTEGER NOT NULL CHECK (item_number BETWEEN 1 AND 20),
    document_title TEXT NOT NULL,
    category TEXT NOT NULL,
    exists_status TEXT NOT NULL CHECK (exists_status IN ('Yes', 'No', 'Partial', 'Unknown')) DEFAULT 'Unknown',
    collected_status TEXT NOT NULL CHECK (collected_status IN ('Collected', 'Pending', 'Refused', 'N/A')) DEFAULT 'Pending',
    notes TEXT DEFAULT '',
    follow_up_action TEXT DEFAULT '',
    file_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_interview_document_item UNIQUE (interview_id, item_number)
);

-- 6. INTERVIEWER POST-INTERVIEW NOTES TABLE
CREATE TABLE IF NOT EXISTS public.interviewer_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id UUID NOT NULL UNIQUE REFERENCES public.interviews(id) ON DELETE CASCADE,
    observations TEXT DEFAULT '',
    numbers_captured JSONB DEFAULT '{
        "total_staff": null,
        "labour_officers_count": null,
        "annual_inspections": null,
        "disputes_logged": null,
        "disputes_resolved": null,
        "budget_allocated_ugx": null,
        "budget_released_pct": null,
        "backlog_cases": null
    }'::jsonb,
    contradictions TEXT DEFAULT '',
    documents_collected_summary TEXT DEFAULT '',
    follow_ups TEXT DEFAULT '',
    maturity_signals JSONB DEFAULT '{
        "governance_score": 3,
        "technology_score": 2,
        "process_score": 2,
        "people_skills_score": 3,
        "data_reporting_score": 2,
        "justification": ""
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. FILES / ATTACHMENTS TABLE
CREATE TABLE IF NOT EXISTS public.interview_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
    document_item_id UUID REFERENCES public.documents_checklist(id) ON DELETE SET NULL,
    file_name TEXT NOT NULL,
    file_size_bytes BIGINT,
    mime_type TEXT,
    storage_path TEXT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_interviews_interviewer_id ON public.interviews(interviewer_id);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON public.interviews(status);
CREATE INDEX IF NOT EXISTS idx_interviews_tier ON public.interviews(tier);
CREATE INDEX IF NOT EXISTS idx_answers_interview_id ON public.answers(interview_id);
CREATE INDEX IF NOT EXISTS idx_documents_interview_id ON public.documents_checklist(interview_id);
CREATE INDEX IF NOT EXISTS idx_notes_interview_id ON public.interviewer_notes(interview_id);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviewer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_files ENABLE ROW LEVEL SECURITY;

-- Helper functions for authorization
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROFILES POLICIES
CREATE POLICY "Profiles viewable by self or admin"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Admins can insert profiles"
    ON public.profiles FOR INSERT
    WITH CHECK (public.is_admin() OR auth.uid() = id);

-- QUESTIONS POLICIES (Master catalogue is readable by all authenticated users)
CREATE POLICY "Questions readable by authenticated users"
    ON public.questions FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Questions manageable only by admins"
    ON public.questions FOR ALL
    TO authenticated
    USING (public.is_admin());

-- INTERVIEWS POLICIES
-- Interviewers can only see/edit their own interviews; Admins can see/edit everything
CREATE POLICY "Interviews viewable by creator or admin"
    ON public.interviews FOR SELECT
    TO authenticated
    USING (interviewer_id = auth.uid() OR public.is_admin());

CREATE POLICY "Interviewers can create interviews"
    ON public.interviews FOR INSERT
    TO authenticated
    WITH CHECK (interviewer_id = auth.uid() OR public.is_admin());

CREATE POLICY "Interviewers can update own interviews"
    ON public.interviews FOR UPDATE
    TO authenticated
    USING (interviewer_id = auth.uid() OR public.is_admin());

CREATE POLICY "Interviewers can delete draft interviews or admin can delete any"
    ON public.interviews FOR DELETE
    TO authenticated
    USING ((interviewer_id = auth.uid() AND status = 'Draft') OR public.is_admin());

-- ANSWERS POLICIES
CREATE POLICY "Answers viewable by interview owner or admin"
    ON public.answers FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.interviews
            WHERE id = answers.interview_id AND (interviewer_id = auth.uid() OR public.is_admin())
        )
    );

CREATE POLICY "Answers editable by interview owner or admin"
    ON public.answers FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.interviews
            WHERE id = answers.interview_id AND (interviewer_id = auth.uid() OR public.is_admin())
        )
    );

-- DOCUMENTS CHECKLIST POLICIES
CREATE POLICY "Documents viewable by interview owner or admin"
    ON public.documents_checklist FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.interviews
            WHERE id = documents_checklist.interview_id AND (interviewer_id = auth.uid() OR public.is_admin())
        )
    );

CREATE POLICY "Documents manageable by interview owner or admin"
    ON public.documents_checklist FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.interviews
            WHERE id = documents_checklist.interview_id AND (interviewer_id = auth.uid() OR public.is_admin())
        )
    );

-- INTERVIEWER NOTES POLICIES
CREATE POLICY "Notes viewable by interview owner or admin"
    ON public.interviewer_notes FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.interviews
            WHERE id = interviewer_notes.interview_id AND (interviewer_id = auth.uid() OR public.is_admin())
        )
    );

CREATE POLICY "Notes editable by interview owner or admin"
    ON public.interviewer_notes FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.interviews
            WHERE id = interviewer_notes.interview_id AND (interviewer_id = auth.uid() OR public.is_admin())
        )
    );

-- FILES POLICIES
CREATE POLICY "Files viewable by interview owner or admin"
    ON public.interview_files FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.interviews
            WHERE id = interview_files.interview_id AND (interviewer_id = auth.uid() OR public.is_admin())
        )
    );

CREATE POLICY "Files insertable by interview owner or admin"
    ON public.interview_files FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.interviews
            WHERE id = interview_files.interview_id AND (interviewer_id = auth.uid() OR public.is_admin())
        )
    );

-- TRIGGER TO UPDATE updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_interviews_updated_at BEFORE UPDATE ON public.interviews FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_answers_updated_at BEFORE UPDATE ON public.answers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents_checklist FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON public.interviewer_notes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- AUTO-CREATE PROFILE ON AUTH USER SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, department_unit)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'interviewer'),
        COALESCE(NEW.raw_user_meta_data->>'department_unit', 'Labour Directorate')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

