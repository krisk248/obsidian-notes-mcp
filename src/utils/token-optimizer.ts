/**
 * Token Optimization Utilities
 *
 * Functions to minimize token usage in responses while preserving useful information.
 */

import type { NoteContent, NoteSummary, PaginatedResult } from '../types/index.js';

/**
 * Truncate content to a maximum number of characters
 */
export function truncateContent(
  content: string,
  maxChars: number,
  suffix: string = '... [truncated]'
): { content: string; truncated: boolean } {
  if (content.length <= maxChars) {
    return { content, truncated: false };
  }

  // Try to truncate at a word boundary
  const truncatedRaw = content.slice(0, maxChars - suffix.length);
  const lastSpace = truncatedRaw.lastIndexOf(' ');
  const truncated = lastSpace > maxChars * 0.8
    ? truncatedRaw.slice(0, lastSpace)
    : truncatedRaw;

  return {
    content: truncated + suffix,
    truncated: true,
  };
}

/**
 * Extract a summary from a note (path, title, tags only)
 */
export function summarizeNote(note: NoteContent): NoteSummary {
  // Extract title from content (first H1) or frontmatter
  let title = note.frontmatter?.title as string | undefined;

  if (!title) {
    const h1Match = note.content.match(/^#\s+(.+)$/m);
    title = h1Match ? h1Match[1] : undefined;
  }

  // Get modification date
  const modified = note.stat?.mtime
    ? new Date(note.stat.mtime).toISOString().split('T')[0]
    : undefined;

  return {
    path: note.path,
    title,
    tags: note.tags,
    modified,
  };
}

/**
 * Paginate results
 */
export function paginate<T>(
  items: T[],
  page: number = 1,
  perPage: number = 20
): PaginatedResult<T> {
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const paginatedItems = items.slice(start, end);

  return {
    items: paginatedItems,
    total: items.length,
    page,
    perPage,
    hasMore: end < items.length,
  };
}

/**
 * Extract a section from markdown content by heading
 */
export function extractSection(
  content: string,
  heading: string
): string | null {
  // Escape special regex characters in heading
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Find the heading and extract content until next same-level or higher heading
  const headingPattern = new RegExp(
    `^(#{1,6})\\s+${escapedHeading}\\s*$`,
    'im'
  );
  const match = content.match(headingPattern);

  if (!match) {
    return null;
  }

  const headingLevel = match[1].length;
  const startIndex = (match.index || 0) + match[0].length;

  // Find the next heading of same or higher level
  const nextHeadingPattern = new RegExp(
    `^#{1,${headingLevel}}\\s+`,
    'im'
  );
  const remaining = content.slice(startIndex);
  const nextMatch = remaining.match(nextHeadingPattern);

  const sectionContent = nextMatch
    ? remaining.slice(0, nextMatch.index)
    : remaining;

  return sectionContent.trim();
}

/**
 * Format frontmatter as YAML
 */
export function formatFrontmatter(
  frontmatter: Record<string, unknown>
): string {
  const lines = ['---'];

  for (const [key, value] of Object.entries(frontmatter)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${item}`);
      }
    } else if (typeof value === 'object' && value !== null) {
      lines.push(`${key}: ${JSON.stringify(value)}`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }

  lines.push('---');
  return lines.join('\n');
}

/**
 * Combine frontmatter with content
 */
export function combineContent(
  content: string,
  frontmatter?: Record<string, unknown>
): string {
  if (!frontmatter || Object.keys(frontmatter).length === 0) {
    return content;
  }

  return `${formatFrontmatter(frontmatter)}\n\n${content}`;
}
