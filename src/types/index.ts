/**
 * Type definitions for obsidian-mcp
 */

// Configuration types
export interface ObsidianConfig {
  apiKey: string;
  host: string;
  port: number;
  protocol: 'http' | 'https';
  rejectUnauthorized: boolean;
}

// Vault file types
export interface VaultFile {
  path: string;
  name: string;
  extension: string;
  isDirectory: boolean;
}

export interface NoteFrontmatter {
  [key: string]: unknown;
}

export interface NoteContent {
  path: string;
  content: string;
  frontmatter?: NoteFrontmatter;
  tags?: string[];
  stat?: FileStat;
}

export interface FileStat {
  ctime: number;
  mtime: number;
  size: number;
}

// Note summary (token-efficient version)
export interface NoteSummary {
  path: string;
  title?: string;
  tags?: string[];
  modified?: string;
}

// Search types
export interface SearchResult {
  path: string;
  matches: SearchMatch[];
  score?: number;
}

export interface SearchMatch {
  content: string;
  line?: number;
  context?: string;
}

// Pagination types
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  hasMore: boolean;
}

// Error types - using const object for better string literal compatibility
export const ErrorCode = {
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  AUTH_FAILED: 'AUTH_FAILED',
  NOT_FOUND: 'NOT_FOUND',
  FILE_EXISTS: 'FILE_EXISTS',
  INVALID_PATH: 'INVALID_PATH',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  OBSIDIAN_ERROR: 'OBSIDIAN_ERROR',
  UNKNOWN: 'UNKNOWN',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface ObsidianError {
  code: ErrorCode;
  message: string;
  help?: string;
  details?: unknown;
}

// Tool response types
export interface ToolSuccess<T = unknown> {
  success: true;
  data: T;
}

export interface ToolError {
  success: false;
  error: ObsidianError;
}

export type ToolResult<T = unknown> = ToolSuccess<T> | ToolError;

// Tool parameter types
export interface ListNotesParams {
  folder?: string;
  maxResults?: number;
  includeContent?: boolean;
  page?: number;
}

export interface ReadNoteParams {
  path: string;
  maxChars?: number;
  section?: string;
}

export interface CreateNoteParams {
  path: string;
  content: string;
  frontmatter?: NoteFrontmatter;
  overwrite?: boolean;
}

export interface UpdateNoteParams {
  path: string;
  content: string;
  mode?: 'append' | 'prepend' | 'replace';
}

export interface DeleteNoteParams {
  path: string;
  confirm?: boolean;
}

export interface SearchParams {
  query: string;
  maxResults?: number;
  contextChars?: number;
}

export interface SearchTagsParams {
  tags: string[];
  matchAll?: boolean;
  maxResults?: number;
}

export interface DailyNoteParams {
  date?: string; // YYYY-MM-DD format
}

export interface BatchReadParams {
  paths: string[];
  maxCharsPerNote?: number;
}

export interface ExecuteCommandParams {
  commandId: string;
}
