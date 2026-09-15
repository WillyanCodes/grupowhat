import { createClient } from '@supabase/supabase-js';

// ESSAS DUAS CHAVES VOCÊ PEGA NO PAINEL DO SUPABASE (veja o README).
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const ADMIN_EMAIL = 'willyanrossanelliwress2703@gmail.com';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const isAdmin = (email) =>
  String(email || '').toLowerCase().replace(/\s/g, '') === ADMIN_EMAIL;