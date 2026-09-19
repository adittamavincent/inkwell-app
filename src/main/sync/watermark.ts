import fs from 'node:fs';
import path from 'node:path';
import { getAppDataDir } from '../db/crypto';

function getLastSyncPath(): string {
  return path.join(getAppDataDir(), 'last_sync.txt');
}
function readCheckpoint(): { timestamp: string; id?: number } | null {
  try {
    const text = fs.readFileSync(getLastSyncPath(), 'utf8').trim();
    const value = text.startsWith('{') ? JSON.parse(text) : { timestamp: text };
    if (!Number.isFinite(new Date(value.timestamp).getTime())) return null;
    return { timestamp: value.timestamp, id: Number.isSafeInteger(value.id) && value.id > 0 ? value.id : undefined };
  } catch { return null; }
}
export function getLastSync(): Date | null {
  const checkpoint = readCheckpoint();
  return checkpoint ? new Date(checkpoint.timestamp) : null;
}
export function getLastSyncId(): number | undefined {
  return readCheckpoint()?.id;
}
export function writeLastSync(date: Date, id?: number): void {
  const p = getLastSyncPath();
  fs.writeFileSync(`${p}.tmp`, JSON.stringify({ timestamp: date.toISOString(), id }), 'utf8');
  fs.renameSync(`${p}.tmp`, p);
}
