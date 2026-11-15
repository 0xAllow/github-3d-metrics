import { mkdir, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { github } from './github.ts'
import { config, login, requirements, snapshot, type Snapshot } from './model.ts'
import { assertViewData, renderSvg } from './render.ts'

async function readOptional(path: string) {
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw error
  }
}

export async function publishAssets(root: string, data: Snapshot, options: unknown, lightPair = false, today = new Date().toISOString().slice(0, 10)) {
  const settings = config(options)
  const normalized = snapshot(data)
  assertViewData(normalized, settings.view)
  const directory = join(await realpath(root), 'assets')
  await mkdir(directory, { recursive: true })
  if (await realpath(directory) !== directory) throw new Error('assets must be a real directory inside the destination.')
  const { updated: ignored, ...metrics } = normalized
  const saved = await readOptional(join(directory, 'github-3d-metrics.json'))
  let prior: Snapshot | undefined
  if (saved) {
    try { prior = snapshot(JSON.parse(saved)) } catch { /* A successful refresh can replace an invalid snapshot. */ }
  }
  const { updated: oldDate, ...oldMetrics } = prior ?? {}
  const same = JSON.stringify(metrics) === JSON.stringify(oldMetrics)
  const current = snapshot({ ...metrics, updated: same ? oldDate ?? today : today })
  const outputs: [string, string][] = [
    ['github-3d-metrics.svg', renderSvg(current, settings)],
    ['github-3d-metrics.json', JSON.stringify(current) + '\n']
  ]
  if (lightPair) outputs.push(['github-3d-metrics-light.svg',
    renderSvg(current, { ...settings, theme: 'light', background: '', accent: '', accent2: '' })])
  const staged: [string, string][] = []
  try {
    for (const [name, value] of outputs) {
      const target = join(directory, name)
      if (await readOptional(target) === value) continue
      const temp = join(directory, '.metrics-' + randomUUID())
      await writeFile(temp, value, { flag: 'wx' })
      staged.push([temp, target])
    }
    for (const [temp, target] of staged) await rename(temp, target)
  } finally {
    await Promise.all(staged.map(([temp]) => rm(temp, { force: true })))
  }
  return staged.length
}

async function main() {
  const { values } = parseArgs({ options: {
    username: { type: 'string' }, options: { type: 'string' }, root: { type: 'string', default: '.' },
    'light-pair': { type: 'boolean' }, help: { type: 'boolean' }
  } })
  if (values.help) {
    console.log('npm run generate -- --username LOGIN [--options JSON] [--root REPOSITORY] [--light-pair]')
    return
  }
  const username = login(values.username ?? process.env.METRICS_USERNAME)
  const settings = config(JSON.parse(values.options ?? process.env.METRICS_OPTIONS ?? '{}'))
  const data = await github(process.env.GITHUB_TOKEN).collect(username, requirements(settings.view))
  const changed = await publishAssets(resolve(values.root), data, settings,
    values['light-pair'] ?? process.env.METRICS_LIGHT_PAIR === 'true')
  console.log(changed ? 'Updated ' + changed + ' asset(s) for @' + data.login : 'Metrics unchanged.')
}
if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) {
  main().catch(error => {
    const reason = error instanceof SyntaxError ? 'Invalid settings JSON.' : error instanceof Error ? error.message : 'Unexpected error'
    console.error('Metrics update failed:', reason)
    process.exitCode = 1
  })
}
