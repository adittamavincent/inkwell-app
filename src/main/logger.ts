import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_LOG_FILES = 3;
const HEARTBEAT_INTERVAL_MS = 20_000; // 20 seconds

function getDefaultLogDir(): string {
  if (process.env.INKWELL_LOG_DIR) {
    return process.env.INKWELL_LOG_DIR;
  }
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
    return path.join(os.tmpdir(), 'inkwell-test-logs');
  }
  return path.join(os.homedir(), 'Library', 'Logs', 'Inkwell');
}

let currentLogDir = getDefaultLogDir();
let currentLogFile = path.join(currentLogDir, 'inkwell.log');
let currentHeartbeatFile = path.join(currentLogDir, 'heartbeat.json');

const runId = `${process.pid}-${Date.now().toString(36)}`;
const startedAt = Date.now();
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let isCleanShutdown = false;

function ensureLogDir(): void {
  if (!fs.existsSync(currentLogDir)) {
    try {
      fs.mkdirSync(currentLogDir, { recursive: true });
    } catch {
      // Cannot create log dir — non-critical fallback
    }
  }
}

function rotateIfNeeded(): void {
  try {
    if (!fs.existsSync(currentLogFile)) return;
    const stats = fs.statSync(currentLogFile);
    if (stats.size > MAX_LOG_SIZE) {
      for (let i = MAX_LOG_FILES - 1; i >= 1; i--) {
        const from = path.join(currentLogDir, `inkwell.${i}.log`);
        const to = path.join(currentLogDir, `inkwell.${i + 1}.log`);
        if (fs.existsSync(from)) {
          if (i + 1 >= MAX_LOG_FILES) {
            fs.unlinkSync(from);
          } else {
            fs.renameSync(from, to);
          }
        }
      }
      fs.renameSync(currentLogFile, path.join(currentLogDir, 'inkwell.1.log'));
    }
  } catch {
    // Rotation failure is non-critical
  }
}

function timestamp(): string {
  return new Date().toISOString();
}

function serializeData(data: unknown): unknown {
  if (data instanceof Error) {
    const errorObj: Record<string, unknown> = {
      name: data.name,
      message: data.message,
      stack: data.stack,
    };
    if (data.cause) {
      errorObj.cause = serializeData(data.cause);
    }
    for (const key of Object.keys(data)) {
      if (!(key in errorObj)) {
        errorObj[key] = (data as unknown as Record<string, unknown>)[key];
      }
    }
    return errorObj;
  }
  if (typeof data === 'bigint') {
    return data.toString();
  }
  if (typeof data === 'function') {
    return `[Function: ${data.name || 'anonymous'}]`;
  }
  return data;
}

function writeSync(level: string, component: string, message: string, data?: unknown): void {
  ensureLogDir();
  rotateIfNeeded();

  const uptimeMs = Math.round(process.uptime() * 1000);
  let line = `${timestamp()} [${level}] [${component}] [pid=${process.pid} run=${runId} uptimeMs=${uptimeMs}] ${message}`;

  if (data !== undefined) {
    try {
      line += ` | ${JSON.stringify(serializeData(data))}`;
    } catch {
      line += ` | [unserializable]`;
    }
  }

  // Synchronous atomic write directly to filesystem.
  // This guarantees that any log statement before a process crash, SIGTERM, or quit
  // is physically persisted on disk immediately with no buffering loss.
  try {
    fs.appendFileSync(currentLogFile, line + '\n', 'utf8');
  } catch (err) {
    // If writing to file fails (e.g. read-only filesystem), fallback to stderr
    console.error('Inkwell: Failed to write to log file:', err);
  }
}

// ── Heartbeat mechanism (unclean-shutdown & crash detection) ────────────────

interface HeartbeatPayload {
  runId: string;
  pid: number;
  lastHeartbeatAt: string;
  cleanShutdown?: boolean;
  shutdownReason?: string;
  shutdownAt?: string;
  uptimeSeconds?: number;
  lastError?: unknown;
}

function writeHeartbeatFile(extra?: Partial<HeartbeatPayload>): void {
  try {
    ensureLogDir();
    const payload: HeartbeatPayload = {
      runId,
      pid: process.pid,
      lastHeartbeatAt: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      ...extra,
    };
    fs.writeFileSync(currentHeartbeatFile, JSON.stringify(payload, null, 2), 'utf-8');
  } catch {
    // Heartbeat failure must never affect the app
  }
}

function startHeartbeat(): void {
  if (heartbeatTimer) return;
  writeHeartbeatFile({ cleanShutdown: false });
  heartbeatTimer = setInterval(() => {
    writeHeartbeatFile({ cleanShutdown: false });
  }, HEARTBEAT_INTERVAL_MS);
}

