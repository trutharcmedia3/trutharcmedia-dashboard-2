import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function checkSchema() {
  const db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
  console.log('Tables in database:', tables.map(t => t.name));

  const tableInfo = await db.all("PRAGMA table_info(payments)");
  console.log('Payments table columns:', tableInfo.map(c => c.name));
  await db.close();
}

checkSchema().catch(console.error);
