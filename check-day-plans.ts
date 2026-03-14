import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function checkDayPlansSchema() {
  const db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  const tableInfo = await db.all("PRAGMA table_info(day_plans)");
  console.log('Day Plans table columns:', tableInfo.map(c => c.name));
  await db.close();
}

checkDayPlansSchema().catch(console.error);
