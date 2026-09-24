-- =====================================================================
-- MGLSD Labour Directorate – Server-Side Email Domain Enforcement Migration
-- Enforces allowed email domains at the database level (profiles / sign-up gate)
-- =====================================================================

-- Helper function to validate allowed email domains server-side
CREATE OR REPLACE FUNCTION public.is_allowed_email_domain(email_input TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    clean_email TEXT;
    domain_part TEXT;
BEGIN
    IF email_input IS NULL OR NOT (email_input LIKE '%@%') THEN
        RETURN FALSE;
    END IF;
    
    clean_email := LOWER(TRIM(email_input));
    domain_part := SPLIT_PART(clean_email, '@', 2);
    
    IF domain_part IS NULL OR domain_part = '' THEN
        RETURN FALSE;
    END IF;

    -- Check exact match or .go.ug suffix
    IF domain_part IN ('gmail.com', 'yahoo.com', 'malaikapath.org', 'mglsd.go.ug', 'go.ug') 
       OR domain_part LIKE '%.go.ug' THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger function to enforce domain check on public.profiles insert/update
CREATE OR REPLACE FUNCTION public.enforce_profile_email_domain()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT public.is_allowed_email_domain(NEW.email) THEN
        RAISE EXCEPTION 'This email domain is not authorised. Please use a Gmail, Yahoo, Malaika Path, or official .go.ug email address.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if present and create BEFORE INSERT OR UPDATE trigger on profiles
DROP TRIGGER IF EXISTS trg_enforce_profile_email_domain ON public.profiles;
CREATE TRIGGER trg_enforce_profile_email_domain
    BEFORE INSERT OR UPDATE OF email ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_profile_email_domain();
