# MGLSD Labour Directorate – Diagnostic Interview Application
### TRANSFORMATIVE Programme | Ministry of Gender, Labour and Social Development (Republic of Uganda)

A role-based, enterprise diagnostic interview and institutional assessment platform built for the **TRANSFORMATIVE Programme** within Uganda's Ministry of Gender, Labour and Social Development (MGLSD). The tool enables structured qualitative and quantitative interviews across institutional tiers, statutory evidence collection, interviewer observation logging, and cross-departmental diagnostic analytics.

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Dual-Mode Architecture](#2-dual-mode-architecture)
3. [Prerequisites](#3-prerequisites)
4. [Local Development Setup](#4-local-development-setup)
5. [Supabase Backend Setup](#5-supabase-backend-setup)
6. [Available Scripts](#6-available-scripts)
7. [Project Structure](#7-project-structure)
8. [Role Model & Security Notes](#8-role-model--security-notes)
9. [Known Limitations & Technical Debt](#9-known-limitations--technical-debt)
10. [Contributing & Next Steps](#10-contributing--next-steps)

---

## 1. Project Overview

### Purpose
The **TRANSFORMATIVE Programme** is a national systems-strengthening initiative within the Republic of Uganda. This diagnostic tool captures current-state institutional data, operational pain points, statutory compliance gaps, and evidence across all levels of the Labour Directorate (Headquarters in Simbamanyo House, Kampala, as well as decentralized Regional and District Labour Offices).

### Key Features
- **Tier-Specific Dynamic Questionnaires**: Automatically selects and renders targeted diagnostic questions (Sections A through H plus Section W) based on the interviewee's institutional tier:
  - `Leadership`: Strategy, policy, legislative mandate, inter-agency coordination.
  - `Management`: Operational execution, budget, personnel allocation, workflow bottlenecks.
  - `Frontline`: Field inspection mechanics, dispute resolution, case registries, logistical challenges.
  - `Support/IT`: Digital systems, database availability, network infrastructure, hardware constraints.
- **20-Item Statutory Documents Checklist**: Tracks existence and physical/digital collection status (`Exists & Collected`, `Exists - Not Collected`, `Does Not Exist`, `Unknown`) for critical statutory records (inspection logs, accident registers, CBA filings, child labour reports).
- **Interviewer Observations & Diagnostic Notes**: Structured capture of institutional culture, capacity signals, operational pain points, and recommended reforms with automatic background autosaving.
- **Printable Diagnostic Brief Export**: Generates an official, printable assessment brief with the Republic of Uganda Coat of Arms, institutional metadata, question responses, checklist summary, and formal signing blocks.
- **National Oversight Analytics Dashboard**: Admin-level radar charts, inspection volume indicators, tier distribution breakdowns, and JSON export capabilities.
- **Responsive Official UI**: Tailored with the Coat of Arms of Uganda, accessible high-contrast design, mobile drawer navigation, and offline resilience.

### Tech Stack Summary
| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | React 19 (`react`, `react-dom`) |
| **Language** | TypeScript 5.8 (Strict Type Safety) |
| **Build Tool & Dev Server** | Vite 6.2 |
| **Styling** | Tailwind CSS v4 (`@tailwindcss/vite`), Lucide Icons (`lucide-react`) |
| **Animations** | Motion (`motion/react`) |
| **Data Visualization** | Recharts 3.10 (Pie, Bar, Radar charts) |
| **Backend & Persistence** | Supabase (`@supabase/supabase-js` v2) — PostgreSQL, Auth & Storage |
| **Testing** | Vitest 5.0, `@testing-library/react`, JSDOM |
| **Runtime & Package Manager** | Bun (preferred) / Node.js (v18+) & npm |

---

## 2. Dual-Mode Architecture

The application is engineered with a **Zero-Config Dual Mode** architecture. It functions seamlessly both in a fully offline/demo setting and with a connected live Supabase backend.

```
                    ┌───────────────────────────────┐
                    │   src/lib/supabase.ts         │
                    │   isSupabaseConfigured flag   │
                    └───────────────┬───────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
  [ FALSE: Demo / Offline Mode ]                   [ TRUE: Supabase Live Mode ]
  • Uses browser localStorage                       • Connects to PostgreSQL via Supabase
  • Mock profile selection                          • Real Supabase Auth (JWT & sessions)
  • Immediate prototype evaluation                  • Row-Level Security (RLS) enforcement
  • Full offline data persistence                   • Supabase Storage for uploaded documents
  • Resilient to network outages                    • Real-time synchronization
```

### 1. Demo / Offline Mode
Triggered when `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` are missing, empty, or contain default placeholder strings.
- **No external service needed**: Developers, field officers, or stakeholders can test and use the app immediately without configuring a database.
- **Quick-switch mock users**: Instant toggling between sample MGLSD officers (e.g., *Dr. Bernard Mugalu - Admin/Commissioner*, *John Okello - Senior Labour Officer*, *Grace Akello - Inspector*).
- **In-memory + LocalStorage Fallback**: All changes persist across browser refreshes using dedicated local keys.

#### LocalStorage Keys Reference
| Key | Storage Target | Description |
| :--- | :--- | :--- |
| `mglsd_demo_user` | User Profile JSON | Currently active mock user and role in Demo Mode |
| `mglsd_interviews` | `Interview[]` | Array of all interviews created or modified |
| `mglsd_answers` | `Record<string, Answer[]>` | Diagnostic answers mapped by `interview_id` |
| `mglsd_checklists` | `Record<string, DocumentItem[]>` | 20-item statutory checklist states by `interview_id` |
| `mglsd_notes` | `Record<string, InterviewerNote>` | Observation notes mapped by `interview_id` |
| `mglsd_activities` | `RecentActivityItem[]` | System audit log of created/updated interviews |
| `mglsd_questions_cache` | `Question[]` | Cached master questions catalogue loaded from Supabase |
| `mglsd_questions_cache_meta` | `QuestionsCacheMetadata` | Cache timestamp, provenance source (`supabase` vs `fallback`), and row count |

### Dynamic Questions Loading & Single Source of Truth

To prevent schema and catalogue drift, **Supabase (`public.questions` table)** is established as the canonical, single source of truth for the TRANSFORMATIVE diagnostic questionnaire. `src/lib/questionsData.ts` serves strictly as an offline safety net and demo fallback.

```
                  ┌────────────────────────────────────────────────────────┐
                  │                 Application Boot / Hook                 │
                  │   App.tsx (mount)  •  useQuestions() (initialization)  │
                  └───────────────────────────┬────────────────────────────┘
                                              │
                                              ▼
                             ┌─────────────────────────────────┐
                             │    fetchQuestionsFromSupabase   │
                             └────────────────┬────────────────┘
                                              │
                     ┌────────────────────────┴────────────────────────┐
                     ▼                                                 ▼
        [ isSupabaseConfigured = TRUE ]                 [ isSupabaseConfigured = FALSE ]
                     │                                                 │
                     ▼                                                 │
        Query public.questions table                                   │
                     │                                                 │
        ┌────────────┴────────────┐                                    │
        ▼                         ▼                                    │
  [ Rows Found ]          [ Error / 0 Rows ]                           │
        │                         │                                    │
        ├─────────────────────────┼────────────────────────────────────┘
        │                         │
        ▼                         ▼
┌───────────────────────┐  ┌───────────────────────────────────────────┐
│ Supabase Live Mode    │  │ Fallback Safety Net                       │
│ 1. Map to Question[]  │  │ 1. Inspect localStorage key                │
│ 2. Save in memory     │  │    `mglsd_questions_cache`                 │
│ 3. Save to storage    │  │ 2. If valid & unexpired, use cached pool   │
│ 4. Set 24h timestamp  │  │ 3. If missing/empty, fall back to          │
│    `mglsd_questions_  │  │    MASTER_QUESTIONS in questionsData.ts    │
│    cache_meta`        │  └───────────────────────────────────────────┘
└───────────────────────┘
```

#### Key Architecture Principles:
1. **Canonical Single Source of Truth (`public.questions`)**:
   - Master questions are defined and seeded in `supabase/seed.sql` with explicit `sort_order`, `applicable_tiers`, `section_code`, and `who_to_ask` fields.
   - Any modifications, re-orderings, or new statutory questions are updated in the database directly. No code rebuild or redeployment is required.

2. **In-Memory & Persistent Caching (`mglsd_questions_cache`)**:
   - On app start (or first invocation of `useQuestions`), the application queries `public.questions`.
   - Successful queries update the in-memory array and write to `localStorage` under `mglsd_questions_cache`.
   - Metadata is stored under `mglsd_questions_cache_meta` containing `{ timestamp, count, source: 'supabase', isStale: boolean }`.

3. **24-Hour Cache Refresh & Auto-Sync**:
   - The cache incorporates a 24-hour TTL (`QUESTIONS_CACHE_TTL_MS = 86,400,000 ms`).
   - If `isQuestionsCacheStale()` returns true, `useQuestions()` triggers a fresh background synchronization with Supabase.

4. **Operator / Admin On-Demand Refresh**:
   - Authorized administrators (`role: 'admin'`) can force an immediate catalogue sync without waiting for the 24-hour cycle:
     - **Analytics Dashboard**: The "Refresh Questions Cache" button in the top action bar synchronizes immediately and displays status toasts with row counts.
     - **Header User Dropdown**: The "Refresh Questions Cache" menu item allows instant synchronization from any screen.

5. **Robust Offline Safety Net (`src/lib/questionsData.ts`)**:
   - `MASTER_QUESTIONS` in `src/lib/questionsData.ts` is preserved strictly as the offline and demo fallback.
   - If Supabase credentials are not provided (`isSupabaseConfigured === false`), or if network connection is lost or the database returns zero rows, the application falls back seamlessly without breaking tier filters or questionnaire forms.

### 2. Real Supabase Mode
Triggered when valid `VITE_SUPABASE_URL` (starting with `https://`) and `VITE_SUPABASE_ANON_KEY` are supplied in `.env`.
- Real authentication via Supabase Auth (`supabase.auth.signInWithPassword`, `signUp`, `signOut`).
- PostgreSQL database tables enforce referential integrity and Row-Level Security (RLS).
- Private Supabase Storage bucket (`interview-documents`) stores uploaded files with signed URLs.
- Background sync and local cache fallback guarantee data is not lost during transient network drops.

### The `isSupabaseConfigured` Flag
Defined in `src/lib/supabase.ts`:
```typescript
export const isSupabaseConfigured: boolean = Boolean(
  rawUrl &&
    rawKey &&
    !rawUrl.includes('your-project') &&
    !rawKey.includes('your-anon-key') &&
    (rawUrl.startsWith('https://') || rawUrl.startsWith('http://'))
);
```
Both `AuthContext.tsx` and `InterviewContext.tsx` check this flag to switch between Supabase API queries (`src/lib/interviewService.ts`) and localStorage handlers without breaking component contracts.

---

## 3. Prerequisites

Ensure your environment satisfies the following minimum requirements:

- **Runtime / Package Manager**:
  - **Bun** `v1.0.0` or later (Recommended for fast builds and test execution)
  - *OR* **Node.js** `v18.18.0` / `v20.0.0`+ with **npm** `v9.0.0`+
- **Supabase Account** (Only required for Real Supabase Mode):
  - Access to [supabase.com](https://supabase.com) to provision a project, or a local Supabase CLI instance.
- **Modern Web Browser**:
  - Google Chrome, Microsoft Edge, Firefox, or Safari with ES2022 support.

---

## 4. Local Development Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd mglsd-labour-diagnostic
```

### 2. Install Dependencies
Using **Bun** (Preferred):
```bash
bun install
```
Or using **npm**:
```bash
npm install
```

### 3. Environment Configuration
Copy the template configuration file:
```bash
cp .env.example .env
```

#### Environment Variables Explained
```env
# GEMINI_API_KEY: Optional legacy key reserved for AI summarization features (can remain empty).
GEMINI_API_KEY=

# APP_URL: Base URL where the application or reverse-proxy is hosted (default: http://localhost:3000).
APP_URL=http://localhost:3000

# SUPABASE BACKEND CONFIGURATION:
# Set these to your Supabase Project Settings -> API credentials to activate Real Mode.
# Leave them empty or commented out to run in Demo / Offline Mode.
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### 4. Running in Pure Demo Mode (No Supabase Required)
Leave `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` empty in `.env`. Then start the dev server:
```bash
# Using Bun
bun run dev

# Using npm
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. You will see the **"Demo Prototype Mode"** indicator in the navigation bar with full access to mock interviews, role switching, and diagnostic forms.

### 5. Running in Real Supabase Mode
Populate `.env` with your project credentials:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI...
```
Restart the development server:
```bash
bun run dev
```
The app will connect to your live Supabase database. You can sign in using real credentials created in your project.

---

## 5. Supabase Backend Setup

Follow these steps to configure a brand-new Supabase project for the application.

### Step 1: Create a Supabase Project
1. Log in to [Supabase Dashboard](https://app.supabase.com) and click **"New Project"**.
2. Select your organization, name the project (e.g., `mglsd-labour-diagnostic`), set a secure database password, and select a hosting region (e.g., `eu-central-1` or closest to Uganda).

### Step 2: Apply the Schema Migration
Open the **SQL Editor** in your Supabase dashboard, paste the contents of `supabase/migrations/20250916_initial_schema.sql`, and click **Run**.

This creates:
- `public.profiles`: Stores user details and roles (`interviewer` or `admin`) linked to `auth.users(id)`.
- `public.interviews`: Primary interview records (interviewee, tier, status, completion).
- `public.questions`: Master catalog of diagnostic questions (Sections A through W).
- `public.answers`: Detailed qualitative and structured question answers.
- `public.documents_checklist`: 20 statutory document checklist entries per interview.
- `public.interviewer_notes`: Qualitative interviewer observations and ratings.
- `public.interview_files`: Metadata for uploaded evidentiary documents.
- Automatic update triggers on `updated_at` columns.
- Row-Level Security (RLS) on all tables and the `public.is_admin()` helper function.

### Step 3: Configure Storage and Storage RLS
In the **SQL Editor**, run the script from `supabase/migrations/20250916_storage_setup.sql`.

This creates:
- The private bucket `interview-documents` with a 50MB file size limit.
- Allowed MIME types: PDF, Word (`.doc`, `.docx`), Excel (`.xls`, `.xlsx`), Images (`.jpg`, `.png`, `.webp`), and text/csv.
- Storage RLS policies allowing upload, read, and delete operations only to the interview owner (`interviewer_id = auth.uid()`) or users with `role = 'admin'`.

### Step 3b: Apply Profiles Security Hardening Migration
In the **SQL Editor**, run the script from `supabase/migrations/20260920_harden_profiles_role_update.sql`.

This resolves the role privilege escalation vector (`await supabase.from('profiles').update({ role: 'admin' }).eq('id', auth.uid())`):
- **Drops Insecure Policy**: Drops legacy `"Users can update own profile"`.
- **Enforces Non-Role RLS**: Creates `"Users update own non-role fields"` with a `WITH CHECK (auth.uid() = id AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()))` constraint.
- **Admin Role Management**: Creates `"Admins can update any profile"` permitting users where `public.is_admin() = true` to update any profile and manage roles.
- **Engine-Level Trigger**: Adds `trg_prevent_role_escalation` which raises an `insufficient_privilege (42501)` exception if a non-admin attempts to mutate the `role` column.

### Step 4: Seed the Master Questions Catalog
In the **SQL Editor**, run the script from `supabase/seed.sql`.
- Inserts the complete MGLSD questionnaire across Section A (Strategy & Mandate), Section B (Institutional Structure), Section C (Labour Inspectorate), Section D (Dispute Resolution), Section E (Occupational Safety & Health), Section F (External Employment), Section G (Social Dialogue & Tripartite), Section H (Information Systems & Logistics), and Section W (Regional Workshop / Frontline).

### Step 5: How RLS and the `is_admin()` Helper Work
Security in the database is strictly enforced using PostgreSQL Row-Level Security:
```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```
- **Interviewers** can only view and update interviews where `interviewer_id = auth.uid()`.
- **Admins** bypass the `interviewer_id` filter via `public.is_admin()` and can view/manage all records nationwide.
- **Profiles RLS & Trigger Hardening**: Non-admin users are strictly barred from altering their `role` column via client-side updates through policy `Users update own non-role fields` (`WITH CHECK (auth.uid() = id AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()))`) and engine trigger `trg_prevent_role_escalation`. Admin users manage roles through policy `Admins can update any profile`. All non-admin users are barred from modifying the master questions catalogue.

### Step 6: Create the Initial Admin User
To log in as the first administrator:
1. In the Supabase Dashboard, go to **Authentication -> Users** and click **"Add user" -> "Create user"**.
2. Enter an email (e.g. `admin@mglsd.go.ug`) and a secure password.
3. Copy the newly created user's `UUID`.
4. Open the **SQL Editor** and run:
```sql
INSERT INTO public.profiles (id, email, full_name, role, department_unit)
VALUES (
    '<PASTE-USER-UUID-HERE>',
    'admin@mglsd.go.ug',
    'Commissioner Administrator',
    'admin',
    'Office of the Director - Labour Directorate'
)
ON CONFLICT (id) DO UPDATE SET
    role = 'admin';
```
Now you can log in to the application with this email and password, receiving full administrator privileges.

### Step 7: Production User Provisioning & Management
When running in live Supabase mode (`isSupabaseConfigured === true`), new field interviewers and staff accounts must be provisioned securely via the Supabase Auth Dashboard or invite links:
1. **Create User in Supabase Auth**: In the Supabase Dashboard, go to **Authentication -> Users** and invite or create the user.
2. **Profile & Role Assignment**: Once the user signs up or is created, their corresponding row in `public.profiles` is populated, and administrators can assign or update their role (`interviewer` or `admin`) directly from the **User Management** view within the application.
3. **UI Graceful Degradation**: In live Supabase mode, the local "Add New Field Interviewer" button is disabled with an explanatory banner, ensuring that unauthenticated or unmanaged mock IDs are not incorrectly inserted into production databases.

---

## 6. Available Scripts

The project includes the following commands defined in `package.json`:

| Command (Bun) | Command (npm) | Description |
| :--- | :--- | :--- |
| `bun run dev` | `npm run dev` | Launches Vite development server on `0.0.0.0:3000` with hot reload |
| `bun run build` | `npm run build` | Runs TypeScript compilation and generates production assets in `dist/` |
| `bun run preview`| `npm run preview` | Starts a local server previewing the production build in `dist/` |
| `bun run lint` | `npm run lint` | Executes TypeScript strict type check (`tsc --noEmit`) |
| `bun run test` | `npm run test` | Executes the Vitest test suite (`vitest run`) |
| `bun run clean` | `npm run clean` | Removes `dist` and temporary build output artifacts |

---

## 7. Project Structure

```
├── .env.example                     # Environment template documenting all variables
├── index.html                       # Application HTML entry point with Uganda branding & favicon
├── package.json                     # Project scripts and dependencies
├── tsconfig.json                    # TypeScript compiler options
├── vite.config.ts                   # Vite configuration with Tailwind CSS plugin
├── vitest.config.ts                 # Vitest configuration for unit and integration testing
│
├── public/                          # Static assets served at the root
│   ├── Coat_of_arms_of_Uganda.svg   # Official Uganda Coat of Arms vector graphic
│   └── favicon.svg                  # Browser tab icon
│
├── src/
│   ├── App.tsx                      # Root component, routing, drawer state, and loading view
│   ├── main.tsx                     # React 19 application bootstrap
│   ├── types.ts                     # Core TypeScript data contracts, interfaces, and enums
│   ├── index.css                    # Tailwind CSS imports and custom global rules
│   │
│   ├── assets/                      # Bundled images and static media
│   │   └── images/                  # Ministry headquarters imagery
│   │
│   ├── components/                  # Application views and interface modules
│   │   ├── Header.tsx               # Top navigation ribbon, user menu, Coat of Arms
│   │   ├── Sidebar.tsx              # Persistent desktop navigation & mobile drawer
│   │   ├── LoginView.tsx            # Sign in / registration portal with connection status
│   │   ├── DashboardView.tsx        # Overview dashboard, metric cards, tier distribution
│   │   ├── DynamicInterviewForm.tsx # Diagnostic questionnaire, checklist & notes form
│   │   ├── DiagnosticExportModal.tsx# Printable letterhead brief & export modal
│   │   ├── AdminAnalyticsDashboard.tsx# Oversight suite, radar charts & JSON export
│   │   ├── DocumentsView.tsx        # Statutory evidence inventory browser
│   │   ├── UserManagementView.tsx   # Admin user management and role assignment
│   │   ├── NewInterviewModal.tsx    # Modal for initiating a new diagnostic interview
│   │   ├── ProfileView.tsx          # User profile view and details editor
│   │   └── SupportView.tsx          # System help, guidance, and statutory references
│   │
│   ├── context/                     # Global state providers
│   │   ├── AuthContext.tsx          # Real Supabase Auth + Demo user switcher
│   │   └── InterviewContext.tsx     # Unified data layer (Supabase + localStorage cache)
│   │
│   ├── lib/                         # Business logic, services, and catalogues
│   │   ├── supabase.ts              # Supabase client instantiation & Database types
│   │   ├── interviewService.ts      # Database queries, mutations, and storage helpers
│   │   ├── questionsData.ts         # Diagnostic questions catalogue & tier filter helpers
│   │   └── mockData.ts              # Sample interviewees, profiles, and initial seeds
│   │
│   └── test/                        # Automated test suites
│       ├── setup.ts                 # Test environment setup (JSDOM polyfills)
│       ├── authAndRls.test.tsx      # RLS policies and permission validation
│       ├── profilesSecurity.test.ts # RLS role hardening and trigger test suite
│       ├── securityHardening.test.tsx# Demo mode isolation & client-side role guards
│       ├── interviewFlow.test.tsx   # Dashboard, form rendering & export workflows
│       ├── interviewPersistence.test.tsx# Supabase persistence & fallback mechanisms
│       ├── questionsData.test.ts    # Questionnaire logic & tier mapping tests
│       ├── questionsService.test.ts # Database question fetching & fallback tests
│       └── supabaseAuth.test.tsx    # Authentication state and login view tests
│
└── supabase/                        # Database schema, storage, and seed definitions
    ├── seed.sql                     # Full SQL seed for master questions catalogue
    └── migrations/
        ├── 20250916_initial_schema.sql  # Database schema, tables, triggers, and RLS
        ├── 20250916_storage_setup.sql   # Storage bucket setup & storage.objects RLS
        └── 20260920_harden_profiles_role_update.sql # Hardened RLS policies & anti-escalation trigger
```

---

## 8. Role Model & Security Notes

### Role Definitions
| Role | Capabilities | Permitted Views |
| :--- | :--- | :--- |
| **`interviewer`** | • Create and edit assigned interviews<br>• Complete questionnaire sections<br>• Update checklist and upload documents<br>• Export diagnostic briefs | • Interview Dashboard<br>• Diagnostic Interview Form<br>• Statutory Documents Inventory<br>• User Profile |
| **`admin`** | • All `interviewer` capabilities<br>• View all interviews nationwide<br>• Delete interviews<br>• Access cross-departmental analytics<br>• Manage user accounts and assign roles | • All Interviewer views<br>• National Oversight Analytics<br>• User Administration View |

### Profiles Privilege Escalation Defense Model
To prevent unauthorized privilege escalation (`await supabase.from('profiles').update({ role: 'admin' }).eq('id', auth.uid())`):
1. **Separation of Update Policies**:
   - **`Users update own non-role fields`**: Permitted only when `auth.uid() = id`, with an enforced `WITH CHECK (auth.uid() = id AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()))`. This allows users to update personal details (`full_name`, `phone_number`, `department_unit`, `avatar_url`) while rejecting any mutation of `role`.
   - **`Admins can update any profile`**: Permitted only when `public.is_admin()` returns true (`USING (public.is_admin()) WITH CHECK (public.is_admin())`). This preserves the ability of Directorate Administrators to assign and change staff roles in `UserManagementView`.
2. **Defensive Database Trigger (`trg_prevent_role_escalation`)**:
   - Executes `BEFORE UPDATE ON public.profiles`.
   - Checks `IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin() THEN RAISE EXCEPTION ... USING ERRCODE = '42501'`.
   - Rejects any direct bypass attempts with standard PostgreSQL insufficient privilege errors.
3. **Client-Side Defense-in-Depth**:
   - `AuthContext.updateProfile` strips the `role` attribute before updating client state or emitting REST queries.
   - `AuthContext.updateUserRole` requires `actualRole === 'admin'`.

### Role Switching Mechanics
- **Demo Mode**: The user profile dropdown in the top header features a quick-switch control allowing instant testing between interviewer and admin personas without re-authenticating.
- **Real Supabase Mode**: Roles are strictly verified against the `role` column in `public.profiles` corresponding to the user's verified Supabase JWT (`auth.uid()`). Switching roles requires an administrator update in the database or `UserManagementView`.

> [!WARNING]
> **Production Security Mandate**: Demo mode relies on browser `localStorage` and exposes a role switcher intended exclusively for design verification and local development. In any staging or production deployment, valid `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` credentials **must** be provided so that PostgreSQL Row-Level Security (RLS) guards all data access.

---

## 9. Known Limitations & Technical Debt

During recent architectural audits, the following areas were identified for future refactoring:

1. **Large Component Architecture**:
   - `src/components/DynamicInterviewForm.tsx` (~1,190 lines): Contains questionnaire rendering, checklist table, notes editor, file upload handlers, and pagination in a single file. Should be decomposed into `<QuestionnaireSection />`, `<DocumentsChecklistTab />`, and `<InterviewerNotesTab />`.
   - `src/components/DashboardView.tsx` (~920 lines): Manages metric summaries, tier charts, search/filtering, data tables, and upcoming schedule. Should extract sub-components for the data table and metrics bar.
   - `src/context/InterviewContext.tsx` (~700 lines): Bridges both offline localStorage and Supabase persistence in a single provider. Could be split into dedicated state hooks.
2. **Duplicated Questions Catalogue**:
   - The diagnostic questions exist in both TypeScript (`src/lib/questionsData.ts`) and SQL (`supabase/seed.sql`). An update in the question text or hints must currently be synchronized across both files. A future enhancement should fetch questions directly from Supabase with local IndexedDB caching.
3. **Unused Dependencies in `package.json`**:
   - Residual dependencies (`@google/genai`, `express`, `dotenv`, `@types/express`) have been cleanly removed from `package.json` and lockfiles.
4. **Offline Document Upload Queueing**:
   - In Demo Mode, document uploads store mock metadata without persisting raw binary data to localStorage to prevent quota exhaustion (`QUOTA_EXCEEDED_ERR`).

---

## 10. Contributing & Next Steps

When contributing to this repository, please adhere to the following development practices:

1. **Maintain Type Safety**: Always run `bun run lint` (`npm run lint`) prior to opening a PR. No `any` escapes without documented justification.
2. **Ensure Test Coverage**: Run `bun run test` (`npm run test`) to verify that all 21+ integration and unit tests pass cleanly.
3. **Preserve Dual-Mode Compatibility**: Any new database operations added to `src/lib/interviewService.ts` must maintain graceful fallback handling in `InterviewContext.tsx` for offline/demo users.
4. **Database Changes**: Never alter existing migration files. Always create a new numbered SQL migration in `supabase/migrations/` (e.g., `YYYYMMDD_feature_name.sql`).
5. **UI Accessibility & Branding**: Use Tailwind utility classes following the established palette. Retain official Republic of Uganda emblems and high-contrast color standards.

---
*For administrative questions or diagnostic questionnaire updates, contact the MGLSD TRANSFORMATIVE Programme Technical Working Group.*
