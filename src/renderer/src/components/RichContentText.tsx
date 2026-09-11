import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CopyIcon, CheckIcon, CodeIcon } from './Icons';
import { trimBackticks } from '../../../shared/reconstructor';

interface RichContentTextProps {
  text: string;
  className?: string;
  onCopyText?: (text: string) => void;
}

export type ChipCategory = 'regular' | 'qNq';

export interface ChipSegment {
  type: 'chip';
  category: ChipCategory;
  content: string;
}

export interface TextSegment {
  type: 'text';
  content: string;
}

export type Segment = ChipSegment | TextSegment;

/**
 * Tokenize code string into syntax-highlighted React elements.
 */
function renderSyntaxHighlighted(code: string): React.ReactNode {
  // Regex pattern for tokenizing common programming languages
  const tokenRegex =
    /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*|--[^\n]*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b(?:const|let|var|function|return|if|else|for|while|import|from|export|default|class|extends|new|async|await|try|catch|throw|finally|typeof|instanceof|def|elif|lambda|yield|SELECT|FROM|WHERE|INSERT|INTO|UPDATE|DELETE|CREATE|TABLE|interface|type|enum|public|private|protected)\b)|(\b(?:true|false|null|undefined|None|True|False|nil)\b)|(\b\d+(?:\.\d+)?\b)|(\b[a-zA-Z_$][a-zA-Z0-9_$]*(?=\s*\())|([{}()[\],;.:=+\-*/%&|^!<>?~@#])/g;

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(code)) !== null) {
    const matchIndex = match.index;

    // Plain text preceding match
    if (matchIndex > lastIndex) {
      elements.push(
        <span key={`plain-${lastIndex}`} className="text-ink-text">
          {code.slice(lastIndex, matchIndex)}
        </span>
      );
    }

    const [fullMatch, comment, str, keyword, booleanNull, num, fnName, punct] = match;

    if (comment) {
      elements.push(
        <span key={`comment-${matchIndex}`} className="text-ink-muted/80 italic">
          {comment}
        </span>
      );
    } else if (str) {
      elements.push(
        <span key={`str-${matchIndex}`} className="text-emerald-300">
          {str}
        </span>
      );
    } else if (keyword) {
      elements.push(
        <span key={`kw-${matchIndex}`} className="text-purple-300 font-semibold">
          {keyword}
        </span>
      );
    } else if (booleanNull) {
      elements.push(
        <span key={`bool-${matchIndex}`} className="text-amber-300 font-medium">
          {booleanNull}
        </span>
      );
    } else if (num) {
      elements.push(
        <span key={`num-${matchIndex}`} className="text-orange-300">
          {num}
        </span>
      );
    } else if (fnName) {
      elements.push(
        <span key={`fn-${matchIndex}`} className="text-cyan-300">
          {fnName}
        </span>
      );
    } else if (punct) {
      elements.push(
        <span key={`punct-${matchIndex}`} className="text-ink-faint">
          {punct}
        </span>
      );
    } else {
      elements.push(
        <span key={`other-${matchIndex}`} className="text-ink-text">
          {fullMatch}
        </span>
      );
    }

    lastIndex = matchIndex + fullMatch.length;
  }

  if (lastIndex < code.length) {
    elements.push(
      <span key={`tail-${lastIndex}`} className="text-ink-text">
        {code.slice(lastIndex)}
      </span>
    );
  }

  return elements;
}

/**
 * Parses a string into text and clickable chip segments { regular, qNq }.
 * Strips leading/trailing backticks and detects both internal chip markers
 * and legacy fence wrappers cleanly.
 */
