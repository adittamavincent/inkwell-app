import React, { useState, useEffect } from 'react';
import { SessionPreview } from '../types';
import { CopyIcon, CheckIcon, TrashIcon, ClockIcon } from './Icons';
import { IconButton } from './IconButton';
import { RichContentText } from './RichContentText';

interface SessionHistoryProps {
  sessions: SessionPreview[];
  appIcons?: Record<string, string | null>;
  onCopyText: (text: string) => void;
  onDeleteSession?: (session: SessionPreview, index: number) => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  session: SessionPreview;
  index: number;
}

export const SessionHistory: React.FC<SessionHistoryProps> = ({
  sessions,
  appIcons = {},
  onCopyText,
  onDeleteSession,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const handleCopy = (text: string, index: number) => {
    onCopyText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  const handleContextMenu = (e: React.MouseEvent, session: SessionPreview, index: number) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      session,
      index,
    });
  };

  // Close context menu on outside click or escape
  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu]);

  if (sessions.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border border-dashed border-ink-border/60 rounded-xl bg-ink-panel/20 select-none">
        <div className="w-10 h-10 rounded-full bg-ink-panel flex items-center justify-center text-ink-faint mb-3 border border-ink-border/60">
          <ClockIcon className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-serif font-semibold text-ink-warm mb-1">
          Manuscript Archive Empty
        </h3>
        <p className="text-xs text-ink-muted max-w-[280px] leading-relaxed">
          Keystrokes are recorded per application focus session and appended here when idle or switching apps.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-3 pr-1 relative">
      <div className="flex items-center justify-between px-1 select-none">
        <span className="text-[11px] font-mono text-ink-faint uppercase tracking-wider font-medium">
          Archived Sessions ({sessions.length})
        </span>
        <span className="text-[11px] text-ink-faint">
          Right-click entry for options
        </span>
      </div>

      {sessions.map((session, index) => {
        const timeStr = typeof session.start === 'string'
          ? session.start
          : new Date(session.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const icon = appIcons[session.app];

        return (
          <div
            key={index}
            onContextMenu={(e) => handleContextMenu(e, session, index)}
            className="group relative bg-ink-panel border border-ink-border/80 hover:border-ink-accent/40 rounded-lg p-3 transition-all shadow-subtle flex flex-col gap-2"
          >
            {/* Header / Meta */}
            <div className="flex items-center justify-between text-xs border-b border-ink-border-subtle pb-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-ink-muted text-[11px]">
                  {timeStr}
                </span>
                <span className="font-sans text-xs text-ink-muted bg-ink-card border border-ink-border-subtle px-1.5 py-0.5 rounded-md inline-flex items-center gap-1.5 max-w-full">
                  {icon ? (
                    <img
                      src={icon}
                      alt=""
                      className="w-3.5 h-3.5 rounded-sm shrink-0 object-contain"
                    />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-faint shrink-0" />
                  )}
                  <span className="font-medium text-ink-text truncate max-w-[140px] sm:max-w-[200px]">
                    {session.app}
                  </span>
                </span>
              </div>

              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                <IconButton
                  icon={copiedIndex === index ? CheckIcon : CopyIcon}
                  title="Copy session text"
                  variant={copiedIndex === index ? 'success' : 'ghost'}
                  size="sm"
                  onClick={() => handleCopy(session.text, index)}
                />
                {onDeleteSession && (
                  <IconButton
                    icon={TrashIcon}
                    title="Delete session entry"
                    variant="danger"
                    size="sm"
                    onClick={() => onDeleteSession(session, index)}
                  />
                )}
              </div>
            </div>

            {/* Session Text Content */}
            <div className="font-mono text-xs text-ink-text/90 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] select-text pt-0.5">
              <RichContentText text={session.text} onCopyText={onCopyText} />
            </div>
          </div>
        );
      })}

      {/* Context Menu Portal / Popup */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 min-w-[190px] bg-ink-panel/95 backdrop-blur-md rounded-lg border border-ink-border shadow-elevated py-1 text-xs text-ink-text select-none animate-scale-in font-sans"
        >
          <button
            type="button"
            onClick={() => {
              handleCopy(contextMenu.session.text, contextMenu.index);
              setContextMenu(null);
            }}
            className="w-full px-3 py-1.5 text-left hover:bg-ink-hover flex items-center gap-2 text-ink-text transition-colors cursor-pointer"
          >
            <CopyIcon className="w-3.5 h-3.5 text-ink-muted" />
            <span>Copy Session Text</span>
          </button>

          {onDeleteSession && (
            <>
              <div className="h-[1px] bg-ink-border my-1" />
              <button
                type="button"
                onClick={() => {
                  onDeleteSession(contextMenu.session, contextMenu.index);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-ink-danger-muted text-ink-danger hover:text-ink-danger-hover flex items-center gap-2 transition-colors cursor-pointer"
              >
                <TrashIcon className="w-3.5 h-3.5" />
                <span className="font-medium">Delete Entry</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
