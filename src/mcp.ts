import { McpServer } from '@modelcontextprotocol/server'
import { serveStdio } from '@modelcontextprotocol/server/stdio'
import { z } from 'zod'
import { github } from './github.ts'
import { config, defaultConfig, requirements, themes, views } from './model.ts'
import { markdown, workflow } from './install.ts'
import { renderSvg } from './render.ts'

const api = github(process.env.GITHUB_TOKEN)
const username = z.string().min(1).max(39)
const options = z.object({
  view: z.enum(['city', 'stats', 'languages', 'constellation', 'timeline', 'combined']).optional(),
  theme: z.enum(['neon', 'cyberpunk', 'matrix', 'midnight', 'minimal', 'light', 'transparent']).optional(),
  width: z.number().int().min(480).max(2000).optional(),
  height: z.number().int().min(300).max(1200).optional(),
  accent: z.string().max(7).optional(),
  accent2: z.string().max(7).optional(),
  background: z.string().max(7).optional(),
  style: z.enum(['solid', 'outline']).optional(),
  showUpdated: z.boolean().optional(),
  metrics: z.array(z.enum(['followers', 'repositories', 'stars', 'forks'])).min(1).max(4).optional()
}).strict().optional()
function result(value: unknown) {
  return { content: [{ type: 'text' as const, text: typeof value === 'string' ? value : JSON.stringify(value) }] }
}
async function run(get: () => unknown) {
  try { return result(await get()) } catch (error) {
    return { ...result(error instanceof Error ? error.message : 'Unexpected error'), isError: true }
  }
}
const readOnly = { readOnlyHint: true, openWorldHint: true }
const local = { readOnlyHint: true, openWorldHint: false }
void serveStdio(() => {
  const server = new McpServer({ name: 'github-3d-metrics', version: '0.1.0' })
  server.registerTool('get_github_profile', { description: 'Get public GitHub profile metrics.', inputSchema: z.object({ username }).strict(), annotations: readOnly },
    args => run(() => api.profile(args.username)))
  server.registerTool('get_contributions', { description: 'Get the public-only 365-day GitHub calendar.', inputSchema: z.object({ username }).strict(), annotations: readOnly },
    args => run(() => api.calendar(args.username)))
  server.registerTool('get_languages', { description: 'Aggregate GitHub language bytes across public non-fork repositories.', inputSchema: z.object({ username }).strict(), annotations: readOnly },
    args => run(async () => api.languages(args.username, await api.repositories(args.username))))
  server.registerTool('get_repository_metrics', { description: 'List owned public repositories, stars and forks.', inputSchema: z.object({ username }).strict(), annotations: readOnly },
    args => run(() => api.repositories(args.username)))
  server.registerTool('get_available_themes', { description: 'List themes and their palettes.', annotations: local }, () => run(() => themes))
  server.registerTool('generate_3d_svg', {
    description: 'Render an SVG as text. The client can save it locally with authorization.',
    inputSchema: z.object({ username, options }).strict(), annotations: readOnly
  }, args => run(async () => {
    const settings = config(args.options)
    const data = await api.collect(args.username, requirements(settings.view))
    return renderSvg({ ...data, updated: new Date().toISOString().slice(0, 10) }, settings)
  }))
  server.registerTool('generate_readme_markdown', { description: 'Generate relative README embed markup.', inputSchema: z.object({ lightPair: z.boolean().optional() }).strict(), annotations: local },
    args => run(() => markdown(args.lightPair)))
  server.registerTool('get_visualization_config', {
    description: 'Get normalized settings and a reusable workflow to install in a profile repository.',
    inputSchema: z.object({ username, options, lightPair: z.boolean().optional() }).strict(), annotations: local
  }, args => run(() => ({ views, defaults: defaultConfig, config: config(args.options), workflow: workflow(args.username, args.options, args.lightPair) })))
  return server
})
