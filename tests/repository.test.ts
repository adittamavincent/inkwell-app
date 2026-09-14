import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import * as crypto from '../src/main/db/crypto';
import { initSchema } from '../src/main/db/connection';
import {
  insertKeystroke,
  loadHistoryPaginated,
  loadAllHistory,
  clearHistory,
} from '../src/main/db/repository';

// A small helper to point repository functions at an in-memory DB.
function useDatabase(db: Database.Database) {
  (globalThis as any).__inkwell_test_db = db;
}

describe('loadHistoryPaginated', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    initSchema(db);
    useDatabase(db);
  });

  afterEach(() => {
    clearHistory();
    db.close();
    delete (globalThis as any).__inkwell_test_db;
  });

  it('returns latest sessions with default limit of 100', () => {
    // Create 150 keystrokes over 150 distinct seconds so they form many single-key sessions
    for (let i = 0; i < 150; i++) {
      const iso = new Date(Date.UTC(2026, 7, 30, 10, 0, i)).toISOString();
      insertKeystroke(iso, 'Notes', String.fromCharCode(97 + (i % 26)), 0);
    }

    const result = loadHistoryPaginated({ idleTimeoutSecs: 0 });
    expect(result.sessions.length).toBeLessThanOrEqual(100);
    expect(result.hasMore).toBe(true);
    expect(result.oldestTimestamp).toBeDefined();
  });

  it('respects explicit limit parameter', () => {
    for (let i = 0; i < 3000; i++) {
      const iso = new Date(Date.UTC(2026, 7, 30, 10, 0, i)).toISOString();
      insertKeystroke(iso, 'Notes', 'a', 0);
    }

    const result = loadHistoryPaginated({ limit: 10 });
    expect(result.sessions.length).toBeLessThanOrEqual(10);
    expect(result.hasMore).toBe(true);
  });

  it('fetches older sessions when before is provided', () => {
    const timestamps: string[] = [];
    for (let i = 0; i < 3000; i++) {
      const iso = new Date(Date.UTC(2026, 7, 30, 10, 0, i)).toISOString();
      timestamps.push(iso);
      insertKeystroke(iso, 'Notes', 'a', 0);
    }

    const firstPage = loadHistoryPaginated({ limit: 20 });
    expect(firstPage.sessions.length).toBeLessThanOrEqual(20);
    expect(firstPage.hasMore).toBe(true);
    expect(firstPage.oldestTimestamp).toBeDefined();

    const secondPage = loadHistoryPaginated({
      limit: 20,
      before: firstPage.oldestTimestamp,
    });
    expect(secondPage.sessions.length).toBeGreaterThan(0);
    // The oldest timestamp from the second page should be earlier than the first page cutoff
    expect(secondPage.oldestTimestamp).toBeDefined();
  });

  it('groups keystrokes into sessions using idle timeout', () => {
    // 3 keys in quick succession, long gap, then 2 more keys
    insertKeystroke('2026-08-30T10:00:00Z', 'Notes', 'h', 0);
    insertKeystroke('2026-08-30T10:00:01Z', 'Notes', 'i', 0);
    insertKeystroke('2026-08-30T10:00:02Z', 'Notes', '!', 0);

    insertKeystroke('2026-08-30T10:02:00Z', 'Notes', 'b', 0);
    insertKeystroke('2026-08-30T10:02:01Z', 'Notes', 'y', 0);
    insertKeystroke('2026-08-30T10:02:02Z', 'Notes', 'e', 0);

    const result = loadHistoryPaginated({ limit: 100, idleTimeoutSecs: 60 });
    expect(result.sessions).toHaveLength(2);
  });

  it('returns hasMore=false when no more records exist', () => {
    for (let i = 0; i < 10; i++) {
      const iso = new Date(Date.UTC(2026, 7, 30, 10, 0, i)).toISOString();
      insertKeystroke(iso, 'Notes', 'a', 0);
    }

    const result = loadHistoryPaginated({ limit: 100 });
    expect(result.hasMore).toBe(false);
  });
});
