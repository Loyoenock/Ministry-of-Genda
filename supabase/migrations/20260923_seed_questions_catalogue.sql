-- =====================================================================
-- MGLSD Labour Directorate Diagnostic Interview Application
-- TRANSFORMATIVE Programme – Ministry of Gender, Labour and Social Development
-- Master Diagnostic Questions Catalogue Seed Migration
-- Migration: 20260923_seed_questions_catalogue.sql
-- =====================================================================

-- 1. Ensure table exists
CREATE TABLE IF NOT EXISTS public.questions (
    id TEXT PRIMARY KEY,
    section_code TEXT NOT NULL,
    section_title TEXT NOT NULL,
    question_text TEXT NOT NULL,
    who_to_ask TEXT NOT NULL,
    prompt_hints TEXT,
    applicable_tiers TEXT[] NOT NULL,
    response_type TEXT NOT NULL DEFAULT 'text',
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- 2. Ensure RLS allows public read access for both authenticated officers and pre-auth cache warming
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Questions readable by authenticated users" ON public.questions;
DROP POLICY IF EXISTS "Questions readable by everyone" ON public.questions;
CREATE POLICY "Questions readable by everyone"
    ON public.questions FOR SELECT
    TO public
    USING (true);

DROP POLICY IF EXISTS "Questions manageable only by admins" ON public.questions;
CREATE POLICY "Questions manageable only by admins"
    ON public.questions FOR ALL
    TO authenticated
    USING (public.is_admin());

-- 3. Upsert Master Questions (Idempotent seed)
INSERT INTO public.questions (id, section_code, section_title, question_text, who_to_ask, prompt_hints, applicable_tiers, response_type, sort_order) VALUES
('A1', 'A', 'Section A: Strategy, Policy & Mandate',
'What is the statutory mandate of the Labour Directorate, and how effectively does current operational practice reflect this mandate?',
'Minister, Permanent Secretary, Director of Labour, Commissioners',
'Probe: Key enabling legislation (Employment Act 2006, OSH Act 2006, Labour Unions Act, Workers Compensation Act
ON CONFLICT (id) DO UPDATE SET
  section_code = EXCLUDED.section_code,
  section_title = EXCLUDED.section_title,
  question_text = EXCLUDED.question_text,
  who_to_ask = EXCLUDED.who_to_ask,
  prompt_hints = EXCLUDED.prompt_hints,
  applicable_tiers = EXCLUDED.applicable_tiers,
  response_type = EXCLUDED.response_type,
  sort_order = EXCLUDED.sort_order;

INSERT INTO public.questions (id, section_code, section_title, question_text, who_to_ask, prompt_hints, applicable_tiers, response_type, sort_order) VALUES
('B1', 'B', 'Section B: Institutional Structure, Governance & Oversight',
'Does the existing departmental and divisional organogram reflect the current workload, strategic priorities, and operational reality?',
'Permanent Secretary, Director, Principal HR Officer',
'Probe: Department of Labour, Industrial Relations & Productivity; Department of OSH; Department of Employment Services; statutory bodies; bottlenecks caused by current hierarchy.',
ARRAY['Leadership', 'Management'], 'text', 9),

('B2', 'B', 'Section B: Institutional Structure, Governance & Oversight',
'Are the mandates and division of responsibilities across departments and units clearly delineated, or do overlaps and silos exist?',
'Commissioners, Assistant Commissioners, Heads of Unit',
'Probe: Overlap between general labour inspection and OSH inspections; coordination between dispute settlement and Industrial Court; communication across units.',
ARRAY['Leadership', 'Management'], 'text', 10),

('B3', 'B', 'Section B: Institutional Structure, Governance & Oversight',
'What statutory boards, councils, or committees exist (e.g., Labour Advisory Board, OSH Board, Minimum Wages Board), and what is their operational status?',
'Director, Commissioners, Board Secretariats',
'Probe: Composition of boards; frequency of statutory meetings; budgetary allocations for sittings; implementation of board resolutions; tenure of current members.',
ARRAY['Leadership', 'Management'], 'text', 11),

('B4', 'B', 'Section B: Institutional Structure, Governance & Oversight',
'Describe the formal and informal reporting lines, supervisory cadence, and escalation pathways for critical issues.',
'Heads of Department, Principal Officers',
'Probe: Weekly/monthly management meetings; incident escalation (fatal workplace accidents, illegal wildcat strikes
ON CONFLICT (id) DO UPDATE SET
  section_code = EXCLUDED.section_code,
  section_title = EXCLUDED.section_title,
  question_text = EXCLUDED.question_text,
  who_to_ask = EXCLUDED.who_to_ask,
  prompt_hints = EXCLUDED.prompt_hints,
  applicable_tiers = EXCLUDED.applicable_tiers,
  response_type = EXCLUDED.response_type,
  sort_order = EXCLUDED.sort_order;

INSERT INTO public.questions (id, section_code, section_title, question_text, who_to_ask, prompt_hints, applicable_tiers, response_type, sort_order) VALUES
('C1', 'C', 'Section C: Operational Delivery & Core Workflows',
'Provide a high-level overview of the Directorate’s core operational workflows from citizen/business intake to final resolution.',
'Commissioners, Heads of Unit, Senior Labour Officers, Frontline Officers',
'Probe: End-to-end journey for typical cases; manual paper steps vs digital steps; key hand-offs between departments or central vs district levels.',
ARRAY['Management', 'Frontline'], 'text', 17),

('C1a', 'C', 'Section C: Operational Delivery & Core Workflows',
'Detailed Labour Inspection Workflow: Describe the end-to-end process for scheduling, executing, reporting, and enforcing workplace inspections.',
'Commissioner Labour, Principal Labour Officer (Inspections), District Labour Officers',
'Probe: Risk-based vs random targeting; standard inspection checklists; issuance of Improvement/Prohibition Notices; prosecution of non-compliant employers; re-inspection rates.',
ARRAY['Management', 'Frontline'], 'text', 18),

('C1b', 'C', 'Section C: Operational Delivery & Core Workflows',
'Detailed Dispute Resolution & Reconciliation: Describe how labour disputes and individual complaints are received, recorded, mediated, and settled.',
'Labour Officers (Disputes), Industrial Relations Officers, Conciliators',
'Probe: Intake registry; mediation notice issuance; statutory 30-day timeline compliance; referral mechanisms to the Industrial Court; enforcement of settlement awards.',
ARRAY['Management', 'Frontline'], 'text', 19),

('C1c', 'C', 'Section C: Operational Delivery & Core Workflows',
'Detailed Work Permits & External Employment Vetting: Describe the vetting and clearance of Ugandan migrant workers and recruitment agencies (PRAs).',
'Commissioner Employment Services, EEMIS Technical Team, Vetting Officers',
'Probe: Agency pre-qualification; job order authentication; pre-departure training verification; clearance certificates; foreign mission coordination and repatriation protocols.',
ARRAY['Management', 'Frontline'], 'text', 20),

('C1d', 'C', 'Section C: Operational Delivery & Core Workflows',
'Detailed Occupational Safety & Health (OSH) Registration & Auditing: Describe the registration of workplaces, statutory examinations (boilers, cranes), and incident investigations.',
'Commissioner OSH, OSH Inspectors, Occupational Hygienists, Statutory Examiners',
'Probe: Workplace registration certificates; hazardous equipment certification; workplace injury reporting (Workers Compensation Form 1
ON CONFLICT (id) DO UPDATE SET
  section_code = EXCLUDED.section_code,
  section_title = EXCLUDED.section_title,
  question_text = EXCLUDED.question_text,
  who_to_ask = EXCLUDED.who_to_ask,
  prompt_hints = EXCLUDED.prompt_hints,
  applicable_tiers = EXCLUDED.applicable_tiers,
  response_type = EXCLUDED.response_type,
  sort_order = EXCLUDED.sort_order;

INSERT INTO public.questions (id, section_code, section_title, question_text, who_to_ask, prompt_hints, applicable_tiers, response_type, sort_order) VALUES
('D1', 'D', 'Section D: Human Resources, Staffing & Capability',
'What are the approved establishment numbers versus actual filled positions across the Directorate?',
'Permanent Secretary, Director, Principal Human Resource Officer',
'Probe: Total sanctioned posts; current vacancy rate percentage; critical shortages (e.g. specialized OSH chemical inspectors, actuaries, legal officers).',
ARRAY['Leadership', 'Management'], 'text', 26),

('D2', 'D', 'Section D: Human Resources, Staffing & Capability',
'What is the profile of technical skills, qualifications, and specialized competencies currently available within the staff body?',
'Commissioners, Heads of Unit, Principal HR Officer',
'Probe: Engineering, occupational hygiene, medicine, labour economics, dispute mediation credentials; gap in specialized digital or forensics capability.',
ARRAY['Leadership', 'Management'], 'text', 27),

('D3', 'D', 'Section D: Human Resources, Staffing & Capability',
'What structured training, continuous professional development, and onboarding programmes are provided to staff?',
'Principal HR Officer, Commissioners, Frontline Officers',
'Probe: Annual training budget; induction curriculum for new Labour Officers; international study tours (e.g. ILO ITC Turin
ON CONFLICT (id) DO UPDATE SET
  section_code = EXCLUDED.section_code,
  section_title = EXCLUDED.section_title,
  question_text = EXCLUDED.question_text,
  who_to_ask = EXCLUDED.who_to_ask,
  prompt_hints = EXCLUDED.prompt_hints,
  applicable_tiers = EXCLUDED.applicable_tiers,
  response_type = EXCLUDED.response_type,
  sort_order = EXCLUDED.sort_order;

INSERT INTO public.questions (id, section_code, section_title, question_text, who_to_ask, prompt_hints, applicable_tiers, response_type, sort_order) VALUES
('E1', 'E', 'Section E: Information Systems, Technology & Data',
'What software applications, digital databases, or legacy systems are currently deployed across the Directorate?',
'Head of ICT / Systems Administrator, Commissioners, Frontline Users',
'Probe: EEMIS (External Employment Management Information System
ON CONFLICT (id) DO UPDATE SET
  section_code = EXCLUDED.section_code,
  section_title = EXCLUDED.section_title,
  question_text = EXCLUDED.question_text,
  who_to_ask = EXCLUDED.who_to_ask,
  prompt_hints = EXCLUDED.prompt_hints,
  applicable_tiers = EXCLUDED.applicable_tiers,
  response_type = EXCLUDED.response_type,
  sort_order = EXCLUDED.sort_order;

INSERT INTO public.questions (id, section_code, section_title, question_text, who_to_ask, prompt_hints, applicable_tiers, response_type, sort_order) VALUES
('F1', 'F', 'Section F: Budget, Finance & Resource Allocation',
'What is the Directorate’s annual budgetary allocation under the Medium-Term Expenditure Framework (MTEF), broken down by Wage, Non-Wage Recurrent, and Development?',
'Undersecretary / Accounting Officer, Principal Economist, Director, Commissioners',
'Probe: Total UGX allocated across the three main departments; percentage of total Ministry budget; historical trend over past 3 fiscal years.',
ARRAY['Management', 'Frontline'], 'text', 39),

('F2', 'F', 'Section F: Budget, Finance & Resource Allocation',
'How timely and complete are quarterly warrant releases from the Ministry of Finance, Planning and Economic Development (MoFPED)?',
'Principal Finance Officer, Planning Unit, Commissioners',
'Probe: Budget cut frequencies; discrepancies between approved budget and actual quarterly releases; impact on scheduled field inspections and mediation hearings.',
ARRAY['Management', 'Frontline'], 'text', 40),

('F3', 'F', 'Section F: Budget, Finance & Resource Allocation',
'What proportion of operational and capital activities depends on Development Partner / Donor funding (e.g., ILO, IOM, Enabel, World Bank)?',
'Project Coordinators, Planning Unit, Commissioners',
'Probe: Active donor projects; sustainability when donor projects phase out; alignment of donor deliverables with core Directorate mandates.',
ARRAY['Management', 'Frontline'], 'text', 41),

('F4', 'F', 'Section F: Budget, Finance & Resource Allocation',
'What Non-Tax Revenue (NTR) is generated through Directorate activities (e.g. workplace registrations, statutory examination fees, PRA licensing), and what is the collection mechanism?',
'Principal Cashier / Accounts, OSH Registrars, Employment Services Licensing Desk',
'Probe: Annual NTR targets vs actual collections; URA e-Tax portal integration; revenue leakage risks; retention vs 100% remittance to Consolidated Fund.',
ARRAY['Management', 'Frontline'], 'text', 42),

('F5', 'F', 'Section F: Budget, Finance & Resource Allocation',
'What are the most severe financial constraints currently hindering day-to-day statutory operations?',
'Commissioners, Heads of Department, Frontline Officers',
'Probe: Fuel votes; witness summoning fees; night allowance for field officers; printing of statutory certificates and inspection forms; vehicle maintenance debt.',
ARRAY['Management', 'Frontline'], 'text', 43
ON CONFLICT (id) DO UPDATE SET
  section_code = EXCLUDED.section_code,
  section_title = EXCLUDED.section_title,
  question_text = EXCLUDED.question_text,
  who_to_ask = EXCLUDED.who_to_ask,
  prompt_hints = EXCLUDED.prompt_hints,
  applicable_tiers = EXCLUDED.applicable_tiers,
  response_type = EXCLUDED.response_type,
  sort_order = EXCLUDED.sort_order;

INSERT INTO public.questions (id, section_code, section_title, question_text, who_to_ask, prompt_hints, applicable_tiers, response_type, sort_order) VALUES
('G1', 'G', 'Section G: Stakeholder Engagement & Social Dialogue',
'How structured, regular, and effective are tripartite consultations with the Federation of Uganda Employers (FUE) and Labour Federations (NOTU / COFTU)?',
'Minister, Director, Commissioner Labour & Industrial Relations',
'Probe: Functioning of National Tripartite Council; negotiations on minimum wage; resolution of national industrial disputes; collective bargaining agreement (CBA) registrations.',
ARRAY['Leadership', 'Management', 'Support/IT'], 'text', 44),

('G2', 'G', 'Section G: Stakeholder Engagement & Social Dialogue',
'How does the Directorate engage with informal economy workers, domestic worker associations, and vulnerable labour segments?',
'Commissioner Employment, Principal Labour Officers, Civil Society Focal',
'Probe: Engagement with market vendors, boda boda associations; formalization initiatives; awareness of basic rights; addressing child labour in agriculture and mining.',
ARRAY['Leadership', 'Management', 'Support/IT'], 'text', 45),

('G3', 'G', 'Section G: Stakeholder Engagement & Social Dialogue',
'What is the nature of engagement, compliance monitoring, and association dialogue with Private Recruitment Agencies (e.g., UAERA)?',
'Commissioner Employment Services, Licensing Officers, PRA Monitoring Desk',
'Probe: Quarterly consultative forums; compliance audits; dispute arbitration between agencies and returnee migrant workers; handling of unlicensed recruitment brokers.',
ARRAY['Leadership', 'Management', 'Support/IT'], 'text', 46),

('G4', 'G', 'Section G: Stakeholder Engagement & Social Dialogue',
'How does the Directorate manage international and regional labour commitments with the ILO, East African Community (EAC), and bilateral labour agreements (BLAs)?',
'Director, Legal Advisory Unit, International Labour Affairs Desk',
'Probe: Reporting on ratified ILO Conventions (e.g., C81, C155
ON CONFLICT (id) DO UPDATE SET
  section_code = EXCLUDED.section_code,
  section_title = EXCLUDED.section_title,
  question_text = EXCLUDED.question_text,
  who_to_ask = EXCLUDED.who_to_ask,
  prompt_hints = EXCLUDED.prompt_hints,
  applicable_tiers = EXCLUDED.applicable_tiers,
  response_type = EXCLUDED.response_type,
  sort_order = EXCLUDED.sort_order;

INSERT INTO public.questions (id, section_code, section_title, question_text, who_to_ask, prompt_hints, applicable_tiers, response_type, sort_order) VALUES
('H1', 'H', 'Section H: Strategic Challenges, Vision & Priority Reforms',
'From your perspective, what are the single biggest systemic risks or institutional vulnerabilities currently facing the Labour Directorate?',
'All Interviewees (Leadership, Management, Frontline, Support/IT)',
'Probe: Operational collapse risks; reputational damage; staff burnout; technological obsolescence; corruption risks; policy paralysis.',
ARRAY['Leadership', 'Management', 'Frontline', 'Support/IT'], 'text', 50),

('H2', 'H', 'Section H: Strategic Challenges, Vision & Priority Reforms',
'If you had full authority and targeted resources, what would the Labour Directorate look like in 3 years under a transformative modernization programme?',
'All Interviewees (Leadership, Management, Frontline, Support/IT)',
'Probe: Digital transformation vision; inspection reach and enforcement power; staffing profile and dignity of labour officers; regional/district footprint; citizen satisfaction.',
ARRAY['Leadership', 'Management', 'Frontline', 'Support/IT'], 'text', 51),

('H3', 'H', 'Section H: Strategic Challenges, Vision & Priority Reforms',
'What are the top 3 high-impact, immediate reforms or "quick wins" that should be executed within the next 3 to 6 months?',
'All Interviewees (Leadership, Management, Frontline, Support/IT)',
'Probe: Pragmatic low-cost improvements; critical policy statutory instrument gazetting; workflow simplification; quick digital fixes; staff welfare/equipment provision.',
ARRAY['Leadership', 'Management', 'Frontline', 'Support/IT'], 'text', 52
ON CONFLICT (id) DO UPDATE SET
  section_code = EXCLUDED.section_code,
  section_title = EXCLUDED.section_title,
  question_text = EXCLUDED.question_text,
  who_to_ask = EXCLUDED.who_to_ask,
  prompt_hints = EXCLUDED.prompt_hints,
  applicable_tiers = EXCLUDED.applicable_tiers,
  response_type = EXCLUDED.response_type,
  sort_order = EXCLUDED.sort_order;

INSERT INTO public.questions (id, section_code, section_title, question_text, who_to_ask, prompt_hints, applicable_tiers, response_type, sort_order) VALUES
('W1', 'W', 'System Access Walkthrough',
'Live Demonstration: Core Application Access & Authentication Walkthrough (Log into primary system, show user roles, MFA, session management)',
'System Administrator / IT Specialist / Records Manager',
'Observe: Screen-share or direct demonstration of EEMIS / OSH system login, role-based screens, password policies, multi-factor authentication (if any), timeout mechanisms.',
ARRAY['Support/IT'], 'structured', 53),

('W2', 'W', 'System Access Walkthrough',
'Live Demonstration: Transaction Processing & Database Architecture (Submit a test transaction, show database schema, table indexing, and data validation rules)',
'Database Administrator / Senior Developer / Systems Analyst',
'Observe: Step through creating a record (e.g. PRA license application or workplace inspection filing
ON CONFLICT (id) DO UPDATE SET
  section_code = EXCLUDED.section_code,
  section_title = EXCLUDED.section_title,
  question_text = EXCLUDED.question_text,
  who_to_ask = EXCLUDED.who_to_ask,
  prompt_hints = EXCLUDED.prompt_hints,
  applicable_tiers = EXCLUDED.applicable_tiers,
  response_type = EXCLUDED.response_type,
  sort_order = EXCLUDED.sort_order;

