import Database from 'better-sqlite3';
import path from 'node:path';
import { getAppDataDir } from './crypto';
import { logger } from '../logger';

let dbInstance: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (dbInstance) return dbInstance;

  const dbPath = path.join(getAppDataDir(), 'inkwell.db');
  let opened: Database.Database | undefined;
  try {
    opened = new Database(dbPath, { timeout: 1000 });
    opened.pragma('journal_mode = WAL');
    initSchema(opened);
    dbInstance = opened;

    logger.info('db', `Database opened at ${dbPath}`);
    return dbInstance;
  } catch (err) {
    opened?.close();
    logger.error('db', `Failed to open database at ${dbPath}`, err);
    throw err;
  }
}

/**
 * Initializes the database schema. Used for both production and test setups.
 */
export function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS keystrokes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      app_name TEXT,
      key_char TEXT,
      key_code INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_ts ON keystrokes(timestamp);
  `);
}

export function closeDatabase(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
      logger.info('db', 'Database closed cleanly');
    } catch (err) {
      logger.error('db', 'Error closing database', err);
    } finally {
      dbInstance = null;
    }
  }
}
