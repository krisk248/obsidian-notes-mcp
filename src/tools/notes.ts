/**
 * Note CRUD Tools
 *
 * Tools for creating, reading, updating, and deleting notes.
 */

import { z } from 'zod';
import type { ObsidianClient } from '../api/obsidian-client.js';
import type {
  ToolResult,
  NoteSummary,
  PaginatedResult,
} from '../types/index.js';
import {
  truncateContent,
  summarizeNote,
  paginate,
  extractSection,
  combineContent,
} from '../utils/token-optimizer.js';

// Default values for token optimization
const DEFAULT_MAX_RESULTS = 20;
const DEFAULT_MAX_CHARS = 5000;

/**
 * list_notes - List notes in the vault or a specific folder
 */
export const listNotesSchema = z.object({
  folder: z.string().optional().describe('Folder path (optional, defaults to root)'),
  maxResults: z.number().default(DEFAULT_MAX_RESULTS).describe('Maximum notes to return'),
  includeContent: z.boolean().default(false).describe('Include note content (increases tokens)'),
  page: z.number().default(1).describe('Page number for pagination'),
});

export type ListNotesInput = z.infer<typeof listNotesSchema>;

export async function listNotes(
  client: ObsidianClient,
  params: ListNotesInput
): Promise<ToolResult<PaginatedResult<NoteSummary>>> {
  try {
    const files = await client.listFiles(params.folder || '/');

    // Filter to only markdown files
    const notes = files.filter(
      (f) => !f.isDirectory && f.extension === 'md'
    );

    // Get summaries (with optional content)
    const summaries: NoteSummary[] = [];

    for (const file of notes) {
      if (params.includeContent) {
        const content = await client.getFile(file.path);
        const summary = summarizeNote(content);
        summaries.push(summary);
      } else {
        // Just return path for minimal token usage
        summaries.push({ path: file.path });
      }
    }

    // Paginate results
    const result = paginate(summaries, params.page, params.maxResults);

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'OBSIDIAN_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        help: 'Check if Obsidian is running with Local REST API enabled',
      },
    };
  }
}

/**
 * read_note - Read a specific note's content
 */
export const readNoteSchema = z.object({
  path: z.string().describe('Path to the note file'),
  maxChars: z.number().default(DEFAULT_MAX_CHARS).describe('Maximum characters to return'),
  section: z.string().optional().describe('Specific section heading to extract'),
});

export type ReadNoteInput = z.infer<typeof readNoteSchema>;

export async function readNote(
  client: ObsidianClient,
  params: ReadNoteInput
): Promise<ToolResult<{ path: string; content: string; truncated: boolean; frontmatter?: Record<string, unknown>; tags?: string[] }>> {
  try {
    const note = await client.getFile(params.path);

    let content = note.content;

    // Extract section if requested
    if (params.section) {
      const sectionContent = extractSection(content, params.section);
      if (sectionContent === null) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Section "${params.section}" not found in ${params.path}`,
            help: 'Check the heading name and try again',
          },
        };
      }
      content = sectionContent;
    }

    // Truncate if needed
    const { content: truncatedContent, truncated } = truncateContent(
      content,
      params.maxChars
    );

    return {
      success: true,
      data: {
        path: note.path,
        content: truncatedContent,
        truncated,
        frontmatter: note.frontmatter,
        tags: note.tags,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Note not found: ${params.path}`,
        help: 'Check the file path and try again',
      },
    };
  }
}

/**
 * create_note - Create a new note
 */
export const createNoteSchema = z.object({
  path: z.string().describe('Path for the new note (e.g., "folder/note.md")'),
  content: z.string().describe('Markdown content of the note'),
  frontmatter: z.record(z.unknown()).optional().describe('YAML frontmatter as object'),
  overwrite: z.boolean().default(false).describe('Overwrite if file exists'),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;

export async function createNote(
  client: ObsidianClient,
  params: CreateNoteInput
): Promise<ToolResult<{ path: string; created: boolean }>> {
  try {
    // Check if file exists
    if (!params.overwrite) {
      try {
        await client.getFile(params.path);
        return {
          success: false,
          error: {
            code: 'FILE_EXISTS',
            message: `File already exists: ${params.path}`,
            help: 'Use overwrite: true to replace, or choose a different path',
          },
        };
      } catch {
        // File doesn't exist, continue
      }
    }

    // Combine frontmatter with content
    const fullContent = combineContent(params.content, params.frontmatter);

    // Create the file
    await client.createFile(params.path, fullContent);

    return {
      success: true,
      data: { path: params.path, created: true },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'OBSIDIAN_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create note',
        help: 'Check the file path and try again',
      },
    };
  }
}

/**
 * update_note - Update an existing note
 */
export const updateNoteSchema = z.object({
  path: z.string().describe('Path to the note to update'),
  content: z.string().describe('Content to add or replace'),
  mode: z.enum(['append', 'prepend', 'replace']).default('append').describe('How to update the note'),
});

export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;

export async function updateNote(
  client: ObsidianClient,
  params: UpdateNoteInput
): Promise<ToolResult<{ path: string; updated: boolean; mode: string }>> {
  try {
    if (params.mode === 'replace') {
      await client.createFile(params.path, params.content);
    } else if (params.mode === 'append') {
      await client.appendToFile(params.path, '\n' + params.content);
    } else {
      // prepend
      await client.patchFile(params.path, params.content + '\n', {
        operation: 'prepend',
      });
    }

    return {
      success: true,
      data: { path: params.path, updated: true, mode: params.mode },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'OBSIDIAN_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update note',
        help: 'Make sure the file exists and try again',
      },
    };
  }
}

/**
 * delete_note - Delete a note (with safety check)
 */
export const deleteNoteSchema = z.object({
  path: z.string().describe('Path to the note to delete'),
  confirm: z.boolean().default(false).describe('Must be true to confirm deletion'),
});

export type DeleteNoteInput = z.infer<typeof deleteNoteSchema>;

export async function deleteNote(
  client: ObsidianClient,
  params: DeleteNoteInput
): Promise<ToolResult<{ path: string; deleted: boolean }>> {
  if (!params.confirm) {
    return {
      success: false,
      error: {
        code: 'PERMISSION_DENIED',
        message: 'Deletion requires confirmation',
        help: 'Set confirm: true to delete the file',
      },
    };
  }

  try {
    await client.deleteFile(params.path);
    return {
      success: true,
      data: { path: params.path, deleted: true },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Note not found: ${params.path}`,
        help: 'Check the file path and try again',
      },
    };
  }
}
