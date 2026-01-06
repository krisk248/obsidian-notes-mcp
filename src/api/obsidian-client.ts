/**
 * Obsidian REST API Client
 *
 * Communicates with the Obsidian Local REST API plugin.
 * Handles authentication, error handling, and response parsing.
 */

import type {
  ObsidianConfig,
  VaultFile,
  NoteContent,
  SearchResult,
  ErrorCode,
  ObsidianError,
} from '../types/index.js';
import { getBaseUrl } from '../utils/config.js';

export class ObsidianClient {
  private config: ObsidianConfig;
  private baseUrl: string;

  constructor(config: ObsidianConfig) {
    this.config = config;
    this.baseUrl = getBaseUrl(config);
  }

  /**
   * Make an authenticated request to the Obsidian API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.apiKey}`,
      ...((options.headers as Record<string, string>) || {}),
    };

    // Set content type for requests with body
    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'text/markdown';
    }

    try {
      // For self-signed certs, we need to set NODE_TLS_REJECT_UNAUTHORIZED
      if (!this.config.rejectUnauthorized) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      }

      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        throw await this.handleErrorResponse(response);
      }

      const contentType = response.headers.get('Content-Type') || '';

      // Handle JSON responses (including vendor types like application/vnd.olrapi.note+json)
      if (contentType.includes('json')) {
        return (await response.json()) as T;
      }

      return (await response.text()) as unknown as T;
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error; // Already an ObsidianError
      }

      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw this.createError(
          'CONNECTION_FAILED',
          'Cannot connect to Obsidian. Is it running?',
          'Make sure Obsidian is open and the Local REST API plugin is enabled.'
        );
      }

      throw this.createError(
        'UNKNOWN',
        error instanceof Error ? error.message : 'Unknown error',
        'Check the Obsidian console for more details.'
      );
    }
  }

  /**
   * Handle error responses from the API
   */
  private async handleErrorResponse(response: Response): Promise<ObsidianError> {
    const status = response.status;

    switch (status) {
      case 401:
      case 403:
        return this.createError(
          'AUTH_FAILED',
          'Authentication failed. Check your API key.',
          'Get your API key from Obsidian: Settings → Local REST API → Copy API Key'
        );
      case 404:
        return this.createError(
          'NOT_FOUND',
          'Resource not found',
          'Check the file path and try again.'
        );
      case 405:
        return this.createError(
          'INVALID_PATH',
          'Invalid operation for this path',
          'This operation may not be supported for directories.'
        );
      default:
        const text = await response.text();
        return this.createError(
          'OBSIDIAN_ERROR',
          `Obsidian returned error ${status}: ${text}`,
          'Check the Obsidian console for more details.'
        );
    }
  }

  /**
   * Create a standardized error object
   */
  private createError(
    code: ErrorCode | string,
    message: string,
    help?: string
  ): ObsidianError {
    return { code: code as ErrorCode, message, help };
  }

  /**
   * Test connection to Obsidian
   */
  async testConnection(): Promise<{ authenticated: boolean; version?: string }> {
    const result = await this.request<{
      authenticated: boolean;
      versions?: { self: string };
    }>('/');
    return {
      authenticated: result.authenticated,
      version: result.versions?.self,
    };
  }

  /**
   * List files in a directory
   */
  async listFiles(path: string = '/'): Promise<VaultFile[]> {
    const endpoint = path === '/' ? '/vault/' : `/vault/${encodeURIComponent(path)}/`;
    const result = await this.request<{ files: string[] }>(endpoint, {
      headers: { Accept: 'application/json' },
    });

    return result.files.map((filePath) => {
      const isDirectory = filePath.endsWith('/');
      const cleanPath = isDirectory ? filePath.slice(0, -1) : filePath;
      const parts = cleanPath.split('/');
      const name = parts[parts.length - 1];
      const extension = isDirectory ? '' : name.split('.').pop() || '';

      return {
        path: cleanPath,
        name,
        extension,
        isDirectory,
      };
    });
  }

