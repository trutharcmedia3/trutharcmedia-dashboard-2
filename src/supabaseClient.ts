import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gqppjvhpcutgunecsgyb.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxcHBqdmhwY3V0Z3VuZWNzZ3liIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxODkwNjEsImV4cCI6MjA4ODc2NTA2MX0.nae4emsZsagEGwqx20YmOTpislTb67rqsyfrRy3GAGw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
