import { describe, it, expect } from 'vitest';
import { groupSessions } from '../src/main/sync/sessionGrouper';

describe('groupSessions', () => {
  it('groups continuous typing within idle window into a single session even over long duration', () => {
    // 5 keys spaced 10 seconds apart (total 40s), idle window 60s
    const rows = [
      ['2026-08-30T10:00:00Z', 'Notes', 'h'],
      ['2026-08-30T10:00:10Z', 'Notes', 'e'],
      ['2026-08-30T10:00:20Z', 'Notes', 'l'],
      ['2026-08-30T10:00:30Z', 'Notes', 'l'],
      ['2026-08-30T10:00:40Z', 'Notes', 'o'],
    ] as [string, string, string][];

    const sessions = groupSessions(rows, 60);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].app).toBe('Notes');
    expect(sessions[0].text).toBe('hello');
  });

  it('splits into a new session when gap exceeds idle timeout', () => {
    const rows = [
      ['2026-08-30T10:00:00Z', 'Code', 'a'],
      ['2026-08-30T10:00:10Z', 'Code', 'b'],
      // Gap of 70s (> 60s)
      ['2026-08-30T10:01:20Z', 'Code', 'c'],
      ['2026-08-30T10:01:25Z', 'Code', 'd'],
    ] as [string, string, string][];

    const sessions = groupSessions(rows, 60);
    expect(sessions).toHaveLength(2);
    expect(sessions[0].text).toBe('ab');
    expect(sessions[1].text).toBe('cd');
  });

  it('immediately splits sessions on any app switch even on a quick round-trip', () => {
    const rows = [
      ['2026-08-30T10:00:00Z', 'VSCode', 'h'],
      ['2026-08-30T10:00:01Z', 'VSCode', 'e'],
      ['2026-08-30T10:00:02Z', 'VSCode', 'l'],
      // Single keystroke in Slack 1s later
      ['2026-08-30T10:00:03Z', 'Slack', 'k'],
      // Back to VSCode 2s later
      ['2026-08-30T10:00:05Z', 'VSCode', 'l'],
      ['2026-08-30T10:00:06Z', 'VSCode', 'o'],
    ] as [string, string, string][];

    const sessions = groupSessions(rows, 60);
    expect(sessions).toHaveLength(3);
    expect(sessions[0].app).toBe('VSCode');
    expect(sessions[0].text).toBe('hel');
    expect(sessions[1].app).toBe('Slack');
    expect(sessions[1].text).toBe('k');
    expect(sessions[2].app).toBe('VSCode');
    expect(sessions[2].text).toBe('lo');
  });

  it('splits into separate sessions when switching permanently to another app', () => {
    const rows = [
      ['2026-08-30T10:00:00Z', 'Slack', 'h'],
      ['2026-08-30T10:00:01Z', 'Slack', 'i'],
      ['2026-08-30T10:00:02Z', 'Chrome', 'g'],
      ['2026-08-30T10:00:03Z', 'Chrome', 'o'],
    ] as [string, string, string][];

    const sessions = groupSessions(rows, 60);
    expect(sessions).toHaveLength(2);
    expect(sessions[0].app).toBe('Slack');
    expect(sessions[0].text).toBe('hi');
    expect(sessions[1].app).toBe('Chrome');
    expect(sessions[1].text).toBe('go');
  });

  it('preserves spaces and word separations across typing stream', () => {
    const rows = [
      ['2026-08-30T10:00:00Z', 'Obsidian', 'I'],
      ['2026-08-30T10:00:01Z', 'Obsidian', 'n'],
      ['2026-08-30T10:00:02Z', 'Obsidian', 'k'],
      ['2026-08-30T10:00:03Z', 'Obsidian', 'w'],
      ['2026-08-30T10:00:04Z', 'Obsidian', 'e'],
      ['2026-08-30T10:00:05Z', 'Obsidian', 'l'],
      ['2026-08-30T10:00:06Z', 'Obsidian', 'l'],
      ['2026-08-30T10:00:07Z', 'Obsidian', ' '],
      ['2026-08-30T10:00:08Z', 'Obsidian', 'a'],
      ['2026-08-30T10:00:09Z', 'Obsidian', 'p'],
      ['2026-08-30T10:00:10Z', 'Obsidian', 'p'],
    ] as [string, string, string][];

    const sessions = groupSessions(rows, 60);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].text).toBe('Inkwell app');
    expect(sessions[0].startIso).toBe('2026-08-30T10:00:00Z');
    expect(sessions[0].endIso).toBe('2026-08-30T10:00:10Z');
  });

  it('commits active session to history when left click ([CLICK]) or select-all ([⌘A]) occurs', () => {
    const rows = [
      ['2026-08-30T10:00:00Z', 'Notes', 'f'],
      ['2026-08-30T10:00:01Z', 'Notes', 'i'],
      ['2026-08-30T10:00:02Z', 'Notes', 'r'],
      ['2026-08-30T10:00:03Z', 'Notes', 's'],
      ['2026-08-30T10:00:04Z', 'Notes', 't'],
      // Left click repositions cursor
      ['2026-08-30T10:00:05Z', 'Notes', '[CLICK]'],
      ['2026-08-30T10:00:06Z', 'Notes', 's'],
      ['2026-08-30T10:00:07Z', 'Notes', 'e'],
      ['2026-08-30T10:00:08Z', 'Notes', 'c'],
      ['2026-08-30T10:00:09Z', 'Notes', 'o'],
      ['2026-08-30T10:00:10Z', 'Notes', 'n'],
      ['2026-08-30T10:00:11Z', 'Notes', 'd'],
      // Cmd+A selects all
      ['2026-08-30T10:00:12Z', 'Notes', '[⌘A]'],
      ['2026-08-30T10:00:13Z', 'Notes', 't'],
      ['2026-08-30T10:00:14Z', 'Notes', 'h'],
      ['2026-08-30T10:00:15Z', 'Notes', 'i'],
      ['2026-08-30T10:00:16Z', 'Notes', 'r'],
      ['2026-08-30T10:00:17Z', 'Notes', 'd'],
    ] as [string, string, string][];

    const sessions = groupSessions(rows, 60);
    expect(sessions).toHaveLength(3);
    expect(sessions[0].text).toBe('first');
    expect(sessions[1].text).toBe('second');
    expect(sessions[2].text).toBe('third');
  });
});
