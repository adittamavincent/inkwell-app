import { getDatabase } from './connection';
import { encrypt, decrypt } from './crypto';
import { groupSessions, SessionPreview } from '../sync/sessionGrouper';

export function insertKeystroke(
  timestamp: string,
  appName: string,
  keyChar: string,
  keyCode: number
): number {
  const db = getDatabase();
  const encryptedChar = encrypt(keyChar);
  const stmt = db.prepare(`
    INSERT INTO keystrokes (timestamp, app_name, key_char, key_code)
    VALUES (?, ?, ?, ?)
  `);
  return Number(stmt.run(timestamp, appName, encryptedChar, keyCode).lastInsertRowid);
}

export function querySessionsSince(sinceIso: string, afterId?: number): Array<[string, string, string, number]> {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT id, timestamp, app_name, key_char FROM keystrokes
    WHERE ${afterId === undefined ? 'timestamp >= ?' : 'id > ?'}
    ORDER BY id ASC LIMIT 5000
  `).all(afterId ?? sinceIso) as Array<{ id: number; timestamp: string; app_name: string; key_char: string }>;
  return rows.map((r) => [r.timestamp, r.app_name || 'Unknown', decrypt(r.key_char || ''), r.id]);
}

export interface PaginatedHistoryOptions {
  limit?: number;
  before?: string;
  beforeId?: number;
  idleTimeoutSecs?: number;
}

export interface PaginatedHistoryResult {
  sessions: SessionPreview[];
  hasMore: boolean;
  oldestTimestamp?: string;
  nextBeforeId?: number;
}

export function loadHistoryPaginated(
  options: PaginatedHistoryOptions = {}
): PaginatedHistoryResult {
  const limit = Number.isFinite(options.limit)
    ? Math.max(1, Math.min(100, Math.floor(options.limit!))) : 100;
  const idleTimeoutSecs = options.idleTimeoutSecs ?? 60;
  const db = getDatabase();
  // Bound each request, including pages containing only clicks/control keys.
  const chunkSize = Math.max(limit * 50, 2000);
  const beforeId = options.beforeId;
  if (beforeId !== undefined && (!Number.isSafeInteger(beforeId) || beforeId < 1)) {
    throw new Error('Invalid history cursor');
  }
  const predicate = beforeId !== undefined ? 'WHERE id < ?' : options.before ? 'WHERE timestamp < ?' : '';
  const args: (string | number)[] = beforeId !== undefined ? [beforeId] : options.before ? [options.before] : [];
  const rows = db.prepare(`
    SELECT id, timestamp, app_name, key_char FROM keystrokes
    ${predicate} ORDER BY id DESC LIMIT ?
  `).all(...args, chunkSize) as Array<{ id: number; timestamp: string; app_name: string; key_char: string }>;
  if (!rows.length) return { sessions: [], hasMore: false };

  const grouped = groupSessions([...rows].reverse().map((row) => ({
    id: row.id, timestamp: row.timestamp, appName: row.app_name || 'Unknown',
    keyChar: decrypt(row.key_char || ''),
  })), idleTimeoutSecs).sort((a, b) => b.startId! - a.startId!);
  const sessions = grouped.slice(0, limit);
  const oldestSession = sessions[sessions.length - 1];
  const oldestRow = rows[rows.length - 1];
  const nextBeforeId = grouped.length > limit ? oldestSession.startId! : oldestRow.id;
  const hasMore = !!db.prepare('SELECT 1 FROM keystrokes WHERE id < ? LIMIT 1').get(nextBeforeId);
  return {
    sessions, hasMore, nextBeforeId,
    oldestTimestamp: grouped.length > limit ? oldestSession.startIso : oldestRow.timestamp,
  };
}

export function loadAllHistory(idleTimeoutSecs = 60): SessionPreview[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT timestamp, app_name, key_char
    FROM keystrokes
    ORDER BY id ASC
  `);
  const rows = stmt.all() as Array<{
    timestamp: string;
    app_name: string;
    key_char: string;
  }>;

  const decryptedRows: Array<[string, string, string]> = rows.map((r) => [
    r.timestamp,
    r.app_name || 'Unknown',
    decrypt(r.key_char),
  ]);

  return groupSessions(decryptedRows, idleTimeoutSecs).reverse();
}

export function deleteSessionEntry(startIso: string, endIso?: string, appName?: string, startId?: number, endId?: number): void {
  const db = getDatabase();
  if (Number.isSafeInteger(startId) && Number.isSafeInteger(endId) && startId! > 0 && endId! >= startId! && appName) {
    db.prepare('DELETE FROM keystrokes WHERE id >= ? AND id <= ? AND app_name = ?').run(startId, endId, appName);
  } else if (startIso && endIso && appName) {
    db.prepare('DELETE FROM keystrokes WHERE timestamp >= ? AND timestamp <= ? AND app_name = ?')
      .run(startIso, endIso, appName);
  } else if (startIso && endIso) {
    db.prepare('DELETE FROM keystrokes WHERE timestamp >= ? AND timestamp <= ?')
      .run(startIso, endIso);
  } else if (startIso && appName) {
    db.prepare('DELETE FROM keystrokes WHERE timestamp = ? AND app_name = ?')
      .run(startIso, appName);
  } else if (startIso) {
    db.prepare('DELETE FROM keystrokes WHERE timestamp = ?')
      .run(startIso);
  }
}

export function clearHistory(): void {
  const db = getDatabase();
  db.prepare('DELETE FROM keystrokes').run();
  // Avoid an exclusive, full-file VACUUM on the Electron UI thread.
}
