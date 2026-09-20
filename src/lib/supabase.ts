/// <reference types="vite/client" />
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables
const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

const hasUrl = Boolean(rawUrl);
const hasKey = Boolean(rawKey);
const isUrlPlaceholder = rawUrl.includes('your-project') || rawUrl.toLowerCase().includes('placeholder');
const isKeyPlaceholder = rawKey.includes('your-anon-key') || rawKey.toLowerCase().includes('placeholder');
const hasValidProtocol = rawUrl.startsWith('https://') || rawUrl.startsWith('http://');

let errorMessage: string | null = null;
if (!hasUrl && !hasKey) {
  errorMessage = 'Both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are missing from your environment variables.';
} else if (!hasUrl) {
  errorMessage = 'VITE_SUPABASE_URL is missing from your environment variables.';
} else if (!hasKey) {
  errorMessage = 'VITE_SUPABASE_ANON_KEY is missing from your environment variables.';
} else if (isUrlPlaceholder || isKeyPlaceholder) {
  errorMessage = 'Detected placeholder values in Supabase environment variables. Please replace them with your actual Supabase project URL and anon API key.';
} else if (!hasValidProtocol) {
  errorMessage = 'VITE_SUPABASE_URL must start with https:// or http://.';
}

export const isConfigured = Boolean(
  hasUrl && hasKey && !isUrlPlaceholder && !isKeyPlaceholder && hasValidProtocol
);

export interface SupabaseConfigState {
  isConfigured: boolean;
  url: string | null;
  errorMessage: string | null;
  details?: {
    hasUrl: boolean;
    hasKey: boolean;
    isUrlPlaceholder: boolean;
    isKeyPlaceholder: boolean;
    hasValidProtocol: boolean;
  };
}

export const supabaseConfig: SupabaseConfigState = {
  isConfigured,
  url: hasUrl ? rawUrl : null,
  errorMessage,
  details: {
    hasUrl,
    hasKey,
    isUrlPlaceholder,
    isKeyPlaceholder,
    hasValidProtocol,
  },
};

/**
 * Flag indicating whether a real Supabase backend has been configured.
 * Must be a valid HTTP(S) URL and non-placeholder API key.
 */
export let isSupabaseConfigured: boolean = isConfigured;

export function setSupabaseConfiguredForTesting(val: boolean): void {
  isSupabaseConfigured = val;
  (supabaseConfig as any).isConfigured = val;
}

/**
 * Full Database schema types matching supabase/migrations/20250916_initial_schema.sql
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: 'interviewer' | 'admin';
          department_unit: string;
          phone_number: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: 'interviewer' | 'admin';
          department_unit?: string;
          phone_number?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: 'interviewer' | 'admin';
          department_unit?: string;
          phone_number?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      interviews: {
        Row: {
          id: string;
          interviewee_name: string;
          role_title: string;
          department_unit: string;
          years_in_role: number;
          interview_date: string;
          interview_time: string;
          location: string;
          interviewer_id: string;
          tier: 'Leadership' | 'Management' | 'Frontline' | 'Support/IT';
          status: 'Draft' | 'In Progress' | 'Completed';
          duration_min: number;
          completion_percentage: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          interviewee_name: string;
          role_title: string;
          department_unit: string;
          years_in_role?: number;
          interview_date?: string;
          interview_time?: string;
          location?: string;
          interviewer_id: string;
          tier: 'Leadership' | 'Management' | 'Frontline' | 'Support/IT';
          status?: 'Draft' | 'In Progress' | 'Completed';
          duration_min?: number;
          completion_percentage?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          interviewee_name?: string;
          role_title?: string;
          department_unit?: string;
          years_in_role?: number;
          interview_date?: string;
          interview_time?: string;
          location?: string;
          interviewer_id?: string;
          tier?: 'Leadership' | 'Management' | 'Frontline' | 'Support/IT';
          status?: 'Draft' | 'In Progress' | 'Completed';
          duration_min?: number;
          completion_percentage?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      questions: {
        Row: {
          id: string;
          section_code: string;
          section_title: string;
          question_text: string;
          who_to_ask: string;
          prompt_hints: string | null;
          applicable_tiers: string[];
          response_type: string;
          sort_order: number;
        };
        Insert: {
          id: string;
          section_code: string;
          section_title: string;
          question_text: string;
          who_to_ask: string;
          prompt_hints?: string | null;
          applicable_tiers: string[];
          response_type?: string;
          sort_order?: number;
        };
        Update: {
          id?: string;
          section_code?: string;
          section_title?: string;
          question_text?: string;
          who_to_ask?: string;
          prompt_hints?: string | null;
          applicable_tiers?: string[];
          response_type?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      answers: {
        Row: {
          id: string;
          interview_id: string;
          question_id: string;
          answer_text: string;
          structured_data: Record<string, any>;
          is_flagged: boolean;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          interview_id: string;
          question_id: string;
          answer_text?: string;
          structured_data?: Record<string, any>;
          is_flagged?: boolean;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          interview_id?: string;
          question_id?: string;
          answer_text?: string;
          structured_data?: Record<string, any>;
          is_flagged?: boolean;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      documents_checklist: {
        Row: {
          id: string;
          interview_id: string;
          item_number: number;
          document_title: string;
          category: string;
          exists_status: string;
          collected_status: string;
          notes: string;
          follow_up_action: string;
          file_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          interview_id: string;
          item_number: number;
          document_title: string;
          category: string;
          exists_status?: string;
          collected_status?: string;
          notes?: string;
          follow_up_action?: string;
          file_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          interview_id?: string;
          item_number?: number;
          document_title?: string;
          category?: string;
          exists_status?: string;
          collected_status?: string;
          notes?: string;
          follow_up_action?: string;
          file_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      interviewer_notes: {
        Row: {
          id: string;
          interview_id: string;
          observations: string;
          numbers_captured: Record<string, any>;
          contradictions: string;
          documents_collected_summary: string;
          follow_ups: string;
          maturity_signals: Record<string, any>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          interview_id: string;
          observations?: string;
          numbers_captured?: Record<string, any>;
          contradictions?: string;
          documents_collected_summary?: string;
          follow_ups?: string;
          maturity_signals?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          interview_id?: string;
          observations?: string;
          numbers_captured?: Record<string, any>;
          contradictions?: string;
          documents_collected_summary?: string;
          follow_ups?: string;
          maturity_signals?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      interview_files: {
        Row: {
          id: string;
          interview_id: string;
          document_item_id: string | null;
          file_name: string;
          file_size_bytes: number | null;
          mime_type: string | null;
          storage_path: string;
          uploaded_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          interview_id: string;
          document_item_id?: string | null;
          file_name: string;
          file_size_bytes?: number | null;
          mime_type?: string | null;
          storage_path: string;
          uploaded_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          interview_id?: string;
          document_item_id?: string | null;
          file_name?: string;
          file_size_bytes?: number | null;
          mime_type?: string | null;
          storage_path?: string;
          uploaded_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

/**
 * Always export a typed Supabase client instance.
 * If credentials are missing, falls back to a safe inert client to avoid null reference exceptions.
 */
const supabaseUrl = isSupabaseConfigured ? rawUrl : 'https://placeholder-mglsd.supabase.co';
const supabaseKey = isSupabaseConfigured ? rawKey : 'placeholder-anon-key-mglsd';

export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
