-- =====================================================================
-- MGLSD LABOUR DIAGNOSTIC APPLICATION - PHASE 1.3
-- SUPABASE STORAGE BUCKET & RLS POLICIES FOR INTERVIEW DOCUMENTS
-- =====================================================================

-- 1. Create the private Storage bucket for interview documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'interview-documents',
    'interview-documents',
    false, -- Private bucket: access requires authenticated session with RLS
    52428800, -- 50MB maximum file size limit
    ARRAY[
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 52428800,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage RLS Policies for storage.objects
-- Files are stored with path pattern: {interview_id}/{item_number}_{filename}
-- Access control: Only the interview owner (interviewer_id = auth.uid()) or Admin (public.is_admin()) can read/write

-- POLICY 1: View / Download files
DROP POLICY IF EXISTS "Interview documents viewable by interview owner or admin" ON storage.objects;
CREATE POLICY "Interview documents viewable by interview owner or admin"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'interview-documents'
    AND (
        public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.interviews
            WHERE id::text = (storage.foldername(name))[1]
            AND interviewer_id = auth.uid()
        )
    )
);

-- POLICY 2: Upload files
DROP POLICY IF EXISTS "Interview documents uploadable by interview owner or admin" ON storage.objects;
CREATE POLICY "Interview documents uploadable by interview owner or admin"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'interview-documents'
    AND (
        public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.interviews
            WHERE id::text = (storage.foldername(name))[1]
            AND interviewer_id = auth.uid()
        )
    )
);

-- POLICY 3: Update files
DROP POLICY IF EXISTS "Interview documents updatable by interview owner or admin" ON storage.objects;
CREATE POLICY "Interview documents updatable by interview owner or admin"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'interview-documents'
    AND (
        public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.interviews
            WHERE id::text = (storage.foldername(name))[1]
            AND interviewer_id = auth.uid()
        )
    )
);

-- POLICY 4: Delete files
DROP POLICY IF EXISTS "Interview documents deletable by interview owner or admin" ON storage.objects;
CREATE POLICY "Interview documents deletable by interview owner or admin"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'interview-documents'
    AND (
        public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.interviews
            WHERE id::text = (storage.foldername(name))[1]
            AND interviewer_id = auth.uid()
        )
    )
);
