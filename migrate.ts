import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gqppjvhpcutgunecsgyb.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxcHBqdmhwY3V0Z3VuZWNzZ3liIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE4OTA2MSwiZXhwIjoyMDg4NzY1MDYxfQ.kmDue_xuu80VWu_Oj9uNWyTfVi9xtFyfUoyDHFlIygw';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function migrate() {
  const db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  const tables = [
    'users', 'clients', 'projects', 'tasks', 'payments', 
    'expenditures', 'comments', 'activity_logs', 
    'day_plans', 'team_members', 'settings'
  ];

  for (const table of tables) {
    console.log(`Migrating table: ${table}...`);
    const rows = await db.all(`SELECT * FROM ${table}`);
    
    if (rows.length === 0) {
      console.log(`Table ${table} is empty, skipping.`);
      continue;
    }

    // Supabase insert
    const { error } = await supabase.from(table).upsert(rows);
    
    if (error) {
      console.error(`Error migrating ${table}:`, error.message);
    } else {
      console.log(`Successfully migrated ${rows.length} rows to ${table}`);
    }
  }

  console.log('Migration complete!');
  await db.close();
}

migrate().catch(console.error);
