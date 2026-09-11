import React from 'react';
import { ShieldAlertIcon, ExternalLinkIcon } from './Icons';
import { AuthStatus } from '../types';
import { IconButton } from './IconButton';

interface PermissionBannerProps {
  accessibility: AuthStatus;
  inputMonitoring: AuthStatus;
  onRequestAccessibility: () => void;
  onRequestInputMonitoring: () => void;
  onOpenAccessibilitySettings: () => void;
  onOpenInputMonitoringSettings: () => void;
}

export const PermissionBanner: React.FC<PermissionBannerProps> = ({
  accessibility,
  inputMonitoring,
  onOpenAccessibilitySettings,
  onOpenInputMonitoringSettings,
}) => {
  const needsAcc = accessibility !== 'authorized';
  const needsInput = inputMonitoring !== 'authorized';

  if (!needsAcc && !needsInput) return null;

  return (
    <div className="bg-ink-warning-muted/90 border-b border-ink-warning-border px-3.5 py-2 flex items-center justify-between text-xs text-ink-warning select-none shrink-0 font-sans">
      <div className="flex items-center gap-2">
        <ShieldAlertIcon className="w-4 h-4 shrink-0 text-ink-warning" />
        <span className="font-medium">
          {needsAcc && needsInput
            ? 'Permissions missing: Accessibility & Input Monitoring'
            : needsAcc
            ? 'Permission missing: Accessibility'
            : 'Permission missing: Input Monitoring'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {needsAcc && (
          <button
            type="button"
            onClick={onOpenAccessibilitySettings}
            className="px-2 py-0.5 rounded bg-ink-warning-border/60 hover:bg-ink-warning-border text-ink-warning text-[11px] font-medium border border-ink-warning/30 transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>Accessibility</span>
            <ExternalLinkIcon className="w-3 h-3" />
          </button>
        )}
        {needsInput && (
          <button
            type="button"
            onClick={onOpenInputMonitoringSettings}
            className="px-2 py-0.5 rounded bg-ink-warning-border/60 hover:bg-ink-warning-border text-ink-warning text-[11px] font-medium border border-ink-warning/30 transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>Input Monitoring</span>
            <ExternalLinkIcon className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
