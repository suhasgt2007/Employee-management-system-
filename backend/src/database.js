import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(currentDirectory, '../..');
const databaseDirectory = path.join(projectDirectory, 'database');
const dataDirectory = path.join(projectDirectory, 'data');
const databasePath = process.env.DATABASE_PATH || path.join(dataDirectory, 'employees.sqlite');

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

export const db = new Database(databasePath);
db.pragma('journal_mode = WAL');
db.exec(fs.readFileSync(path.join(databaseDirectory, 'schema.sql'), 'utf8'));

if (db.prepare('SELECT COUNT(*) AS count FROM departments').get().count === 0) {
  db.exec(fs.readFileSync(path.join(databaseDirectory, 'seed.sql'), 'utf8'));
}

db.pragma('foreign_keys = ON');