import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { LiveFeed } from './components/LiveFeed';
import { SessionHistory } from './components/SessionHistory';
import { SettingsDrawer } from './components/SettingsDrawer';
import { PermissionBanner } from './components/PermissionBanner';
import { PermissionGate } from './components/PermissionGate';
import { SessionPreview, KeystrokePayload, SyncResponse, PermissionStatus } from './types';
import type { GetHistoryParams } from '@preload/index';
import { reconstructText, stripChipMarkers } from '../../shared/reconstructor';
import { DEFAULT_CONFIG, CogdexSyncConfig } from '../../shared/constants';

export const App: React.FC = () => {
  const [isRunning, setIsRunning] = useState(true);
  const [permissions, setPermissions] = useState<PermissionStatus | null>(null);
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const [detectedApp, setDetectedApp] = useState<string>('');
  const [detectedAppIcon, setDetectedAppIcon] = useState<string | null>(null);
  const [appIcons, setAppIcons] = useState<Record<string, string | null>>({});
  const [config, setConfig] = useState<CogdexSyncConfig>(DEFAULT_CONFIG);
  const [history, setHistory] = useState<SessionPreview[]>([]);
  const [hasMoreHistory, setHasMoreHistory] = useState<boolean>(true);
  const [isFetchingMoreHistory, setIsFetchingMoreHistory] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const historyCursor = useRef<number>();
  const historyLoading = useRef(false);
  const historyGeneration = useRef(0);
  const requestedIcons = useRef(new Set<string>());

  useEffect(() => {
    const report = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      console.error('Inkwell operation failed:', event.reason);
      setError('The operation failed. Please try again.');
    };
    window.addEventListener('unhandledrejection', report);
    return () => window.removeEventListener('unhandledrejection', report);
  }, []);

  const fetchIcon = useCallback((appName: string) => {
    if (!appName || appName === 'Unknown') return;
    if (requestedIcons.current.has(appName)) return;
    requestedIcons.current.add(appName);
    void window.inkwellApi?.getAppIcon?.(appName).then((icon) => {
      setAppIcons((current) => ({ ...current, [appName]: icon }));
    }).catch(() => { requestedIcons.current.delete(appName); });
  }, []);

  const handleActiveAppInfo = useCallback((data: any) => {
    const name = typeof data === 'string' ? data : data?.name || '';
    const icon = typeof data === 'object' ? data?.icon || null : null;
    setDetectedApp(name);
    setDetectedAppIcon(icon);
    if (name) {
      if (icon) {
        setAppIcons((prev) => ({ ...prev, [name]: icon }));
      } else {
        fetchIcon(name);
      }
    }
  }, [fetchIcon]);

  // In-progress live typing session (React state for UI render)
  const [liveTokens, setLiveTokens] = useState<string[]>([]);
  const [liveApp, setLiveApp] = useState<string>('');
  const [liveStart, setLiveStart] = useState<string | null>(null);
  const [liveText, setLiveText] = useState<string>('');

  // Mutable live state refs to prevent any React async race conditions & dropped tokens
  const configRef = useRef(config);
  configRef.current = config;
  const liveTokensRef = useRef<string[]>([]);
  const liveAppRef = useRef<string>('');
  const liveStartRef = useRef<string | null>(null);
  const lastKeyTimeRef = useRef<number>(0);
  const liveBufferSize = useRef(0);
  const liveEndRef = useRef<string>();
  const liveStartIdRef = useRef<number>();
  const liveEndIdRef = useRef<number>();

  const flushLiveSession = useCallback(() => {
    if (liveTokensRef.current.length > 0) {
      const reconstructed = reconstructText(liveTokensRef.current);
      if (reconstructed.trim()) {
        const newSession: SessionPreview = {
          start: liveStartRef.current || new Date().toISOString(),
          startIso: liveStartRef.current || undefined,
          endIso: liveEndRef.current,
          startId: liveStartIdRef.current,
          endId: liveEndIdRef.current,
          app: liveAppRef.current || 'Unknown',
          text: reconstructed,
        };
        setHistory((prev) => [newSession, ...prev]);
      }
      liveStartIdRef.current = liveEndIdRef.current = undefined;
      liveEndRef.current = undefined;
      liveBufferSize.current = 0;
      liveTokensRef.current = [];
      liveAppRef.current = '';
      liveStartRef.current = null;
      setLiveTokens([]);
      setLiveText('');
      setLiveStart(null);
      setLiveApp('');
    }
  }, []);

  const handlePermissionUpdate = useCallback((status: PermissionStatus) => {
    setPermissions(status);
    const fullyAuthorized =
      status.accessibility === 'authorized' && status.inputMonitoring === 'authorized';

    if (fullyAuthorized) {
      setIsOnboarded(true);
      window.inkwellApi?.getCaptureStatus().then(setIsRunning);
    } else {
      setIsRunning(false);
      // If we haven't onboarded yet, keep onboarding gate active
      setIsOnboarded((prev) => (prev === null ? false : prev));
    }
  }, []);

  // Initial Data Fetching & Realtime Keystroke Listener
  useEffect(() => {
    if (!window.inkwellApi) return;

    let disposed = false;
    const generation = ++historyGeneration.current;
    historyLoading.current = true;
    setIsFetchingMoreHistory(true);
    void window.inkwellApi.getConfig().then((value) => { if (!disposed) setConfig(value); }).catch(() => setError('Could not load settings.'));
    void window.inkwellApi.getHistory({ limit: 100 }).then((result) => {
      if (disposed || generation !== historyGeneration.current) return;
      setHistory((prev) => [...prev, ...result.sessions]);
      historyCursor.current = result.nextBeforeId;
      setHasMoreHistory(result.hasMore);
    }).catch(() => { if (!disposed) setError('Could not load history. Try loading again.'); }).finally(() => {
      if (disposed || generation !== historyGeneration.current) return;
      historyLoading.current = false;
      setIsFetchingMoreHistory(false);
    });

    // Initial frontmost app
    window.inkwellApi.getActiveApp?.().then(handleActiveAppInfo).catch(() => setError('Could not read the active app.'));

    // Initial non-prompting permission status check
    window.inkwellApi.checkPermissions().then((status) => {
      handlePermissionUpdate(status);
      const fullyAuthorized =
        status.accessibility === 'authorized' && status.inputMonitoring === 'authorized';
      setIsOnboarded(fullyAuthorized);
    }).catch((err) => {
      console.error('Failed to check permissions:', err);
      setError('Could not check permissions. Reload to try again.');
      setIsOnboarded(false);
    });

    // Active App Changed Listener
    const unsubscribeActiveApp = window.inkwellApi.onActiveAppChanged?.(handleActiveAppInfo);

    // Keystroke Stream Listener
    const unsubscribeKeystroke = window.inkwellApi.onKeystroke((payload: KeystrokePayload) => {
      if (document.hidden) return;
      const now = Date.now();
      const idleLimitMs = (configRef.current.idleTimeoutSecs || 60) * 1000;
      const timedOut =
        lastKeyTimeRef.current > 0 && now - lastKeyTimeRef.current > idleLimitMs;

      const isBreakToken =
        payload.keyChar === '[CLICK]' ||
        payload.keyChar === '[CLICK:LEFT]' ||
        payload.keyChar === '[⌘A]';

      if (isBreakToken || timedOut ||
          (liveAppRef.current && liveAppRef.current !== payload.appName) ||
          liveTokensRef.current.length >= 5000 || liveBufferSize.current >= 50000) {
        flushLiveSession();
      }
      lastKeyTimeRef.current = now;
      if (isBreakToken) return;
      if (!liveTokensRef.current.length) {
        liveAppRef.current = payload.appName;
        liveStartRef.current = payload.timestamp;
        liveStartIdRef.current = payload.id;
      }
      liveTokensRef.current.push(payload.keyChar);
      liveBufferSize.current += payload.keyChar.length;
      liveEndRef.current = payload.timestamp;
      liveEndIdRef.current = payload.id;

      // Update React state for instant UI rendering
      const currentTokens = [...liveTokensRef.current];
      setLiveTokens(currentTokens);
      setLiveApp(liveAppRef.current);
      setLiveStart(liveStartRef.current);
      setLiveText(reconstructText(currentTokens));
    });

    const refreshOnShow = () => {
      if (document.hidden) {
        flushLiveSession();
        return;
      }
      const generation = ++historyGeneration.current;
      historyLoading.current = true;
      setIsFetchingMoreHistory(true);
      void window.inkwellApi!.getHistory({ limit: 100 }).then((result) => {
        if (disposed || generation !== historyGeneration.current) return;
        setHistory(result.sessions);
        historyCursor.current = result.nextBeforeId;
        setHasMoreHistory(result.hasMore);
      }).catch(() => setError('Could not refresh history.')).finally(() => {
        if (disposed || generation !== historyGeneration.current) return;
        historyLoading.current = false;
        setIsFetchingMoreHistory(false);
      });
    };
    document.addEventListener('visibilitychange', refreshOnShow);

    const unsubscribeBackendError = window.inkwellApi.onBackendError?.(setError);
    const unsubscribeCapture = window.inkwellApi.onCaptureStatusChanged?.(setIsRunning);

    // Main Process Permission Watcher Event Listeners
    const unsubscribeStatusChanged = window.inkwellApi.onPermissionStatusChanged?.(
      (status: PermissionStatus) => {
        handlePermissionUpdate(status);
      }
    );

    const unsubscribePermissionGranted = window.inkwellApi.onPermissionGranted?.(() => {
      window.inkwellApi?.checkPermissions().then(handlePermissionUpdate).catch((err) => {
        console.error('Failed to check permissions after grant:', err);
      });
    });

    const unsubscribePermissionRevoked = window.inkwellApi.onPermissionRevoked?.(() => {
      setIsRunning(false);
      window.inkwellApi?.checkPermissions().then(handlePermissionUpdate).catch((err) => {
        console.error('Failed to check permissions after revoke:', err);
      });
    });

    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', refreshOnShow);
      unsubscribeCapture?.();
      unsubscribeBackendError?.();
      unsubscribeActiveApp?.();
      unsubscribeKeystroke();
      unsubscribeStatusChanged?.();
      unsubscribePermissionGranted?.();
      unsubscribePermissionRevoked?.();
    };
  }, [handlePermissionUpdate, handleActiveAppInfo, flushLiveSession]);

  // Re-check permission on window focus to immediately detect in-session revocation or grant
  useEffect(() => {
    let isChecking = false;
    const checkPerm = () => {
      const api = window.inkwellApi;
      if (api && !isChecking) {
        isChecking = true;
        api.checkPermissions()
          .then(handlePermissionUpdate)
          .catch((err) => {
            console.error('Failed to check permissions on focus:', err);
          })
          .finally(() => {
            setTimeout(() => {
              isChecking = false;
            }, 500);
          });
      }
    };

    window.addEventListener('focus', checkPerm);
    return () => {
      window.removeEventListener('focus', checkPerm);
    };
  }, [handlePermissionUpdate]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (liveTokensRef.current.length && Date.now() - lastKeyTimeRef.current > configRef.current.idleTimeoutSecs * 1000) {
        flushLiveSession();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [flushLiveSession]);

  const handleLoadMoreHistory = useCallback(async () => {
    if (historyLoading.current || !hasMoreHistory || !window.inkwellApi) return;
    const generation = historyGeneration.current;
    historyLoading.current = true;
    setIsFetchingMoreHistory(true);
    try {
      const params: GetHistoryParams = { limit: 100, beforeId: historyCursor.current };
      const result = await window.inkwellApi.getHistory(params);
      if (generation !== historyGeneration.current) return;
      setHistory((prev) => [...prev, ...result.sessions]);
      historyCursor.current = result.nextBeforeId;
      setHasMoreHistory(result.hasMore);
      setError(null);
    } catch (err) {
      setError('Could not load history. Try loading again.');
    } finally {
      if (generation === historyGeneration.current) {
        historyLoading.current = false;
        setIsFetchingMoreHistory(false);
      }
    }
  }, [hasMoreHistory]);

  const handleToggleCapture = async () => {
    if (!window.inkwellApi) return;
    const nextStatus = !isRunning;
    const result = await window.inkwellApi.toggleCapture(nextStatus);
    setIsRunning(result);
  };

  const handleClearHistory = async () => {
    if (!window.inkwellApi) return;
    ++historyGeneration.current;
    historyLoading.current = false;
    setIsFetchingMoreHistory(false);
    await window.inkwellApi.clearHistory();
    historyCursor.current = undefined;
    setHasMoreHistory(false);
    liveTokensRef.current = [];
    liveBufferSize.current = 0;
    liveAppRef.current = '';
    liveStartRef.current = null;
    lastKeyTimeRef.current = 0;
    setHistory([]);
    setLiveTokens([]);
    setLiveText('');
    setLiveStart(null);
    setLiveApp('');
  };

  const handleDeleteSession = async (session: SessionPreview) => {
    if (!window.inkwellApi?.deleteSession) return;
    ++historyGeneration.current;
    historyLoading.current = false;
    setIsFetchingMoreHistory(false);
    await window.inkwellApi.deleteSession(session);
    // Use identity, since new live sessions can shift every index while IPC runs.
    setHistory((prev) => prev.filter((item) => item !== session));
  };

  const handleCopyText = async (text: string) => {
    if (!window.inkwellApi) return;
    await window.inkwellApi.copyToClipboard(stripChipMarkers(text));
  };

  const handleCopyAll = async () => {
    if (!window.inkwellApi) return;
    let fullPreview = '';
    if (liveText.trim()) {
      const timeStr = liveStart ? new Date(liveStart).toLocaleTimeString() : '';
      fullPreview += `${timeStr} · ${liveApp || 'Live'}\n${stripChipMarkers(liveText)}\n\n`;
    }
    for (const s of history) {
      const timeStr = new Date(s.start).toLocaleTimeString();
      fullPreview += `${timeStr} · ${s.app}\n${stripChipMarkers(s.text)}\n\n`;
    }

    await window.inkwellApi.copyToClipboard(fullPreview.trim());
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
  };

  const handleSaveConfig = async (newConfig: Partial<CogdexSyncConfig>) => {
    if (!window.inkwellApi) return;
    const updated = await window.inkwellApi.saveConfig(newConfig);
    setConfig(updated);
  };

  const handleForceSync = async (): Promise<SyncResponse> => {
    if (!window.inkwellApi) {
      return { success: false, message: 'Inkwell API not available' };
    }
    flushLiveSession();
    return window.inkwellApi.forceSync();
  };

  const handleRequestAccessibility = async (): Promise<void> => {
    if (!window.inkwellApi?.requestAccessibility) return;
    await window.inkwellApi.requestAccessibility();
  };

  const handleRequestInputMonitoring = async (): Promise<void> => {
    if (!window.inkwellApi?.requestInputMonitoring) return;
    await window.inkwellApi.requestInputMonitoring();
  };

  const handleOpenAccessibilitySettings = async () => {
    if (!window.inkwellApi?.openAccessibilitySettings) return;
    await window.inkwellApi.openAccessibilitySettings();
  };

  const handleOpenInputMonitoringSettings = async () => {
    if (!window.inkwellApi?.openInputMonitoringSettings) return;
    await window.inkwellApi.openInputMonitoringSettings();
  };

  // Fetch missing icons for apps present in history or live session
  useEffect(() => {
    for (const item of history) {
      if (item.app) fetchIcon(item.app);
    }
    if (liveApp) fetchIcon(liveApp);
  }, [history, liveApp, fetchIcon]);

  // Loading state before initial check resolves (prevents flash of gate)
  if (isOnboarded === null || !permissions) {
    if (error) return <div className="p-8 text-ink-text" role="alert">{error} <button onClick={() => window.location.reload()}>Reload</button></div>;
    if (typeof window !== 'undefined' && !window.inkwellApi) {
      return (
        <div className="h-screen w-screen bg-ink-bg text-ink-text flex items-center justify-center font-mono text-xs text-ink-muted select-none">
          <span>The app connection is unavailable. <button onClick={() => window.location.reload()}>Reload window</button></span>
        </div>
      );
    }
    return <div className="h-screen w-screen bg-ink-bg" />;
  }

  // 1. First-Launch / Missing Permission Onboarding Gate
  if (!isOnboarded) {
    return (
      <PermissionGate
        onGranted={() => {
          setIsOnboarded(true);
          window.inkwellApi?.getCaptureStatus().then(setIsRunning);
        }}
        accessibility={permissions.accessibility}
        inputMonitoring={permissions.inputMonitoring}
        onRequestAccessibility={handleRequestAccessibility}
        onRequestInputMonitoring={handleRequestInputMonitoring}
        onOpenAccessibilitySettings={handleOpenAccessibilitySettings}
        onOpenInputMonitoringSettings={handleOpenInputMonitoringSettings}
      />
    );
  }

  const effectiveSessionCount =
    history.length + (liveText ? 1 : 0);

  // 2. Normal Main Application UI
  return (
    <div className="flex flex-col h-screen w-screen bg-ink-bg text-ink-text overflow-hidden">
      <Header
        isRunning={isRunning}
        detectedApp={detectedApp}
        detectedAppIcon={detectedAppIcon}
        onToggleCapture={handleToggleCapture}
        onClear={handleClearHistory}
        onCopyAll={handleCopyAll}
        isCopied={isCopied}
        isSettingsOpen={isSettingsOpen}
        onToggleSettings={() => setIsSettingsOpen(!isSettingsOpen)}
        sessionCount={effectiveSessionCount}
      />

      {error && <div role="alert" className="p-3 text-xs text-ink-warning">
        {error} {error.toLowerCase().includes('history') && <button onClick={() => { setError(null); void handleLoadMoreHistory(); }}>Retry history</button>}
        <button onClick={() => setError(null)} className="ml-3">Dismiss</button>
      </div>}

      {/* Safety Net Banner for in-session permission revocation / missing permission */}
      <PermissionBanner
        accessibility={permissions.accessibility}
        inputMonitoring={permissions.inputMonitoring}
        onRequestAccessibility={handleRequestAccessibility}
        onRequestInputMonitoring={handleRequestInputMonitoring}
        onOpenAccessibilitySettings={handleOpenAccessibilitySettings}
        onOpenInputMonitoringSettings={handleOpenInputMonitoringSettings}
      />

      <main className="flex-1 min-h-0 flex flex-col overflow-hidden relative min-w-0 w-full">
        <LiveFeed
          app={liveApp}
          appIcon={(liveApp && appIcons[liveApp]) || detectedAppIcon}
          text={liveText}
          keystrokeCount={liveTokens.length}
        />

        <SessionHistory
          sessions={history}
          appIcons={appIcons}
          onCopyText={handleCopyText}
          onDeleteSession={handleDeleteSession}
          hasMore={hasMoreHistory}
          onLoadMore={handleLoadMoreHistory}
          isFetchingMore={isFetchingMoreHistory}
        />

        {/* Overlay backdrop when settings open on compact screens */}
        {isSettingsOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 transition-opacity animate-fade-in"
            onClick={() => setIsSettingsOpen(false)}
          />
        )}

        <SettingsDrawer
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          config={config}
          onSaveConfig={handleSaveConfig}
          onForceSync={handleForceSync}
        />
      </main>
    </div>
  );
};

