# Reddit Post Draft

## Title Options (pick one):
1. "I built an MCP server for Obsidian with Claude Code - now Claude can read/write my notes!"
2. "Made my Obsidian vault accessible to Claude AI - sharing my MCP server"
3. "Built obsidian-notes-mcp: Connect Claude to your Obsidian vault with one command"

---

## Post Body:

Hey everyone!

I built an MCP server that connects Claude (Claude Code / Claude Desktop) to my Obsidian vault, and I wanted to share it with the community.

**Why I made this:**
I wanted Claude to have access to my notes while coding. It's like giving Claude a memory - not full context, but my notes can provide background info, project details, and things I've written down. Super helpful when working on projects!

**What it does:**
- Read, create, update, and delete notes
- Search across your entire vault (really fast, < 1 second)
- Access daily/weekly/monthly notes
- Batch operations (read multiple notes at once)
- 18 tools total

**Setup is one line:**
```bash
claude mcp add obsidian -e OBSIDIAN_API_KEY=your_key -e OBSIDIAN_REJECT_UNAUTHORIZED=false -- npx -y obsidian-notes-mcp
```
(You need the Local REST API plugin in Obsidian first - the second env var handles its self-signed certificate)

**Built with Claude Code:**
I actually built this entire thing with help from Claude Code. It was a fun experience - Claude helped with the architecture, wrote tests, debugged issues, and even helped publish to npm.

**Links:**
- npm: https://www.npmjs.com/package/obsidian-notes-mcp
- GitHub: https://github.com/krisk248/obsidian-notes-mcp

I'd really appreciate any feedback! Try it out and let me know what features you'd like to see or any issues you run into. The code is public so feel free to check it out or contribute.

Thanks! 🙏

---

## Subreddits to post:
- r/ObsidianMD (main one)
- r/ClaudeAI
- r/LocalLLaMA (if they allow MCP posts)
