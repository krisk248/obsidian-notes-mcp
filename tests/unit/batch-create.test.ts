/**
 * Batch Create Tool Tests
 *
 * Tests for batch_create implementation
 */

import { describe, test, expect, mock } from 'bun:test';
import { batchCreate, batchCreateSchema } from '../../src/tools/batch.js';
import type { ObsidianClient } from '../../src/api/obsidian-client.js';

describe('batchCreateSchema', () => {
  test('requires notes array parameter', () => {
    const input = {
      notes: [
        { path: 'note1.md', content: 'Content 1' },
        { path: 'note2.md', content: 'Content 2' },
      ],
    };
    const result = batchCreateSchema.parse(input);
    expect(result.notes.length).toBe(2);
    expect(result.overwrite).toBe(false); // default
  });

  test('accepts notes with optional frontmatter', () => {
    const input = {
      notes: [
        {
          path: 'note1.md',
          content: 'Content 1',
          frontmatter: { title: 'Note 1', tags: ['test'] },
        },
      ],
    };
    const result = batchCreateSchema.parse(input);
    expect(result.notes[0].frontmatter).toEqual({ title: 'Note 1', tags: ['test'] });
  });

  test('accepts overwrite parameter', () => {
    const input = {
      notes: [{ path: 'note1.md', content: 'Content' }],
      overwrite: true,
    };
    const result = batchCreateSchema.parse(input);
    expect(result.overwrite).toBe(true);
  });

  test('requires path and content in notes', () => {
    const input = {
      notes: [{ path: 'note1.md' }], // missing content
    };
    expect(() => batchCreateSchema.parse(input)).toThrow();
  });
});

