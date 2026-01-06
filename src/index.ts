#!/usr/bin/env node
/**
 * obsidian-mcp
 *
 * The best MCP server for Obsidian.
 * Connect Claude Code and Claude Desktop to your notes with one-line setup.
 *
 * Usage:
 *   claude mcp add obsidian-mcp -e OBSIDIAN_API_KEY=your_key
 *
 * Or run directly:
 *   OBSIDIAN_API_KEY=your_key npx obsidian-mcp
 *   OBSIDIAN_API_KEY=your_key bunx obsidian-mcp
 */

import { runServer } from './server.js';

// Run the server
runServer().catch((error) => {
  console.error('Failed to start obsidian-mcp server:', error);
  process.exit(1);
});