function stopHeartbeat(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function readPreviousHeartbeat(): HeartbeatPayload | null {
  try {
    if (!fs.existsSync(currentHeartbeatFile)) return null;
    const raw = fs.readFileSync(currentHeartbeatFile, 'utf-8');
    return JSON.parse(raw) as HeartbeatPayload;
  } catch {
    return null;
  }
}

export const logger = {
  info(component: string, message: string, data?: unknown): void {
    writeSync('INFO', component, message, data);
    if (process.env.NODE_ENV !== 'production' && !process.env.VITEST) {
      console.log(`Inkwell [${component}]: ${message}`, data !== undefined ? data : '');
    }
  },

  warn(component: string, message: string, data?: unknown): void {
    writeSync('WARN', component, message, data);
    console.warn(`Inkwell [${component}]: ${message}`, data !== undefined ? data : '');
  },

  error(component: string, message: string, data?: unknown): void {
    writeSync('ERROR', component, message, data);
    console.error(`Inkwell [${component}]: ${message}`, data !== undefined ? data : '');
  },

  debug(component: string, message: string, data?: unknown): void {
    writeSync('DEBUG', component, message, data);
    if (process.env.NODE_ENV !== 'production' && !process.env.VITEST) {
      console.debug(`Inkwell [${component}]: ${message}`, data !== undefined ? data : '');
    }
  },

  /**
   * Log an explicit shutdown event and persist clean shutdown state.
   */
  logShutdown(reason: string, details?: unknown): void {
    if (isCleanShutdown) return;
    isCleanShutdown = true;
    const uptimeSec = Math.round(process.uptime());
    writeSync('INFO', 'lifecycle', `Shutting down (reason: ${reason}, uptime: ${uptimeSec}s)`, details);
    writeHeartbeatFile({
      cleanShutdown: true,
      shutdownReason: reason,
      shutdownAt: new Date().toISOString(),
      uptimeSeconds: uptimeSec,
    });
    stopHeartbeat();
  },

  /**
   * Record a fatal crash or unhandled exception immediately before exit.
   */
  recordCrash(error: unknown, context = 'fatal-crash'): void {
    const serialized = serializeData(error);
    writeSync('FATAL', 'main', `Fatal crash encountered (${context})`, serialized);
    writeHeartbeatFile({
      cleanShutdown: false,
      shutdownReason: context,
      shutdownAt: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      lastError: serialized,
    });
    stopHeartbeat();
  },

  /**
   * Flushes logs and stops timers. Synchronous and safe on process exit.
   */
  close(): void {
    stopHeartbeat();
  },

  /**
   * Stop the heartbeat and write a clean-shutdown marker.
   */
  writeCleanShutdown(reason = 'clean-exit'): void {
    this.logShutdown(reason);
  },

  /**
   * Start periodic heartbeat writer.
   */
  startHeartbeat(): void {
    startHeartbeat();
  },

  /**
   * Check if the previous run ended uncleanly and log findings.
   */
  checkPreviousRun(): void {
    const prev = readPreviousHeartbeat();
    if (prev && typeof prev.runId === 'string' && prev.runId !== runId) {
      if (!prev.cleanShutdown) {
        writeSync(
          'ERROR',
          'lifecycle',
          'Previous session ended unexpectedly (unclean shutdown / crash detected)',
          {
            previousRunId: prev.runId,
            previousPid: prev.pid,
            lastHeartbeatAt: prev.lastHeartbeatAt,
            lastError: prev.lastError,
          }
        );
      } else {
        writeSync('INFO', 'lifecycle', 'Previous session exited cleanly', {
          previousRunId: prev.runId,
          previousPid: prev.pid,
          shutdownAt: prev.shutdownAt || prev.lastHeartbeatAt,
          shutdownReason: prev.shutdownReason || 'unknown',
        });
      }
    }
    // Initialize heartbeat for current run
    writeHeartbeatFile({ cleanShutdown: false });
  },

  /**
   * Log startup information.
   */
  logStartup(details: Record<string, unknown>): void {
    writeSync('INFO', 'main', 'Inkwell process initialized', {
      ...details,
      run: this.getRunContext(),
    });
  },

  /** Returns the log file path for display to the user. */
  getLogPath(): string {
    return currentLogFile;
  },

  /** Returns the directory where logs are kept. */
  getLogDir(): string {
    return currentLogDir;
  },

  /** Override log directory (primarily for test isolation). */
  setLogDir(dir: string): void {
    currentLogDir = dir;
    currentLogFile = path.join(currentLogDir, 'inkwell.log');
    currentHeartbeatFile = path.join(currentLogDir, 'heartbeat.json');
    ensureLogDir();
  },

  getRunContext(): { runId: string; pid: number; startedAt: string } {
    return { runId, pid: process.pid, startedAt: new Date(startedAt).toISOString() };
  },
};
