-- =====================================================================
-- MGLSD Labour Directorate – Current-State Diagnostic Interview Application
-- TRANSFORMATIVE Programme – Ministry of Gender, Labour and Social Development, Uganda
-- Master Questions Catalogue & Seed Data
-- =====================================================================

-- Clean slate for seed reload
TRUNCATE TABLE public.questions CASCADE;

-- Ensure questions are readable by all clients (authenticated officers as well as unauthenticated pre-auth cache warming)
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Questions readable by authenticated users" ON public.questions;
DROP POLICY IF EXISTS "Questions readable by everyone" ON public.questions;
CREATE POLICY "Questions readable by everyone"
    ON public.questions FOR SELECT
    TO public
    USING (true);

-- SECTION A: STRATEGY, POLICY & MANDATE
INSERT INTO public.questions (id, section_code, section_title, question_text, who_to_ask, prompt_hints, applicable_tiers, response_type, sort_order) VALUES
('A1', 'A', 'Section A: Strategy, Policy & Mandate',
'What is the statutory mandate of the Labour Directorate, and how effectively does current operational practice reflect this mandate?',
'Minister, Permanent Secretary, Director of Labour, Commissioners',
'Probe: Key enabling legislation (Employment Act 2006, OSH Act 2006, Labour Unions Act, Workers Compensation Act); gaps between legal mandate and actual daily operational scope; areas of mission creep or mandate neglect.',
ARRAY['Leadership', 'Management'], 'text', 1),

('A2', 'A', 'Section A: Strategy, Policy & Mandate',
'How are national policies (such as National Employment Policy, Decent Work Agenda, and NDPIII) translated into actionable departmental priorities?',
'Permanent Secretary, Director, Commissioners, Assistant Commissioners',
'Probe: Cascading process from Cabinet to Directorate; clarity of multi-year goals; role of Ministerial Policy Statements (MPS) in daily priority setting; alignment with Vision 2040.',
ARRAY['Leadership', 'Management'], 'text', 2),

('A3', 'A', 'Section A: Strategy, Policy & Mandate',
'What major gaps, inconsistencies, or outdated provisions exist in the current legal and regulatory framework governing labour in Uganda?',
'Director of Labour, Commissioners, Legal Officer',
'Probe: Status of draft amendments (e.g. Employment Amendment Bill); regulation of informal economy; modern forms of work (gig economy, remote work); adequacy of statutory penalties.',
ARRAY['Leadership', 'Management'], 'text', 3),

('A4', 'A', 'Section A: Strategy, Policy & Mandate',
'How does the Directorate track and diagnose labour market dynamics, youth unemployment trends, and sectoral labour shortages?',
'Commissioner Employment Services, Principal Labour Economists, Statistics Focal Point',
'Probe: Frequency of Labour Market Information System (LMIS) updates; reliance on UBOS surveys vs internal data; usage of data in policy design; feedback loops with employers.',
ARRAY['Leadership', 'Management'], 'text', 4),

('A5', 'A', 'Section A: Strategy, Policy & Mandate',
'What are the current top 3 strategic priorities or directives issued by Executive Leadership, and what progress has been achieved?',
'Minister, Permanent Secretary, Director',
'Probe: Externalisation of labour safeguards; decentralised inspection rollouts; digitization of services; presidential directives on industrial disputes; specific milestone targets.',
ARRAY['Leadership', 'Management'], 'text', 5),

('A6', 'A', 'Section A: Strategy, Policy & Mandate',
'How does the Labour Directorate coordinate with other Ministries, Departments, and Agencies (MDAs)—such as Internal Affairs/Immigration, Health, Justice, Education, and Local Government?',
'Permanent Secretary, Director, Head of Units',
'Probe: Inter-agency taskforces; data sharing protocols; institutional friction in issuing work permits; joint factory/site inspections; cross-jurisdictional referrals.',
ARRAY['Leadership', 'Management'], 'text', 6),

('A7', 'A', 'Section A: Strategy, Policy & Mandate',
'How is operational delivery coordinated between the central Ministry headquarters and the District Labour Offices (DLOs) under Local Government devolution?',
'Director of Labour, Commissioner Labour & Industrial Relations, Principal Labour Officers',
'Probe: Reporting lines between DLOs (reporting to Chief Administrative Officers - CAOs) and MGLSD technical oversight; inspection data transmission; supervision visits; logistical support.',
ARRAY['Leadership', 'Management'], 'text', 7),

