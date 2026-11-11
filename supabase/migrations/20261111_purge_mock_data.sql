-- ==============================================================================
-- Purge All Mock / Demo Data from Remote Supabase PostgreSQL
-- ==============================================================================

-- 1. Remove mock leads by ID and company name
DELETE FROM public.lead_activities
WHERE lead_id IN ('LD-2408', 'LD-2407', 'LD-2406', 'LD-2405', 'LD-2404', 'LD-2403', 'LD-2402', 'LD-2401')
   OR lead_id LIKE 'LD-240%'
   OR person_name IN ('Sofia Chen', 'Alex Morgan', 'Jordan Lee', 'Olivia Rhye', 'Phoenix Baker')
   OR subject IN ('Phoenix Baker', 'Lana Steiner', 'Demi Wilkinson', 'Candice Wu', 'Natali Craig', 'Drew Cano', 'Orlando Diggs');

DELETE FROM public.lead_discussions
WHERE lead_id IN ('LD-2408', 'LD-2407', 'LD-2406', 'LD-2405', 'LD-2404', 'LD-2403', 'LD-2402', 'LD-2401')
   OR lead_id LIKE 'LD-240%'
   OR author IN ('Sofia Chen', 'Alex Morgan', 'Jordan Lee');

DELETE FROM public.lead_outreach
WHERE lead_id IN ('LD-2408', 'LD-2407', 'LD-2406', 'LD-2405', 'LD-2404', 'LD-2403', 'LD-2402', 'LD-2401')
   OR lead_id LIKE 'LD-240%';

DELETE FROM public.leads
WHERE id IN ('LD-2408', 'LD-2407', 'LD-2406', 'LD-2405', 'LD-2404', 'LD-2403', 'LD-2402', 'LD-2401')
   OR id LIKE 'LD-240%'
   OR LOWER(company) IN ('layers studio', 'circooles', 'catalog', 'quotient', 'sisyphus', 'hourglass', 'bloom labs', 'fable & co.', 'acme corp', 'acme');

-- 2. Remove mock chat messages
DELETE FROM public.chat_messages
WHERE author IN ('Sofia Chen', 'Alex Morgan', 'Jordan Lee', 'Mayur Buildicy')
   OR channel_id IN ('marketing', 'sales', 'wins');

-- 3. Remove legacy mock channels
DELETE FROM public.chat_channels
WHERE id IN ('marketing', 'sales', 'wins', 'sales-team', 'general');

SELECT 'All mock leads, activities, messages, and channels purged successfully!' AS result;

