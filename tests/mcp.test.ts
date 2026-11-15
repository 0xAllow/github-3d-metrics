import { Client } from '@modelcontextprotocol/client'
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio'
import { expect, test } from 'vitest'
import { fileURLToPath } from 'node:url'

test('official SDK client connects over stdio and runs all offline MCP tools', async () => {
  const client = new Client({ name: 'github-3d-metrics-smoke', version: '1.0.0' })
  await client.connect(new StdioClientTransport({
    command: process.execPath, args: [fileURLToPath(new URL('../src/mcp.ts', import.meta.url))]
  }))
  try {
    const tools = await client.listTools()
    expect(tools.tools.map(t => t.name).sort()).toEqual([
      'generate_3d_svg', 'generate_readme_markdown', 'get_available_themes', 'get_contributions',
      'get_github_profile', 'get_languages', 'get_repository_metrics', 'get_visualization_config'
    ])
    const themes = await client.callTool({ name: 'get_available_themes', arguments: {} })
    expect(JSON.stringify(themes)).toContain('Neon Universe')
    const markdown = await client.callTool({ name: 'generate_readme_markdown', arguments: { lightPair: true } })
    expect(JSON.stringify(markdown)).toContain('prefers-color-scheme')
    const config = await client.callTool({ name: 'get_visualization_config', arguments: { username: 'octocat' } })
    expect(JSON.stringify(config)).toContain('workflow_dispatch')
  } finally {
    await client.close()
  }
})
