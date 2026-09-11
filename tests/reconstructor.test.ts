import { describe, it, expect } from 'vitest';
import {
  reconstructText,
  stripChipMarkers,
  trimBackticks,
} from '../src/main/sync/reconstructor';
import { parseSegments } from '../src/renderer/src/components/RichContentText';

describe('reconstructText & Clickable Chips', () => {
  it('reconstructs plain typed characters', () => {
    const tokens = ['h', 'e', 'l', 'l', 'o', ' ', 'w', 'o', 'r', 'l', 'd'];
    expect(reconstructText(tokens)).toBe('hello world');
  });

  it('preserves spaces between words (regression check)', () => {
    const tokens = ['f', 'o', 'o', ' ', 'b', 'a', 'r', ' ', 'b', 'a', 'z'];
    expect(reconstructText(tokens)).toBe('foo bar baz');
  });

  it('handles backspace [⌫] deleting the previous character', () => {
    const tokens = ['a', 'b', 'c', '[⌫]', 'd'];
    expect(reconstructText(tokens)).toBe('abd');
  });

  it('handles forward delete [⌦]', () => {
    const tokens = ['a', 'b', 'c', '[←]', '[←]', '[⌦]'];
    expect(reconstructText(tokens)).toBe('ac');
  });

  it('handles newline token [↵] inserting newline', () => {
    const tokens = ['l', 'i', 'n', 'e', '1', '[↵]', 'l', 'i', 'n', 'e', '2'];
    expect(reconstructText(tokens)).toBe('line1\nline2');
  });

  it('handles tab token [⇥] inserting tab', () => {
    const tokens = ['c', 'o', 'd', 'e', ':', '[↵]', '[⇥]', 'x'];
    expect(reconstructText(tokens)).toBe('code:\n\tx');
  });

  it('handles select-all [⌘A] then type replacing the whole buffer', () => {
    const tokens = ['h', 'e', 'l', 'l', 'o', '[⌘A]', 'w', 'o', 'r', 'l', 'd'];
    expect(reconstructText(tokens)).toBe('world');
  });

  it('handles Option+Backspace [⌥⌫] deleting the whole previous word', () => {
    const tokens = [
      'h', 'e', 'l', 'l', 'o', ' ', 'w', 'o', 'r', 'l', 'd',
      '[⌥⌫]',
      't', 'h', 'e', 'r', 'e',
    ];
    expect(reconstructText(tokens)).toBe('hello there');
  });

  it('handles Cmd+Backspace [⌘⌫] deleting back to the start of the current line only', () => {
    const tokens = [
      'f', 'i', 'r', 's', 't', ' ', 'l', 'i', 'n', 'e', '[↵]',
      's', 'e', 'c', 'o', 'n', 'd', ' ', 'l', 'i', 'n', 'e',
      '[⌘⌫]',
      'n', 'e', 'w',
    ];
    expect(reconstructText(tokens)).toBe('first line\nnew');
  });

  it('handles Shift+Arrow ([⇧←], [⇧→]) selection replaced by the next typed character', () => {
    const tokens = ['t', 'e', 's', 't', '[⇧←]', '[⇧←]', 'x'];
    expect(reconstructText(tokens)).toBe('tex');
  });

  describe('trimBackticks', () => {
    it('trims leading and trailing backticks from content', () => {
      expect(trimBackticks('```console.log("hello");```')).toBe('console.log("hello");');
      expect(trimBackticks('`inline code`')).toBe('inline code');
      expect(trimBackticks('````SELECT * FROM users;````')).toBe('SELECT * FROM users;');
      expect(trimBackticks('plain text without backticks')).toBe('plain text without backticks');
    });
  });

  describe('Clickable Chips: { regular, qNq }', () => {
    it('handles regular paste without artificial backticks and strips leading/trailing backticks', () => {
      const pasted = '```const x = 42;```';
      const b64 = Buffer.from(pasted).toString('base64');
      const tokens = ['l', 'e', 't', ' ', '[PASTE:b64:' + b64 + ']', ' ', 'y'];
      const raw = reconstructText(tokens);

      // Plain text sync with universal editor
      const plain = stripChipMarkers(raw);
      expect(plain).toBe('let const x = 42; y');

      // Parsed segments for UI
      const segments = parseSegments(raw);
      expect(segments).toHaveLength(3);
      expect(segments[0]).toEqual({ type: 'text', content: 'let ' });
      expect(segments[1]).toEqual({
        type: 'chip',
        category: 'regular',
        content: 'const x = 42;',
      });
      expect(segments[2]).toEqual({ type: 'text', content: ' y' });
    });

    it('handles qNq snippet with \\nPASTED\\n and trimmed backticks', () => {
      const pasted = '```console.log("hello");```';
      const b64 = Buffer.from(pasted).toString('base64');
      const tokens = ['[PASTE:b64:' + b64 + ']', '[↵]', 'q', '3', 'q', 'm', 'o', 'r', 'e'];
      const raw = reconstructText(tokens);

      // Plain text sync with universal editor: \nPASTED\n
      const plain = stripChipMarkers(raw);
      expect(plain).toBe('console.log("hello");\n\nconsole.log("hello");\nmore');

      // Parsed segments
      const segments = parseSegments(raw);
      const chips = segments.filter((s) => s.type === 'chip');
      expect(chips).toHaveLength(2);
      expect(chips[0]).toEqual({
        type: 'chip',
        category: 'regular',
        content: 'console.log("hello");',
      });
      expect(chips[1]).toEqual({
        type: 'chip',
        category: 'qNq',
        content: 'console.log("hello");',
      });
    });

    it('handles explicit [Q3Q:b64:...] and [Q4Q:b64:...] tokens as qNq category', () => {
      const code = '````SELECT * FROM users;````';
      const b64 = Buffer.from(code).toString('base64');
      const tokens = ['[Q3Q:b64:' + b64 + ']'];
      const raw = reconstructText(tokens);

      const plain = stripChipMarkers(raw);
      expect(plain).toBe('\nSELECT * FROM users;\n');

      const segments = parseSegments(raw);
      const chip = segments.find((s) => s.type === 'chip');
      expect(chip).toEqual({
        type: 'chip',
        category: 'qNq',
        content: 'SELECT * FROM users;',
      });
    });
  });

  describe('Undo [⌘Z] and editor synchronization', () => {
    it('undoes regular paste chip immediately following [PASTE:b64:...]', () => {
      const pasted = 'const x = 42;';
      const b64 = Buffer.from(pasted).toString('base64');
      const tokens = ['l', 'e', 't', ' ', '[PASTE:b64:' + b64 + ']', '[⌘Z]'];
      const raw = reconstructText(tokens);
      expect(stripChipMarkers(raw)).toBe('let ');
    });

    it('undoes qNq snippet expansion immediately following q3q or explicit token', () => {
      const pasted = 'console.log("hello");';
      const b64 = Buffer.from(pasted).toString('base64');
      const tokens = ['[PASTE:b64:' + b64 + ']', '[↵]', 'q', '3', 'q', '[⌘Z]'];
      const raw = reconstructText(tokens);
      expect(stripChipMarkers(raw)).toBe('console.log("hello");\n');

      const tokensExplicit = ['[Q3Q:b64:' + b64 + ']', '[⌘Z]'];
      expect(stripChipMarkers(reconstructText(tokensExplicit))).toBe('');
    });

    it('undoes step-by-step accurately like universal text editors', () => {
      const pasted = 'pasted_text';
      const b64 = Buffer.from(pasted).toString('base64');
      // Type 'a', paste 'pasted_text', type 'b', undo 'b' -> 'a' + paste
      const tokens1 = ['a', '[PASTE:b64:' + b64 + ']', 'b', '[⌘Z]'];
      const raw1 = reconstructText(tokens1);
      expect(stripChipMarkers(raw1)).toBe('apasted_text');

      // Undo again -> 'a'
      const tokens2 = ['a', '[PASTE:b64:' + b64 + ']', 'b', '[⌘Z]', '[⌘Z]'];
      const raw2 = reconstructText(tokens2);
      expect(stripChipMarkers(raw2)).toBe('a');
    });

    it('handles backspace deleting previous character or chip', () => {
      const pasted = 'foo';
      const b64 = Buffer.from(pasted).toString('base64');
      const tokens = ['a', '[PASTE:b64:' + b64 + ']', '[⌫]'];
      const raw = reconstructText(tokens);
      expect(stripChipMarkers(raw)).toBe('a');
    });
  });
});
