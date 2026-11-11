# 🚀 Buildicy Team Hub — Live Supabase Setup (3 Easy Steps)

Nothing is hardcoded! The application now connects to your live Supabase database via the direct Supabase REST & Auth integration in `src/lib/supabase/client.ts` and `src/lib/supabase/store.ts`.

Follow these **3 quick steps** in your Supabase dashboard:

---

### Step 1: Create a Free Project on Supabase
1. Go to **[supabase.com](https://supabase.com)** and sign in / sign up.
2. Click **"New Project"**.
3. Choose any name (e.g. `buildicy-hub`) and set a database password.
4. Wait 1–2 minutes for the database to provision.

---

### Step 2: Run the SQL Migration Scripts
1. In your Supabase dashboard, click on the **SQL Editor** tab (the `>_` icon on the left sidebar).
2. Click **"New Query"**.
3. Open [`supabase/migrations/20261111_init.sql`](./supabase/migrations/20261111_init.sql), copy its **entire content**, paste it, and click **"Run"**.
4. Open [`supabase/migrations/20261111_performance_reporting.sql`](./supabase/migrations/20261111_performance_reporting.sql), copy its **entire content**, paste it, and click **"Run"**.

> **What these scripts do:**
> - Create all tables (`profiles`, `leads`, `lead_outreach`, `daily_work_updates`, `lead_activities`, `lead_discussions`, `chat_channels`, `chat_messages`, `notifications`, `daily_tasks`).
> - Add working status, lead quality potentials, and next follow-up dates.
> - Configure PostgreSQL Row Level Security (RLS) & Realtime broadcast.
> - Register the 4 team credentials in Supabase Auth.

---

### Step 3: Copy Your API Keys into `.env`
1. In your Supabase dashboard, click **Project Settings** (gear icon at the bottom left) ➔ **API**.
2. Copy two values:
   - **Project URL** (e.g. `https://xyzprojectid.supabase.co`)
   - **Project API Key** (the one labeled `anon` `public`)
3. Open `.env` in the `buildicy-team-hub/` folder and paste them:
   ```env
   VITE_SUPABASE_URL=https://xyzprojectid.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
4. Save the file and restart your Vite dev server (`npm run dev` or `pnpm dev`).

---

### ✅ You are all set!
- Every lead you create is inserted directly into Supabase PostgreSQL table `leads`.
- Every status update changes the record in Supabase.
- Every chat message or lead discussion writes to Supabase.
- Authentication validates against Supabase Auth.
- If you run the app offline or without `.env` set up, it automatically uses the smart local persistence fallback so work is never lost.
