export const views = {
  city: 'Contribution City', stats: 'GitHub Stats', languages: 'Language Distribution',
  constellation: 'Repository Constellation', timeline: 'Activity Timeline', combined: 'Combined Statistics'
} as const
export const themes = {
  neon: ['Neon Universe', '#070B14', '#00E5FF', '#2563EB', '#8B5CF6', '#E8F2FF', '#9AAFC8'],
  cyberpunk: ['Cyberpunk', '#15091C', '#FF3FAF', '#9538E5', '#22D3EE', '#FFF0FB', '#DAC0DE'],
  matrix: ['Matrix', '#020C07', '#38FA93', '#078445', '#A3F36D', '#E6FFEB', '#9CCAAC'],
  midnight: ['Midnight', '#10142C', '#A5B4FC', '#4F46E5', '#C084FC', '#EEEDF9', '#AEADD0'],
  minimal: ['Minimal Dark', '#151515', '#F1F1F1', '#595959', '#A3A3A3', '#FFFFFF', '#B8B8B8'],
  light: ['Light', '#F4F8FE', '#17599D', '#327ACD', '#6847A9', '#142843', '#43607F'],
  transparent: ['Transparent', 'none', '#087DB1', '#2563EB', '#8B5CF6', '#334155', '#475569']
} as const
export type View = keyof typeof views
export type Theme = keyof typeof themes
export type Day = { date: string; count: number }
export type Language = { name: string; bytes: number }
export type Repository = { name: string; stars: number; forks: number; fork: boolean }
export type Snapshot = {
  schema: 1; login: string; followers: number; days: Day[] | null;
  repositories: Repository[]; languages: Language[]; languagesIncluded: boolean; updated?: string
}
export const defaultConfig = {
  view: 'city' as View, theme: 'neon' as Theme, width: 1000, height: 480,
  accent: '', accent2: '', background: '', style: 'solid' as 'solid' | 'outline', showUpdated: false,
  metrics: ['followers', 'repositories', 'stars', 'forks']
}
export type Config = typeof defaultConfig
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected an object.')
  return value as Record<string, unknown>
}
export function login(value: unknown): string {
  if (typeof value !== 'string' || !/^(?=.{1,39}$)[a-z\d]+(?:-[a-z\d]+)*$/i.test(value)) {
    throw new Error('Enter a GitHub username with 1–39 letters, numbers or internal hyphens.')
  }
  return value
}
export function integer(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error('Expected an integer between ' + min + ' and ' + max + '.')
  }
  return value
}
export function label(value: unknown): string {
  if (typeof value !== 'string' || !value.length || value.length > 100 || /[\x00-\x1f\x7f\uD800-\uDFFF\uFFFE\uFFFF]/u.test(value)) {
    throw new Error('Invalid data label.')
  }
  return value
}
export function dayDate(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\d$/.test(value) ||
    !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) {
    throw new Error('Invalid calendar date.')
  }
  return value
}
export function list<T>(value: unknown, limit: number, parse: (entry: unknown) => T): T[] {
  if (!Array.isArray(value) || value.length > limit) throw new Error('Unexpected list size.')
  return value.map(parse)
}
export function config(value: unknown = {}): Config {
  const input = object(value)
  for (const key of Object.keys(input)) if (!Object.hasOwn(defaultConfig, key)) throw new Error('Unknown setting: ' + key)
  const c = { ...defaultConfig, ...input }
  if (typeof c.view !== 'string' || !Object.hasOwn(views, c.view) ||
      typeof c.theme !== 'string' || !Object.hasOwn(themes, c.theme)) throw new Error('Unknown visualization or theme.')
  integer(c.width, 480, 2000)
  integer(c.height, 300, 1200)
  for (const color of [c.accent, c.accent2, c.background]) {
    if (typeof color !== 'string' || !/^(?:#[a-f\d]{6})?$/i.test(color)) throw new Error('Use six-digit hex colors.')
  }
  if (!['solid', 'outline'].includes(c.style) || typeof c.showUpdated !== 'boolean' ||
      !Array.isArray(c.metrics) || c.metrics.length < 1 || c.metrics.length > 4 ||
      new Set(c.metrics).size !== c.metrics.length || c.metrics.some(x => !defaultConfig.metrics.includes(x))) {
    throw new Error('Invalid style, update label or displayed metrics.')
  }
  return c
}
export function repository(value: unknown): Repository {
  const r = object(value)
  if (typeof r.fork !== 'boolean') throw new Error('Missing fork flag.')
  return { name: label(r.name), stars: integer(r.stars), forks: integer(r.forks), fork: r.fork }
}
export function snapshot(value: unknown): Snapshot {
  const s = object(value)
  if (s.schema !== 1 || typeof s.languagesIncluded !== 'boolean') throw new Error('Unsupported snapshot.')
  const days = s.days === null ? null : list(s.days, 370, value => {
    const d = object(value)
    return { date: dayDate(d.date), count: integer(d.count, 0, 1_000_000) }
  }).sort((a, b) => a.date.localeCompare(b.date))
  if (days?.some((d, i) => i > 0 && Date.parse(d.date) - Date.parse(days[i - 1].date) !== 86400000)) {
    throw new Error('Calendar days must be consecutive.')
  }
  return {
    schema: 1, login: login(s.login), followers: integer(s.followers), days,
    repositories: list(s.repositories, 10_000, repository),
    languages: list(s.languages, 1000, value => {
      const l = object(value)
      return { name: label(l.name), bytes: integer(l.bytes, 1) }
    }), languagesIncluded: s.languagesIncluded,
    ...(s.updated === undefined ? {} : { updated: dayDate(s.updated) })
  }
}
export function requirements(view: View) {
  return {
    calendar: view === 'city' || view === 'timeline' || view === 'combined',
    languages: view === 'languages'
  }
}
