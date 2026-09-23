/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { MASTER_QUESTIONS } from '../src/lib/questionsData';

// Parse .env if running standalone via tsx/node
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    });
  }
}

loadEnv();

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

console.log('========================================================================');
console.log('MGLSD DIAGNOSTIC INTERVIEW APPLICATION – DATABASE SEEDING UTILITY');
console.log('Target URL:', url || 'NOT CONFIGURED');
console.log('Timestamp:', new Date().toISOString());
console.log('========================================================================\n');

async function main() {
  if (!url) {
    console.error('❌ Error: VITE_SUPABASE_URL is not configured in .env');
    process.exit(1);
  }

  // 1. If service role key is provided, perform automated seed insert
  if (serviceRoleKey) {
    console.log('🔑 Supabase Service Role Key detected. Executing direct seed insertion...');
    const adminClient = createClient(url, serviceRoleKey, {
      auth: { persistSession: false },
    });

    console.log(`📦 Seeding ${MASTER_QUESTIONS.length} diagnostic questions...`);
    const rows = MASTER_QUESTIONS.map((q) => ({
      id: q.id,
      section_code: q.section_code,
      section_title: q.section_title,
      question_text: q.question_text,
      who_to_ask: q.who_to_ask,
      prompt_hints: q.prompt_hints || '',
      applicable_tiers: q.applicable_tiers,
      response_type: q.response_type,
      sort_order: q.sort_order,
    }));

    const { data, error } = await adminClient.from('questions').upsert(rows, { onConflict: 'id' });
    if (error) {
      console.error('❌ Failed to upsert questions into Supabase:', error.message);
      process.exit(1);
    }
    console.log('✅ Successfully seeded questions into public.questions table!');
  } else {
    console.log('ℹ️  No SUPABASE_SERVICE_ROLE_KEY in environment.');
    console.log('ℹ️  If the questions table is empty, run `supabase/seed.sql` in the Supabase Dashboard SQL Editor.');
    console.log('ℹ️  Or run: supabase db reset / supabase migration up\n');
  }

  // 2. Query and verify the public.questions table
  console.log('--- Verifying public.questions Table Status ---');
  const verifyClient = createClient(url, serviceRoleKey || anonKey);
  const { data, count, error } = await verifyClient
    .from('questions')
    .select('id, section_code, section_title', { count: 'exact' });

  if (error) {
    console.error('❌ Error querying public.questions:', error.message);
    if (error.message.includes('permission denied') || error.message.includes('row-level security')) {
      console.log('💡 Note: RLS policy on public.questions may need "CREATE POLICY \\"Questions readable by everyone\\" ON public.questions FOR SELECT TO public USING (true);"');
    }
    process.exit(1);
  }

  const rowCount = count ?? (data ? data.length : 0);
  console.log(`📊 Total rows in public.questions: ${rowCount}`);

  if (rowCount === 0) {
    console.error('\n⚠️  WARNING: public.questions is EMPTY (0 rows).');
    console.error('⚠️  The application requires the diagnostic questions catalogue to operate.');
    console.error('⚠️  ACTION REQUIRED:');
    console.error('    1. Open Supabase Dashboard (https://app.supabase.com)');
    console.error('    2. Navigate to SQL Editor -> New Query');
    console.error('    3. Paste and run the entire contents of supabase/seed.sql');
    console.error('    4. Run this command again to verify: npm run db:seed\n');
    process.exit(1);
  }

  // Count by section
  const sectionCounts: Record<string, number> = {};
  if (data) {
    data.forEach((row: any) => {
      sectionCounts[row.section_code] = (sectionCounts[row.section_code] || 0) + 1;
    });
  }

  console.log('\n📋 Row count breakdown by section:');
  Object.keys(sectionCounts)
    .sort()
    .forEach((code) => {
      console.log(`   - Section ${code}: ${sectionCounts[code]} questions`);
    });

  console.log('\n✅ Database questions verification completed successfully!');
}

main().catch((err) => {
  console.error('Fatal error during seeding verification:', err);
  process.exit(1);
});
