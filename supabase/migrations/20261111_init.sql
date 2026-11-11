-- ==============================================================================
-- Buildicy Team Hub - Complete Supabase PostgreSQL Schema & Migrations
-- Fresh Production Database without mock data
-- ==============================================================================

-- Enable UUID & Crypto extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. PROFILES TABLE (Public user profiles with roles)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('founder', 'member')),
  title TEXT NOT NULL DEFAULT 'Team Member',
  department TEXT NOT NULL DEFAULT 'Marketing',
  initials TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'avatar-lilac',
  active_status TEXT NOT NULL DEFAULT 'Active now',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 2. LEADS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.leads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT 'Not added',
  source TEXT NOT NULL DEFAULT 'Website',
  value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost')),
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  owner_name TEXT NOT NULL,
  initials TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'avatar-lilac',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 3. LEAD ACTIVITIES TABLE (Timeline Touchpoints)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id TEXT NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  person_name TEXT NOT NULL,
  initials TEXT NOT NULL,
  color TEXT NOT NULL,
  action TEXT NOT NULL,
  subject TEXT NOT NULL,
  detail TEXT NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('status', 'note', 'lead', 'check')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 4. LEAD DISCUSSIONS TABLE (Internal Comments)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.lead_discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id TEXT NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author TEXT NOT NULL,
  initials TEXT NOT NULL,
  color TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 5. CHAT CHANNELS TABLE (Group Channels & DMs)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.chat_channels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_group BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  member_ids TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 6. CHAT MESSAGES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id TEXT NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author TEXT NOT NULL,
  initials TEXT NOT NULL,
  color TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 7. NOTIFICATIONS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  lead_id TEXT REFERENCES public.leads(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 8. DAILY TASKS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.daily_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  due_time TEXT NOT NULL DEFAULT 'Today',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;

-- Helper function: check if founder
CREATE OR REPLACE FUNCTION public.is_founder()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'founder'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Policies
DROP POLICY IF EXISTS "Profiles viewable" ON public.profiles;
CREATE POLICY "Profiles viewable" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Profiles editable" ON public.profiles;
CREATE POLICY "Profiles editable" ON public.profiles FOR ALL USING (true);

DROP POLICY IF EXISTS "Leads viewable" ON public.leads;
CREATE POLICY "Leads viewable" ON public.leads FOR SELECT USING (true);

DROP POLICY IF EXISTS "Leads insertable" ON public.leads;
CREATE POLICY "Leads insertable" ON public.leads FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Leads updatable" ON public.leads;
CREATE POLICY "Leads updatable" ON public.leads FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Activities all" ON public.lead_activities;
CREATE POLICY "Activities all" ON public.lead_activities FOR ALL USING (true);

DROP POLICY IF EXISTS "Discussions all" ON public.lead_discussions;
CREATE POLICY "Discussions all" ON public.lead_discussions FOR ALL USING (true);

DROP POLICY IF EXISTS "Channels all" ON public.chat_channels;
CREATE POLICY "Channels all" ON public.chat_channels FOR ALL USING (true);

DROP POLICY IF EXISTS "Messages all" ON public.chat_messages;
CREATE POLICY "Messages all" ON public.chat_messages FOR ALL USING (true);

DROP POLICY IF EXISTS "Notifications all" ON public.notifications;
CREATE POLICY "Notifications all" ON public.notifications FOR ALL USING (true);

DROP POLICY IF EXISTS "Tasks all" ON public.daily_tasks;
CREATE POLICY "Tasks all" ON public.daily_tasks FOR ALL USING (true);

-- ==============================================================================
-- 10. REALTIME ENABLEMENT
-- ==============================================================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_activities;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_discussions;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ==============================================================================
-- 11. SUPABASE AUTH USERS (Founder & Marketing Members)
-- ==============================================================================
DO $$
BEGIN
  -- 1. Founder
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'founder@buildicy.com') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'founder@buildicy.com', crypt('Buildicy@2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"Mayur Founder","role":"founder"}', false
    );
  END IF;

  -- 2. Ganesh
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'ganesh.marketing@buildicy.com') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'ganesh.marketing@buildicy.com', crypt('GaneshBuildicy@2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"Ganesh","role":"member"}', false
    );
  END IF;

  -- 3. Dhruv
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'dhruv.marketing@buildicy.com') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'dhruv.marketing@buildicy.com', crypt('DhruvBuildicy@2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"Dhruv","role":"member"}', false
    );
  END IF;

  -- 4. Padma
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'padma.amarketing@buildicy.com') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'padma.amarketing@buildicy.com', crypt('PadmaBuildicy@2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"Padma","role":"member"}', false
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ==============================================================================
-- 12. SEED PROFILES
-- ==============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = 'founder@buildicy.com') THEN
    INSERT INTO public.profiles (id, email, full_name, role, title, department, initials, color, active_status)
    VALUES ('00000000-0000-0000-0000-000000000001', 'founder@buildicy.com', 'Mayur Founder', 'founder', 'Founder & CEO', 'Leadership', 'FB', 'avatar-lilac', 'Active now');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = 'ganesh.marketing@buildicy.com') THEN
    INSERT INTO public.profiles (id, email, full_name, role, title, department, initials, color, active_status)
    VALUES ('00000000-0000-0000-0000-000000000002', 'ganesh.marketing@buildicy.com', 'Ganesh', 'member', 'Marketing Lead', 'Marketing', 'GM', 'avatar-peach', 'Active 4m ago');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = 'dhruv.marketing@buildicy.com') THEN
    INSERT INTO public.profiles (id, email, full_name, role, title, department, initials, color, active_status)
    VALUES ('00000000-0000-0000-0000-000000000003', 'dhruv.marketing@buildicy.com', 'Dhruv', 'member', 'Growth Marketing', 'Marketing', 'DM', 'avatar-sage', 'Active 12m ago');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = 'padma.amarketing@buildicy.com') THEN
    INSERT INTO public.profiles (id, email, full_name, role, title, department, initials, color, active_status)
    VALUES ('00000000-0000-0000-0000-000000000004', 'padma.amarketing@buildicy.com', 'Padma', 'member', 'Content & Inbound', 'Marketing', 'PM', 'avatar-rose', 'Active 1h ago');
  END IF;
