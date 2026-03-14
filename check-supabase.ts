import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gqppjvhpcutgunecsgyb.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxcHBqdmhwY3V0Z3VuZWNzZ3liIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE4OTA2MSwiZXhwIjoyMDg4NzY1MDYxfQ.kmDue_xuu80VWu_Oj9uNWyTfVi9xtFyfUoyDHFlIygw';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkTables() {
  const table = 'team_members';
  
  const { data, error } = await supabase.from(table).select('*');
  
  if (error) {
    console.error('Select ERROR:', error);
  } else if (data && data.length > 0) {
    console.log('All Team members:', data.map(tm => ({ id: tm.id, email: tm.email, name: tm.name })));
    const found = data.find(tm => tm.email?.toLowerCase() === 'trutharcmedia3@gmail.com');
    console.log('Found trutharcmedia3@gmail.com:', found ? 'YES' : 'NO');
  } else {
    console.log('Table team_members is empty.');
  }
}

checkTables();