('A8', 'A', 'Section A: Strategy, Policy & Mandate',
'What key performance indicators (KPIs) are currently used to evaluate the Directorate’s success, and how are these KPIs monitored and reported?',
'Director of Labour, Planning Unit, Commissioners',
'Probe: Output indicators (e.g. number of inspections, disputes resolved within 30 days, revenue collected); outcome indicators (fatal accidents reduction, compliance rates); frequency of performance reviews.',
ARRAY['Leadership', 'Management'], 'text', 8);

-- SECTION B: INSTITUTIONAL STRUCTURE, GOVERNANCE & OVERSIGHT
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
'Probe: Weekly/monthly management meetings; incident escalation (fatal workplace accidents, illegal wildcat strikes); speed of executive sign-offs.',
ARRAY['Leadership', 'Management'], 'text', 12),

('B5', 'B', 'Section B: Institutional Structure, Governance & Oversight',
'How are strategic management decisions made, minuted, and tracked through to completion within the Directorate?',
'Director, Commissioners, Administrative Officers',
'Probe: Action-item tracking systems; accountability for non-delivery; delegation of financial and operational authority thresholds.',
ARRAY['Leadership', 'Management'], 'text', 13),

('B6', 'B', 'Section B: Institutional Structure, Governance & Oversight',
'What internal audit, compliance, and ethical oversight mechanisms are in place to ensure integrity in inspections, licensing, and enforcement?',
'Director, Internal Audit Focal Point, Commissioners',
'Probe: Integrity management committee; inspector code of conduct; whistleblowing channels; audit recommendations implementation; handling of complaints against officers.',
ARRAY['Leadership', 'Management'], 'text', 14),

('B7', 'B', 'Section B: Institutional Structure, Governance & Oversight',
'What formal service standards or Client Service Charters exist, and are they measured and published?',
'Commissioners, Quality Assurance / Client Charter Officer',
'Probe: Turnaround times for dispute resolution, workplace registration, permit vetting, complaint acknowledgement; public visibility of standards.',
ARRAY['Leadership', 'Management'], 'text', 15),

('B8', 'B', 'Section B: Institutional Structure, Governance & Oversight',
'How effectively does the Directorate collaborate with external oversight bodies such as the IGG, Auditor General, and Parliament?',
'Permanent Secretary, Director, Legal / Planning',
'Probe: Timeliness of responses to parliamentary queries; implementation of Auditor General recommendations; compliance with regulatory scrutiny.',
ARRAY['Leadership', 'Management'], 'text', 16);

-- SECTION C: OPERATIONAL DELIVERY & CORE WORKFLOWS
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
'Probe: Workplace registration certificates; hazardous equipment certification; workplace injury reporting (Workers Compensation Form 1); fatal accident investigation protocols.',
ARRAY['Management', 'Frontline'], 'text', 21),

('C2', 'C', 'Section C: Operational Delivery & Core Workflows',
'What are the primary operational bottlenecks, case backlogs, or recurring failure points in these workflows?',
'Frontline Labour Officers, Dispute Mediators, OSH Inspectors, Unit Heads',
'Probe: Unresolved disputes backlog; uninspected high-risk factories; delays in vetting migrant contracts; lack of transport to follow up on compliance notices.',
ARRAY['Management', 'Frontline'], 'text', 22),

('C3', 'C', 'Section C: Operational Delivery & Core Workflows',
'What Standard Operating Procedures (SOPs), manuals, or statutory guidelines are available, and how consistently are they utilized in the field?',
'Heads of Unit, Senior Labour Officers, Frontline Staff',
'Probe: Date of last SOP review; availability in print/digital form; compliance variability across different officers or districts.',
ARRAY['Management', 'Frontline'], 'text', 23),

('C4', 'C', 'Section C: Operational Delivery & Core Workflows',
'What logistical and operational challenges affect field operations, on-site inspections, and evidence collection?',
'Frontline Inspectors, District Labour Officers, Drivers/Logistics Focal',
'Probe: Availability of inspection vehicles/fuel; personal protective equipment (PPE); testing instruments (sound meters, gas detectors, lux meters); camera/evidence handling.',
ARRAY['Management', 'Frontline'], 'text', 24),

('C5', 'C', 'Section C: Operational Delivery & Core Workflows',
'How does the Directorate gather citizen and enterprise feedback, handle public inquiries, and manage whistle-blower complaints?',
'Public Relations Officer, Frontline Desk Officers, Complaints Desk',
'Probe: Toll-free lines; walk-in customer care desk; digital complaint portal; anonymous whistle-blower protection; typical response times.',
ARRAY['Management', 'Frontline'], 'text', 25);

-- SECTION D: HUMAN RESOURCES, STAFFING & CAPABILITY
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
'Probe: Annual training budget; induction curriculum for new Labour Officers; international study tours (e.g. ILO ITC Turin); donor-funded training workshops.',
ARRAY['Leadership', 'Management'], 'text', 28),

