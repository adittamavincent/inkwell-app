import React from 'react';
import { AppIcon, PlayIcon, PauseIcon, CopyIcon, CheckIcon, TrashIcon, SettingsIcon } from './Icons';
import { IconButton } from './IconButton';

interface HeaderProps {
  isRunning: boolean;
  detectedApp?: string;
  detectedAppIcon?: string | null;
  onToggleCapture: () => void;
  onClear: () => void;
  onCopyAll: () => void;
  isCopied: boolean;
  isSettingsOpen: boolean;
  onToggleSettings: () => void;
  sessionCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  isRunning,
  detectedApp,
  detectedAppIcon,
  onToggleCapture,
  onClear,
  onCopyAll,
  isCopied,
  isSettingsOpen,
  onToggleSettings,
  sessionCount,
}) => {
  return (
    <header className="titlebar-drag-region h-12 bg-ink-sidebar/95 border-b border-ink-border flex items-center justify-between px-4 pl-20 select-none backdrop-blur-md z-30">
      {/* Left: Branding & Status */}
      <div className="flex items-center gap-3 titlebar-no-drag">
        <div className="flex items-center gap-2">
          <AppIcon className="w-5 h-5 rounded drop-shadow-sm" />
          <span className="font-serif text-sm font-semibold tracking-wide text-ink-text">
            Inkwell
          </span>
          {import.meta.env.DEV && (
            <span
              className="text-[9px] font-mono uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-ink-accent-muted/60 text-ink-accent-light border border-ink-accent/30"
              title="Running in dev mode — permissions assigned to 'Electron' in macOS settings."
            >
              Dev
            </span>
          )}
        </div>

        {/* Engine status indicator */}
        <div
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-ink-panel border border-ink-border text-[11px] text-ink-muted"
          title={isRunning ? 'Active: Capturing Keystrokes' : 'Paused: Capture Suspended'}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
            {isRunning ? 'REC' : 'IDLE'}
          </span>
        </div>

        {/* Active Application Pill */}
        {detectedApp && (
          <div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-ink-card border border-ink-border-subtle text-xs text-ink-muted max-w-[200px]"
            title={`Active frontmost app: ${detectedApp}`}
          >
            {detectedAppIcon ? (
              <img
                src={detectedAppIcon}
                alt=""
                className="w-3.5 h-3.5 rounded-xs shrink-0 object-contain"
              />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-ink-faint" />
            )}
            <span className="text-ink-text text-xs truncate font-medium">
              {detectedApp}
            </span>
          </div>
        )}

        <span className="text-[11px] font-mono text-ink-faint hidden lg:inline">
          {sessionCount} {sessionCount === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 titlebar-no-drag">
        <IconButton
          icon={isRunning ? PauseIcon : PlayIcon}
          title={isRunning ? 'Pause capture' : 'Resume capture'}
          variant={isRunning ? 'default' : 'warning'}
          size="sm"
          onClick={onToggleCapture}
        />

        <IconButton
          icon={isCopied ? CheckIcon : CopyIcon}
          title={isCopied ? 'Copied buffer to clipboard' : 'Copy entire buffer'}
          variant={isCopied ? 'success' : 'default'}
          size="sm"
          onClick={onCopyAll}
        />

        <IconButton
          icon={TrashIcon}
          title="Clear all stored keystrokes"
          variant="danger"
          size="sm"
          onClick={onClear}
        />

        <div className="h-4 w-px bg-ink-border/80 mx-1" />

        <IconButton
          icon={SettingsIcon}
          title="Vault Sync Settings"
          active={isSettingsOpen}
          variant={isSettingsOpen ? 'primary' : 'default'}
          size="sm"
          onClick={onToggleSettings}
        />
      </div>
    </header>
  );
};
