import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Guard: if env vars are missing (e.g. Vercel env not configured),
// create a dummy client that won't crash the app at module load time.
// Auth calls will simply fail gracefully rather than white-screening.
const safeUrl  = supabaseUrl  || 'https://placeholder.supabase.co';
const safeKey  = supabaseAnonKey || 'placeholder-anon-key';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.\n' +
    'Add them to your Vercel project settings under Environment Variables.'
  );
}

export const supabase = createClient(safeUrl, safeKey);