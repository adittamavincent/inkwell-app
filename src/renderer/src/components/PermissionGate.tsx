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
  const [loadingAcc, setLoadingAcc] = useState(false);
  const [loadingInput, setLoadingInput] = useState(false);

  const isAccAuthorized = accessibility === 'authorized';
  const isInputAuthorized = inputMonitoring === 'authorized';

  const handleReqAcc = async () => {
    setLoadingAcc(true);
    try {
      await onRequestAccessibility();
    } finally {
      setLoadingAcc(false);
    }
  };

  const handleReqInput = async () => {
    setLoadingInput(true);
    try {
      await onRequestInputMonitoring();
    } finally {
      setLoadingInput(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-bg/90 backdrop-blur-md p-4 select-none animate-fade-in font-sans">
      <div className="w-full max-w-lg bg-ink-panel border border-ink-border rounded-xl shadow-overlay p-6 flex flex-col gap-6 animate-scale-in">
        {/* Header Icon + Title */}
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-ink-card border border-ink-border flex items-center justify-center shrink-0">
            <AppIcon className="w-6 h-6 text-ink-accent" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-serif font-semibold text-ink-warm tracking-tight">
              macOS System Permissions Required
            </h2>
            <p className="text-xs text-ink-muted leading-relaxed">
              Inkwell runs locally to capture system-wide keystrokes and sync them into Obsidian notes. macOS requires explicit privacy authorization for keystroke hooks.
            </p>
          </div>
        </div>

        {/* Requirements Box List */}
        <div className="space-y-3">
          {/* Requirement 1: Accessibility */}
          <div className="p-3.5 rounded-lg bg-ink-card/60 border border-ink-border-subtle flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isAccAuthorized ? (
                  <CheckCircleIcon className="w-4 h-4 text-ink-success shrink-0" />
                ) : accessibility === 'denied' || accessibility === 'restricted' ? (
                  <AlertCircleIcon className="w-4 h-4 text-ink-danger shrink-0" />
                ) : (
                  <AlertCircleIcon className="w-4 h-4 text-ink-warning shrink-0" />
                )}
                <span className="text-xs font-semibold text-ink-text">
                  1. Accessibility Permission
                </span>
              </div>
              {isAccAuthorized ? (
                <span className="text-[11px] font-mono text-ink-success font-medium flex items-center gap-1">
                  <CheckIcon className="w-3 h-3" /> Granted
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleReqAcc}
                    disabled={loadingAcc}
                    className="px-2.5 py-1 bg-ink-accent hover:bg-ink-accent-hover text-white rounded text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                  >
                    {loadingAcc && <LoaderIcon className="w-3 h-3 animate-spin" />}
                    Prompt Prompt
                  </button>
                  <button
                    type="button"
                    onClick={onOpenAccessibilitySettings}
                    className="px-2.5 py-1 bg-ink-panel hover:bg-ink-hover border border-ink-border text-ink-muted hover:text-ink-text rounded text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    Open Settings
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-ink-muted leading-relaxed pl-6">
              {isAccAuthorized
                ? 'Authorized: System event tap active.'
                : accessibility === 'denied'
                ? 'Denied: Enable Inkwell in macOS System Settings > Privacy & Security > Accessibility.'
                : 'Required to intercept system-wide key presses via macOS Event Tap.'}
            </p>
          </div>

          {/* Requirement 2: Input Monitoring */}
          <div className="p-3.5 rounded-lg bg-ink-card/60 border border-ink-border-subtle flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isInputAuthorized ? (
                  <CheckCircleIcon className="w-4 h-4 text-ink-success shrink-0" />
                ) : inputMonitoring === 'denied' || inputMonitoring === 'restricted' ? (
                  <AlertCircleIcon className="w-4 h-4 text-ink-danger shrink-0" />
                ) : (
                  <AlertCircleIcon className="w-4 h-4 text-ink-warning shrink-0" />
                )}
                <span className="text-xs font-semibold text-ink-text">
                  2. Input Monitoring Permission
                </span>
              </div>
              {isInputAuthorized ? (
                <span className="text-[11px] font-mono text-ink-success font-medium flex items-center gap-1">
                  <CheckIcon className="w-3 h-3" /> Granted
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleReqInput}
                    disabled={loadingInput}
                    className="px-2.5 py-1 bg-ink-accent hover:bg-ink-accent-hover text-white rounded text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                  >
                    {loadingInput && <LoaderIcon className="w-3 h-3 animate-spin" />}
                    Prompt Prompt
                  </button>
                  <button
                    type="button"
                    onClick={onOpenInputMonitoringSettings}
                    className="px-2.5 py-1 bg-ink-panel hover:bg-ink-hover border border-ink-border text-ink-muted hover:text-ink-text rounded text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    Open Settings
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-ink-muted leading-relaxed pl-6">
              {isInputAuthorized
                ? 'Authorized: Keystroke monitoring active.'
                : inputMonitoring === 'denied'
                ? 'Denied: Enable Inkwell in macOS System Settings > Privacy & Security > Input Monitoring.'
                : 'Required on macOS 10.15+ to read key events outside the active window.'}
            </p>
          </div>
        </div>

        {/* Footer Security Badge */}
        <div className="pt-2 border-t border-ink-border-subtle flex items-center justify-between text-[11px] text-ink-muted">
          <div className="flex items-center gap-1.5">
            <LockIcon className="w-3.5 h-3.5 text-ink-accent" />
            <span>Local-first, encrypted SQLite database, zero telemetry</span>
          </div>
        </div>
      </div>
    </div>
  );
};