  /**
   * Get file content
   */
  async getFile(path: string): Promise<NoteContent> {
    const endpoint = `/vault/${encodeURIComponent(path)}`;

    // Get content as JSON for metadata
    const result = await this.request<{
      content: string;
      frontmatter?: Record<string, unknown>;
      tags?: string[];
      stat?: { ctime: number; mtime: number; size: number };
    }>(endpoint, {
      headers: { Accept: 'application/vnd.olrapi.note+json' },
    });

    return {
      path,
      content: result.content,
      frontmatter: result.frontmatter,
      tags: result.tags,
      stat: result.stat,
    };
  }

  /**
   * Get raw file content (markdown)
   */
  async getFileRaw(path: string): Promise<string> {
    const endpoint = `/vault/${encodeURIComponent(path)}`;
    return this.request<string>(endpoint, {
      headers: { Accept: 'text/markdown' },
    });
  }

  /**
   * Create or replace a file
   */
  async createFile(path: string, content: string): Promise<void> {
    const endpoint = `/vault/${encodeURIComponent(path)}`;
    await this.request(endpoint, {
      method: 'PUT',
      body: content,
      headers: { 'Content-Type': 'text/markdown' },
    });
  }

  /**
   * Append content to a file
   */
  async appendToFile(path: string, content: string): Promise<void> {
    const endpoint = `/vault/${encodeURIComponent(path)}`;
    await this.request(endpoint, {
      method: 'POST',
      body: content,
      headers: { 'Content-Type': 'text/markdown' },
    });
  }

  /**
   * Patch content at a specific location
   */
  async patchFile(
    path: string,
    content: string,
    options: {
      operation: 'append' | 'prepend' | 'replace';
      targetType?: 'heading' | 'block' | 'frontmatter';
      target?: string;
    }
  ): Promise<void> {
    const endpoint = `/vault/${encodeURIComponent(path)}`;
    await this.request(endpoint, {
      method: 'PATCH',
      body: content,
      headers: {
        'Content-Type': 'text/markdown',
        Operation: options.operation,
        ...(options.targetType && { 'Target-Type': options.targetType }),
        ...(options.target && { Target: options.target }),
      },
    });
  }

  /**
   * Delete a file
   */
  async deleteFile(path: string): Promise<void> {
    const endpoint = `/vault/${encodeURIComponent(path)}`;
    await this.request(endpoint, { method: 'DELETE' });
  }

  /**
   * Search for text across the vault (local implementation - fast)
   * Note: Obsidian's /search/simple/ endpoint is very slow, so we use local search
   */
  async search(query: string, contextLength: number = 100): Promise<SearchResult[]> {
    // Use fast local search instead of slow Obsidian API
    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();

    // Get all markdown files recursively
    const allFiles = await this.listFilesRecursive('/');
    const mdFiles = allFiles.filter(f => !f.isDirectory && f.extension === 'md');

    for (const file of mdFiles) {
      try {
        const note = await this.getFile(file.path);
        const content = note.content || '';
        const contentLower = content.toLowerCase();

        // Find all matches
        const matches: Array<{ content: string; context: string }> = [];
        let searchIndex = 0;

        while (searchIndex < contentLower.length) {
          const matchIndex = contentLower.indexOf(queryLower, searchIndex);
          if (matchIndex === -1) break;

          // Extract context around match
          const start = Math.max(0, matchIndex - contextLength);
          const end = Math.min(content.length, matchIndex + query.length + contextLength);
          const context = content.slice(start, end);

          matches.push({ content: context, context });
          searchIndex = matchIndex + query.length;

          // Limit matches per file
          if (matches.length >= 3) break;
        }

        if (matches.length > 0) {
          results.push({
            path: file.path,
            matches,
            score: matches.length,
          });
        }

        // Limit total results for performance
        if (results.length >= 50) break;
      } catch {
        // Skip files that can't be read
      }
    }

    // Sort by score (number of matches)
    return results.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }

  /**
   * List files recursively from a path
   */
  async listFilesRecursive(path: string): Promise<VaultFile[]> {
    const files: VaultFile[] = [];
    const items = await this.listFiles(path);

    // Normalize path - remove trailing slash
    const normalizedPath = path.replace(/\/$/, '') || '';

    for (const item of items) {
      // Item paths from API may have trailing slashes for directories
      const itemName = item.path.replace(/\/$/, '');

      if (item.isDirectory) {
        const subPath = normalizedPath ? `${normalizedPath}/${itemName}` : itemName;
        const subFiles = await this.listFilesRecursive(subPath);
        files.push(...subFiles);
      } else {
        const fullPath = normalizedPath ? `${normalizedPath}/${itemName}` : itemName;
        files.push({
          ...item,
          path: fullPath,
        });
      }
    }

    return files;
  }

