-- =====================================================================
-- MGLSD Labour Directorate – Server-Side Email Domain Enforcement at auth.users Gate
-- Prevents opaque "Database error saving new user" by validating email
-- domain on auth.users BEFORE INSERT (true gate) with readable error.
-- =====================================================================

-- 1. Helper function to validate allowed email domains server-side
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

    -- Authorised domains: gmail.com, yahoo.com, malaikapath.org, mglsd.go.ug, and any .go.ug address
    IF domain_part IN ('gmail.com', 'yahoo.com', 'malaikapath.org', 'mglsd.go.ug', 'go.ug') 
       OR domain_part LIKE '%.go.ug' THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Trigger function on auth.users to enforce domain check at the true gate
CREATE OR REPLACE FUNCTION public.enforce_auth_user_email_domain()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT public.is_allowed_email_domain(NEW.email) THEN
        RAISE EXCEPTION 'This email domain is not authorised. Please use a Gmail, Yahoo, Malaika Path, or official .go.ug email address.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Idempotently attach BEFORE INSERT OR UPDATE trigger directly to auth.users
DROP TRIGGER IF EXISTS trg_enforce_auth_user_email_domain ON auth.users;
CREATE TRIGGER trg_enforce_auth_user_email_domain
    BEFORE INSERT OR UPDATE OF email ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_auth_user_email_domain();
