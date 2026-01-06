/**
 * Command Tools
 *
 * Tools for listing and executing Obsidian commands.
 */

import { z } from 'zod';
import type { ObsidianClient } from '../api/obsidian-client.js';
import type { ToolResult } from '../types/index.js';

/**
 * list_commands - List available Obsidian commands
 */
export const listCommandsSchema = z.object({
  filter: z.string().optional().describe('Filter commands by name (case-insensitive)'),
});

export type ListCommandsInput = z.infer<typeof listCommandsSchema>;

export async function listCommands(
  client: ObsidianClient,
  params: ListCommandsInput
): Promise<ToolResult<{ commands: Array<{ id: string; name: string }>; total: number }>> {
  try {
    let commands = await client.listCommands();

    // Filter if requested
    if (params.filter) {
      const filterLower = params.filter.toLowerCase();
      commands = commands.filter(
        (cmd) =>
          cmd.name.toLowerCase().includes(filterLower) ||
          cmd.id.toLowerCase().includes(filterLower)
      );
    }

    return {
      success: true,
      data: {
        commands,
        total: commands.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'OBSIDIAN_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list commands',
        help: 'Check if Obsidian is running with Local REST API enabled',
      },
    };
  }
}

/**
 * execute_command - Execute an Obsidian command
 */
export const executeCommandSchema = z.object({
  commandId: z.string().describe('Command ID to execute (use list_commands to find IDs)'),
});

export type ExecuteCommandInput = z.infer<typeof executeCommandSchema>;

export async function executeCommand(
  client: ObsidianClient,
  params: ExecuteCommandInput
): Promise<ToolResult<{ commandId: string; executed: boolean }>> {
  try {
    await client.executeCommand(params.commandId);

    return {
      success: true,
      data: {
        commandId: params.commandId,
        executed: true,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Command not found: ${params.commandId}`,
        help: 'Use list_commands to see available commands',
      },
    };
  }
}

/**
 * get_active_note - Get the currently active note in Obsidian
 */
export const getActiveNoteSchema = z.object({
  maxChars: z.number().default(5000).describe('Maximum characters to return'),
});

export type GetActiveNoteInput = z.infer<typeof getActiveNoteSchema>;

export async function getActiveNote(
  client: ObsidianClient,
  params: GetActiveNoteInput
): Promise<ToolResult<{ path: string; content: string; truncated: boolean } | null>> {
  try {
    const note = await client.getActiveFile();

    if (!note) {
      return {
        success: true,
        data: null,
      };
    }

    // Truncate if needed
    let content = note.content;
    let truncated = false;

    if (content.length > params.maxChars) {
      content = content.slice(0, params.maxChars) + '... [truncated]';
      truncated = true;
    }

    return {
      success: true,
      data: {
        path: note.path,
        content,
        truncated,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'OBSIDIAN_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get active note',
        help: 'Make sure a note is open in Obsidian',
      },
    };
  }
}
