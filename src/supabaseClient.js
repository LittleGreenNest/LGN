import { createClient } from '@supabase/supabase-js';

// Support both CRA and Vite-style envs
const supabaseUrl =
  process.env.REACT_APP_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL;

const supabaseAnonKey =
  process.env.REACT_APP_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[Supabase] Missing Supabase URL or anon key. ' +
      'Check your .env: REACT_APP_SUPABASE_URL / REACT_APP_SUPABASE_ANON_KEY (CRA) ' +
      'or VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (Vite).'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
console.log('[Supabase] URL:', supabaseUrl);
console.log('[Supabase] KEY present:', !!supabaseAnonKey);
