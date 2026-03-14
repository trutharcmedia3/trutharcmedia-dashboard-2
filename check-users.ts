import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function checkUsers() {
  const db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  const users = await db.all('SELECT email, role FROM users');
  console.log('Users in local database:', users);
  await db.close();
}

checkUsers().catch(console.error);
