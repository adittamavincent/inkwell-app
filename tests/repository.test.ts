import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
vi.mock('../src/main/db/crypto', () => ({ encrypt: (s: string) => s, decrypt: (s: string) => s }));
vi.mock('../src/main/db/connection', async (original) => {
  const actual = await original<typeof import('../src/main/db/connection')>();
  return { ...actual, getDatabase: () => (globalThis as any).__inkwell_test_db };
});
import { initSchema } from '../src/main/db/connection';
import {
  insertKeystroke,
  querySessionsSince,
  deleteSessionEntry,
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
    db?.close();
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
  it('advances through click-only pages without losing older text', () => {
    insertKeystroke('2026-09-01T00:00:00Z', 'Notes', 'h', 0);
    for (let i = 0; i < 2100; i++) insertKeystroke('2026-09-02T00:00:00Z', 'Notes', '[CLICK]', 0);
    const first = loadHistoryPaginated({ limit: 1 });
    expect(first.sessions).toEqual([]);
    expect(first.hasMore).toBe(true);
    const second = loadHistoryPaginated({ limit: 1, beforeId: first.nextBeforeId });
    expect(second.sessions[0].text).toBe('h');
    expect(second.hasMore).toBe(false);
  });

  it('does not skip or repeat sessions that share a timestamp', () => {
    for (const app of ['A', 'B', 'C']) insertKeystroke('2026-09-01T00:00:00Z', app, app, 0);
    const seen: string[] = [];
    let beforeId: number | undefined;
    for (let page = 0; page < 3; page++) {
      const result = loadHistoryPaginated({ limit: 1, beforeId });
      seen.push(...result.sessions.map((s) => s.text));
      beforeId = result.nextBeforeId;
      expect(result.hasMore).toBe(page < 2);
    }
    expect(seen).toEqual(['C', 'B', 'A']);
  });

  it('bounds invalid limits and rejects invalid cursors', () => {
    insertKeystroke('2026-09-01T00:00:00Z', 'Notes', 'h', 0);
    expect(loadHistoryPaginated({ limit: Infinity }).sessions).toHaveLength(1);
    expect(loadHistoryPaginated({ limit: 0 }).sessions).toHaveLength(1);
    expect(() => loadHistoryPaginated({ beforeId: NaN })).toThrow('Invalid history cursor');
  });

  it('batches sync by ID without losing equal-timestamp rows', () => {
    for (let i = 0; i < 5002; i++) insertKeystroke('2026-09-01T00:00:00Z', 'Notes', 'a', 0);
    const first = querySessionsSince('2026-08-01T00:00:00Z');
    expect(first).toHaveLength(5000);
    const second = querySessionsSince('2026-08-01T00:00:00Z', first.at(-1)![3]);
    expect(second).toHaveLength(2);
    expect(second[0][3]).toBeGreaterThan(first.at(-1)![3]);
  });

  it('deletes only the selected session when timestamps collide', () => {
    const first = insertKeystroke('2026-09-01T00:00:00Z', 'Notes', 'a', 0);
    insertKeystroke('2026-09-01T00:00:00Z', 'Notes', '[CLICK]', 0);
    insertKeystroke('2026-09-01T00:00:00Z', 'Notes', 'b', 0);
    deleteSessionEntry('2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z', 'Notes', first, first);
    expect(loadHistoryPaginated().sessions.map(s => s.text)).toEqual(['b']);
  });

});
