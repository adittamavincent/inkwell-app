import React, { useState, useEffect } from 'react';
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
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    if (!isConfirmOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsConfirmOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isConfirmOpen]);

  return (
    <>
      <header className="h-12 bg-ink-sidebar/80 backdrop-blur-md border-b border-ink-border flex items-center justify-between pl-20 pr-3.5 select-none titlebar-drag-region shrink-0">
        {/* Left: Branding & Status */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2">
            <AppIcon className="w-4 h-4 text-ink-accent" />
            <span className="font-serif text-sm font-semibold tracking-tight text-ink-warm">
              Inkwell
            </span>
          </div>

          <div className="h-3 w-[1px] bg-ink-border" />

          {/* Engine Status indicator */}
          <div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-ink-panel/60 border border-ink-border/60 text-[11px] font-medium"
            title={
              isRunning
                ? 'Keylogging engine active'
                : 'Keylogging engine paused'
            }
          >
            <span
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                isRunning
                  ? 'bg-ink-success animate-pulse'
                  : 'bg-ink-warning'
              }`}
            />
            <span className="text-ink-muted">
              {isRunning ? 'REC' : 'PAUSED'}
            </span>
          </div>

          {/* Active app context */}
          {detectedApp && (
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-ink-panel/40 border border-ink-border-subtle max-w-[160px] md:max-w-[220px]">
              {detectedAppIcon ? (
                <img
                  src={detectedAppIcon}
                  alt=""
                  className="w-3.5 h-3.5 rounded-sm shrink-0 object-contain"
                />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-ink-faint shrink-0" />
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
            variant={isRunning ? 'default' : 'active'}
            size="sm"
            onClick={onToggleCapture}
          />
          <IconButton
            icon={isCopied ? CheckIcon : CopyIcon}
            title={isCopied ? 'Copied all sessions' : 'Copy all sessions'}
            variant={isCopied ? 'success' : 'default'}
            size="sm"
            onClick={onCopyAll}
          />
          <IconButton
            icon={TrashIcon}
            title="Clear all recorded entries"
            variant="danger"
            size="sm"
            onClick={() => setIsConfirmOpen(true)}
          />

          <div className="h-3 w-[1px] bg-ink-border mx-0.5" />

          <IconButton
            icon={SettingsIcon}
            title="Sync & Vault settings"
            variant={isSettingsOpen ? 'active' : 'default'}
            size="sm"
            onClick={onToggleSettings}
          />
        </div>
      </header>

      {/* Delete Confirmation Modal */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div
            className="bg-ink-panel border border-ink-border rounded-xl p-5 max-w-sm w-full shadow-overlay space-y-4 animate-scale-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-delete-title"
          >
            <div className="space-y-1.5">
              <h3
                id="confirm-delete-title"
                className="text-sm font-semibold text-ink-text font-serif"
              >
                Clear all recorded entries?
              </h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                This will purge all in-memory keystrokes and local history database entries. Synced Obsidian notes will not be affected.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="px-3.5 py-1.5 rounded-md text-xs font-medium text-ink-muted hover:text-ink-text hover:bg-ink-card border border-ink-border transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onClear();
                  setIsConfirmOpen(false);
                }}
                className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-ink-danger hover:bg-ink-danger-hover text-white transition-colors cursor-pointer shadow-subtle"
              >
                Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
