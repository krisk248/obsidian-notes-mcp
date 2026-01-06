/**
 * Search Tools
 *
 * Tools for searching notes by text, tags, and frontmatter.
 */

import { z } from 'zod';
import type { ObsidianClient } from '../api/obsidian-client.js';
import type { ToolResult, SearchResult } from '../types/index.js';

const DEFAULT_MAX_RESULTS = 10;
const DEFAULT_CONTEXT_CHARS = 100;

/**
 * search - Full-text search across the vault
 */
export const searchSchema = z.object({
  query: z.string().describe('Search query text'),
  maxResults: z.number().default(DEFAULT_MAX_RESULTS).describe('Maximum results to return'),
  contextChars: z.number().default(DEFAULT_CONTEXT_CHARS).describe('Characters of context around matches'),
});

export type SearchInput = z.infer<typeof searchSchema>;

export async function search(
  client: ObsidianClient,
  params: SearchInput
): Promise<ToolResult<{ results: SearchResult[]; total: number }>> {
  try {
    const results = await client.search(params.query, params.contextChars);

    // Limit results
    const limitedResults = results.slice(0, params.maxResults);

    return {
      success: true,
      data: {
        results: limitedResults,
        total: results.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'OBSIDIAN_ERROR',
        message: error instanceof Error ? error.message : 'Search failed',
        help: 'Check if Obsidian is running with Local REST API enabled',
      },
    };
  }
}

/**
 * search_tags - Search notes by tags
 */
export const searchTagsSchema = z.object({
  tags: z.array(z.string()).describe('Tags to search for (without # prefix)'),
  matchAll: z.boolean().default(false).describe('Require all tags to match'),
  maxResults: z.number().default(DEFAULT_MAX_RESULTS).describe('Maximum results to return'),
});

export type SearchTagsInput = z.infer<typeof searchTagsSchema>;

export async function searchTags(
  client: ObsidianClient,
  params: SearchTagsInput
): Promise<ToolResult<{ results: Array<{ path: string; tags: string[] }>; total: number }>> {
  try {
    // Get all files
    const files = await client.listFiles('/');
    const mdFiles = files.filter((f) => !f.isDirectory && f.extension === 'md');

    const matches: Array<{ path: string; tags: string[] }> = [];

    for (const file of mdFiles) {
      try {
        const note = await client.getFile(file.path);
        const noteTags = note.tags || [];

        // Normalize tags (remove # prefix if present)
        const normalizedNoteTags = noteTags.map((t) =>
          t.startsWith('#') ? t.slice(1) : t
        );
        const normalizedSearchTags = params.tags.map((t) =>
          t.startsWith('#') ? t.slice(1) : t
        );

        // Check for matches
        const matchedTags = normalizedSearchTags.filter((searchTag) =>
          normalizedNoteTags.some(
            (noteTag) =>
              noteTag.toLowerCase() === searchTag.toLowerCase() ||
              noteTag.toLowerCase().startsWith(searchTag.toLowerCase() + '/')
          )
        );

        const isMatch = params.matchAll
          ? matchedTags.length === normalizedSearchTags.length
          : matchedTags.length > 0;

        if (isMatch) {
          matches.push({
            path: file.path,
            tags: normalizedNoteTags,
          });
        }
      } catch {
        // Skip files that can't be read
      }
    }

    // Limit results
    const limitedResults = matches.slice(0, params.maxResults);

    return {
      success: true,
      data: {
        results: limitedResults,
        total: matches.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'OBSIDIAN_ERROR',
        message: error instanceof Error ? error.message : 'Tag search failed',
        help: 'Check if Obsidian is running with Local REST API enabled',
      },
    };
  }
}

/**
 * search_frontmatter - Search notes by frontmatter field value
 */
export const searchFrontmatterSchema = z.object({
  field: z.string().describe('Frontmatter field name to search'),
  value: z.unknown().describe('Value to match (can be string, number, boolean, etc.)'),
  operator: z
    .enum(['equals', 'contains', 'exists'])
    .default('equals')
    .describe('Comparison operator (equals, contains, exists)'),
  maxResults: z.number().default(DEFAULT_MAX_RESULTS).describe('Maximum results to return'),
});

export type SearchFrontmatterInput = z.infer<typeof searchFrontmatterSchema>;

interface FrontmatterSearchResult {
  path: string;
  value?: unknown;
}

export async function searchFrontmatter(
  client: ObsidianClient,
  params: SearchFrontmatterInput
): Promise<ToolResult<{ results: FrontmatterSearchResult[]; total: number }>> {
  try {
    // Get all files
    const files = await client.listFiles('/');
    const mdFiles = files.filter((f) => !f.isDirectory && f.extension === 'md');

    const matches: FrontmatterSearchResult[] = [];

    for (const file of mdFiles) {
      try {
        const note = await client.getFile(file.path);
        const frontmatter = note.frontmatter || {};

        // Check if field exists
        if (!(params.field in frontmatter)) {
          if (params.operator === 'exists') {
            // Skip notes that don't have this field
            continue;
          } else {
            // Skip for other operators if field doesn't exist
            continue;
          }
        }

        const fieldValue = frontmatter[params.field];
        let isMatch = false;

        switch (params.operator) {
          case 'exists':
            // Field exists and we already checked that above
            isMatch = true;
            break;

          case 'equals':
            // Exact match (loose equality for flexibility)
            isMatch = fieldValue === params.value || String(fieldValue) === String(params.value);
            break;

          case 'contains':
            // Check if field value contains the search value
            if (typeof fieldValue === 'string') {
              isMatch = fieldValue.toLowerCase().includes(String(params.value).toLowerCase());
            } else if (Array.isArray(fieldValue)) {
              isMatch = fieldValue.some((item) =>
                String(item).toLowerCase().includes(String(params.value).toLowerCase())
              );
            } else if (typeof fieldValue === 'object' && fieldValue !== null) {
              // For objects, check if any value contains the search string
              isMatch = Object.values(fieldValue).some((val) =>
                String(val).toLowerCase().includes(String(params.value).toLowerCase())
              );
            }
            break;
        }

        if (isMatch) {
          matches.push({
            path: file.path,
            value: fieldValue,
          });
        }
      } catch {
        // Skip files that can't be read
      }
    }

    // Limit results
    const limitedResults = matches.slice(0, params.maxResults);

    return {
      success: true,
      data: {
        results: limitedResults,
        total: matches.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'OBSIDIAN_ERROR',
        message: error instanceof Error ? error.message : 'Frontmatter search failed',
        help: 'Check if Obsidian is running with Local REST API enabled and notes have frontmatter',
      },
    };
  }
}
