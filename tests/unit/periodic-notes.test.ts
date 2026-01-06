/**
 * Periodic Notes Tools Tests
 *
 * Tests for weekly_note, monthly_note implementations
 */

import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test';
import { weeklyNote, weeklyNoteSchema, monthlyNote, monthlyNoteSchema } from '../../src/tools/periodic.js';
import type { ObsidianClient } from '../../src/api/obsidian-client.js';

describe('weeklyNoteSchema', () => {
  test('accepts valid week format YYYY-Www', () => {
    const input = { week: '2026-W01' };
    const result = weeklyNoteSchema.parse(input);
    expect(result.week).toBe('2026-W01');
    expect(result.maxChars).toBe(5000); // default
  });

  test('accepts optional week parameter', () => {
    const input = {};
    const result = weeklyNoteSchema.parse(input);
    expect(result.week).toBeUndefined();
    expect(result.maxChars).toBe(5000);
  });

  test('accepts custom maxChars', () => {
    const input = { week: '2026-W01', maxChars: 1000 };
    const result = weeklyNoteSchema.parse(input);
    expect(result.maxChars).toBe(1000);
  });
});

describe('monthlyNoteSchema', () => {
  test('accepts valid month format YYYY-MM', () => {
    const input = { month: '2026-01' };
    const result = monthlyNoteSchema.parse(input);
    expect(result.month).toBe('2026-01');
    expect(result.maxChars).toBe(5000);
  });

  test('accepts optional month parameter', () => {
    const input = {};
    const result = monthlyNoteSchema.parse(input);
    expect(result.month).toBeUndefined();
    expect(result.maxChars).toBe(5000);
  });

  test('accepts custom maxChars', () => {
    const input = { month: '2026-01', maxChars: 2000 };
    const result = monthlyNoteSchema.parse(input);
    expect(result.maxChars).toBe(2000);
  });
});

describe('weeklyNote tool', () => {
  let mockClient: ObsidianClient;

  beforeEach(() => {
    mockClient = {
      getWeeklyNote: mock(async (week?: string) => {
        if (!week || week === '2026-W01') {
          return {
            path: 'Weekly/2026-W01.md',
            content: '# Week 1 2026\n\nWeek planning notes',
            frontmatter: { week: '2026-W01' },
            tags: ['weekly'],
          };
        }
        return null;
      }),
      createWeeklyNote: mock(async (week?: string) => {
        // Mock create successful
      }),
    } as unknown as ObsidianClient;
  });

  test('returns existing weekly note with metadata', async () => {
    const result = await weeklyNote(mockClient, { week: '2026-W01', maxChars: 5000 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.path).toBe('Weekly/2026-W01.md');
      expect(result.data.content).toContain('Week 1 2026');
      expect(result.data.truncated).toBe(false);
      expect(result.data.created).toBe(false);
    }
  });

  test('returns error when note cannot be created', async () => {
    mockClient.getWeeklyNote = mock(async () => null);
    mockClient.createWeeklyNote = mock(async () => {
      throw new Error('Plugin not enabled');
    });

    const result = await weeklyNote(mockClient, {});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('OBSIDIAN_ERROR');
      expect(result.error.message).toContain('Plugin not enabled');
    }
  });

  test('truncates content when exceeding maxChars', async () => {
    mockClient.getWeeklyNote = mock(async () => ({
      path: 'Weekly/2026-W01.md',
      content: 'This is a very long weekly note that should be truncated when the character limit is exceeded.',
      tags: [],
    }));

    const result = await weeklyNote(mockClient, { maxChars: 20 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.truncated).toBe(true);
      expect(result.data.content.length).toBeLessThanOrEqual(20);
    }
  });
});

describe('monthlyNote tool', () => {
  let mockClient: ObsidianClient;

  beforeEach(() => {
    mockClient = {
      getMonthlyNote: mock(async (month?: string) => {
        if (!month || month === '2026-01') {
          return {
            path: 'Monthly/2026-01.md',
            content: '# January 2026\n\nMonth review and planning',
            frontmatter: { month: '2026-01' },
            tags: ['monthly'],
          };
        }
        return null;
      }),
      createMonthlyNote: mock(async (month?: string) => {
        // Mock create successful
      }),
    } as unknown as ObsidianClient;
  });

  test('returns existing monthly note with metadata', async () => {
    const result = await monthlyNote(mockClient, { month: '2026-01', maxChars: 5000 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.path).toBe('Monthly/2026-01.md');
      expect(result.data.content).toContain('January 2026');
      expect(result.data.truncated).toBe(false);
      expect(result.data.created).toBe(false);
    }
  });

  test('returns error when plugin not configured', async () => {
    mockClient.getMonthlyNote = mock(async () => null);
    mockClient.createMonthlyNote = mock(async () => {
      throw new Error('Monthly notes not configured');
    });

    const result = await monthlyNote(mockClient, { month: '2026-02' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('OBSIDIAN_ERROR');
    }
  });

  test('truncates long monthly note content', async () => {
    const longContent = 'A'.repeat(10000);
    mockClient.getMonthlyNote = mock(async () => ({
      path: 'Monthly/2026-01.md',
      content: longContent,
      tags: [],
    }));

    const result = await monthlyNote(mockClient, { maxChars: 1000 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.truncated).toBe(true);
      expect(result.data.content.length).toBeLessThanOrEqual(1000);
    }
  });

  test('creates monthly note if it does not exist', async () => {
    let createCalled = false;
    mockClient.getMonthlyNote = mock(async (month?: string) => {
      if (createCalled) {
        return {
          path: 'Monthly/2026-02.md',
          content: 'New monthly note',
          tags: [],
        };
      }
      return null;
    });
    mockClient.createMonthlyNote = mock(async () => {
      createCalled = true;
    });

    const result = await monthlyNote(mockClient, { month: '2026-02' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.created).toBe(true);
    }
  });
});
