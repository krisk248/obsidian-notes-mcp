/**
 * Obsidian MCP Server
 *
 * Model Context Protocol server for Obsidian integration.
 * Provides tools for note management, search, and automation.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { ObsidianClient } from './api/obsidian-client.js';
import { loadConfig } from './utils/config.js';
import {
  TOOL_DEFINITIONS,
  // Note tools
  listNotes,
  listNotesSchema,
  readNote,
  readNoteSchema,
  createNote,
  createNoteSchema,
  updateNote,
  updateNoteSchema,
  deleteNote,
  deleteNoteSchema,
  // Search tools
  search,
  searchSchema,
  searchTags,
  searchTagsSchema,
  searchFrontmatter,
  searchFrontmatterSchema,
  // Periodic tools
  dailyNote,
  dailyNoteSchema,
  weeklyNote,
  weeklyNoteSchema,
  monthlyNote,
  monthlyNoteSchema,
  appendToDaily,
  appendToDailySchema,
  // Batch tools
  batchRead,
  batchReadSchema,
  batchCreate,
  batchCreateSchema,
  vaultStats,
  vaultStatsSchema,
  // Command tools
  listCommands,
  listCommandsSchema,
  executeCommand,
  executeCommandSchema,
  getActiveNote,
  getActiveNoteSchema,
} from './tools/index.js';

/**
 * Create and configure the MCP server
 */
export function createServer(): Server {
  const server = new Server(
    {
      name: 'obsidian-notes-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Load configuration
  let client: ObsidianClient;
  try {
    const config = loadConfig();
    client = new ObsidianClient(config);
  } catch (error) {
    console.error('Configuration error:', error);
    process.exit(1);
  }

  // Register tool list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: Object.values(TOOL_DEFINITIONS),
    };
  });

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result;

      switch (name) {
        // Note CRUD
        case 'list_notes':
          result = await listNotes(client, listNotesSchema.parse(args));
          break;
        case 'read_note':
          result = await readNote(client, readNoteSchema.parse(args));
          break;
        case 'create_note':
          result = await createNote(client, createNoteSchema.parse(args));
          break;
        case 'update_note':
          result = await updateNote(client, updateNoteSchema.parse(args));
          break;
        case 'delete_note':
          result = await deleteNote(client, deleteNoteSchema.parse(args));
          break;

        // Search
        case 'search':
          result = await search(client, searchSchema.parse(args));
          break;
        case 'search_tags':
          result = await searchTags(client, searchTagsSchema.parse(args));
          break;
        case 'search_frontmatter':
          result = await searchFrontmatter(client, searchFrontmatterSchema.parse(args));
          break;

        // Periodic notes
        case 'daily_note':
          result = await dailyNote(client, dailyNoteSchema.parse(args));
          break;
        case 'weekly_note':
          result = await weeklyNote(client, weeklyNoteSchema.parse(args));
          break;
        case 'monthly_note':
          result = await monthlyNote(client, monthlyNoteSchema.parse(args));
          break;
        case 'append_to_daily':
          result = await appendToDaily(client, appendToDailySchema.parse(args));
          break;

        // Batch operations
        case 'batch_read':
          result = await batchRead(client, batchReadSchema.parse(args));
          break;
        case 'batch_create':
          result = await batchCreate(client, batchCreateSchema.parse(args));
          break;
        case 'vault_stats':
          result = await vaultStats(client, vaultStatsSchema.parse(args));
          break;

        // Commands
        case 'list_commands':
          result = await listCommands(client, listCommandsSchema.parse(args));
          break;
        case 'execute_command':
          result = await executeCommand(client, executeCommandSchema.parse(args));
          break;
        case 'get_active_note':
          result = await getActiveNote(client, getActiveNoteSchema.parse(args));
          break;

        default:
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  error: {
                    code: 'UNKNOWN_TOOL',
                    message: `Unknown tool: ${name}`,
                    help: 'Use list_tools to see available tools',
                  },
                }),
              },
            ],
            isError: true,
          };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
        isError: !result.success,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: {
                code: 'TOOL_ERROR',
                message: errorMessage,
                help: 'Check the tool parameters and try again',
              },
            }),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Run the MCP server with stdio transport
 */
export async function runServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  // Handle shutdown
  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await server.close();
    process.exit(0);
  });
}
