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

### Dynamic Questions Loading & Single Source of Truth
The canonical source of truth for the master diagnostic questions catalogue is the PostgreSQL database (`public.questions` table seeded by `supabase/seed.sql`).
- **Runtime Loading**: In Supabase mode, questions are loaded at runtime via `fetchQuestionsFromSupabase()` in `src/lib/questionsService.ts` and cached in memory and `localStorage`.
- **Zero-Drift**: Adding or modifying questions is done centrally in `supabase/seed.sql` rather than hardcoding in frontend files.
- **Offline & Demo Fallback**: When `isSupabaseConfigured` is false or during offline field operation, the service falls back gracefully to cached questions or the verified demo catalogue in `src/lib/questionsData.ts`. Tier filtering (`getQuestionsForTier`) and section navigation (`getSectionsForTier`) remain 100% operational across all tiers.

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
- All non-admin users are barred from escalating their own role or modifying the master questions catalogue.

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
│       ├── interviewFlow.test.tsx   # Dashboard, form rendering & export workflows
│       ├── interviewPersistence.test.tsx# Supabase persistence & fallback mechanisms
│       ├── questionsData.test.ts    # Questionnaire logic & tier mapping tests
│       └── supabaseAuth.test.tsx    # Authentication state and login view tests
│
└── supabase/                        # Database schema, storage, and seed definitions
    ├── seed.sql                     # Full SQL seed for master questions catalogue
    └── migrations/
        ├── 20250916_initial_schema.sql  # Database schema, tables, triggers, and RLS
        └── 20250916_storage_setup.sql   # Storage bucket setup & storage.objects RLS
```

---

## 8. Role Model & Security Notes

### Role Definitions
| Role | Capabilities | Permitted Views |
| :--- | :--- | :--- |
| **`interviewer`** | • Create and edit assigned interviews<br>• Complete questionnaire sections<br>• Update checklist and upload documents<br>• Export diagnostic briefs | • Interview Dashboard<br>• Diagnostic Interview Form<br>• Statutory Documents Inventory<br>• User Profile |
| **`admin`** | • All `interviewer` capabilities<br>• View all interviews nationwide<br>• Delete interviews<br>• Access cross-departmental analytics<br>• Manage user accounts and assign roles | • All Interviewer views<br>• National Oversight Analytics<br>• User Administration View |

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
