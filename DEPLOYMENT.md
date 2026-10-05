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
