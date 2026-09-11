/**
 * Pure text reconstruction logic for Inkwell.
 * Shared between main process (sync) and renderer (live feed).
 */

export type ChipCategory = 'regular' | 'qNq';

export const CHIP_START_REGULAR = '\u001DPASTE:regular\u001E';
export const CHIP_START_QNQ = '\u001DPASTE:qNq\u001E';
export const CHIP_END = '\u001F';

/**
 * Strips leading and trailing backticks from pasted/snippet content.
 */
export function trimBackticks(str: string): string {
  if (!str) return '';
  return str.replace(/^`+|`+$/g, '');
}

/**
 * Builds an internal chip representation.
 * - regular: PASTED
 * - qNq: \nPASTED\n
 */
export function makeChip(category: ChipCategory, content: string): string {
  const clean = trimBackticks(content);
  if (category === 'qNq') {
    return `\n${CHIP_START_QNQ}${clean}${CHIP_END}\n`;
  }
  return `${CHIP_START_REGULAR}${clean}${CHIP_END}`;
}

/**
 * Strips all internal chip markers to return plain text identical
 * to what appears in universal text editors.
 */
export function stripChipMarkers(text: string): string {
  if (!text) return '';
  return text
    .replace(/\u001DPASTE:(?:regular|qNq)\u001E([\s\S]*?)\u001F/g, '$1')
    .replace(/«chip:(?:regular|qNq)»([\s\S]*?)«\/chip»/g, '$1');
}

function isAlphanumeric(ch: string): boolean {
  return /^[a-zA-Z0-9]$/.test(ch);
}

function deleteSelection(buffer: string[], selection: [number, number]): number {
  const start = Math.min(selection[0], selection[1]);
  const end = Math.max(selection[0], selection[1]);
  if (start >= end || end > buffer.length) {
    return Math.min(selection[0], buffer.length);
  }
  buffer.splice(start, end - start);
  return start;
}

function decodeBase64Safe(b64: string): string {
  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(b64, 'base64').toString('utf8');
    }
    if (typeof atob !== 'undefined') {
      const binaryString = atob(b64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return new TextDecoder().decode(bytes);
    }
  } catch (e) {
    console.error('Inkwell: Base64 decode error:', e);
  }
  return '';
}

interface BufferSnapshot {
  buffer: string[];
  cursor: number;
}

