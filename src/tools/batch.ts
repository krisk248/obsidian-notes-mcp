/**
 * Batch Operations Tools
 *
 * Tools for performing multiple operations in a single call to reduce token usage.
 */

import { z } from 'zod';
import type { ObsidianClient } from '../api/obsidian-client.js';
import type { ToolResult } from '../types/index.js';
import { truncateContent } from '../utils/token-optimizer.js';

const DEFAULT_MAX_CHARS_PER_NOTE = 1000;

/**
 * batch_read - Read multiple notes in a single call
 */
export const batchReadSchema = z.object({
  paths: z.array(z.string()).describe('Array of note paths to read'),
  maxCharsPerNote: z.number().default(DEFAULT_MAX_CHARS_PER_NOTE).describe('Max chars per note'),
});

export type BatchReadInput = z.infer<typeof batchReadSchema>;

interface BatchReadResult {
  path: string;
  content?: string;
  truncated?: boolean;
  error?: string;
}

export async function batchRead(
  client: ObsidianClient,
  params: BatchReadInput
): Promise<ToolResult<{ notes: BatchReadResult[]; successCount: number; errorCount: number }>> {
  const results: BatchReadResult[] = [];
  let successCount = 0;
  let errorCount = 0;

  for (const path of params.paths) {
    try {
      const note = await client.getFile(path);
      const { content, truncated } = truncateContent(
        note.content,
        params.maxCharsPerNote
      );

      results.push({
        path,
        content,
        truncated,
      });
      successCount++;
    } catch (error) {
      results.push({
        path,
        error: error instanceof Error ? error.message : 'Failed to read note',
      });
      errorCount++;
    }
  }

  return {
    success: true,
    data: {
      notes: results,
      successCount,
      errorCount,
    },
  };
}

/**
 * batch_create - Create multiple notes in a single call
 */
export const batchCreateSchema = z.object({
  notes: z.array(
    z.object({
      path: z.string().describe('Path for the note'),
      content: z.string().describe('Content of the note'),
      frontmatter: z.record(z.unknown()).optional().describe('Optional frontmatter'),
    })
  ).describe('Array of notes to create'),
  overwrite: z.boolean().default(false).describe('Overwrite existing files'),
});

export type BatchCreateInput = z.infer<typeof batchCreateSchema>;

interface BatchCreateResult {
  path: string;
  created?: boolean;
  error?: string;
}

export async function batchCreate(
  client: ObsidianClient,
  params: BatchCreateInput
): Promise<ToolResult<{ notes: BatchCreateResult[]; successCount: number; errorCount: number }>> {
  const results: BatchCreateResult[] = [];
  let successCount = 0;
  let errorCount = 0;

  for (const note of params.notes) {
    try {
      // Check if file exists
      if (!params.overwrite) {
        try {
          await client.getFile(note.path);
          results.push({
            path: note.path,
            error: 'File already exists',
          });
          errorCount++;
          continue;
        } catch {
          // File doesn't exist, continue
        }
      }

      // Build content with frontmatter
      let fullContent = note.content;
      if (note.frontmatter && Object.keys(note.frontmatter).length > 0) {
        const frontmatterYaml = [
          '---',
          ...Object.entries(note.frontmatter).map(([k, v]) => {
            if (Array.isArray(v)) {
              return `${k}:\n${v.map((i) => `  - ${i}`).join('\n')}`;
            }
            return `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`;
          }),
          '---',
          '',
        ].join('\n');
        fullContent = frontmatterYaml + fullContent;
      }

      await client.createFile(note.path, fullContent);
      results.push({
        path: note.path,
        created: true,
      });
      successCount++;
    } catch (error) {
      results.push({
        path: note.path,
        error: error instanceof Error ? error.message : 'Failed to create note',
      });
      errorCount++;
    }
  }

  return {
    success: true,
    data: {
      notes: results,
      successCount,
      errorCount,
    },
  };
}

/**
 * vault_stats - Get vault statistics (token-efficient overview)
 */
export const vaultStatsSchema = z.object({});

export type VaultStatsInput = z.infer<typeof vaultStatsSchema>;

export async function vaultStats(
  client: ObsidianClient,
  _params: VaultStatsInput
): Promise<ToolResult<{ totalFiles: number; totalNotes: number; folders: number; tags: string[] }>> {
  try {
    const files = await client.listFiles('/');

    const notes = files.filter((f) => !f.isDirectory && f.extension === 'md');
    const folders = files.filter((f) => f.isDirectory);

    // Collect unique tags from a sample of notes
    const tagSet = new Set<string>();
    const sampleSize = Math.min(50, notes.length);

    for (let i = 0; i < sampleSize; i++) {
      try {
        const note = await client.getFile(notes[i].path);
        if (note.tags) {
          note.tags.forEach((tag) => tagSet.add(tag));
        }
      } catch {
        // Skip files that can't be read
      }
    }

    return {
      success: true,
      data: {
        totalFiles: files.length,
        totalNotes: notes.length,
        folders: folders.length,
        tags: Array.from(tagSet).slice(0, 50), // Limit tags for token efficiency
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'OBSIDIAN_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get vault stats',
        help: 'Check if Obsidian is running with Local REST API enabled',
      },
    };
  }
}
