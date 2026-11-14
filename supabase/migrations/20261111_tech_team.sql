-- ==============================================================================
-- Buildicy Team Hub - Tech Team Tables Migration
-- Run this AFTER 20261111_performance_reporting.sql
-- ==============================================================================

-- 1. TECH TASKS TABLE
CREATE TABLE IF NOT EXISTS public.tech_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assigned_to UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_to_name TEXT NOT NULL,
  assigned_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'In Review', 'Done', 'Blocked')),
  progress_pct INTEGER NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  techie_note TEXT DEFAULT '',
  document_url TEXT DEFAULT '',
  document_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. TECH DAILY UPDATES TABLE
CREATE TABLE IF NOT EXISTS public.tech_daily_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_initials TEXT NOT NULL,
  user_color TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  working_status TEXT NOT NULL DEFAULT 'In Development',
  what_i_worked_on TEXT NOT NULL DEFAULT '',
  blockers TEXT NOT NULL DEFAULT '',
  tomorrow_plan TEXT NOT NULL DEFAULT '',
  task_progress JSONB NOT NULL DEFAULT '[]',
  overall_progress_pct INTEGER NOT NULL DEFAULT 0 CHECK (overall_progress_pct BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_tech_user_daily_update UNIQUE(user_id, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tech_tasks_assigned_to ON public.tech_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tech_tasks_status ON public.tech_tasks(status);
CREATE INDEX IF NOT EXISTS idx_tech_daily_updates_user_id ON public.tech_daily_updates(user_id);
CREATE INDEX IF NOT EXISTS idx_tech_daily_updates_date ON public.tech_daily_updates(date);

-- RLS
ALTER TABLE public.tech_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_daily_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tech tasks access" ON public.tech_tasks;
CREATE POLICY "Tech tasks access" ON public.tech_tasks FOR ALL USING (true);

DROP POLICY IF EXISTS "Tech daily updates access" ON public.tech_daily_updates;
CREATE POLICY "Tech daily updates access" ON public.tech_daily_updates FOR ALL USING (true);

-- Realtime
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tech_tasks;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tech_daily_updates;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Add 'techie' role support to profiles role check
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('founder', 'member', 'techie')) NOT VALID;

SELECT 'Tech team tables (tech_tasks, tech_daily_updates) created successfully!' AS result;
