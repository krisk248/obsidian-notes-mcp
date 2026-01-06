/**
 * Token Optimizer Tests
 */

import { describe, test, expect } from 'bun:test';
import {
  truncateContent,
  paginate,
  extractSection,
  formatFrontmatter,
} from '../../src/utils/token-optimizer.js';

describe('truncateContent', () => {
  test('returns content unchanged if under limit', () => {
    const content = 'Short content';
    const result = truncateContent(content, 100);
    expect(result.content).toBe('Short content');
    expect(result.truncated).toBe(false);
  });

  test('truncates content over limit', () => {
    const content = 'This is a longer piece of content that should be truncated';
    const result = truncateContent(content, 30);
    expect(result.content.length).toBeLessThanOrEqual(30);
    expect(result.truncated).toBe(true);
    expect(result.content).toContain('[truncated]');
  });

  test('truncates at word boundary when possible', () => {
    const content = 'Word1 Word2 Word3 Word4 Word5';
    const result = truncateContent(content, 25);
    expect(result.truncated).toBe(true);
    // Should end with truncation marker
    expect(result.content).toContain('[truncated]');
  });
});

describe('paginate', () => {
  test('returns first page by default', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = paginate(items, 1, 3);
    expect(result.items).toEqual([1, 2, 3]);
    expect(result.total).toBe(10);
    expect(result.page).toBe(1);
    expect(result.hasMore).toBe(true);
  });

  test('returns correct page', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = paginate(items, 2, 3);
    expect(result.items).toEqual([4, 5, 6]);
    expect(result.hasMore).toBe(true);
  });

  test('handles last page', () => {
    const items = [1, 2, 3, 4, 5];
    const result = paginate(items, 2, 3);
    expect(result.items).toEqual([4, 5]);
    expect(result.hasMore).toBe(false);
  });

  test('handles empty array', () => {
    const result = paginate([], 1, 10);
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.hasMore).toBe(false);
  });
});

describe('extractSection', () => {
  test('extracts section by heading', () => {
    const content = `# Main Title

Some intro text.

## Section One

Content of section one.

## Section Two

Content of section two.
`;
    const result = extractSection(content, 'Section One');
    expect(result).toBe('Content of section one.');
  });

  test('returns null if heading not found', () => {
    const content = '# Title\n\nContent';
    const result = extractSection(content, 'Nonexistent');
    expect(result).toBeNull();
  });

  test('handles nested headings', () => {
    const content = `# Main

## Sub Section

Sub content here.

### Nested

Nested content.

## Another Sub

More content.
`;
    const result = extractSection(content, 'Sub Section');
    expect(result).toContain('Sub content here.');
    expect(result).toContain('### Nested');
  });
});

describe('formatFrontmatter', () => {
  test('formats simple key-value pairs', () => {
    const frontmatter = { title: 'Test', date: '2026-01-06' };
    const result = formatFrontmatter(frontmatter);
    expect(result).toContain('---');
    expect(result).toContain('title: Test');
    expect(result).toContain('date: 2026-01-06');
  });

  test('formats arrays', () => {
    const frontmatter = { tags: ['tag1', 'tag2'] };
    const result = formatFrontmatter(frontmatter);
    expect(result).toContain('tags:');
    expect(result).toContain('  - tag1');
    expect(result).toContain('  - tag2');
  });
});
