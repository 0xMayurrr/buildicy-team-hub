-- ==============================================================================
-- Buildicy Team Hub - Member Performance & Daily Work Reporting Migration
-- Safe incremental migration for existing Supabase schema
-- ==============================================================================

-- 1. Extend profiles with working status
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'working_status'
  ) THEN 
    ALTER TABLE public.profiles ADD COLUMN working_status TEXT NOT NULL DEFAULT 'Outreach';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'status_updated_at'
  ) THEN 
    ALTER TABLE public.profiles ADD COLUMN status_updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
  END IF;
END $$;

-- 2. Extend leads with quality potential & next follow-up date
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'quality_potential'
  ) THEN 
    ALTER TABLE public.leads ADD COLUMN quality_potential TEXT NOT NULL DEFAULT 'Medium potential';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'promising_reason'
  ) THEN 
    ALTER TABLE public.leads ADD COLUMN promising_reason TEXT DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'next_followup_date'
  ) THEN 
    ALTER TABLE public.leads ADD COLUMN next_followup_date DATE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'last_outreach_at'
  ) THEN 
    ALTER TABLE public.leads ADD COLUMN last_outreach_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'last_outreach_channel'
  ) THEN 
    ALTER TABLE public.leads ADD COLUMN last_outreach_channel TEXT;
  END IF;
END $$;

-- 3. Create lead_outreach table for multi-channel touchpoint history
CREATE TABLE IF NOT EXISTS public.lead_outreach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id TEXT NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  user_initials TEXT NOT NULL,
  user_color TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('Email', 'WhatsApp', 'Call', 'Meeting', 'LinkedIn', 'Other')),
  notes TEXT NOT NULL,
  prospect_response TEXT NOT NULL,
  is_positive BOOLEAN NOT NULL DEFAULT false,
  status_at_time TEXT NOT NULL,
  next_followup_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Create daily_work_updates table for member daily reporting
CREATE TABLE IF NOT EXISTS public.daily_work_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_initials TEXT NOT NULL,
  user_color TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  working_status TEXT NOT NULL,
  new_leads_count INTEGER NOT NULL DEFAULT 0,
  email_outreach_count INTEGER NOT NULL DEFAULT 0,
  whatsapp_outreach_count INTEGER NOT NULL DEFAULT 0,
  call_outreach_count INTEGER NOT NULL DEFAULT 0,
  total_outreach_count INTEGER NOT NULL DEFAULT 0,
  responses_received_count INTEGER NOT NULL DEFAULT 0,
  positive_responses_count INTEGER NOT NULL DEFAULT 0,
  meetings_booked_count INTEGER NOT NULL DEFAULT 0,
  proposals_requested_count INTEGER NOT NULL DEFAULT 0,
  completed_followups_count INTEGER NOT NULL DEFAULT 0,
  pending_followups_count INTEGER NOT NULL DEFAULT 0,
  achievements TEXT DEFAULT '',
  challenges TEXT DEFAULT '',
  tomorrow_priorities TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_user_daily_update UNIQUE(user_id, date)
);

-- Indexes for high-speed reporting queries
CREATE INDEX IF NOT EXISTS idx_lead_outreach_lead_id ON public.lead_outreach(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_outreach_user_id ON public.lead_outreach(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_outreach_created_at ON public.lead_outreach(created_at);
CREATE INDEX IF NOT EXISTS idx_daily_work_updates_user_id ON public.daily_work_updates(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_work_updates_date ON public.daily_work_updates(date);

-- Enable RLS
ALTER TABLE public.lead_outreach ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_work_updates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lead_outreach
DO $$ 
BEGIN 
  DROP POLICY IF EXISTS "Lead outreach access policy" ON public.lead_outreach;
  CREATE POLICY "Lead outreach access policy" ON public.lead_outreach
    FOR ALL
    USING (
      public.is_founder() OR 
      user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.leads l 
        WHERE l.id = lead_outreach.lead_id AND (l.assigned_to = auth.uid() OR l.assigned_to IS NULL)
      )
    )
    WITH CHECK (
      public.is_founder() OR user_id = auth.uid()
    );
END $$;

-- RLS Policies for daily_work_updates
DO $$ 
BEGIN 
  DROP POLICY IF EXISTS "Daily work updates access policy" ON public.daily_work_updates;
  CREATE POLICY "Daily work updates access policy" ON public.daily_work_updates
    FOR ALL
    USING (
      public.is_founder() OR user_id = auth.uid()
    )
    WITH CHECK (
      public.is_founder() OR user_id = auth.uid()
    );
END $$;

-- 5. Extend chat_channels with member_ids and created_by
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_channels' AND column_name = 'member_ids'
  ) THEN 
    ALTER TABLE public.chat_channels ADD COLUMN member_ids TEXT[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_channels' AND column_name = 'created_by'
  ) THEN 
    ALTER TABLE public.chat_channels ADD COLUMN created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Realtime publications
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_outreach;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_work_updates;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_channels;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;

