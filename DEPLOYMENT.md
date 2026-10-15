# MGLSD Labour Directorate – Operator & Deployment Guide

This document provides a concise operator guide for deploying, configuring, and maintaining the Republic of Uganda MGLSD Labour Directorate Diagnostic Interview Application in production environments.

---

## 1. Required Environment Variables

Refer to `.env.example` for required configuration keys. In production, configure the following environment variables:

```env
# Required Supabase Project Connection (Client Bundle)
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: Service Role Key (Automated CLI Seeding Only)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

> **Security Note**: Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser or client bundle. Service role keys bypass Row-Level Security (RLS) and must only be used in secure server environments or automated CLI scripts (`npm run db:seed`).

---

## 2. Running the Database Seed Script

The `public.questions` table must contain the 52 statutory diagnostic questions for the application to function.

To verify or seed the remote database using the automated CLI tool:

```bash
# Using npm
npm run db:seed

# Using bun
bun run db:seed
```

If the live table is already populated with all 52 statutory questions, the seed utility exits early with:
`✅ Database is already seeded with all 52 diagnostic questions – no changes needed.`

---

## 3. Confirming User Email Addresses

By default, Supabase Auth requires email verification upon registration. If a user reports "signup succeeded but login fails", operators can confirm the account using either method:

### Option A: Via Supabase Dashboard
1. Open [Supabase Dashboard](https://app.supabase.com) → **Authentication** → **Users**.
2. Locate the user by email address.
3. Click the `...` menu on the right and select **Confirm Email**.

### Option B: Via Supabase SQL Editor
Run the following SQL query in the Supabase SQL Editor:
```sql
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'officer@mglsd.go.ug' AND email_confirmed_at IS NULL;
```

---

## 3.1 Required Supabase Production Settings Checklist (Dashboard Configuration)

Before promoting this application to production, operators must configure the following security settings in the Supabase Dashboard:

1. **Email Confirmation (`Confirm email: ON`)**:
   - Location: **Authentication → Providers → Email**.
   - **Requirement**: `Confirm email` must be enabled. Do not disable email confirmation in production. This guarantees that only holders of active government and authorized mailboxes can complete account creation.

2. **Custom SMTP Provider**:
   - Location: **Project Settings → Authentication → SMTP Settings**.
   - **Requirement**: Configure a dedicated custom SMTP server (e.g. Amazon SES, SendGrid, Resend, or Government Exchange SMTP):
     - **Host**: Your verified SMTP server address (e.g. `email-smtp.eu-west-1.amazonaws.com`).
     - **Port**: `587` (STARTTLS) or `465` (SSL).
     - **Sender Email**: Official verified address (e.g. `noreply@mglsd.go.ug`).
     - **Sender Name**: `MGLSD Labour Directorate Diagnostic`.
   - **Rationale**: The Supabase built-in mailing service has strict default limits (3 emails/hour), which causes confirmation delays. Custom SMTP ensures immediate, unlimited transactional email delivery.

3. **Password Security Policy**:
   - Location: **Authentication → Security**.
   - **Requirement**:
     - **Minimum Password Length**: Set to **12 characters** (matching the TypeScript policy in `src/lib/validation.ts`).
     - **Leaked Password Protection**: Toggle **ON** (automatically checks new passwords against the HaveIBeenPwned database to block compromised passwords).

4. **Multi-Factor Authentication (MFA)**:
   - Location: **Authentication → Multi-Factor (MFA)**.
   - **Requirement**: Enable **App Authenticator (TOTP)**.
   - **Admin Policy**: Administrators must be enrolled with TOTP MFA. See `docs/mfa-design.md` for technical design and recovery protocols.

5. **Rate Limiting**:
   - Location: **Project Settings → Authentication → Rate Limits**.
   - **Requirement**:
     - **Email Rate Limit**: Set to `30` emails per hour per user/IP.
     - **Token Verification Limit**: Set to `60` attempts per minute.
     - **Token Refresh Limit**: Set to `100` attempts per hour.

---

## 4. Verifying `isSupabaseConfigured` in Production

To verify that the application is running against a live, configured Supabase backend rather than Demo Mode:

1. **Browser Console Diagnostics**:
   Inspect browser console logs on application startup:
   ```text
   [Supabase Config Diagnostics] VITE_SUPABASE_URL: https://your-project-ref.supabase.co...
   [Supabase Config Diagnostics] VITE_SUPABASE_ANON_KEY: your-anon-key...
   ```
2. **In-App Health Check Card**:
   Navigate to **Support & Guidance** (`/support`). The **Database & Master Catalogue Health Check** card displays live connection status, project target, and row count.
3. **Configuration Flags**:
   `isSupabaseConfigured` evaluates to `true` when valid `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` credentials (non-placeholder) are supplied.

---

## 5. Security Mandate: Role Switcher & RLS

- In live Supabase mode (`isSupabaseConfigured === true`), user roles are enforced directly by PostgreSQL Row-Level Security (RLS) policies and `public.profiles`.
- Role switching (`switchRole`) is automatically enforced as a no-op when `isSupabaseConfigured === true`.
- User roles (`interviewer` vs `admin`) can only be assigned or modified by authorized administrators through the **User Management** interface (`UserManagementView`) or by updating `public.profiles` in the database.

---

## Continuous Integration & Build Commands

Refer to `.github/workflows/ci.yml` for automated continuous integration steps (`install`, `lint`, `test`, `build`).

---

## 6. Staging Environment Checklist

To deploy and validate a Staging / Pre-Production environment before promoting changes to Production:

1. **Configure Environment Variables**:
   Set the following keys in your staging hosting environment (referencing `.env.example` placeholders):
   ```env
   VITE_SUPABASE_URL=https://your-staging-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-staging-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-staging-service-role-key-here
   ```

2. **Execute Database Seeding**:
   Run the statutory question catalogue seed script against the staging database:
   ```bash
   npm run db:seed
   ```

3. **Verify User Email Confirmation & Auth**:
   Register a test MGLSD staff account and confirm the email address using either the Supabase Dashboard (**Authentication → Users → Confirm Email**) or via SQL:
   ```sql
   UPDATE auth.users
   SET email_confirmed_at = NOW()
   WHERE email = 'staging.officer@mglsd.go.ug' AND email_confirmed_at IS NULL;
   ```

4. **Confirm Staging Health Check**:
   Navigate to the `/support` page and verify that the **Database & Master Catalogue Health Check** reports `isSupabaseConfigured === true` connected to the staging project reference.

---

## 7. Secrets Rotation

Operators must periodically rotate API keys or handle compromised credentials following these procedures:

1. **Client Anon Key (`VITE_SUPABASE_ANON_KEY`)**:
   - Generate a new anon key in Supabase Dashboard (**Project Settings → API**).
   - Update the `VITE_SUPABASE_ANON_KEY` environment variable in your deployment platform settings.
   - Re-deploy or trigger a new build so client bundles pick up the updated key.

2. **Service Role Key (`SUPABASE_SERVICE_ROLE_KEY`)**:
   - Generate a new service role key in Supabase Dashboard (**Project Settings → API**).
   - Update `SUPABASE_SERVICE_ROLE_KEY` in your CLI execution environment or secure CI/CD pipeline secrets.
   - **CRITICAL SECURITY RULE**: Never expose the service role key under a `VITE_` prefix or check it into source control. It bypasses Row-Level Security (RLS) and must strictly remain CLI/server-only.

---

## 8. Backup & Restore Runbook

Operators should maintain regular database backups and know how to execute manual user/data maintenance routines.

1. **Automated & Manual Database Backups**:
   - Open [Supabase Dashboard](https://app.supabase.com) → **Database** → **Backups**.
   - Verify that automated daily backups are active.
   - Click **Take Backup** to create an on-demand point-in-time snapshot prior to major migrations or administrative updates.

2. **Restoring Data & Triage SQL**:
   - To restore from a backup snapshot, select the desired backup under **Database → Backups** and click **Restore**.
   - **Check Account Confirmation Status**:
     ```sql
     SELECT id, email, email_confirmed_at, created_at
     FROM auth.users
     WHERE email = 'officer@mglsd.go.ug';
     ```
   - **Manually Confirm Unconfirmed User**:
     ```sql
     UPDATE auth.users
     SET email_confirmed_at = NOW()
     WHERE email = 'officer@mglsd.go.ug' AND email_confirmed_at IS NULL;
     ```

