import { createClient } from '@supabase/supabase-js';

const defaultUrl = 'https://rrwjwzqaxmeglqistjxr.supabase.co';
const defaultAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyd2p3enFheG1lZ2xxaXN0anhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NTY1NTQsImV4cCI6MjEwMTUzMjU1NH0.FWY6DSUMpk7lY8GReNwQNXE_AaebgZ6C8IPR6-qer5k';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL || defaultUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.SUPABASE_PUBLISHABLE_KEY || defaultAnonKey;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://placeholder.supabase.co' &&
  !supabaseUrl.includes('placeholder.supabase.co') &&
  supabaseAnonKey !== 'placeholder-anon-key'
);

const safeUrl  = isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co';
const safeKey  = isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key';

if (!isSupabaseConfigured) {
  console.info(
    '[Sakshar AI] Local Mode active. VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set.\n' +
    'To enable real-time cloud database syncing, add your Supabase credentials to your Vercel Environment Variables.'
  );
}

export const supabase = createClient(safeUrl, safeKey);
