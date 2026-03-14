import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gqppjvhpcutgunecsgyb.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxcHBqdmhwY3V0Z3VuZWNzZ3liIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE4OTA2MSwiZXhwIjoyMDg4NzY1MDYxfQ.kmDue_xuu80VWu_Oj9uNWyTfVi9xtFyfUoyDHFlIygw';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkColumns() {
  const { data, error } = await supabase.from('activity_logs').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else if (data && data.length > 0) {
    console.log('activity_logs columns:', Object.keys(data[0]));
  } else {
    console.log('activity_logs table is empty.');
  }
}

checkColumns();