('D4', 'D', 'Section D: Human Resources, Staffing & Capability',
'How are staff performance appraisals conducted, and how are targets linked to departmental performance agreements?',
'Director, Commissioners, Principal HR Officer',
'Probe: Public Service Commission appraisal tool; setting SMART inspection and mediation targets; reward and sanctions framework; frequency of appraisal reviews.',
ARRAY['Leadership', 'Management'], 'text', 29),

('D5', 'D', 'Section D: Human Resources, Staffing & Capability',
'What factors most significantly influence staff morale, retention, absenteeism, and career progression?',
'Commissioners, Senior & Junior Labour Officers, HR',
'Probe: Remuneration compared to other regulatory agencies (e.g. ERA, UCC); field allowances; safety risks in hostile inspection environments; career stagnation.',
ARRAY['Leadership', 'Management'], 'text', 30),

('D6', 'D', 'Section D: Human Resources, Staffing & Capability',
'How are District Labour Officers (DLOs) deployed, supervised, and supported technically by the central Directorate?',
'Commissioner Labour, DLO Representatives, HR Officer',
'Probe: Dual loyalty between Local Government District Councils and MGLSD; funding of DLO offices; joint inspection operations; technical secondments.',
ARRAY['Leadership', 'Management'], 'text', 31);

-- SECTION E: INFORMATION SYSTEMS, TECHNOLOGY & DATA
INSERT INTO public.questions (id, section_code, section_title, question_text, who_to_ask, prompt_hints, applicable_tiers, response_type, sort_order) VALUES
('E1', 'E', 'Section E: Information Systems, Technology & Data',
'What software applications, digital databases, or legacy systems are currently deployed across the Directorate?',
'Head of ICT / Systems Administrator, Commissioners, Frontline Users',
'Probe: EEMIS (External Employment Management Information System); OSH Information System; Labour Market Information System (LMIS); e-dispute tracker; spreadsheets.',
ARRAY['Management', 'Frontline', 'Support/IT'], 'text', 32),

('E2', 'E', 'Section E: Information Systems, Technology & Data',
'Comprehensive Assessment of EEMIS: How effective is the system in handling agency licensing, job orders, vetting, and migrant welfare monitoring?',
'EEMIS System Administrator, Commissioner Employment, Verification Officers',
'Probe: System uptime and reliability; user satisfaction; security and audit logs; employer/migrant worker portals; mobile responsiveness; integration with Gulf receiving states.',
ARRAY['Management', 'Frontline', 'Support/IT'], 'text', 33),

('E3', 'E', 'Section E: Information Systems, Technology & Data',
'What is the state of hardware infrastructure, workstation availability, network connectivity, and electrical power across headquarters and field stations?',
'IT Support Officers, Records Officers, Frontline Staff',
'Probe: Ratio of PCs/laptops to officers; LAN speed; National Data Backbone Network (NITA-U) connectivity stability; UPS/generator backup; field tablet availability.',
ARRAY['Management', 'Frontline', 'Support/IT'], 'text', 34),

('E4', 'E', 'Section E: Information Systems, Technology & Data',
'How are records and data collected, verified, archived, and secured against loss or unauthorized alteration?',
'Principal Records Officer, ICT Security Officer, Frontline Clerks',
'Probe: Paper registry vs electronic filing; physical registry storage conditions (dampness, fire protection, pest control); data backup frequency; offsite backups.',
ARRAY['Management', 'Frontline', 'Support/IT'], 'text', 35),

('E5', 'E', 'Section E: Information Systems, Technology & Data',
'What interoperability and data exchange mechanisms exist between the Directorate and external MDAs (NIRA, URA, Immigration, Police, UBOS)?',
'Head of ICT, Systems Architects, Commissioners',
'Probe: Direct API connections vs manual batch CSV imports; National ID (NIN) verification through NIRA; tax compliance verification through URA; immigration border clearance.',
ARRAY['Management', 'Frontline', 'Support/IT'], 'text', 36),

('E6', 'E', 'Section E: Information Systems, Technology & Data',
'What is the level of digital literacy, software adoption, and IT helpdesk support available to staff?',
'IT Helpdesk Lead, End Users across Units',
'Probe: Average time to resolve hardware/network tickets; resistance to digital forms; training needs on productivity and specialized software.',
ARRAY['Management', 'Frontline', 'Support/IT'], 'text', 37),

