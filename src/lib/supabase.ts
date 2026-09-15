/// <reference types="vite/client" />
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables
const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

/**
 * Flag indicating whether a real Supabase backend has been configured.
 * Must be a valid HTTP(S) URL and non-placeholder API key.
 */
export const isSupabaseConfigured: boolean = Boolean(
  rawUrl &&
    rawKey &&
    !rawUrl.includes('your-project') &&
    !rawKey.includes('your-anon-key') &&
    (rawUrl.startsWith('https://') || rawUrl.startsWith('http://'))
);

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
