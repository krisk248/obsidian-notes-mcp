# VHS Demo Script - Run with: vhs demo.tape

Output demo.gif

Set FontSize 16
Set Width 800
Set Height 500
Set Theme "Dracula"

Type "# Add obsidian-notes-mcp to Claude Code"
Enter
Sleep 500ms

Type "claude mcp add obsidian-notes-mcp -e OBSIDIAN_API_KEY=your_key"
Enter
Sleep 2s

Type "# Done! Now Claude can access your Obsidian vault"
Enter
Sleep 1s

Type "# Let's test it in Claude Code..."
Enter
Sleep 500ms

Type "claude"
Enter
Sleep 2s

Type "List my Obsidian notes"
Enter
Sleep 3s

Type "Search for notes about 'project'"
Enter
Sleep 3s

Type "Create a note called 'Test Note' with content 'Hello from Claude!'"
Enter
Sleep 3s
