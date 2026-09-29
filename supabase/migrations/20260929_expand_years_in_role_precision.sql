-- Expand years_in_role precision to allow 2 decimal places (e.g. 0.12 for 12 months, 1.12 for 1 year 12 months)
ALTER TABLE public.interviews ALTER COLUMN years_in_role TYPE NUMERIC(5,2);
