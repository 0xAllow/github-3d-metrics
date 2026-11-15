import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { publishAssets } from '../src/cli.ts'
import { github } from '../src/github.ts'
import { markdown, workflow } from '../src/install.ts'
import { config, login, requirements, themes, views } from '../src/model.ts'
import { cityCells, renderSvg } from '../src/render.ts'
import { sample } from '../web/sample.ts'

test('validates usernames and settings before network or rendering', () => {
  assert.equal(login('0xAllow'), '0xAllow')
  for (const username of ['x--y', '../x', 'x\ny', 'x'.repeat(40)]) assert.throws(() => login(username))
  for (const settings of [{ view: '__proto__' }, { theme: 'constructor' },
    { width: 23 }, { accent: 'red" onload="alert(1)' }, { metrics: [] }, { unknown: true }]) {
    assert.throws(() => config(settings))
  }
})

test('renders all 42 visualization and theme combinations deterministically', () => {
  for (const view of Object.keys(views)) for (const theme of Object.keys(themes)) {
    const settings = { view, theme }
    const svg = renderSvg(sample, settings)
    assert.match(svg, /^<svg /)
    assert.doesNotMatch(svg, /<script|foreignObject|NaN|Infinity/)
    assert.ok(Buffer.byteLength(svg) < 110_000)
    assert.equal(svg, renderSvg(sample, settings))
  }
})

test('SVG XML escapes user labels and preserves zero states', () => {
  const data = { ...sample, repositories: [{ name: '<evil&"name>', stars: 0, forks: 0, fork: false }] }
  const svg = renderSvg(data, { view: 'constellation' })
  assert.match(svg, /&lt;evil&amp;&quot;name&gt;/)
  assert.doesNotMatch(svg, /<evil/)
  assert.match(renderSvg({ ...sample, repositories: [] }, { view: 'constellation' }), /No public repositories/)
  assert.match(renderSvg({ ...sample, languages: [] }, { view: 'languages' }), /No languages reported/)
  assert.match(renderSvg({ ...sample, days: null }), /No calendar data/)
  const city = cityCells(sample.days!)
  assert.equal(city[0].weekday, 6)
  assert.equal(city[1].week, 1)
  assert.equal(Math.max(...city.map(d => d.intensity)), 1)
})

test('generates the workflow and standard/light README embed', () => {
  assert.match(workflow('octocat', { theme: 'matrix' }, true), /workflow_dispatch:[\s\S]*light-pair: true/)
  assert.match(markdown(), /^!\[/)
  assert.match(markdown(true), /prefers-color-scheme: light/)
})

const json = (value: unknown, init?: ResponseInit) => Response.json(value, init)
test('reads and normalizes REST data, paginates, and skips forks in languages', async () => {
  const calls: string[] = []
  const api = github('test-token', async (input, init) => {
    const url = new URL(String(input))
    assert.equal(url.origin, 'https://api.github.com')
    assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer test-token')
    calls.push(url.pathname + url.search)
    if (url.pathname === '/users/octocat') return json({ type: 'User', login: 'octocat', followers: 7 })
    if (url.pathname.endsWith('/languages')) {
      assert.match(url.pathname, /\/original\d+\/languages$/)
      return json({ TypeScript: 100, HTML: 50 })
    }
    if (url.searchParams.get('page') === '2') return json([
      { name: 'original101', private: false, fork: false, stargazers_count: 8, forks_count: 3 },
      { name: 'private', private: true }
    ])
    return json(Array.from({ length: 100 }, (_, i) => ({
      name: (i ? 'fork' : 'original') + i, private: false, fork: i > 0, stargazers_count: 1, forks_count: 0
    })))
  })
  const result = await api.collect('octocat', requirements('languages'))
  assert.equal(result.followers, 7)
  assert.equal(result.repositories.length, 101)
  assert.equal(result.days, null)
  assert.deepEqual(result.languages, [{ name: 'TypeScript', bytes: 200 }, { name: 'HTML', bytes: 100 }])
  assert.equal(calls.filter(v => v.endsWith('/languages')).length, 2)
})

test('normalizes GraphQL calendar and rejects restricted data and over-scoped tokens', async () => {
  let restrictedContributionsCount = 0
  let scopes = ''
  const calendar = github('test-token', async (input, init) => {
    assert.equal(String(input), 'https://api.github.com/graphql')
    const { variables } = JSON.parse(String(init?.body))
    assert.deepEqual(variables, { login: 'octocat', from: '2025-01-04T00:00:00.000Z', to: '2026-01-03T18:00:00.000Z' })
    const days = sample.days!.map(d => ({ date: d.date, contributionCount: d.count }))
    const weeks = Array.from({ length: 53 }, (_, i) => ({ contributionDays: days.slice(i * 7, i * 7 + 7) }))
    return json({ data: { user: { contributionsCollection: { restrictedContributionsCount, contributionCalendar: { weeks } } } } },
      { headers: { 'x-oauth-scopes': scopes } })
  }, () => new Date('2026-01-03T18:00:00Z')).calendar
  assert.deepEqual(await calendar('octocat'), sample.days)
  restrictedContributionsCount = 2
  await assert.rejects(() => calendar('octocat'), /restricted contributions/)
  restrictedContributionsCount = 0
  scopes = 'read:user'
  await assert.rejects(() => calendar('octocat'), /without private/)
})

test('reports rate limits and fails before fetching an invalid username', async () => {
  const api = github(undefined, async () => new Response(null, { status: 429, headers: { 'retry-after': '20' } }))
  await assert.rejects(() => api.profile('octocat'), /Retry after 20 seconds/)
  await assert.rejects(() => api.profile('bad/input'), /GitHub username/)
  await assert.rejects(() => api.calendar('octocat'), /GITHUB_TOKEN/)
})

test('publishes assets only on changes and preserves the prior valid output on failed validation', async () => {
  const root = await mkdtemp(join(tmpdir(), 'metrics-'))
  const read = (name: string) => readFile(join(root, 'assets', name), 'utf8')
  try {
    const settings = { showUpdated: true }
    assert.equal(await publishAssets(root, sample, settings, true, '2026-01-01'), 3)
    const svg = await read('github-3d-metrics.svg')
    const data = await read('github-3d-metrics.json')
    assert.match(svg, /Data changed 2026-01-01/)
    assert.match(await read('github-3d-metrics-light.svg'), /#F4F8FE/)
    assert.equal(await publishAssets(root, sample, settings, true, '2026-01-02'), 0)
    await assert.rejects(() => publishAssets(root, { ...sample, days: null }, settings), /needs a contribution calendar/)
    assert.equal(await read('github-3d-metrics.svg'), svg)
    assert.equal(await read('github-3d-metrics.json'), data)
    assert.equal(await publishAssets(root, { ...sample, followers: 1 }, settings, true, '2026-01-02'), 3)
    assert.match(await read('github-3d-metrics.svg'), /Data changed 2026-01-02/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
