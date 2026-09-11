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
    if (!scrollRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
    return () => cancelAnimationFrame(rafRef.current);
  }, [text]);

  return (
    <div className="bg-ink-panel border border-ink-border rounded-lg p-3 flex flex-col gap-2 relative overflow-hidden shadow-subtle">
      {/* LiveFeed Bar Header */}
      <div className="flex items-center justify-between text-xs select-none">
        <div className="flex items-center gap-2">
          {appIcon ? (
            <img
              src={appIcon}
              alt=""
              className="w-4 h-4 rounded-sm shrink-0 object-contain"
            />
          ) : (
            <span className="w-2 h-2 rounded-full bg-ink-accent animate-pulse shrink-0" />
          )}
          <span className="font-semibold text-ink-warm font-sans">
            {app || 'Active Buffer'}
          </span>
          <span className="text-[10px] font-mono uppercase tracking-wider text-ink-accent-light/80 bg-ink-accent-muted/80 px-1.5 py-0.2 rounded border border-ink-accent/30 font-medium">
            Live
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-ink-muted">
          <span>{count} chars</span>
        </div>
      </div>

      {/* Content Feed Container */}
      <div
        ref={scrollRef}
        className="bg-ink-bg/70 border border-ink-border-subtle rounded-md p-3 font-mono text-xs text-ink-text whitespace-pre-wrap break-words [overflow-wrap:anywhere] min-h-[56px] max-h-[220px] select-text overflow-y-auto flex-1 focus-within:border-ink-accent/40 transition-colors"
      >
        {!text ? (
          <span className="text-ink-faint italic font-sans text-xs">
            Awaiting keystrokes (type in any active desktop window)...
          </span>
        ) : (
          <span>
            <RichContentText text={text} />
            <span
              className="inline-block w-[1.5px] h-[12px] bg-ink-accent-light align-middle ml-0.5 animate-blink pointer-events-none rounded-full"
              aria-hidden="true"
            />
          </span>
        )}
      </div>
    </div>
  );
};
