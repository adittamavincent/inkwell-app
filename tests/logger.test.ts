import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { logger } from '../src/main/logger';

describe('Logger system', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'inkwell-logger-test-'));
    logger.setLogDir(tempDir);
  });

  afterEach(() => {
    logger.close();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  it('synchronously persists log entries immediately to disk without buffering delay', () => {
    const logFile = logger.getLogPath();
    expect(fs.existsSync(logFile)).toBe(false);

    logger.info('testComponent', 'Immediate persist test message', { foo: 'bar', count: 42 });

    expect(fs.existsSync(logFile)).toBe(true);
    const content = fs.readFileSync(logFile, 'utf8');
    expect(content).toContain('[INFO]');
    expect(content).toContain('[testComponent]');
    expect(content).toContain('Immediate persist test message');
    expect(content).toContain('"foo":"bar"');
    expect(content).toContain('"count":42');
  });

  it('correctly serializes Error instances including stack traces and causes', () => {
    const logFile = logger.getLogPath();
    const innerError = new Error('Root cause details');
    const outerError = new Error('Top level failure', { cause: innerError });

    logger.error('crashHandler', 'Something went terribly wrong', outerError);

    const content = fs.readFileSync(logFile, 'utf8');
    expect(content).toContain('[ERROR]');
    expect(content).toContain('[crashHandler]');
    expect(content).toContain('Top level failure');
    expect(content).toContain('Root cause details');
    expect(content).toContain('Error: Top level failure');
  });

  it('records clean shutdown in heartbeat and log file', () => {
    const logFile = logger.getLogPath();
    const heartbeatFile = path.join(tempDir, 'heartbeat.json');

    logger.startHeartbeat();
    logger.logShutdown('user-tray-quit', { custom: 'data' });

    // Verify log file has shutdown entry
    const logContent = fs.readFileSync(logFile, 'utf8');
    expect(logContent).toContain('[lifecycle]');
    expect(logContent).toContain('Shutting down (reason: user-tray-quit');
    expect(logContent).toContain('"custom":"data"');

    // Verify heartbeat file has cleanShutdown true
    expect(fs.existsSync(heartbeatFile)).toBe(true);
    const heartbeat = JSON.parse(fs.readFileSync(heartbeatFile, 'utf8'));
    expect(heartbeat.cleanShutdown).toBe(true);
    expect(heartbeat.shutdownReason).toBe('user-tray-quit');
    expect(typeof heartbeat.shutdownAt).toBe('string');
  });

  it('records fatal crashes in both log file and heartbeat', () => {
    const logFile = logger.getLogPath();
    const heartbeatFile = path.join(tempDir, 'heartbeat.json');
    const crash = new TypeError('Cannot read properties of undefined');

    logger.recordCrash(crash, 'uncaughtException');

    const logContent = fs.readFileSync(logFile, 'utf8');
    expect(logContent).toContain('[FATAL]');
    expect(logContent).toContain('Fatal crash encountered (uncaughtException)');
    expect(logContent).toContain('Cannot read properties of undefined');

    const heartbeat = JSON.parse(fs.readFileSync(heartbeatFile, 'utf8'));
    expect(heartbeat.cleanShutdown).toBe(false);
    expect(heartbeat.shutdownReason).toBe('uncaughtException');
    expect(heartbeat.lastError.message).toContain('Cannot read properties of undefined');
  });

  it('detects and logs unclean shutdown from previous session', () => {
    const logFile = logger.getLogPath();
    const heartbeatFile = path.join(tempDir, 'heartbeat.json');

    // Simulate a previous crashed run
    fs.writeFileSync(
      heartbeatFile,
      JSON.stringify({
        runId: 'crashed-run-999',
        pid: 99999,
        lastHeartbeatAt: '2026-09-08T12:00:00.000Z',
        cleanShutdown: false,
        lastError: { message: 'SIGKILL or sudden power loss' },
      }),
      'utf8'
    );

    logger.checkPreviousRun();

    const logContent = fs.readFileSync(logFile, 'utf8');
    expect(logContent).toContain('Previous session ended unexpectedly (unclean shutdown / crash detected)');
    expect(logContent).toContain('crashed-run-999');
    expect(logContent).toContain('99999');
  });

  it('rotates log file when it exceeds MAX_LOG_SIZE', () => {
    const logFile = logger.getLogPath();
    const rotatedFile1 = path.join(tempDir, 'inkwell.1.log');

    // Write dummy data slightly exceeding 5MB
    const largeBuffer = Buffer.alloc(5 * 1024 * 1024 + 100, 'A');
    fs.writeFileSync(logFile, largeBuffer);

    // Trigger log write which should trigger rotation
    logger.info('rotation', 'This should go into the fresh inkwell.log after rotation');

    expect(fs.existsSync(rotatedFile1)).toBe(true);
    expect(fs.statSync(rotatedFile1).size).toBeGreaterThanOrEqual(5 * 1024 * 1024);

    const freshContent = fs.readFileSync(logFile, 'utf8');
    expect(freshContent).toContain('This should go into the fresh inkwell.log after rotation');
  });
});
