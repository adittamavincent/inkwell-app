import { app } from 'electron';

let isQuitting = false;
let quitReason = 'user-quit';

export function getIsQuitting(): boolean {
  return isQuitting;
}

export function setIsQuitting(val: boolean): void {
  isQuitting = val;
}

export function getQuitReason(): string {
  return quitReason;
}

export function requestQuit(reason = 'user-quit'): void {
  isQuitting = true;
  quitReason = reason;
  app.quit();
}

/**
 * Resets internal state for unit testing purposes.
 */
export function _resetLifecycleForTesting(): void {
  isQuitting = false;
  quitReason = 'user-quit';
}