('E7', 'E', 'Section E: Information Systems, Technology & Data',
'How are analytical reports, statistical bulletins, and executive dashboards generated from operational data?',
'Planning Unit, Statisticians, ICT Officers, Director',
'Probe: Automated dashboard vs manual copy-pasting into Excel; time required to compile the Annual Labour Report; data accuracy and duplicate records.',
ARRAY['Management', 'Frontline', 'Support/IT'], 'text', 38);

-- SECTION F: BUDGET, FINANCE & RESOURCE ALLOCATION
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
ARRAY['Management', 'Frontline'], 'text', 43);

-- SECTION G: STAKEHOLDER ENGAGEMENT & SOCIAL DIALOGUE
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
'Probe: Reporting on ratified ILO Conventions (e.g., C81, C155); negotiation and enforcement of Bilateral Labour Agreements with Gulf destinations; EAC common market labour mobility.',
ARRAY['Leadership', 'Management', 'Support/IT'], 'text', 47),

('G5', 'G', 'Section G: Stakeholder Engagement & Social Dialogue',
'What public sensitization, worker rights education, and employer compliance campaigns are conducted?',
'Public Relations Officer, Labour Inspectors, Outreach Focal',
'Probe: Radio talk shows in regional languages; World Day for Safety and Health at Work; distribution of labour law primers; workplace poster distributions.',
ARRAY['Leadership', 'Management', 'Support/IT'], 'text', 48),

('G6', 'G', 'Section G: Stakeholder Engagement & Social Dialogue',
'How does the Directorate manage media inquiries, public scandals (e.g. stranded migrant workers abroad, factory disasters), and crisis communication?',
'Minister, Permanent Secretary, Principal Communications Officer, Director',
'Probe: Standard media protocols; coordination with Uganda missions abroad; official press statements vs unauthorized leaks; public trust management.',
ARRAY['Leadership', 'Management', 'Support/IT'], 'text', 49);

-- SECTION H: STRATEGIC CHALLENGES, VISION & PRIORITY REFORMS
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
ARRAY['Leadership', 'Management', 'Frontline', 'Support/IT'], 'text', 52);

-- SYSTEM WALKTHROUGH (W1 - W4) for Support / IT / Records Tier
INSERT INTO public.questions (id, section_code, section_title, question_text, who_to_ask, prompt_hints, applicable_tiers, response_type, sort_order) VALUES
('W1', 'W', 'System Access Walkthrough',
'Live Demonstration: Core Application Access & Authentication Walkthrough (Log into primary system, show user roles, MFA, session management)',
'System Administrator / IT Specialist / Records Manager',
'Observe: Screen-share or direct demonstration of EEMIS / OSH system login, role-based screens, password policies, multi-factor authentication (if any), timeout mechanisms.',
ARRAY['Support/IT'], 'structured', 53),

('W2', 'W', 'System Access Walkthrough',
'Live Demonstration: Transaction Processing & Database Architecture (Submit a test transaction, show database schema, table indexing, and data validation rules)',
'Database Administrator / Senior Developer / Systems Analyst',
'Observe: Step through creating a record (e.g. PRA license application or workplace inspection filing); verify frontend validation; check database writes; observe foreign key constraints and error handling.',
ARRAY['Support/IT'], 'structured', 54),

('W3', 'W', 'System Access Walkthrough',
'Live Demonstration: Backup, Disaster Recovery & Network Reliability (Show actual backup routines, storage location, restoration testing, and NITA-U bandwidth monitoring)',
'Infrastructure Engineer / Network Admin / IT Security Officer',
'Observe: Automated vs manual backup scripts; offsite replication; timestamp of last successful disaster recovery dry-run; network utilization graphs.',
ARRAY['Support/IT'], 'structured', 55),

('W4', 'W', 'System Access Walkthrough',
'Live Demonstration: User Provisioning, Access Control & Audit Trails (Walk through onboarding an officer, assigning permissions, and viewing system event logs)',
'System Administrator / Security Lead',
'Observe: User lifecycle management; deprovisioning of departed officers; review of audit log entries (who viewed/edited sensitive migrant or enterprise inspection files).',
ARRAY['Support/IT'], 'structured', 56);

-- =====================================================================
-- POST-SEED VERIFICATION QUERIES:
-- Run these statements in the Supabase SQL Editor to verify the master catalogue:
--
-- SELECT count(*) AS total_questions FROM public.questions;
-- (Expected result: 52)
--
-- SELECT section_code, count(*) AS questions_per_section
-- FROM public.questions
-- GROUP BY section_code
-- ORDER BY section_code;
-- (Expected breakdown: A: 8, B: 8, C: 5, D: 6, E: 7, F: 5, G: 6, H: 3, W: 4)
-- =====================================================================

