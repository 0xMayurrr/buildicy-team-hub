-- Migration: Allow deleting leads via Supabase PostgREST
DROP POLICY IF EXISTS "Leads deletable" ON public.leads;
CREATE POLICY "Leads deletable" ON public.leads FOR DELETE USING (true);

