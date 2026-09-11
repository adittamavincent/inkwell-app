import React, { useState } from 'react';
import {
  ShieldAlertIcon,
  LoaderIcon,
  CheckCircleIcon,
  LockIcon,
  CheckIcon,
  AlertCircleIcon,
  TerminalIcon,
  AppIcon,
} from './Icons';
import { AuthStatus } from '../types';

interface PermissionGateProps {
  onGranted?: () => void;
  accessibility: AuthStatus;
  inputMonitoring: AuthStatus;
  onRequestAccessibility: () => Promise<void>;
  onRequestInputMonitoring: () => Promise<void>;
  onOpenAccessibilitySettings: () => Promise<void>;
  onOpenInputMonitoringSettings: () => Promise<void>;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  accessibility,
  inputMonitoring,
  onRequestAccessibility,
  onRequestInputMonitoring,
  onOpenAccessibilitySettings,
  onOpenInputMonitoringSettings,
}) => {
  const [isRequestingAcc, setIsRequestingAcc] = useState(false);
  const [isRequestingInp, setIsRequestingInp] = useState(false);

  const isAccAuthorized = accessibility === 'authorized';
  const isInputAuthorized = inputMonitoring === 'authorized';
  const allSet = isAccAuthorized && isInputAuthorized;

  const handleAccessibility = async () => {
    setIsRequestingAcc(true);
    try {
      if (accessibility === 'denied' || accessibility === 'restricted') {
        await onOpenAccessibilitySettings();
      } else {
        await onRequestAccessibility();
      }
    } catch (err) {
      console.error('Failed to handle accessibility action:', err);
    } finally {
      setIsRequestingAcc(false);
    }
  };

  const handleInputMonitoring = async () => {
    setIsRequestingInp(true);
    try {
      if (inputMonitoring === 'denied' || inputMonitoring === 'restricted') {
        await onOpenInputMonitoringSettings();
      } else {
        await onRequestInputMonitoring();
      }
    } catch (err) {
      console.error('Failed to handle input monitoring action:', err);
    } finally {
      setIsRequestingInp(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink-bg text-ink-text flex flex-col items-center justify-center p-6 select-none overflow-y-auto">
      <div className="relative max-w-lg w-full flex flex-col items-stretch space-y-6">
        {/* Editorial Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-ink-card border border-ink-border text-ink-accent-light shadow-subtle mb-1">
            {allSet ? (
              <CheckCircleIcon className="w-6 h-6 text-emerald-400" />
            ) : (
              <AppIcon className="w-6 h-6 text-ink-accent-light" />
            )}
          </div>

          <div className="space-y-1.5">
            <h1 className="font-serif text-2xl font-semibold text-ink-text tracking-tight">
              {allSet ? 'Inkwell Initialized' : 'Authorize Keystroke Stream'}
            </h1>
            <p className="text-xs text-ink-muted leading-relaxed max-w-sm mx-auto">
              {allSet
                ? 'System authorization granted. Launching the live manuscript desk...'
                : 'Inkwell requires macOS system permissions to passively record keystrokes and correlate them with active windows.'}
            </p>
          </div>
        </div>

        {/* Dev Mode Callout */}
        {import.meta.env.DEV && (
          <div className="bg-ink-panel rounded border border-ink-border-subtle p-3 text-left text-xs flex items-start gap-3 shadow-subtle">
            <TerminalIcon className="w-4 h-4 text-ink-accent-light shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="text-xs font-mono uppercase tracking-wider font-semibold text-ink-accent-light block">
                Development Build
              </span>
              <p className="text-xs text-ink-muted leading-relaxed">
                macOS attributes permissions to the <strong className="text-ink-text font-semibold">'Electron'</strong> app binary in System Settings during local development.
              </p>
            </div>
          </div>
        )}

        {/* Dual Permission Ledger */}
        {!allSet && (
          <div className="bg-ink-panel rounded-lg border border-ink-border p-4 text-left space-y-3 divide-y divide-ink-border-subtle shadow-subtle">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs text-ink-muted font-semibold flex items-center gap-1.5">
                <ShieldAlertIcon className="w-3.5 h-3.5 text-ink-accent" />
                Required Clearances
              </span>
              <span className="text-xs font-mono text-ink-faint">
                {[isAccAuthorized, isInputAuthorized].filter(Boolean).length}/2 Granted
              </span>
            </div>

            {/* 1. Accessibility */}
            <div className="pt-3 flex items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  {isAccAuthorized ? (
                    <CheckIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : accessibility === 'denied' || accessibility === 'restricted' ? (
                    <AlertCircleIcon className="w-4 h-4 text-ink-danger shrink-0" />
                  ) : (
                    <AlertCircleIcon className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  <span className="text-xs font-semibold text-ink-text">
                    1. Accessibility
                  </span>
                </div>
                <p className="text-xs text-ink-muted leading-normal pl-6">
                  {isAccAuthorized
                    ? 'Authorized · System event tap active'
                    : accessibility === 'denied' || accessibility === 'restricted'
                    ? 'Denied · Enable in Privacy & Security settings'
                    : 'Needed to detect active window titles and global events'}
                </p>
              </div>

              <div className="shrink-0">
                {isAccAuthorized ? (
                  <span className="px-2 py-0.5 text-xs font-medium rounded bg-emerald-950/30 text-emerald-300 border border-emerald-800/40">
                    Active
                  </span>
                ) : (
                  <button
                    onClick={handleAccessibility}
                    disabled={isRequestingAcc}
                    className="px-3 py-1.5 text-xs font-medium rounded bg-ink-accent hover:bg-ink-accent-hover text-white border border-ink-accent-light/30 flex items-center gap-1.5 transition-colors cursor-pointer active:scale-[0.98]"
                  >
                    {isRequestingAcc ? (
                      <LoaderIcon className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>
                        {accessibility === 'denied' || accessibility === 'restricted'
                          ? 'Open Settings'
                          : 'Authorize'}
                      </span>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* 2. Input Monitoring */}
            <div className="pt-3 flex items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  {isInputAuthorized ? (
                    <CheckIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : inputMonitoring === 'denied' || inputMonitoring === 'restricted' ? (
                    <AlertCircleIcon className="w-4 h-4 text-ink-danger shrink-0" />
                  ) : (
                    <AlertCircleIcon className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  <span className="text-xs font-semibold text-ink-text">
                    2. Input Monitoring
                  </span>
                </div>
                <p className="text-xs text-ink-muted leading-normal pl-6">
                  {isInputAuthorized
                    ? 'Authorized · Global keystroke tap connected'
                    : inputMonitoring === 'denied' || inputMonitoring === 'restricted'
                    ? 'Denied · Enable in Privacy & Security settings'
                    : 'Needed to stream keystrokes across external applications'}
                </p>
              </div>

              <div className="shrink-0">
                {isInputAuthorized ? (
                  <span className="px-2 py-0.5 text-xs font-medium rounded bg-emerald-950/30 text-emerald-300 border border-emerald-800/40">
                    Active
                  </span>
                ) : (
                  <button
                    onClick={handleInputMonitoring}
                    disabled={isRequestingInp}
                    className="px-3 py-1.5 text-xs font-medium rounded bg-ink-card hover:bg-ink-hover text-ink-text border border-ink-border flex items-center gap-1.5 transition-colors cursor-pointer active:scale-[0.98]"
                  >
                    {isRequestingInp ? (
                      <LoaderIcon className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>
                        {inputMonitoring === 'denied' || inputMonitoring === 'restricted'
                          ? 'Open Settings'
                          : 'Authorize'}
                      </span>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bottom State Bar */}
        <div className="space-y-3">
          {allSet ? (
            <div className="py-2 px-4 rounded bg-emerald-950/20 border border-emerald-800/40 text-emerald-300 flex items-center justify-center gap-2 text-xs font-medium">
              <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Permissions verified · Starting engine</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 py-2 px-3 rounded bg-ink-panel border border-ink-border-subtle text-xs text-ink-muted font-mono">
              <span>Awaiting System Settings update...</span>
            </div>
          )}

          {/* Privacy Guarantee Seal */}
          <div className="flex items-center justify-center gap-2 text-[11px] text-ink-faint pt-2 border-t border-ink-border-subtle font-sans">
            <LockIcon className="w-3 h-3 text-ink-muted" />
            <span>
              Local-first · AES-256 encrypted · Zero external telemetry
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
