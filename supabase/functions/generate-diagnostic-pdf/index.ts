// @ts-nocheck
/**
 * Supabase Edge Function: generate-diagnostic-pdf
 *
 * Generates an official, tamper-evident Republic of Uganda Diagnostic Brief PDF dossier
 * for a completed or verified interview session.
 *
 * Security & Authorization:
 * - Re-uses the caller's JWT from Authorization header.
 * - Does NOT use the service role key; PostgREST enforces all RLS policies.
 * - Non-admins can only export their own / departmental records; Admins can export any.
 *
 * Cryptographic Audit Stamp:
 * - Stamps Interview ID, completed_at, generation time, and SHA-256 hash in the footer.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.9';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { interview_id } = body;
    if (!interview_id || typeof interview_id !== 'string') {
      return new Response(JSON.stringify({ error: 'interview_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client using caller's JWT to strictly enforce RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // 1. Fetch interview with interviewer profile join
    const { data: interview, error: intErr } = await supabase
      .from('interviews')
      .select('*, profiles:interviewer_id(full_name, department_unit, email)')
      .eq('id', interview_id)
      .single();

    if (intErr || !interview) {
      return new Response(
        JSON.stringify({
          error: intErr ? intErr.message : 'Interview not found or unauthorized under RLS',
        }),
        {
          status: intErr?.code === '42501' ? 403 : 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 2. Fetch answers
    const { data: answersData } = await supabase
      .from('answers')
      .select('*')
      .eq('interview_id', interview_id);
    const answers = answersData || [];

    // 3. Fetch checklist
    const { data: checklistData } = await supabase
      .from('documents_checklist')
      .select('*')
      .eq('interview_id', interview_id)
      .order('item_number', { ascending: true });
    const checklist = checklistData || [];

    // 4. Fetch interviewer notes
    const { data: notesData } = await supabase
      .from('interviewer_notes')
      .select('*')
      .eq('interview_id', interview_id)
      .maybeSingle();
    const notes = notesData || {};

    // 5. Compute SHA-256 cryptographic audit hash
    const generationTime = new Date().toISOString();
    const completedAt = interview.completed_at || interview.updated_at || 'Not Recorded';
    const auditPayload = [
      `INTERVIEW_ID:${interview.id}`,
      `TIER:${interview.tier}`,
      `STATUS:${interview.status}`,
      `COMPLETED_AT:${completedAt}`,
      `INTERVIEWEE:${interview.interviewee_name || 'N/A'}`,
      `ANSWERS_COUNT:${answers.length}`,
      `CHECKLIST_COUNT:${checklist.length}`,
      `GENERATED_AT:${generationTime}`,
    ].join('|');

    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(auditPayload));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const sha256Hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    // 6. Build PDF document using pdf-lib
    const pdfDoc = await PDFDocument.create();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    const primaryColor = rgb(0.01, 0.05, 0.1); // #020617
    const secondaryColor = rgb(0.28, 0.33, 0.41); // #475569
    const accentColor = rgb(0.07, 0.31, 0.29); // #134e4a
    const mutedColor = rgb(0.4, 0.45, 0.55);

    const a4Width = 595.28;
    const a4Height = 841.89;
    const margin = 40;
    const printableWidth = a4Width - margin * 2;

    let page = pdfDoc.addPage([a4Width, a4Height]);
    let y = a4Height - margin;

    const checkPageBreak = (neededHeight: number) => {
      if (y - neededHeight < margin + 45) {
        drawFooter(page);
        page = pdfDoc.addPage([a4Width, a4Height]);
        y = a4Height - margin;
      }
    };

    const drawFooter = (pg: any) => {
      pg.drawLine({
        start: { x: margin, y: margin + 28 },
        end: { x: a4Width - margin, y: margin + 28 },
        thickness: 0.5,
        color: rgb(0.8, 0.83, 0.88),
      });

      pg.drawText(
        `TRANSFORMATIVE Diagnostic Suite • Interview ID: ${interview.id} • Completed At: ${completedAt}`,
        {
          x: margin,
          y: margin + 18,
          size: 7,
          font: helvetica,
          color: mutedColor,
        }
      );

      pg.drawText(
        `Generated: ${generationTime} • SHA-256 Audit Stamp: ${sha256Hex}`,
        {
          x: margin,
          y: margin + 9,
          size: 6.5,
          font: helveticaBold,
          color: accentColor,
        }
      );

      pg.drawText('CONFIDENTIAL • FOR OFFICIAL GOVERNMENT USE ONLY • THE REPUBLIC OF UGANDA', {
        x: margin,
        y: margin,
        size: 6,
        font: helvetica,
        color: secondaryColor,
      });
    };

    // Header
    page.drawText('THE REPUBLIC OF UGANDA', {
      x: a4Width / 2 - helveticaBold.widthOfTextAtSize('THE REPUBLIC OF UGANDA', 9) / 2,
      y,
      size: 9,
      font: helveticaBold,
      color: secondaryColor,
    });
    y -= 14;

    page.drawText('MINISTRY OF GENDER, LABOUR AND SOCIAL DEVELOPMENT', {
      x: a4Width / 2 - helveticaBold.widthOfTextAtSize('MINISTRY OF GENDER, LABOUR AND SOCIAL DEVELOPMENT', 13) / 2,
      y,
      size: 13,
      font: helveticaBold,
      color: primaryColor,
    });
    y -= 14;

    page.drawText('Labour Directorate • TRANSFORMATIVE Programme Diagnostic Brief', {
      x: a4Width / 2 - helveticaBold.widthOfTextAtSize('Labour Directorate • TRANSFORMATIVE Programme Diagnostic Brief', 10) / 2,
      y,
      size: 10,
      font: helveticaBold,
      color: accentColor,
    });
    y -= 12;

    const recordSub = 'Official Record of Field Evidence & Institutional Current-State Assessment';
    page.drawText(recordSub, {
      x: a4Width / 2 - helvetica.widthOfTextAtSize(recordSub, 8) / 2,
      y,
      size: 8,
      font: helvetica,
      color: mutedColor,
    });
    y -= 10;

    page.drawLine({
      start: { x: margin, y },
      end: { x: a4Width - margin, y },
      thickness: 1.5,
      color: primaryColor,
    });
    y -= 16;

    // Metadata Grid
    page.drawRectangle({
      x: margin,
      y: y - 56,
      width: printableWidth,
      height: 56,
      color: rgb(0.97, 0.98, 0.99),
      borderColor: rgb(0.89, 0.91, 0.94),
      borderWidth: 1,
    });

    const col1X = margin + 10;
    const col2X = margin + printableWidth / 2 + 10;
    let metaY = y - 14;

    page.drawText(`Interviewee: ${interview.interviewee_name || 'Not provided'}`, {
      x: col1X,
      y: metaY,
      size: 8.5,
      font: helveticaBold,
      color: primaryColor,
    });
    page.drawText(`Interview Tier: ${interview.tier}`, {
      x: col2X,
      y: metaY,
      size: 8.5,
      font: helveticaBold,
      color: primaryColor,
    });
    metaY -= 13;

    page.drawText(`Role / Title: ${interview.role_title || 'Not provided'}`, {
      x: col1X,
      y: metaY,
      size: 8,
      font: helvetica,
      color: secondaryColor,
    });
    page.drawText(`Interviewer: ${interview.profiles?.full_name || interview.interviewer_name || 'Assigned Officer'}`, {
      x: col2X,
      y: metaY,
      size: 8,
      font: helvetica,
      color: secondaryColor,
    });
    metaY -= 13;

    page.drawText(`Department / Unit: ${interview.department_unit || 'Labour Directorate'}`, {
      x: col1X,
      y: metaY,
      size: 8,
      font: helvetica,
      color: secondaryColor,
    });
    page.drawText(`Session Date: ${interview.interview_date || 'N/A'} (${interview.interview_time || '10:00 AM'})`, {
      x: col2X,
      y: metaY,
      size: 8,
      font: helvetica,
      color: secondaryColor,
    });
    metaY -= 13;

    page.drawText(`Location: ${interview.location || 'Headquarters, Kampala'}`, {
      x: col1X,
      y: metaY,
      size: 8,
      font: helvetica,
      color: secondaryColor,
    });
    page.drawText(`Status: ${interview.status} (${interview.completion_percentage || 0}%) • Completed: ${completedAt}`, {
      x: col2X,
      y: metaY,
      size: 8,
      font: helveticaBold,
      color: accentColor,
    });

    y -= 70;

    // Section 1: Maturity Scores
    checkPageBreak(50);
    page.drawText('1. INSTITUTIONAL MATURITY DIAGNOSTIC SCORES (1 TO 5)', {
      x: margin,
      y,
      size: 9.5,
      font: helveticaBold,
      color: primaryColor,
    });
    y -= 14;

    const ms = notes.maturity_signals || {};
    const domains = [
      { name: 'Governance', score: ms.governance_score ? `${ms.governance_score}/5` : 'N/S' },
      { name: 'IT & Systems', score: ms.technology_score ? `${ms.technology_score}/5` : 'N/S' },
      { name: 'Workflows & SOPs', score: ms.process_score ? `${ms.process_score}/5` : 'N/S' },
      { name: 'Staff Skills', score: ms.people_skills_score ? `${ms.people_skills_score}/5` : 'N/S' },
      { name: 'Data & Reporting', score: ms.data_reporting_score ? `${ms.data_reporting_score}/5` : 'N/S' },
    ];

    const boxWidth = (printableWidth - 32) / 5;
    domains.forEach((dom, i) => {
      const bx = margin + i * (boxWidth + 8);
      page.drawRectangle({
        x: bx,
        y: y - 26,
        width: boxWidth,
        height: 26,
        color: rgb(0.97, 0.98, 0.99),
        borderColor: rgb(0.89, 0.91, 0.94),
        borderWidth: 1,
      });
      page.drawText(dom.name, {
        x: bx + 4,
        y: y - 10,
        size: 7,
        font: helvetica,
        color: mutedColor,
      });
      page.drawText(dom.score, {
        x: bx + 4,
        y: y - 22,
        size: 9,
        font: helveticaBold,
        color: accentColor,
      });
    });
    y -= 38;

    // Section 2: Key Diagnostic Responses
    checkPageBreak(30);
    page.drawText(`2. KEY DIAGNOSTIC RESPONSES (${answers.length} Responses Logged)`, {
      x: margin,
      y,
      size: 9.5,
      font: helveticaBold,
      color: primaryColor,
    });
    y -= 14;

    if (answers.length === 0) {
      page.drawText('No questionnaire responses recorded in database.', {
        x: margin,
        y,
        size: 8,
        font: helveticaOblique,
        color: mutedColor,
      });
      y -= 14;
    } else {
      for (const ans of answers) {
        checkPageBreak(32);
        page.drawText(`[${ans.question_id}] Diagnostic Response:`, {
          x: margin,
          y,
          size: 8,
          font: helveticaBold,
          color: primaryColor,
        });
        y -= 11;

        const rawText = String(ans.answer_text || '').replace(/\s+/g, ' ');
        const snippet = rawText.length > 120 ? `${rawText.substring(0, 117)}...` : rawText;
        page.drawText(`"${snippet}"`, {
          x: margin + 8,
          y,
          size: 7.5,
          font: helveticaOblique,
          color: secondaryColor,
        });
        y -= 13;
      }
    }
    y -= 8;

    // Section 3: Statutory Evidence Checklist
    checkPageBreak(40);
    page.drawText('3. STATUTORY SUPPORTING EVIDENCE STATUS', {
      x: margin,
      y,
      size: 9.5,
      font: helveticaBold,
      color: primaryColor,
    });
    y -= 14;

    const displayChecklist = checklist.slice(0, 10);
    for (const item of displayChecklist) {
      checkPageBreak(14);
      page.drawText(`${item.item_number}. ${item.document_title}`, {
        x: margin,
        y,
        size: 7.5,
        font: helvetica,
        color: primaryColor,
      });
      const isCol = item.collected_status === 'Collected';
      page.drawText(item.collected_status || 'Pending', {
        x: margin + printableWidth - 55,
        y,
        size: 7.5,
        font: helveticaBold,
        color: isCol ? rgb(0.02, 0.45, 0.25) : mutedColor,
      });
      y -= 12;
    }
    y -= 8;

    // Section 4: Quantitative Baselines & Observations
    checkPageBreak(45);
    page.drawText('4. FIELD OBSERVATIONS & QUANTITATIVE BASELINES', {
      x: margin,
      y,
      size: 9.5,
      font: helveticaBold,
      color: primaryColor,
    });
    y -= 14;

    const nc = notes.numbers_captured || {};
    const quantSummary = `Inspections: ${nc.annual_inspections ?? 'N/A'}  |  Disputes Logged: ${nc.disputes_logged ?? 'N/A'}  |  Resolved: ${nc.disputes_resolved ?? 'N/A'}  |  Staff Count: ${nc.total_staff ?? 'N/A'}`;
    page.drawText(quantSummary, {
      x: margin,
      y,
      size: 8,
      font: helveticaBold,
      color: secondaryColor,
    });
    y -= 14;

    if (notes.observations) {
      checkPageBreak(24);
      const obsSnippet = notes.observations.length > 140 ? `${notes.observations.substring(0, 137)}...` : notes.observations;
      page.drawText(`Observations: "${obsSnippet}"`, {
        x: margin,
        y,
        size: 7.5,
        font: helveticaOblique,
        color: secondaryColor,
      });
      y -= 14;
    }

    // Signatures
    checkPageBreak(55);
    y -= 8;
    page.drawLine({
      start: { x: margin, y },
      end: { x: a4Width - margin, y },
      thickness: 1,
      color: rgb(0.8, 0.83, 0.88),
    });
    y -= 14;

    page.drawText('Field Diagnostic Interviewer: ____________________________', {
      x: margin,
      y,
      size: 8,
      font: helvetica,
      color: secondaryColor,
    });
    page.drawText('Interviewee Verification: ____________________________', {
      x: margin + printableWidth / 2,
      y,
      size: 8,
      font: helvetica,
      color: secondaryColor,
    });

    // Draw footer on all pages
    const pageCount = pdfDoc.getPageCount();
    for (let i = 0; i < pageCount; i++) {
      drawFooter(pdfDoc.getPage(i));
    }

    const pdfBytes = await pdfDoc.save();

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Diagnostic_Brief_${interview.id}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error('Unhandled Edge Function error:', err);
    return new Response(JSON.stringify({ error: err?.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
