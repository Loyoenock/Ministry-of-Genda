// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Supabase Edge Function: transcription-token
 *
 * Secure ephemeral credential minting service for live streaming transcription sessions.
 *
 * Security & Guardrails:
 * - Requires caller's JWT in Authorization header.
 * - Uses caller-scoped Supabase client (NOT service-role) to enforce RLS.
 * - Confirms interview ownership or admin role.
 * - Verifies consent_confirmed_at timestamp is present on the transcript record.
 * - Blocks completed interviews unless caller is admin.
 * - Enforces per-user rate limiting (max 10 tokens/minute).
 * - Provider secrets live exclusively in Edge Function environment.
 * - Zero tokens, secrets, or transcripts logged to console.
 * - Ephemeral token TTL <= 5 minutes (300 seconds), scoped to transcript_id.
 * - Generic error responses prevent internal stack trace or provider leakage.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// In-memory rate limiting map (keyed by user UUID: { count, resetAt })
const userRateLimits = new Map();

function checkRateLimit(userId: string, limit = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = userRateLimits.get(userId);

  if (!entry || now > entry.resetAt) {
    userRateLimits.set(userId, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count += 1;
  return true;
}

// Clean up expired rate limit records periodically
setInterval(() => {
  const now = Date.now();
  for (const [userId, entry] of userRateLimits.entries()) {
    if (now > entry.resetAt) {
      userRateLimits.delete(userId);
    }
  }
}, 300000);

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  const rawAllowed = Deno.env.get('ALLOWED_APP_ORIGINS') || '';
  const allowedList = rawAllowed
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  let allowedOrigin = '*';
  if (allowedList.length > 0) {
    if (origin && allowedList.includes(origin)) {
      allowedOrigin = origin;
    } else {
      allowedOrigin = allowedList[0];
    }
  }

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

// Cryptographic token signer (Web Crypto HMAC-SHA256)
async function mintScopedJwt(
  payload: Record<string, unknown>,
  secretKey: string
): Promise<string> {
  const encoder = new TextEncoder();
  const header = { alg: 'HS256', typ: 'JWT' };

  const encodeSegment = (obj: unknown) => {
    const bytes = encoder.encode(JSON.stringify(obj));
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  const headerB64 = encodeSegment(header);
  const payloadB64 = encodeSegment(payload);
  const data = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const sigBytes = new Uint8Array(signature);
  let sigBinary = '';
  for (let i = 0; i < sigBytes.byteLength; i++) {
    sigBinary += String.fromCharCode(sigBytes[i]);
  }
  const sigB64 = btoa(sigBinary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  return `${data}.${sigB64}`;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // 1. Enforce Authentication Header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authorization token required', code: 'UNAUTHORIZED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Parse and Validate Request Payload
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload', code: 'BAD_REQUEST' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { interview_id, transcript_id } = body;
    if (!interview_id || typeof interview_id !== 'string' || !transcript_id || typeof transcript_id !== 'string') {
      return new Response(
        JSON.stringify({ error: 'interview_id and transcript_id are required', code: 'BAD_REQUEST' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Initialize Caller-Scoped Supabase Client (Strict RLS Enforcement)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    // 4. Verify User Session
    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired user session', code: 'UNAUTHORIZED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;

    // 5. Rate Limiting Gate (Max 10 tokens per user per minute)
    if (!checkRateLimit(userId, 10, 60000)) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded: maximum 10 tokens per minute',
          code: 'RATE_LIMITED',
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Query Interview through Caller-Scoped RLS
    const { data: interview, error: intError } = await callerClient
      .from('interviews')
      .select('id, status, interviewer_id')
      .eq('id', interview_id)
      .single();

    if (intError || !interview) {
      return new Response(
        JSON.stringify({ error: 'Interview not found or access denied', code: 'INTERVIEW_NOT_FOUND' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Check Admin Status if Interview is Completed
    if (interview.status === 'Completed') {
      const { data: profile } = await callerClient
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
      if (!isAdmin) {
        return new Response(
          JSON.stringify({
            error: 'Interview is completed and locked from live transcription',
            code: 'INTERVIEW_LOCKED',
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 8. Query Transcript & Check Consent Confirmation Gate
    const { data: transcript, error: transError } = await callerClient
      .from('interview_transcripts')
      .select('id, interview_id, status, consent_confirmed_at')
      .eq('id', transcript_id)
      .eq('interview_id', interview_id)
      .is('deleted_at', null)
      .single();

    if (transError || !transcript) {
      return new Response(
        JSON.stringify({ error: 'Transcript record not found or access denied', code: 'TRANSCRIPT_NOT_FOUND' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!transcript.consent_confirmed_at) {
      return new Response(
        JSON.stringify({
          error: 'Transcription consent has not been confirmed for this session',
          code: 'CONSENT_MISSING',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 9. Check Provider Secret & Configuration
    const featureEnabled = Deno.env.get('ENABLE_LIVE_TRANSCRIPTION') !== 'false';
    const provider = Deno.env.get('TRANSCRIPTION_PROVIDER') || 'deepgram';
    const providerKey = Deno.env.get('DEEPGRAM_API_KEY') || Deno.env.get('TRANSCRIPTION_API_KEY');
    const signingKey =
      Deno.env.get('TRANSCRIPTION_SIGNING_KEY') ||
      Deno.env.get('SUPABASE_JWT_SECRET') ||
      providerKey;

    if (!featureEnabled || (!providerKey && !signingKey)) {
      return new Response(
        JSON.stringify({
          error: 'Transcription provider service unavailable or unconfigured',
          code: 'PROVIDER_UNAVAILABLE',
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 10. Mint Ephemeral Token (TTL: 300 seconds / 5 minutes)
    const nowSec = Math.floor(Date.now() / 1000);
    const ttlSeconds = 300;
    const expiresAt = new Date((nowSec + ttlSeconds) * 1000).toISOString();

    const tokenPayload = {
      sub: userId,
      tid: transcript_id,
      iid: interview_id,
      prv: provider,
      iat: nowSec,
      exp: nowSec + ttlSeconds,
      iss: 'ug-gov-diagnostic-transcription',
    };

    const token = await mintScopedJwt(tokenPayload, signingKey || 'fallback-transcription-secret');

    const defaultEndpoints = {
      deepgram: 'wss://api.deepgram.com/v1/listen',
      assemblyai: 'wss://api.assemblyai.com/v2/realtime/ws',
      selfhosted: Deno.env.get('TRANSCRIPTION_RELAY_URL') || 'wss://transcribe.gov.ug/ws',
    };

    const endpoint =
      Deno.env.get('TRANSCRIPTION_ENDPOINT') ||
      defaultEndpoints[provider] ||
      defaultEndpoints.deepgram;

    return new Response(
      JSON.stringify({
        token,
        expires_at: expiresAt,
        provider,
        endpoint,
        transcript_id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: unknown) {
    // Return generic error; never leak internal details or provider credentials
    return new Response(
      JSON.stringify({
        error: 'An internal error occurred during token issuance',
        code: 'INTERNAL_ERROR',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