export function parseSegments(rawText: string): Segment[] {
  if (!rawText) return [];

  const segments: Segment[] = [];
  const markerRegex =
    /\u001DPASTE:(regular|qNq)\u001E([\s\S]*?)\u001F|«chip:(regular|qNq)»([\s\S]*?)«\/chip»|(`{3,4}|~{3,4})([\s\S]*?)\5/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = markerRegex.exec(rawText)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: rawText.slice(lastIndex, match.index),
      });
    }

    if (match[1] !== undefined) {
      // Internal delimiter format \u001DPASTE:(regular|qNq)\u001E...\u001F
      const category = match[1] as ChipCategory;
      const content = trimBackticks(match[2]);
      segments.push({
        type: 'chip',
        category,
        content,
      });
    } else if (match[3] !== undefined) {
      // «chip:(regular|qNq)»...«/chip»
      const category = match[3] as ChipCategory;
      const content = trimBackticks(match[4]);
      segments.push({
        type: 'chip',
        category,
        content,
      });
    } else if (match[5] !== undefined) {
      // Legacy markdown code fence fallback
      const fence = match[5];
      const category: ChipCategory = fence.length >= 4 ? 'qNq' : 'regular';
      const content = trimBackticks(match[6]);
      segments.push({
        type: 'chip',
        category,
        content,
      });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < rawText.length) {
    segments.push({
      type: 'text',
      content: rawText.slice(lastIndex),
    });
  }

  return segments;
}

interface ClickableChipProps {
  segment: ChipSegment;
  onCopyText?: (text: string) => void;
}

const ClickableChip: React.FC<ClickableChipProps> = ({ segment, onCopyText }) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [popoverCoords, setPopoverCoords] = useState<{
    top: number;
    left: number;
    placement: 'top' | 'bottom';
    maxWidth: number;
    maxHeight: number;
  } | null>(null);

  const chipRef = useRef<HTMLSpanElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanContent = segment.content;
  // Trim preview to maximum 24 characters
  const trimmedPreview = cleanContent.length > 24 ? cleanContent.slice(0, 24) + '…' : cleanContent;
  const isTrimmed = cleanContent.length > 24 || cleanContent.includes('\n');
  const isQnq = segment.category === 'qNq';

  const calculatePosition = useCallback(() => {
    if (!chipRef.current) return;
    const rect = chipRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const spaceAbove = rect.top;
    const spaceBelow = vh - rect.bottom;
    const placement: 'top' | 'bottom' = spaceAbove >= 200 || spaceAbove > spaceBelow ? 'top' : 'bottom';

    const targetWidth = Math.min(460, vw - 24);
    let left = rect.left;
    if (left + targetWidth > vw - 12) {
      left = Math.max(12, vw - targetWidth - 12);
    } else if (left < 12) {
      left = 12;
    }

    const maxHeight = placement === 'top' ? Math.max(140, Math.min(320, spaceAbove - 24)) : Math.max(140, Math.min(320, spaceBelow - 24));
    const top = placement === 'top' ? rect.top - 8 : rect.bottom + 8;

    setPopoverCoords({
      top,
      left,
      placement,
      maxWidth: targetWidth,
      maxHeight,
    });
  }, []);

  const handleMouseEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    calculatePosition();
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 150);
  };

  useEffect(() => {
    if (!isHovered) return;

    const handleScrollOrResize = () => {
      calculatePosition();
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isHovered, calculatePosition]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCopyText) {
      onCopyText(cleanContent);
    } else if (window.inkwellApi?.copyToClipboard) {
      window.inkwellApi.copyToClipboard(cleanContent);
    } else if (navigator?.clipboard) {
      navigator.clipboard.writeText(cleanContent);
    }

    setIsCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsCopied(false), 1500);
  };

  return (
    <span
      ref={chipRef}
      className="relative inline-flex items-center align-middle my-0 mx-1 group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Clickable Chip */}
      <button
        type="button"
        onClick={handleCopy}
        title={`Click to copy ${isQnq ? 'qNq snippet' : 'pasted content'}`}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-[11px] leading-none bg-ink-card/90 hover:bg-ink-hover border ${
          isQnq
            ? 'border-amber-500/30 hover:border-amber-400/60 bg-amber-950/15'
            : 'border-ink-accent/30 hover:border-ink-accent-light/50 bg-ink-accent-muted/20'
        } text-ink-text transition-all duration-150 cursor-pointer select-none max-w-full shadow-subtle`}
      >
        <span
          className={`font-semibold flex items-center gap-1 shrink-0 ${
            isQnq ? 'text-amber-400' : 'text-ink-accent-light'
          }`}
        >
          {isQnq ? (
            <CodeIcon className="w-3 h-3 text-amber-400" />
          ) : (
            <CopyIcon className="w-3 h-3 text-ink-accent-light" />
          )}
          <span className="text-[9px] uppercase tracking-wider font-semibold">{isQnq ? 'qNq' : 'PASTE'}</span>
        </span>

        {/* Trimmed syntax-highlighted preview */}
        {cleanContent.trim() ? (
          <span className="font-mono text-[11px] truncate text-ink-text max-w-[240px] inline-block">
            {renderSyntaxHighlighted(trimmedPreview)}
          </span>
        ) : (
          <span className="text-ink-faint italic font-sans text-[10px]">empty</span>
        )}

        {/* Copy / Copied Indicator */}
        <span className="shrink-0 ml-1 flex items-center">
          {isCopied ? (
            <span className="inline-flex items-center gap-0.5 text-emerald-400 text-[10px] font-sans font-medium">
              <CheckIcon className="w-3 h-3" />
              <span>Copied</span>
            </span>
          ) : (
            <span className="text-ink-faint text-[9px] font-mono group-hover:text-ink-muted transition-colors">
              copy
            </span>
          )}
        </span>
      </button>

      {/* Universal Floating Topmost Portal Popover */}
      {isHovered && cleanContent.trim().length > 0 && isTrimmed && popoverCoords && typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: `${popoverCoords.top}px`,
              left: `${popoverCoords.left}px`,
              maxWidth: `${popoverCoords.maxWidth}px`,
              transform: popoverCoords.placement === 'top' ? 'translateY(-100%)' : 'none',
              zIndex: 99999,
            }}
            onMouseEnter={() => {
              if (closeTimerRef.current) {
                clearTimeout(closeTimerRef.current);
                closeTimerRef.current = null;
              }
              setIsHovered(true);
            }}
            onMouseLeave={handleMouseLeave}
            className="w-max bg-ink-panel/95 backdrop-blur-md rounded-md border border-ink-border shadow-elevated p-2.5 text-left pointer-events-auto animate-in fade-in zoom-in-95 duration-100 font-sans select-none"
          >
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-ink-border-subtle text-[10px] text-ink-muted select-none">
              <span
                className={`font-medium flex items-center gap-1 ${
                  isQnq ? 'text-amber-400' : 'text-ink-accent-light'
                }`}
              >
                {isQnq ? <CodeIcon className="w-3 h-3" /> : <CopyIcon className="w-3 h-3" />}
                <span>
                  {isQnq ? 'qNq Snippet' : 'Pasted Content'} ({cleanContent.length} chars)
                </span>
              </span>
              <span className="text-ink-faint font-mono text-[9px]">Click chip to copy</span>
            </div>

            <pre
              style={{ maxHeight: `${popoverCoords.maxHeight - 48}px` }}
              className="font-mono text-[11px] leading-relaxed text-ink-text whitespace-pre-wrap break-words overflow-y-auto select-text p-2 bg-ink-bg rounded border border-ink-border-subtle"
            >
              {renderSyntaxHighlighted(cleanContent)}
            </pre>
          </div>,
          document.body
        )}
    </span>
  );
};

export const RichContentText: React.FC<RichContentTextProps> = ({
  text,
  className = '',
  onCopyText,
}) => {
  if (!text) return null;

  const segments = parseSegments(text);

  return (
    <span className={`inline leading-relaxed ${className}`}>
      {segments.map((seg, idx) => {
        if (seg.type === 'chip') {
          return <ClickableChip key={idx} segment={seg} onCopyText={onCopyText} />;
        }
        return (
          <span key={idx} className="whitespace-pre-wrap">
            {seg.content}
          </span>
        );
      })}
    </span>
  );
};
