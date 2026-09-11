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
  appIcons,
  onCopyText,
  onDeleteSession,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const handleCopy = (text: string, idx: number) => {
    onCopyText(text);
    setCopiedIndex(idx);
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

  useEffect(() => {
    if (!contextMenu) return;
    const handleClose = () => setContextMenu(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };

    window.addEventListener('click', handleClose);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleClose);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu]);

  const formatTime = (timeVal: string | Date) => {
    try {
      const d = typeof timeVal === 'string' ? new Date(timeVal) : timeVal;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return String(timeVal);
    }
  };

  if (sessions.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-ink-muted select-none w-full">
        <div className="w-10 h-10 rounded-full bg-ink-card border border-ink-border flex items-center justify-center mb-3">
          <ClockIcon className="w-5 h-5 text-ink-faint" />
        </div>
        <h3 className="font-serif text-base font-medium text-ink-text mb-1 tracking-wide">
          Manuscript Archive Empty
        </h3>
        <p className="text-xs max-w-xs text-ink-muted leading-relaxed">
          Completed sessions across your system will be preserved and indexed here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden divide-y divide-ink-border-subtle select-text w-full min-w-0 relative">
      {sessions.map((session, index) => {
        const icon = (appIcons && session.app && appIcons[session.app]) || null;
        const isItemCopied = copiedIndex === index;
        const isMenuOpenForThis = contextMenu?.index === index;

        return (
          <div
            key={index}
            onContextMenu={(e) => handleContextMenu(e, session, index)}
            className={`group flex items-start justify-between gap-3 px-4 py-3 transition-colors w-full min-w-0 ${
              isMenuOpenForThis ? 'bg-ink-panel' : 'hover:bg-ink-panel/60'
            }`}
          >
            <div className="flex items-start gap-4 min-w-0 flex-1">
              {/* Metadata gutter: Timestamp and App vertically stacked */}
              <div className="shrink-0 flex flex-col items-start gap-1 select-none w-28 sm:w-32 pt-0.5">
                <span className="font-mono text-[10px] text-ink-faint tabular-nums tracking-tight">
                  {formatTime(session.start)}
                </span>
                <span className="font-sans text-xs text-ink-muted bg-ink-card/80 border border-ink-border-subtle px-1.5 py-0.5 rounded inline-flex items-center gap-1.5 max-w-full">
                  {icon && (
                    <img
                      src={icon}
                      alt=""
                      className="w-3.5 h-3.5 rounded-xs shrink-0 object-contain"
                    />
                  )}
                  <span className="truncate font-medium text-ink-text/90">{session.app || 'Unknown'}</span>
                </span>
              </div>

              {/* Raw Keystroke text: min-w-0 and [overflow-wrap:anywhere] */}
              <div className="font-mono text-xs text-ink-text leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] flex-1 min-w-0 pt-0.5">
                <RichContentText text={session.text} onCopyText={onCopyText} />
              </div>
            </div>

            {/* Hover Actions: Copy and Delete */}
            <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0 select-none flex items-center gap-0.5">
              <IconButton
                icon={isItemCopied ? CheckIcon : CopyIcon}
                title={isItemCopied ? 'Copied' : 'Copy session text'}
                variant={isItemCopied ? 'success' : 'ghost'}
                size="sm"
                onClick={() => handleCopy(session.text, index)}
              />
              {onDeleteSession && (
                <IconButton
                  icon={TrashIcon}
                  title="Delete session entry"
                  variant="ghost"
                  size="sm"
                  className="hover:text-ink-danger hover:bg-ink-danger-muted/30"
                  onClick={() => onDeleteSession(session, index)}
                />
              )}
            </div>
          </div>
        );
      })}

      {/* Right-Click Context Menu */}
      {contextMenu && (
        <div
          style={{
            top: Math.min(contextMenu.y, typeof window !== 'undefined' ? window.innerHeight - 140 : contextMenu.y),
            left: Math.min(contextMenu.x, typeof window !== 'undefined' ? window.innerWidth - 210 : contextMenu.x),
          }}
          className="fixed z-50 min-w-[190px] bg-ink-panel/95 backdrop-blur-md rounded-md border border-ink-border shadow-elevated py-1 text-xs text-ink-text select-none animate-in fade-in zoom-in-95 duration-100 font-sans"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-[10px] font-mono text-ink-faint border-b border-ink-border-subtle flex items-center justify-between mb-1">
            <span className="font-sans font-medium text-ink-muted truncate max-w-[100px]">{contextMenu.session.app || 'Session'}</span>
            <span>{formatTime(contextMenu.session.start)}</span>
          </div>

          <button
            type="button"
            className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-ink-hover hover:text-ink-text transition-colors cursor-pointer text-ink-muted"
            onClick={() => {
              handleCopy(contextMenu.session.text, contextMenu.index);
              setContextMenu(null);
            }}
          >
            <CopyIcon className="w-3.5 h-3.5 text-ink-accent-light" />
            <span>Copy Session Text</span>
          </button>

          <button
            type="button"
            className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-ink-hover hover:text-ink-text transition-colors cursor-pointer text-ink-muted"
            onClick={() => {
              onCopyText(formatTime(contextMenu.session.start));
              setContextMenu(null);
            }}
          >
            <ClockIcon className="w-3.5 h-3.5 text-ink-muted" />
            <span>Copy Timestamp</span>
          </button>

          {onDeleteSession && (
            <>
              <div className="my-1 border-t border-ink-border-subtle" />
              <button
                type="button"
                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-ink-danger-muted/40 text-ink-danger transition-colors cursor-pointer"
                onClick={() => {
                  onDeleteSession(contextMenu.session, contextMenu.index);
                  setContextMenu(null);
                }}
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
