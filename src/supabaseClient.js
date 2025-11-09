// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// CRA uses REACT_APP_* at build time
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // helps catch missing envs during build
  // eslint-disable-next-line no-console
  console.warn('[Supabase] Missing REACT_APP_SUPABASE_URL / REACT_APP_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
