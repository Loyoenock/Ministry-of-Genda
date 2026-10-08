-- Migration: 20261008_analytics_indexes.sql
-- Description: Performance database indexes accelerating filter and order clauses for reports and analytics datasets.

CREATE INDEX IF NOT EXISTS idx_interviews_created_at
  ON public.interviews (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_interviews_department_unit
  ON public.interviews (department_unit);

CREATE INDEX IF NOT EXISTS idx_interviews_status_tier
  ON public.interviews (status, tier);

CREATE INDEX IF NOT EXISTS idx_interviews_interviewer_status
  ON public.interviews (interviewer_id, status);
