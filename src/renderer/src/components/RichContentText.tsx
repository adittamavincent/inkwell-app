import React, { useState, useRef } from 'react';
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
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanContent = segment.content;
  // Trim preview to maximum 24 characters
  const trimmedPreview = cleanContent.length > 24 ? cleanContent.slice(0, 24) + '…' : cleanContent;
  const isTrimmed = cleanContent.length > 24 || cleanContent.includes('\n');
  const isQnq = segment.category === 'qNq';

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
      className="relative inline-flex items-center align-middle my-0 mx-1 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Clickable Chip */}
      <button
        type="button"
        onClick={handleCopy}
        title={`Click to copy ${isQnq ? 'qNq snippet' : 'pasted content'}`}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono text-[11px] leading-none bg-ink-card/95 hover:bg-ink-hover border ${
          isQnq
            ? 'border-amber-500/40 hover:border-amber-400/80 bg-amber-950/10'
            : 'border-ink-accent/40 hover:border-ink-accent'
        } text-ink-text transition-all shadow-xs cursor-pointer select-none max-w-full`}
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
          <span className="text-[10px] tracking-wide font-medium">{isQnq ? 'qNq' : 'PASTED'}</span>
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
            <span className="text-ink-faint text-[9px] group-hover:text-ink-muted transition-colors">
              copy
            </span>
          )}
        </span>
      </button>

      {/* Hover Popover showing FULL Content */}
      {isHovered && cleanContent.trim().length > 0 && isTrimmed && (
        <div className="absolute left-0 bottom-full mb-2 z-50 min-w-[220px] w-max max-w-[85vw] sm:max-w-[440px] bg-ink-sidebar/95 backdrop-blur-md rounded-lg border border-ink-border shadow-2xl p-2.5 text-left pointer-events-auto">
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-ink-border text-[10px] text-ink-muted select-none">
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
            <span className="text-ink-faint">Click chip to copy</span>
          </div>

          <pre className="font-mono text-[11px] leading-relaxed text-ink-text whitespace-pre-wrap break-words max-h-56 overflow-y-auto select-text p-2 bg-ink-bg/90 rounded border border-ink-border-subtle">
            {renderSyntaxHighlighted(cleanContent)}
          </pre>
        </div>
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
