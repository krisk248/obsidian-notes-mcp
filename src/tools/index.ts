/**
 * Tool Registry
 *
 * Exports all MCP tools for the Obsidian MCP server.
 */

// Note CRUD tools
export {
  listNotesSchema,
  listNotes,
  type ListNotesInput,
  readNoteSchema,
  readNote,
  type ReadNoteInput,
  createNoteSchema,
  createNote,
  type CreateNoteInput,
  updateNoteSchema,
  updateNote,
  type UpdateNoteInput,
  deleteNoteSchema,
  deleteNote,
  type DeleteNoteInput,
} from './notes.js';

// Search tools
export {
  searchSchema,
  search,
  type SearchInput,
  searchTagsSchema,
  searchTags,
  type SearchTagsInput,
  searchFrontmatterSchema,
  searchFrontmatter,
  type SearchFrontmatterInput,
} from './search.js';

// Periodic notes tools
export {
  dailyNoteSchema,
  dailyNote,
  type DailyNoteInput,
  weeklyNoteSchema,
  weeklyNote,
  type WeeklyNoteInput,
  monthlyNoteSchema,
  monthlyNote,
  type MonthlyNoteInput,
  appendToDailySchema,
  appendToDaily,
  type AppendToDailyInput,
} from './periodic.js';

// Batch operation tools
export {
  batchReadSchema,
  batchRead,
  type BatchReadInput,
  batchCreateSchema,
  batchCreate,
  type BatchCreateInput,
  vaultStatsSchema,
  vaultStats,
  type VaultStatsInput,
} from './batch.js';

// Command tools
export {
  listCommandsSchema,
  listCommands,
  type ListCommandsInput,
  executeCommandSchema,
  executeCommand,
  type ExecuteCommandInput,
  getActiveNoteSchema,
  getActiveNote,
  type GetActiveNoteInput,
} from './commands.js';

/**
 * Tool definitions for MCP registration
 */
