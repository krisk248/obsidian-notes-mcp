/**
 * Periodic Notes Tools
 *
 * Tools for working with daily, weekly, and monthly notes.
 */

import { z } from 'zod';
import type { ObsidianClient } from '../api/obsidian-client.js';
import type { ToolResult } from '../types/index.js';
import { truncateContent } from '../utils/token-optimizer.js';

const DEFAULT_MAX_CHARS = 5000;

/**
 * daily_note - Get or create today's daily note
 */
export const dailyNoteSchema = z.object({
  date: z.string().optional().describe('Date in YYYY-MM-DD format (defaults to today)'),
  maxChars: z.number().default(DEFAULT_MAX_CHARS).describe('Maximum characters to return'),
});

export type DailyNoteInput = z.infer<typeof dailyNoteSchema>;

export async function dailyNote(
  client: ObsidianClient,
  params: DailyNoteInput
): Promise<ToolResult<{ path: string; content: string; truncated: boolean; created: boolean }>> {
  try {
    // Format date for API
    let apiDate: string | undefined;
    if (params.date) {
      const [year, month, day] = params.date.split('-');
      apiDate = `${year}/${month}/${day}`;
    }

    // Try to get existing daily note
    let note = await client.getDailyNote(apiDate);
    let created = false;

    if (!note) {
      // Create daily note if it doesn't exist
      await client.createDailyNote(apiDate);
      note = await client.getDailyNote(apiDate);
      created = true;
    }

    if (!note) {
      return {
        success: false,
        error: {
          code: 'OBSIDIAN_ERROR',
          message: 'Could not get or create daily note',
          help: 'Make sure the Daily Notes plugin is enabled in Obsidian',
        },
      };
    }

    const { content, truncated } = truncateContent(note.content, params.maxChars);

    return {
      success: true,
      data: {
        path: note.path,
        content,
        truncated,
        created,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'OBSIDIAN_ERROR',
        message: error instanceof Error ? error.message : 'Failed to access daily note',
        help: 'Make sure the Daily Notes or Periodic Notes plugin is enabled',
      },
    };
  }
}

/**
 * weekly_note - Get or create this week's note
 */
export const weeklyNoteSchema = z.object({
  week: z.string().optional().describe('Week in YYYY-Www format (e.g., 2026-W01)'),
  maxChars: z.number().default(DEFAULT_MAX_CHARS).describe('Maximum characters to return'),
});

export type WeeklyNoteInput = z.infer<typeof weeklyNoteSchema>;

export async function weeklyNote(
  client: ObsidianClient,
  params: WeeklyNoteInput
): Promise<ToolResult<{ path: string; content: string; truncated: boolean; created: boolean }>> {
  try {
    // Try to get existing weekly note
    let note = await client.getWeeklyNote(params.week);
    let created = false;

    if (!note) {
      // Create weekly note if it doesn't exist
      await client.createWeeklyNote(params.week);
      note = await client.getWeeklyNote(params.week);
      created = true;
    }

    if (!note) {
      return {
        success: false,
        error: {
          code: 'OBSIDIAN_ERROR',
          message: 'Could not get or create weekly note',
          help: 'Make sure the Periodic Notes plugin is enabled and configured for weekly notes in Obsidian',
        },
      };
    }

    const { content, truncated } = truncateContent(note.content, params.maxChars);

    return {
      success: true,
      data: {
        path: note.path,
        content,
        truncated,
        created,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'OBSIDIAN_ERROR',
        message: error instanceof Error ? error.message : 'Failed to access weekly note',
        help: 'Make sure the Periodic Notes plugin is enabled and configured in Obsidian Settings → Periodic Notes → Weekly',
      },
    };
  }
}

/**
 * monthly_note - Get or create this month's note
 */
export const monthlyNoteSchema = z.object({
  month: z.string().optional().describe('Month in YYYY-MM format (e.g., 2026-01)'),
  maxChars: z.number().default(DEFAULT_MAX_CHARS).describe('Maximum characters to return'),
});

export type MonthlyNoteInput = z.infer<typeof monthlyNoteSchema>;

export async function monthlyNote(
  client: ObsidianClient,
  params: MonthlyNoteInput
): Promise<ToolResult<{ path: string; content: string; truncated: boolean; created: boolean }>> {
  try {
    // Try to get existing monthly note
    let note = await client.getMonthlyNote(params.month);
    let created = false;

    if (!note) {
      // Create monthly note if it doesn't exist
      await client.createMonthlyNote(params.month);
      note = await client.getMonthlyNote(params.month);
      created = true;
    }

    if (!note) {
      return {
        success: false,
        error: {
          code: 'OBSIDIAN_ERROR',
          message: 'Could not get or create monthly note',
          help: 'Make sure the Periodic Notes plugin is enabled and configured for monthly notes in Obsidian',
        },
      };
    }

    const { content, truncated } = truncateContent(note.content, params.maxChars);

    return {
      success: true,
      data: {
        path: note.path,
        content,
        truncated,
        created,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'OBSIDIAN_ERROR',
        message: error instanceof Error ? error.message : 'Failed to access monthly note',
        help: 'Make sure the Periodic Notes plugin is enabled and configured in Obsidian Settings → Periodic Notes → Monthly',
      },
    };
  }
}

/**
 * append_to_daily - Append content to today's daily note
 */
export const appendToDailySchema = z.object({
  content: z.string().describe('Content to append to daily note'),
  date: z.string().optional().describe('Date in YYYY-MM-DD format (defaults to today)'),
  heading: z.string().optional().describe('Heading to append under (optional)'),
});

export type AppendToDailyInput = z.infer<typeof appendToDailySchema>;

export async function appendToDaily(
  client: ObsidianClient,
  params: AppendToDailyInput
): Promise<ToolResult<{ path: string; appended: boolean }>> {
  try {
    // Format date for API
    let apiDate: string | undefined;
    if (params.date) {
      const [year, month, day] = params.date.split('-');
      apiDate = `${year}/${month}/${day}`;
    }

    // Get the daily note path first
    let note = await client.getDailyNote(apiDate);

    if (!note) {
      // Create daily note if it doesn't exist
      await client.createDailyNote(apiDate);
      note = await client.getDailyNote(apiDate);
    }

    if (!note) {
      return {
        success: false,
        error: {
          code: 'OBSIDIAN_ERROR',
          message: 'Could not get or create daily note',
          help: 'Make sure the Daily Notes plugin is enabled in Obsidian',
        },
      };
    }

    // Append content
    if (params.heading) {
      // Append under a specific heading
      await client.patchFile(note.path, '\n' + params.content, {
        operation: 'append',
        targetType: 'heading',
        target: params.heading,
      });
    } else {
      // Append to end of file
      await client.appendToFile(note.path, '\n\n' + params.content);
    }

    return {
      success: true,
      data: {
        path: note.path,
        appended: true,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'OBSIDIAN_ERROR',
        message: error instanceof Error ? error.message : 'Failed to append to daily note',
        help: 'Make sure the Daily Notes plugin is enabled',
      },
    };
  }
}
