import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '../../mambobot.db');

export const db = new DatabaseSync(dbPath);

// Habilitar WAL mode y foreign keys para alto rendimiento
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT,
      first_name TEXT,
      last_name TEXT,
      role TEXT DEFAULT 'member',
      custom_multiplier REAL DEFAULT 1.0,
      is_banned INTEGER DEFAULT 0,
      warnings_count INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS roles_config (
      role_name TEXT PRIMARY KEY,
      multiplier REAL DEFAULT 1.0
    );

    INSERT OR IGNORE INTO roles_config (role_name, multiplier) VALUES 
      ('owner', 1.0),
      ('mod', 1.2),
      ('vip', 2.0),
      ('booster', 1.5),
      ('member', 1.0);

    CREATE TABLE IF NOT EXISTS auth_codes (
      code TEXT PRIMARY KEY,
      user_id INTEGER,
      expires_at INTEGER,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS giveaways (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id INTEGER,
      message_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      prize TEXT NOT NULL,
      winners_count INTEGER DEFAULT 1,
      created_by INTEGER,
      created_at TEXT,
      ends_at TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      winner_ids TEXT
    );

    CREATE TABLE IF NOT EXISTS giveaway_participants (
      giveaway_id INTEGER,
      user_id INTEGER,
      joined_at TEXT,
      calculated_weight REAL DEFAULT 1.0,
      PRIMARY KEY (giveaway_id, user_id),
      FOREIGN KEY (giveaway_id) REFERENCES giveaways(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS moderation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      target_user_id INTEGER,
      target_username TEXT,
      mod_user_id INTEGER,
      reason TEXT,
      created_at TEXT
    );
  `);

  console.log('[DB] Base de datos mamboBot inicializada correctamente.');
}
