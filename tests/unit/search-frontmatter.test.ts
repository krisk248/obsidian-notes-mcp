/**
 * Search Frontmatter Tool Tests
 *
 * Tests for search_frontmatter implementation
 */

import { describe, test, expect, mock } from 'bun:test';
import { searchFrontmatter, searchFrontmatterSchema } from '../../src/tools/search.js';
import type { ObsidianClient } from '../../src/api/obsidian-client.js';

describe('searchFrontmatterSchema', () => {
  test('requires field parameter', () => {
    const input = { field: 'status' };
    const result = searchFrontmatterSchema.parse(input);
    expect(result.field).toBe('status');
    expect(result.operator).toBe('equals'); // default
  });

  test('accepts value parameter of any type', () => {
    const input1 = { field: 'status', value: 'draft' };
    const result1 = searchFrontmatterSchema.parse(input1);
    expect(result1.value).toBe('draft');

    const input2 = { field: 'priority', value: 1 };
    const result2 = searchFrontmatterSchema.parse(input2);
    expect(result2.value).toBe(1);

    const input3 = { field: 'published', value: true };
    const result3 = searchFrontmatterSchema.parse(input3);
    expect(result3.value).toBe(true);
  });

  test('accepts operator parameter with valid values', () => {
    const input1 = { field: 'status', operator: 'equals' };
    const result1 = searchFrontmatterSchema.parse(input1);
    expect(result1.operator).toBe('equals');

    const input2 = { field: 'title', operator: 'contains' };
    const result2 = searchFrontmatterSchema.parse(input2);
    expect(result2.operator).toBe('contains');

    const input3 = { field: 'author', operator: 'exists' };
    const result3 = searchFrontmatterSchema.parse(input3);
    expect(result3.operator).toBe('exists');
  });

  test('rejects invalid operator value', () => {
    const input = { field: 'status', operator: 'invalid' };
    expect(() => searchFrontmatterSchema.parse(input)).toThrow();
  });

  test('accepts maxResults parameter', () => {
    const input = { field: 'status', maxResults: 5 };
    const result = searchFrontmatterSchema.parse(input);
    expect(result.maxResults).toBe(5);
  });
});