  /**
   * Get active file
   */
  async getActiveFile(): Promise<NoteContent | null> {
    try {
      const result = await this.request<{
        content: string;
        frontmatter?: Record<string, unknown>;
        tags?: string[];
        path?: string;
      }>('/active/', {
        headers: { Accept: 'application/vnd.olrapi.note+json' },
      });

      return {
        path: result.path || 'active',
        content: result.content,
        frontmatter: result.frontmatter,
        tags: result.tags,
      };
    } catch {
      return null; // No active file
    }
  }

  /**
   * Get daily note for a specific date
   */
  async getDailyNote(date?: string): Promise<NoteContent | null> {
    const endpoint = date ? `/periodic/daily/${date}/` : '/periodic/daily/';

    try {
      const result = await this.request<{
        content: string;
        frontmatter?: Record<string, unknown>;
        tags?: string[];
        path?: string;
      }>(endpoint, {
        headers: { Accept: 'application/vnd.olrapi.note+json' },
      });

      return {
        path: result.path || `daily-${date || 'today'}`,
        content: result.content,
        frontmatter: result.frontmatter,
        tags: result.tags,
      };
    } catch {
      return null;
    }
  }

  /**
   * Create daily note for a specific date
   */
  async createDailyNote(date?: string, content?: string): Promise<void> {
    const endpoint = date ? `/periodic/daily/${date}/` : '/periodic/daily/';
    await this.request(endpoint, {
      method: 'PUT',
      body: content || '',
      headers: { 'Content-Type': 'text/markdown' },
    });
  }

  /**
   * Get weekly note for a specific week
   */
  async getWeeklyNote(week?: string): Promise<NoteContent | null> {
    const endpoint = week ? `/periodic/weekly/${week}/` : '/periodic/weekly/';

    try {
      const result = await this.request<{
        content: string;
        frontmatter?: Record<string, unknown>;
        tags?: string[];
        path?: string;
      }>(endpoint, {
        headers: { Accept: 'application/vnd.olrapi.note+json' },
      });

      return {
        path: result.path || `weekly-${week || 'current'}`,
        content: result.content,
        frontmatter: result.frontmatter,
        tags: result.tags,
      };
    } catch {
      return null;
    }
  }

  /**
   * Create weekly note for a specific week
   */
  async createWeeklyNote(week?: string, content?: string): Promise<void> {
    const endpoint = week ? `/periodic/weekly/${week}/` : '/periodic/weekly/';
    await this.request(endpoint, {
      method: 'PUT',
      body: content || '',
      headers: { 'Content-Type': 'text/markdown' },
    });
  }

  /**
   * Get monthly note for a specific month
   */
  async getMonthlyNote(month?: string): Promise<NoteContent | null> {
    const endpoint = month ? `/periodic/monthly/${month}/` : '/periodic/monthly/';

    try {
      const result = await this.request<{
        content: string;
        frontmatter?: Record<string, unknown>;
        tags?: string[];
        path?: string;
      }>(endpoint, {
        headers: { Accept: 'application/vnd.olrapi.note+json' },
      });

      return {
        path: result.path || `monthly-${month || 'current'}`,
        content: result.content,
        frontmatter: result.frontmatter,
        tags: result.tags,
      };
    } catch {
      return null;
    }
  }

  /**
   * Create monthly note for a specific month
   */
  async createMonthlyNote(month?: string, content?: string): Promise<void> {
    const endpoint = month ? `/periodic/monthly/${month}/` : '/periodic/monthly/';
    await this.request(endpoint, {
      method: 'PUT',
      body: content || '',
      headers: { 'Content-Type': 'text/markdown' },
    });
  }

  /**
   * List available commands
   */
  async listCommands(): Promise<Array<{ id: string; name: string }>> {
    const result = await this.request<{
      commands: Array<{ id: string; name: string }>;
    }>('/commands/');
    return result.commands;
  }

  /**
   * Execute a command
   */
  async executeCommand(commandId: string): Promise<void> {
    const endpoint = `/commands/${encodeURIComponent(commandId)}/`;
    await this.request(endpoint, { method: 'POST' });
  }
}