export const TOOL_DEFINITIONS = {
  // Note CRUD
  list_notes: {
    name: 'list_notes',
    description:
      'List notes in the Obsidian vault. Returns paths and optional metadata for token efficiency. Use folder parameter to list a specific folder.',
    inputSchema: {
      type: 'object',
      properties: {
        folder: {
          type: 'string',
          description: 'Folder path to list (optional, defaults to vault root)',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum notes to return (default: 20)',
          default: 20,
        },
        includeContent: {
          type: 'boolean',
          description: 'Include note content in response (default: false)',
          default: false,
        },
        page: {
          type: 'number',
          description: 'Page number for pagination (default: 1)',
          default: 1,
        },
      },
    },
  },

  read_note: {
    name: 'read_note',
    description:
      'Read a specific note from the Obsidian vault. Returns content, frontmatter, and tags. Use section parameter to get only a specific heading.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the note file (e.g., "folder/note.md")',
        },
        maxChars: {
          type: 'number',
          description: 'Maximum characters to return (default: 5000)',
          default: 5000,
        },
        section: {
          type: 'string',
          description: 'Specific section heading to extract (optional)',
        },
      },
      required: ['path'],
    },
  },

  create_note: {
    name: 'create_note',
    description:
      'Create a new note in the Obsidian vault. Supports frontmatter as YAML. Will fail if file exists unless overwrite is true.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path for the new note (e.g., "folder/note.md")',
        },
        content: {
          type: 'string',
          description: 'Markdown content of the note',
        },
        frontmatter: {
          type: 'object',
          description: 'Optional YAML frontmatter as key-value pairs',
        },
        overwrite: {
          type: 'boolean',
          description: 'Overwrite if file exists (default: false)',
          default: false,
        },
      },
      required: ['path', 'content'],
    },
  },

  update_note: {
    name: 'update_note',
    description:
      'Update an existing note. Modes: append (add to end), prepend (add to start), replace (overwrite entire content).',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the note to update',
        },
        content: {
          type: 'string',
          description: 'Content to add or replace with',
        },
        mode: {
          type: 'string',
          enum: ['append', 'prepend', 'replace'],
          description: 'Update mode (default: append)',
          default: 'append',
        },
      },
      required: ['path', 'content'],
    },
  },

  delete_note: {
    name: 'delete_note',
    description:
      'Delete a note from the vault. Requires confirm: true for safety. This action cannot be undone.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the note to delete',
        },
        confirm: {
          type: 'boolean',
          description: 'Must be true to confirm deletion',
          default: false,
        },
      },
      required: ['path'],
    },
  },

  // Search tools
  search: {
    name: 'search',
    description:
      'Search for text across all notes in the vault. Returns matching notes with context around matches.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Text to search for',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum results to return (default: 10)',
          default: 10,
        },
        contextChars: {
          type: 'number',
          description: 'Characters of context around matches (default: 100)',
          default: 100,
        },
      },
      required: ['query'],
    },
  },

  search_tags: {
    name: 'search_tags',
    description:
      'Find notes by tags. Can require all tags (matchAll: true) or any tag (matchAll: false).',
    inputSchema: {
      type: 'object',
      properties: {
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags to search for (without # prefix)',
        },
        matchAll: {
          type: 'boolean',
          description: 'Require all tags to match (default: false)',
          default: false,
        },
        maxResults: {
          type: 'number',
          description: 'Maximum results to return (default: 10)',
          default: 10,
        },
      },
      required: ['tags'],
    },
  },

  search_frontmatter: {
    name: 'search_frontmatter',
    description:
      'Search notes by frontmatter field value. Supports equals (exact match), contains (substring match), and exists (field presence) operators.',
    inputSchema: {
      type: 'object',
      properties: {
        field: {
          type: 'string',
          description: 'Frontmatter field name to search',
        },
        value: {
          description: 'Value to match (can be string, number, boolean, etc.)',
        },
        operator: {
          type: 'string',
          enum: ['equals', 'contains', 'exists'],
          description: 'Comparison operator (default: equals)',
          default: 'equals',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum results to return (default: 10)',
          default: 10,
        },
      },
      required: ['field'],
    },
  },

  // Periodic notes
  daily_note: {
    name: 'daily_note',
    description:
      "Get or create today's daily note. Creates the note using your daily note template if it doesn't exist.",
    inputSchema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Date in YYYY-MM-DD format (defaults to today)',
        },
        maxChars: {
          type: 'number',
          description: 'Maximum characters to return (default: 5000)',
          default: 5000,
        },
      },
    },
  },

  weekly_note: {
    name: 'weekly_note',
    description:
      "Get or create this week's note. Creates the note using your weekly note template if it doesn't exist. Requires Periodic Notes plugin.",
    inputSchema: {
      type: 'object',
      properties: {
        week: {
          type: 'string',
          description: 'Week in YYYY-Www format (e.g., 2026-W01, defaults to current week)',
        },
        maxChars: {
          type: 'number',
          description: 'Maximum characters to return (default: 5000)',
          default: 5000,
        },
      },
    },
  },

  monthly_note: {
    name: 'monthly_note',
    description:
      "Get or create this month's note. Creates the note using your monthly note template if it doesn't exist. Requires Periodic Notes plugin.",
    inputSchema: {
      type: 'object',
      properties: {
        month: {
          type: 'string',
          description: 'Month in YYYY-MM format (e.g., 2026-01, defaults to current month)',
        },
        maxChars: {
          type: 'number',
          description: 'Maximum characters to return (default: 5000)',
          default: 5000,
        },
      },
    },
  },

  append_to_daily: {
    name: 'append_to_daily',
    description:
      "Append content to today's daily note. Optionally append under a specific heading.",
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Content to append',
        },
        date: {
          type: 'string',
          description: 'Date in YYYY-MM-DD format (defaults to today)',
        },
        heading: {
          type: 'string',
          description: 'Heading to append under (optional)',
        },
      },
      required: ['content'],
    },
  },

  // Batch operations
  batch_read: {
    name: 'batch_read',
    description:
      'Read multiple notes in a single call. More token-efficient than multiple read_note calls.',
    inputSchema: {
      type: 'object',
      properties: {
        paths: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of note paths to read',
        },
        maxCharsPerNote: {
          type: 'number',
          description: 'Max characters per note (default: 1000)',
          default: 1000,
        },
      },
      required: ['paths'],
    },
  },

  batch_create: {
    name: 'batch_create',
    description:
      'Create multiple notes in a single call. More token-efficient than multiple create_note calls. Supports optional frontmatter.',
    inputSchema: {
      type: 'object',
      properties: {
        notes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path for the note',
              },
              content: {
                type: 'string',
                description: 'Content of the note',
              },
              frontmatter: {
                type: 'object',
                description: 'Optional frontmatter as key-value pairs',
              },
            },
            required: ['path', 'content'],
          },
          description: 'Array of notes to create',
        },
        overwrite: {
          type: 'boolean',
          description: 'Overwrite existing files (default: false)',
          default: false,
        },
      },
      required: ['notes'],
    },
  },

  vault_stats: {
    name: 'vault_stats',
    description:
      'Get vault statistics: total files, notes, folders, and common tags. Token-efficient overview.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },

  // Commands
  list_commands: {
    name: 'list_commands',
    description:
      'List available Obsidian commands. Use filter to search by name.',
    inputSchema: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          description: 'Filter commands by name (case-insensitive)',
        },
      },
    },
  },

  execute_command: {
    name: 'execute_command',
    description:
      'Execute an Obsidian command by ID. Use list_commands to find available command IDs.',
    inputSchema: {
      type: 'object',
      properties: {
        commandId: {
          type: 'string',
          description: 'Command ID to execute',
        },
      },
      required: ['commandId'],
    },
  },

  get_active_note: {
    name: 'get_active_note',
    description:
      'Get the currently active (open) note in Obsidian. Returns null if no note is active.',
    inputSchema: {
      type: 'object',
      properties: {
        maxChars: {
          type: 'number',
          description: 'Maximum characters to return (default: 5000)',
          default: 5000,
        },
      },
    },
  },
} as const;
