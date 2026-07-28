-- Capital International School Kenya
-- Pre-Registration Supabase setup
--
-- 1. Open your Supabase project SQL Editor.
-- 2. Run this script to create the required preregistration table.
-- 3. In Vercel, configure:
--    - SUPABASE_URL
--    - SUPABASE_SERVICE_ROLE_KEY
--    - NEXT_PUBLIC_SITE_URL

CREATE TABLE IF NOT EXISTS pre_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  curriculum TEXT DEFAULT 'Cambridge',
  status TEXT DEFAULT 'unverified',
  verification_token UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pre_registrations_email ON pre_registrations (email);
CREATE INDEX IF NOT EXISTS idx_pre_registrations_status ON pre_registrations (status);
CREATE INDEX IF NOT EXISTS idx_pre_registrations_created_at ON pre_registrations (created_at DESC);