export function reconstructText(tokens: string[]): string {
  const buffer: string[] = [];
  let cursor = 0;
  let selection: [number, number] | null = null;
  let lastPastedContent = '';

  // History stack of buffer snapshots for exact undo ([⌘Z]) reproduction
  const historyStack: BufferSnapshot[] = [];

  const saveSnapshot = () => {
    historyStack.push({
      buffer: [...buffer],
      cursor,
    });
    // Limit history stack size to prevent unbounded memory growth in huge sessions
    if (historyStack.length > 500) {
      historyStack.shift();
    }
  };

  for (const rawToken of tokens) {
    if (!rawToken) continue;

    // 1. Paste Token: [PASTE:b64:<data>] or [PASTE:<data>]
    if (rawToken.startsWith('[PASTE:')) {
      saveSnapshot();
      if (selection) {
        cursor = deleteSelection(buffer, selection);
        selection = null;
      }
      let content = '';
      if (rawToken.startsWith('[PASTE:b64:')) {
        const b64 = rawToken.slice(11, -1);
        content = decodeBase64Safe(b64);
      } else {
        content = rawToken.slice(7, -1);
      }
      lastPastedContent = content;

      const chip = makeChip('regular', content);
      buffer.splice(cursor, 0, chip);
      cursor += 1;
      continue;
    }

    // 2. Explicit QnQ Snippet Tokens: [Q3Q:...], [Q4Q:...], [QNQ:...], [Q...Q:...]
    if (/^\[Q[0-9a-zA-Z]+Q:/.test(rawToken)) {
      if (selection) {
        saveSnapshot();
        cursor = deleteSelection(buffer, selection);
        selection = null;
      }

      let content = lastPastedContent;
      const b64Match = rawToken.match(/^\[Q[0-9a-zA-Z]+Q:b64:(.*)\]$/);
      if (b64Match) {
        const decoded = decodeBase64Safe(b64Match[1]);
        if (decoded) {
          content = decoded;
          lastPastedContent = decoded;
        }
      } else {
        const directMatch = rawToken.match(/^\[Q[0-9a-zA-Z]+Q:(.*)\]$/);
        if (directMatch && directMatch[1]) {
          content = directMatch[1];
          lastPastedContent = directMatch[1];
        }
      }

      // Check if macro trigger (e.g. 'q3' or 'q4') exists right before cursor in buffer
      if (
        cursor >= 2 &&
        (buffer[cursor - 2] === 'q' || buffer[cursor - 2] === 'Q') &&
        /^[0-9a-zA-Z]$/.test(buffer[cursor - 1])
      ) {
        buffer.splice(cursor - 2, 2);
        cursor -= 2;
        if (historyStack.length >= 2) {
          historyStack.pop();
          historyStack.pop();
        }
        saveSnapshot();
      } else {
        saveSnapshot();
      }

      const chip = makeChip('qNq', content);
      buffer.splice(cursor, 0, chip);
      cursor += 1;
      continue;
    }

    // Single character (not a bracketed control token)
    const isSingleChar = rawToken.length === 1 && !rawToken.startsWith('[');

    if (isSingleChar) {
      // Universal qNq snippet detection when user types 'q' closing macro e.g. 'q3' + 'q'
      const lowerChar = rawToken.toLowerCase();
      if (
        lowerChar === 'q' &&
        cursor >= 2 &&
        (buffer[cursor - 2] === 'q' || buffer[cursor - 2] === 'Q') &&
        /^[0-9a-zA-Z]$/.test(buffer[cursor - 1])
      ) {
        if (selection) {
          cursor = deleteSelection(buffer, selection);
          selection = null;
        }
        buffer.splice(cursor - 2, 2);
        cursor -= 2;
        if (historyStack.length >= 2) {
          historyStack.pop();
          historyStack.pop();
        }
        saveSnapshot();

        const chip = makeChip('qNq', lastPastedContent);
        buffer.splice(cursor, 0, chip);
        cursor += 1;
        continue;
      }

      saveSnapshot();
      if (selection) {
        cursor = deleteSelection(buffer, selection);
        selection = null;
      }

      buffer.splice(cursor, 0, rawToken);
      cursor += 1;
    } else if (rawToken === '[⌫]') {
      // Backspace
      saveSnapshot();
      if (selection) {
        cursor = deleteSelection(buffer, selection);
        selection = null;
      } else if (cursor > 0) {
        buffer.splice(cursor - 1, 1);
        cursor -= 1;
      }
    } else if (rawToken === '[⌦]') {
      // Forward delete
      saveSnapshot();
      if (selection) {
        cursor = deleteSelection(buffer, selection);
        selection = null;
      } else if (cursor < buffer.length) {
        buffer.splice(cursor, 1);
      }
    } else if (rawToken === '[↵]') {
      // Newline
      saveSnapshot();
      if (selection) {
        cursor = deleteSelection(buffer, selection);
        selection = null;
      }
      buffer.splice(cursor, 0, '\n');
      cursor += 1;
    } else if (rawToken === '[←]') {
      // Arrow left
      cursor = Math.max(0, cursor - 1);
      selection = null;
    } else if (rawToken === '[→]') {
      // Arrow right
      cursor = Math.min(buffer.length, cursor + 1);
      selection = null;
    } else if (rawToken === '[↑]' || rawToken === '[↓]') {
      // Arrow up / down: clear selection
      selection = null;
    } else if (rawToken === '[⇥]') {
      // Tab
      saveSnapshot();
      if (selection) {
        cursor = deleteSelection(buffer, selection);
        selection = null;
      }
      buffer.splice(cursor, 0, '\t');
      cursor += 1;
    } else if (rawToken === '[⌘A]') {
      // Select all
      selection = [0, buffer.length];
    } else if (rawToken === '[⇧←]') {
      // Shift + Left: extend or shrink selection backwards
      const anchor: number = selection ? selection[0] : cursor;
      const newCursor = Math.max(0, cursor - 1);
      selection = anchor !== newCursor ? [anchor, newCursor] : null;
      cursor = newCursor;
    } else if (rawToken === '[⇧→]') {
      // Shift + Right: extend or shrink selection forwards
      const anchor: number = selection ? selection[0] : cursor;
      const newCursor = Math.min(buffer.length, cursor + 1);
      selection = anchor !== newCursor ? [anchor, newCursor] : null;
      cursor = newCursor;
    } else if (rawToken === '[⌘⌫]') {
      // Command + Backspace: delete to start of line
      saveSnapshot();
      if (selection) {
        cursor = deleteSelection(buffer, selection);
        selection = null;
      } else {
        let start = cursor;
        while (start > 0 && buffer[start - 1] !== '\n') {
          start -= 1;
        }
        if (start < cursor) {
          buffer.splice(start, cursor - start);
          cursor = start;
        }
      }
    } else if (rawToken === '[⌥⌫]') {
      // Option + Backspace: delete previous word
      saveSnapshot();
      if (selection) {
        cursor = deleteSelection(buffer, selection);
        selection = null;
      } else {
        let start = cursor;
        // 1. Skip trailing spaces
        while (start > 0 && buffer[start - 1] === ' ') {
          start -= 1;
        }
        // 2. Delete word chunk (alphanumeric or punctuation group)
        if (start > 0) {
          const isAlpha = isAlphanumeric(buffer[start - 1]);
          while (
            start > 0 &&
            buffer[start - 1] !== ' ' &&
            buffer[start - 1] !== '\n' &&
            isAlphanumeric(buffer[start - 1]) === isAlpha
          ) {
            start -= 1;
          }
        }
        if (start < cursor) {
          buffer.splice(start, cursor - start);
          cursor = start;
        }
      }
    } else if (rawToken === '[⌘Z]') {
      // Command + Z: Undo last mutation (including paste / snippet / characters)
      if (historyStack.length > 0) {
        const last = historyStack.pop()!;
        buffer.length = 0;
        buffer.push(...last.buffer);
        cursor = Math.min(last.cursor, buffer.length);
        selection = null;
      }
    }
    // Any other unknown bracketed tokens are safely ignored
  }

  return buffer.join('');
}