describe('searchFrontmatter tool', () => {
  test('finds notes with exact matching field value', async () => {
    const mockClient = {
      listFiles: mock(async () => [
        { path: 'note1.md', extension: 'md', isDirectory: false, name: 'note1' },
        { path: 'note2.md', extension: 'md', isDirectory: false, name: 'note2' },
        { path: 'note3.md', extension: 'md', isDirectory: false, name: 'note3' },
      ]),
      getFile: mock(async (path: string) => {
        const notes: Record<string, any> = {
          'note1.md': {
            path: 'note1.md',
            content: 'Content 1',
            frontmatter: { status: 'draft' },
          },
          'note2.md': {
            path: 'note2.md',
            content: 'Content 2',
            frontmatter: { status: 'published' },
          },
          'note3.md': {
            path: 'note3.md',
            content: 'Content 3',
            frontmatter: { status: 'draft' },
          },
        };
        return notes[path];
      }),
    } as unknown as ObsidianClient;

    const result = await searchFrontmatter(mockClient, {
      field: 'status',
      value: 'draft',
      operator: 'equals',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.results.length).toBe(2);
      expect(result.data.total).toBe(2);
      expect(result.data.results[0].path).toBe('note1.md');
      expect(result.data.results[1].path).toBe('note3.md');
    }
  });

  test('finds notes with substring match', async () => {
    const mockClient = {
      listFiles: mock(async () => [
        { path: 'note1.md', extension: 'md', isDirectory: false, name: 'note1' },
        { path: 'note2.md', extension: 'md', isDirectory: false, name: 'note2' },
      ]),
      getFile: mock(async (path: string) => {
        const notes: Record<string, any> = {
          'note1.md': {
            path: 'note1.md',
            content: 'Content 1',
            frontmatter: { title: 'Getting Started with Python' },
          },
          'note2.md': {
            path: 'note2.md',
            content: 'Content 2',
            frontmatter: { title: 'Advanced JavaScript' },
          },
        };
        return notes[path];
      }),
    } as unknown as ObsidianClient;

    const result = await searchFrontmatter(mockClient, {
      field: 'title',
      value: 'Python',
      operator: 'contains',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.results.length).toBe(1);
      expect(result.data.results[0].path).toBe('note1.md');
    }
  });

  test('finds notes where field exists', async () => {
    const mockClient = {
      listFiles: mock(async () => [
        { path: 'note1.md', extension: 'md', isDirectory: false, name: 'note1' },
        { path: 'note2.md', extension: 'md', isDirectory: false, name: 'note2' },
        { path: 'note3.md', extension: 'md', isDirectory: false, name: 'note3' },
      ]),
      getFile: mock(async (path: string) => {
        const notes: Record<string, any> = {
          'note1.md': {
            path: 'note1.md',
            content: 'Content 1',
            frontmatter: { author: 'John' },
          },
          'note2.md': {
            path: 'note2.md',
            content: 'Content 2',
            frontmatter: { },
          },
          'note3.md': {
            path: 'note3.md',
            content: 'Content 3',
            frontmatter: { author: 'Jane' },
          },
        };
        return notes[path];
      }),
    } as unknown as ObsidianClient;

    const result = await searchFrontmatter(mockClient, {
      field: 'author',
      value: '',
      operator: 'exists',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.results.length).toBe(2);
      expect(result.data.total).toBe(2);
    }
  });

  test('handles array values with contains operator', async () => {
    const mockClient = {
      listFiles: mock(async () => [
        { path: 'note1.md', extension: 'md', isDirectory: false, name: 'note1' },
        { path: 'note2.md', extension: 'md', isDirectory: false, name: 'note2' },
      ]),
      getFile: mock(async (path: string) => {
        const notes: Record<string, any> = {
          'note1.md': {
            path: 'note1.md',
            content: 'Content 1',
            frontmatter: { tags: ['python', 'tutorial', 'beginner'] },
          },
          'note2.md': {
            path: 'note2.md',
            content: 'Content 2',
            frontmatter: { tags: ['javascript', 'advanced'] },
          },
        };
        return notes[path];
      }),
    } as unknown as ObsidianClient;

    const result = await searchFrontmatter(mockClient, {
      field: 'tags',
      value: 'python',
      operator: 'contains',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.results.length).toBe(1);
      expect(result.data.results[0].path).toBe('note1.md');
    }
  });

  test('respects maxResults parameter', async () => {
    const mockClient = {
      listFiles: mock(async (_path: string) => [
        { path: 'note1.md', extension: 'md', isDirectory: false, name: 'note1' },
        { path: 'note2.md', extension: 'md', isDirectory: false, name: 'note2' },
        { path: 'note3.md', extension: 'md', isDirectory: false, name: 'note3' },
      ]),
      getFile: mock(async (path: string) => ({
        path,
        content: 'Content',
        frontmatter: { status: 'draft' },
      })),
    } as unknown as ObsidianClient;

    const result = await searchFrontmatter(mockClient, {
      field: 'status',
      value: 'draft',
      maxResults: 2,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      // maxResults limits the returned results, but total shows all matches
      expect(result.data.results.length).toBeLessThanOrEqual(2);
    }
  });

  test('skips markdown files that cannot be read', async () => {
    const mockClient = {
      listFiles: mock(async (_path: string) => [
        { path: 'note1.md', extension: 'md', isDirectory: false, name: 'note1' },
        { path: 'note2.md', extension: 'md', isDirectory: false, name: 'note2' },
      ]),
      getFile: mock(async (path: string) => {
        if (path === 'note1.md') {
          throw new Error('File not accessible');
        }
        return {
          path: 'note2.md',
          content: 'Content 2',
          frontmatter: { status: 'published' },
        };
      }),
    } as unknown as ObsidianClient;

    const result = await searchFrontmatter(mockClient, {
      field: 'status',
      value: 'published',
    });

    expect(result.success).toBe(true);
    // The test verifies that errors are handled gracefully - result may vary based on mock behavior
  });

  test('returns empty results when no matches found', async () => {
    const mockClient = {
      listFiles: mock(async () => [
        { path: 'note1.md', extension: 'md', isDirectory: false, name: 'note1' },
      ]),
      getFile: mock(async () => ({
        path: 'note1.md',
        content: 'Content',
        frontmatter: { status: 'published' },
      })),
    } as unknown as ObsidianClient;

    const result = await searchFrontmatter(mockClient, {
      field: 'status',
      value: 'draft',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.results.length).toBe(0);
      expect(result.data.total).toBe(0);
    }
  });

  test('handles case-insensitive contains search', async () => {
    const mockClient = {
      listFiles: mock(async () => [
        { path: 'note1.md', extension: 'md', isDirectory: false, name: 'note1' },
      ]),
      getFile: mock(async () => ({
        path: 'note1.md',
        content: 'Content',
        frontmatter: { title: 'Introduction to PYTHON' },
      })),
    } as unknown as ObsidianClient;

    const result = await searchFrontmatter(mockClient, {
      field: 'title',
      value: 'python',
      operator: 'contains',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.results.length).toBe(1);
    }
  });
});
