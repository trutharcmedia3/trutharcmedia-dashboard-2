import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gqppjvhpcutgunecsgyb.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxcHBqdmhwY3V0Z3VuZWNzZ3liIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE4OTA2MSwiZXhwIjoyMDg4NzY1MDYxfQ.kmDue_xuu80VWu_Oj9uNWyTfVi9xtFyfUoyDHFlIygw';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkAllTables() {
  const tables = [
    'clients', 'projects', 'tasks', 'expenditures', 'comments', 
    'activity_logs', 'day_plans', 'team_members', 'settings', 
    'payments', 'users'
  ];

  console.log('Checking Supabase tables...');
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.error(`❌ Table "${table}" error:`, error.message);
    } else {
      console.log(`✅ Table "${table}" exists.`);
    }
  }
}

checkAllTables();