describe('batchCreate tool', () => {
  test('creates multiple notes successfully', async () => {
    const mockClient = {
      getFile: mock(async () => {
        throw new Error('File not found');
      }),
      createFile: mock(async () => {
        // Mock successful creation
      }),
    } as unknown as ObsidianClient;

    const result = await batchCreate(mockClient, {
      notes: [
        { path: 'note1.md', content: 'Content 1' },
        { path: 'note2.md', content: 'Content 2' },
        { path: 'note3.md', content: 'Content 3' },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.successCount).toBe(3);
      expect(result.data.errorCount).toBe(0);
      expect(result.data.notes.length).toBe(3);
      expect(result.data.notes[0].created).toBe(true);
    }
  });

  test('prevents overwriting existing files by default', async () => {
    const mockClient = {
      getFile: mock(async (path: string) => {
        if (path === 'note1.md') {
          return { path: 'note1.md', content: 'Existing content' };
        }
        throw new Error('File not found');
      }),
      createFile: mock(async () => {
        // Mock successful creation
      }),
    } as unknown as ObsidianClient;

    const result = await batchCreate(mockClient, {
      notes: [
        { path: 'note1.md', content: 'New content' },
        { path: 'note2.md', content: 'New note' },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.successCount).toBe(1);
      expect(result.data.errorCount).toBe(1);
      expect(result.data.notes[0].error).toBe('File already exists');
      expect(result.data.notes[1].created).toBe(true);
    }
  });

  test('overwrites existing files when overwrite is true', async () => {
    let createCallCount = 0;
    const mockClient = {
      getFile: mock(async () => {
        return { path: 'note1.md', content: 'Existing content' };
      }),
      createFile: mock(async () => {
        createCallCount++;
      }),
    } as unknown as ObsidianClient;

    const result = await batchCreate(mockClient, {
      notes: [{ path: 'note1.md', content: 'New content' }],
      overwrite: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.successCount).toBe(1);
      expect(result.data.errorCount).toBe(0);
      expect(result.data.notes[0].created).toBe(true);
    }
  });

  test('creates notes with frontmatter', async () => {
    const createdContent: string[] = [];
    const mockClient = {
      getFile: mock(async () => {
        throw new Error('File not found');
      }),
      createFile: mock(async (path: string, content: string) => {
        createdContent.push(content);
      }),
    } as unknown as ObsidianClient;

    const result = await batchCreate(mockClient, {
      notes: [
        {
          path: 'note1.md',
          content: 'Note content',
          frontmatter: { title: 'My Note', tags: ['test', 'sample'] },
        },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.successCount).toBe(1);
      expect(createdContent[0]).toContain('---');
      expect(createdContent[0]).toContain('title: My Note');
      expect(createdContent[0]).toContain('tags:');
      expect(createdContent[0]).toContain('  - test');
      expect(createdContent[0]).toContain('  - sample');
      expect(createdContent[0]).toContain('Note content');
    }
  });

  test('handles partial failures in batch creation', async () => {
    const mockClient = {
      getFile: mock(async () => {
        throw new Error('File not found');
      }),
      createFile: mock(async (path: string) => {
        if (path === 'note2.md') {
          throw new Error('Permission denied');
        }
      }),
    } as unknown as ObsidianClient;

    const result = await batchCreate(mockClient, {
      notes: [
        { path: 'note1.md', content: 'Content 1' },
        { path: 'note2.md', content: 'Content 2' },
        { path: 'note3.md', content: 'Content 3' },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.successCount).toBe(2);
      expect(result.data.errorCount).toBe(1);
      expect(result.data.notes[0].created).toBe(true);
      expect(result.data.notes[1].error).toBe('Permission denied');
      expect(result.data.notes[2].created).toBe(true);
    }
  });

  test('creates notes with no frontmatter', async () => {
    const createdContent: string[] = [];
    const mockClient = {
      getFile: mock(async () => {
        throw new Error('File not found');
      }),
      createFile: mock(async (path: string, content: string) => {
        createdContent.push(content);
      }),
    } as unknown as ObsidianClient;

    const result = await batchCreate(mockClient, {
      notes: [{ path: 'note1.md', content: 'Just content, no frontmatter' }],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.successCount).toBe(1);
      expect(createdContent[0]).toBe('Just content, no frontmatter');
    }
  });

  test('handles empty frontmatter object', async () => {
    const createdContent: string[] = [];
    const mockClient = {
      getFile: mock(async () => {
        throw new Error('File not found');
      }),
      createFile: mock(async (path: string, content: string) => {
        createdContent.push(content);
      }),
    } as unknown as ObsidianClient;

    const result = await batchCreate(mockClient, {
      notes: [
        {
          path: 'note1.md',
          content: 'Content',
          frontmatter: {},
        },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.successCount).toBe(1);
      // Should not add frontmatter delimiters if empty
      expect(createdContent[0]).toBe('Content');
    }
  });

  test('handles complex frontmatter with nested objects', async () => {
    const createdContent: string[] = [];
    const mockClient = {
      getFile: mock(async () => {
        throw new Error('File not found');
      }),
      createFile: mock(async (path: string, content: string) => {
        createdContent.push(content);
      }),
    } as unknown as ObsidianClient;

    const result = await batchCreate(mockClient, {
      notes: [
        {
          path: 'note1.md',
          content: 'Content',
          frontmatter: {
            title: 'Note',
            meta: { author: 'John', date: '2026-01-06' },
            count: 42,
          },
        },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.successCount).toBe(1);
      expect(createdContent[0]).toContain('---');
      expect(createdContent[0]).toContain('title: Note');
      expect(createdContent[0]).toContain('count: 42');
    }
  });

  test('returns correct result structure for each note', async () => {
    const mockClient = {
      getFile: mock(async (path: string) => {
        if (path === 'existing.md') {
          return { path: 'existing.md', content: 'Existing' };
        }
        throw new Error('Not found');
      }),
      createFile: mock(async () => {
        // Success
      }),
    } as unknown as ObsidianClient;

    const result = await batchCreate(mockClient, {
      notes: [
        { path: 'new.md', content: 'New' },
        { path: 'existing.md', content: 'Should fail' },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes[0]).toHaveProperty('path');
      expect(result.data.notes[0]).toHaveProperty('created');
      expect(result.data.notes[1]).toHaveProperty('path');
      expect(result.data.notes[1]).toHaveProperty('error');
    }
  });
});