END $$;

-- ==============================================================================
-- 13. SEED CHANNELS & CLEAN START
-- ==============================================================================
INSERT INTO public.chat_channels (id, name, is_group, description)
VALUES
  ('marketing', 'marketing', true, 'Buildicy Marketing campaigns and growth'),
  ('sales', 'sales-team', true, 'Pipeline discussions and updates'),
  ('wins', 'wins', true, 'Celebrations and closed deals'),
  ('dm-ganesh', 'Ganesh', false, 'Direct conversation with Ganesh'),
  ('dm-dhruv', 'Dhruv', false, 'Direct conversation with Dhruv'),
  ('dm-padma', 'Padma', false, 'Direct conversation with Padma'),
  ('dm-founder', 'Founder', false, 'Direct conversation with Founder')
ON CONFLICT (id) DO NOTHING;

-- Initial real welcome message from Founder to the marketing team
INSERT INTO public.chat_messages (channel_id, author, initials, color, text)
VALUES
  ('marketing', 'Mayur Founder', 'FB', 'avatar-lilac', 'Welcome Ganesh, Dhruv & Padma to the Buildicy Team Hub! Let us drive marketing growth 🚀'),
  ('sales', 'Mayur Founder', 'FB', 'avatar-lilac', 'Workspace pipeline is ready. Start tracking your leads and client conversations here.')
ON CONFLICT DO NOTHING;

-- Clean out any previous mock demo leads
DELETE FROM public.leads WHERE id IN ('LD-2408', 'LD-2407', 'LD-2406', 'LD-2405', 'LD-2404', 'LD-2403', 'LD-2402', 'LD-2401');
DELETE FROM public.lead_activities WHERE lead_id IN ('LD-2408', 'LD-2407', 'LD-2406', 'LD-2405', 'LD-2404', 'LD-2403', 'LD-2402', 'LD-2401');

SELECT 'Buildicy Team Hub schema, channels, and verified accounts initialized fresh!' as result;
