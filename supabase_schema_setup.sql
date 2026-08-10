-- Sakshar AI Supabase Database Schema Setup SQL
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/rrwjwzqaxmeglqistjxr/sql)

-- 1. Create Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    email TEXT,
    language TEXT DEFAULT 'english',
    educational_level TEXT DEFAULT 'none',
    progress INTEGER DEFAULT 85,
    score INTEGER DEFAULT 90,
    status TEXT DEFAULT 'Active',
    age INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Courses Table
CREATE TABLE IF NOT EXISTS public.courses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    lang TEXT NOT NULL,
    modules INTEGER DEFAULT 3,
    xp INTEGER DEFAULT 150,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create App Settings Table for Cross-Device Cloud Background Configs & Real-Time Sync
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Create Permissive RLS Policies for instant syncing
CREATE POLICY "Allow public read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow public write profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read courses" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Allow public write courses" ON public.courses FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read app_settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Allow public write app_settings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);
