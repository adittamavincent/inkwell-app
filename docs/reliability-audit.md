# Reliability audit — 2026-09-19

The audit covered the tray/application lifecycle, capture queue, permission polling, active-app helper, SQLite history, settings persistence, Obsidian sync, preload bridge, and renderer loading/scrolling. Changes are in source and compiled output; the installed app has not been replaced.

## Fixes

| Area | Fault and change | Evidence |
| --- | --- | --- |
| Menu bar | Removed the window visibility/activation toggle competing with the native tray menu. Retained the window opener across menu refreshes, avoided rebuilding unchanged menus, and guarded destroyed windows. | Four tray regression tests. The reported macOS click failure still needs native verification. |
| Background startup | The permission watcher was imported but never started. It now starts at launch and retries transient capture startup failures. | Source trace; permission and capture tests. |
| Sleep, screen lock, pause | Wake/unlock previously resumed manually paused capture. Separate user intent and sleep/lock blockers now govern capture. Sync runs independently of capture. | Capture lifecycle regression tests. |
| Memory guard | Removed automatic relaunch based on macOS free memory. Existing logs repeatedly raised alarms while process RSS was around 64–97 MB. Process memory monitoring remains. | Existing log records and source trace. |
| Active-app tracking | Added a two-second native-helper timeout, ignored results arriving after tracker shutdown, deduplicated concurrent icon requests, and corrected Inkwell's cached identity. | Three helper regression tests. |
| Capture delivery | A failed renderer send no longer aborts delivery to other windows. Paste resolution belongs to its queued item. Stop flushes queued keys and resets modifiers. | Queue and destroyed-renderer tests. |
| Storage failure | Failed inserts pause capture, retain queued keys, and retry after two seconds. A backend error reaches the UI; recovery does not silently re-enable capture. Database initialization failure leaves the tray/UI available. | Storage retry regression test; startup source trace. |
| History | Added bounded row-ID pagination, including control-only pages and equal timestamps. Deleted sessions use row-ID ranges when available. Removed synchronous VACUUM from Clear History. | SQLite regression tests, using an isolated in-memory database. |
| Renderer history | Added an immediate in-flight guard and request generations, so repeated scroll events do not fan out requests and stale responses cannot restore cleared/deleted history. Live sessions retain their deletion range. | Type checking; desktop smoke test supplied but execution blocked. |
| Scrolling and long sessions | Fixed flex minimum heights, added a manual older-history button for short/empty pages, preserved live-feed scroll position when reading earlier text, limited live reconstruction buffers, and deferred offscreen rendering. Hidden windows skip live reconstruction and refresh on return. | Build/type checks; visual behavior remains unverified. |
| Renderer recovery | Added a React error boundary, visible connection/loading failures, IPC rejection feedback, and up to three renderer-process reload attempts. | Build/type checks; native crash injection remains unverified. |
| Settings | Validate config values; persist by temporary-file rename before committing in-memory state. Failed writes are reported instead of returning success. Preserve explicitly excluded apps. | Three settings regression tests. |
| Obsidian sync | Query at most 5,000 rows per pass, checkpoint by row ID while reading legacy timestamp checkpoints, append without reading the entire note, and report DB/checkpoint failures. | Sync and SQLite batch regression tests. |
| Test runtime | Run Vitest under Electron's matching Node ABI. Repository tests now actually use their in-memory DB; crypto/sync tests avoid real keys/checkpoints. | Standard `npm test` passes. |

## Validation

- `npm test`: **73 tests passed across 13 files**.
- `npm run compile`: TypeScript, renderer build, main-process build, and preload build passed.
- `git diff --check`: passed.
- Repaired the incomplete local Electron 33.2.1 dependency using its existing cached distribution and restored its executable-path metadata. This is a local dependency repair, not a source dependency upgrade.
- Added `npm run test:smoke` for a disposable Electron window using synthetic IPC data and the actual compiled renderer/preload. It checks header actions, scroll geometry, settings failures, history retry, concurrent scroll requests, and the clear/load race. It requires a build first.

## Limits and remaining risks

The native smoke attempt terminated with SIGABRT before a window opened. Localhost serving was denied with EPERM, and the browser URL policy rejected the local-file fixture. No native menu-click, sleep/wake, renderer crash-injection, or long-duration desktop result is claimed. Packaging, installing, and release verification were not performed.

A hard OS kill or native-addon crash cannot be caught by these JavaScript guards. Pending keys during a storage outage remain in memory until persistence succeeds. SQLite and sync file operations still execute synchronously; requests are bounded, but a stalled filesystem can still delay the main process. Very long sessions may span bounded history/sync batches. Sync note append and checkpoint persistence are separate writes; interruption between them can duplicate the last batch on retry. These need separate fault-injection and soak testing before claiming uninterrupted operation.
