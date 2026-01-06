# obsidian-notes-mcp

[![npm version](https://badge.fury.io/js/obsidian-notes-mcp.svg)](https://www.npmjs.com/package/obsidian-notes-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

The **best MCP server for Obsidian**. Connect Claude Code and Claude Desktop to your notes with one-line setup.

## Why obsidian-mcp?

| Feature | obsidian-mcp | Others |
|---------|-------------|--------|
| Setup | One line | Complex config |
| Token usage | 90%+ reduction | Full content always |
| Tools | 18 comprehensive | 5-8 basic |
| Speed | < 1 second | 3+ minutes (some) |
| Periodic notes | Daily, Weekly, Monthly | Daily only |

## Features

- **One-line setup** - `claude mcp add obsidian-mcp -e OBSIDIAN_API_KEY=xxx`
- **18 powerful tools** - Full CRUD, search, periodic notes, batch operations
- **Token-efficient** - Smart responses minimize token usage by 90%+
- **Blazing fast** - Local search completes in < 1 second
- **Bun-powered** - 4x faster startup than Node.js

## Quick Start

### 1. Install Obsidian Local REST API Plugin

1. Open Obsidian
2. Go to **Settings → Community Plugins → Browse**
3. Search for "**Local REST API**"
4. Install and enable it
5. Copy your API key from the plugin settings

### 2. Add to Claude Code (One Line!)

```bash
claude mcp add obsidian-notes-mcp -e OBSIDIAN_API_KEY=your_key_here
```

**Done!** Claude can now access your Obsidian vault.

### Alternative: Claude Desktop

Add to your Claude Desktop config:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**Linux:** `~/.config/claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "obsidian": {
      "command": "npx",
      "args": ["-y", "obsidian-notes-mcp"],
      "env": {
        "OBSIDIAN_API_KEY": "your_key_here"
      }
    }
  }
}
```

## Available Tools (18 Total)

### Note Management (5 tools)

| Tool | Description | Example |
|------|-------------|---------|
| `list_notes` | List notes with pagination | "List my notes in the Projects folder" |
| `read_note` | Read note content | "Read my meeting notes from today" |
| `create_note` | Create new note with frontmatter | "Create a note called 'Project Ideas'" |
| `update_note` | Append, prepend, or replace content | "Add this to my daily note" |
| `delete_note` | Delete note (requires confirmation) | "Delete the old draft note" |

### Search (3 tools)

| Tool | Description | Example |
|------|-------------|---------|
| `search` | Fast full-text search | "Search for notes about Python" |
| `search_tags` | Find notes by tags | "Find all notes tagged #project" |
| `search_frontmatter` | Search by frontmatter fields | "Find notes with status: draft" |

### Periodic Notes (4 tools)

| Tool | Description | Example |
|------|-------------|---------|
| `daily_note` | Get/create today's daily note | "Show me today's daily note" |
| `weekly_note` | Get/create weekly note | "What's in this week's note?" |
| `monthly_note` | Get/create monthly note | "Create January's monthly review" |
| `append_to_daily` | Append to daily note | "Add 'Had meeting with team' to today" |

### Batch Operations (3 tools)

| Tool | Description | Example |
|------|-------------|---------|
| `batch_read` | Read multiple notes at once | "Read all my project notes" |
| `batch_create` | Create multiple notes at once | "Create these 5 meeting notes" |
| `vault_stats` | Get vault statistics | "How many notes do I have?" |

### Commands (3 tools)

| Tool | Description | Example |
|------|-------------|---------|
| `list_commands` | List Obsidian commands | "What commands are available?" |
| `execute_command` | Run any Obsidian command | "Open the graph view" |
| `get_active_note` | Get currently open note | "What note do I have open?" |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Claude Code / Desktop                       │
└───────────────────────────┬─────────────────────────────────┘
                            │ MCP Protocol (stdio)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    obsidian-mcp Server                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   18 MCP Tools                         │  │
│  │  Notes: list, read, create, update, delete            │  │
│  │  Search: text, tags, frontmatter                      │  │
│  │  Periodic: daily, weekly, monthly                     │  │
│  │  Batch: read, create, stats                           │  │
│  │  Commands: list, execute, active                      │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │            Token Optimization Layer                    │  │
│  │  • Pagination (20 items default)                      │  │
│  │  • Truncation (5000 chars default)                    │  │
│  │  • Smart summaries                                    │  │
│  └───────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS (localhost:27124)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Obsidian + Local REST API Plugin                │
└─────────────────────────────────────────────────────────────┘
```

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OBSIDIAN_API_KEY` | Yes | - | API key from Local REST API plugin |
| `OBSIDIAN_HOST` | No | 127.0.0.1 | Obsidian host address |
| `OBSIDIAN_PORT` | No | 27124 | Obsidian port |
| `OBSIDIAN_PROTOCOL` | No | https | http or https |
| `OBSIDIAN_REJECT_UNAUTHORIZED` | No | true | Set "false" for self-signed certs |

## Token Efficiency

This MCP is designed to minimize token usage:

| Operation | Without Optimization | With obsidian-mcp | Savings |
|-----------|---------------------|-------------------|---------|
| List 1000 notes | ~100,000 tokens | ~2,000 tokens | **98%** |
| Read 10 notes | ~50,000 tokens | ~5,000 tokens | **90%** |
| Search vault | ~200,000 tokens | ~3,000 tokens | **98%** |

**How it works:**
- **Pagination** - Returns 20 items per page by default
- **Truncation** - Limits content to 5000 characters
- **Smart summaries** - Returns paths and metadata, not full content
- **Batch operations** - Reduces API round-trips

## Examples

### Create a note with frontmatter

```
"Create a note called 'Meeting Notes' in the Work folder with tags project and meeting"
```

### Search and summarize

```
"Search my notes for 'machine learning' and summarize what I've written"
```

### Daily journaling

```
"Add to today's daily note: Had a productive meeting about the new feature"
```

### Batch operations

```
"Read all notes in my Projects folder and give me an overview"
```

## Development

```bash
# Clone the repository
git clone https://github.com/krisk248/obsidian-mcp.git
cd obsidian-mcp

# Install dependencies
bun install

# Run in development mode
bun run dev

# Run tests
bun test

# Build for production
bun run build
```

## Requirements

- [Obsidian](https://obsidian.md/) with [Local REST API](https://github.com/coddingtonbear/obsidian-local-rest-api) plugin
- Node.js 20+ or [Bun](https://bun.sh/)

## Troubleshooting

### "Cannot connect to Obsidian"

1. Make sure Obsidian is running
2. Verify Local REST API plugin is enabled
3. Check the API key is correct

### "Self-signed certificate error"

Set the environment variable:
```bash
OBSIDIAN_REJECT_UNAUTHORIZED=false
```

### Search is slow

This MCP uses fast local search (< 1 second). If you experience slowness, ensure you're using the latest version.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Credits

- Built with [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- Powered by [Bun](https://bun.sh/)
- Integrates with [Obsidian Local REST API](https://github.com/coddingtonbear/obsidian-local-rest-api)
