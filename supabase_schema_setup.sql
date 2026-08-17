-- ── Sakshar AI Platform — Self-Healing Supabase DDL Setup ────────────────
-- Run this script inside Supabase Dashboard -> SQL Editor to ensure clean schema!

CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  language TEXT DEFAULT 'english',
  educational_level TEXT DEFAULT 'none',
  age INT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security & Open Access Policies
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read app_settings" ON public.app_settings;
CREATE POLICY "Allow public read app_settings" ON public.app_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public write app_settings" ON public.app_settings;
CREATE POLICY "Allow public write app_settings" ON public.app_settings FOR ALL USING (true);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read profiles" ON public.profiles;
CREATE POLICY "Allow public read profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public write profiles" ON public.profiles;
CREATE POLICY "Allow public write profiles" ON public.profiles FOR ALL USING (true);
