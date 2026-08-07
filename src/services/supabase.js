import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.SUPABASE_PUBLISHABLE_KEY;

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
