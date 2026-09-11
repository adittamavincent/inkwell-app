import React, { useRef, useEffect } from 'react';
import { RichContentText } from './RichContentText';

interface LiveFeedProps {
  app: string;
  appIcon?: string | null;
  text: string;
  keystrokeCount?: number;
  tokenCount?: number;
}

export const LiveFeed: React.FC<LiveFeedProps> = ({
  app,
  appIcon,
  text,
  keystrokeCount,
  tokenCount,
}) => {
  const count = keystrokeCount ?? tokenCount ?? 0;
  const scrollRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (scrollRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [text]);

  if (!text && !count) {
    return (
      <div className="px-4 py-2.5 bg-ink-sidebar/80 border-b border-ink-border-subtle flex items-center justify-between text-xs text-ink-muted select-none">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-ink-faint" />
          <span className="font-mono text-[11px] text-ink-muted tracking-tight">
            Awaiting input · Type in any active application
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 bg-ink-panel/90 border-b border-ink-border select-none max-h-[50vh] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">
            Live Desk
          </span>
          <span className="px-2 py-0.5 rounded bg-ink-card border border-ink-border-subtle text-ink-text text-xs font-medium flex items-center gap-1.5">
            {appIcon && (
              <img
                src={appIcon}
                alt=""
                className="w-3.5 h-3.5 rounded-xs shrink-0 object-contain"
              />
            )}
            <span>{app || 'Active App'}</span>
          </span>
        </div>
        <div className="font-mono text-[11px] text-ink-muted">
          <span>
            {count} {count === 1 ? 'keystroke' : 'keystrokes'}
          </span>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="font-mono text-xs leading-relaxed bg-ink-bg p-3 rounded border border-ink-border text-ink-text whitespace-pre-wrap break-words [overflow-wrap:anywhere] min-h-[48px] select-text overflow-y-auto flex-1 shadow-inner focus-within:border-ink-border"
      >
        {text ? (
          <>
            <RichContentText text={text} />
            <span
              className="inline-block w-[1.5px] h-[13px] bg-ink-accent-light align-middle ml-0.5 animate-cursor-blink pointer-events-none rounded-full"
              aria-hidden="true"
            />
          </>
        ) : (
          <span className="text-ink-faint font-sans text-xs flex items-center gap-1">
            <span>Inking keystrokes...</span>
            <span
              className="inline-block w-[1.5px] h-[12px] bg-ink-accent/60 align-middle ml-0.5 animate-cursor-blink pointer-events-none rounded-full"
              aria-hidden="true"
            />
          </span>
        )}
      </div>
    </div>
  );
};
