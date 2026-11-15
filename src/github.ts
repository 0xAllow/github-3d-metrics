import { integer, label, list, login, object, repository, snapshot, type Language } from './model.ts'

const endpoint = 'https://api.github.com'
const calendarQuery = `query Calendar($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      restrictedContributionsCount
      contributionCalendar { weeks { contributionDays { date contributionCount } } }
    }
  }
}`

export function github(token?: string, fetcher: typeof fetch = fetch, now = () => new Date()) {
  async function request(path: string, body?: object): Promise<unknown> {
    const response = await fetcher(endpoint + path, {
      headers: { Accept: 'application/vnd.github+json', ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}) },
      method: body ? 'POST' : 'GET', body: body ? JSON.stringify(body) : undefined,
      redirect: 'error', signal: AbortSignal.timeout(15000)
    })
    if (!response.ok) {
      const reset = Number(response.headers.get('x-ratelimit-reset'))
      const retry = response.headers.get('retry-after')
      if (response.status === 429 || response.headers.get('x-ratelimit-remaining') === '0' || retry) {
        const detail = retry && /^\d+$/.test(retry) ? ' Retry after ' + retry + ' seconds.' :
          reset > 0 && reset < 4e9 ? ' Try again after ' + new Date(reset * 1000).toISOString() + '.' : ''
        throw new Error('GitHub API rate limit reached.' + detail)
      }
      throw new Error('GitHub API returned HTTP ' + response.status +
        (response.status === 404 ? '. Check the username and repository visibility.' : '. Check token access or try again later.'))
    }
    if (body) {
      const scopes = (response.headers.get('x-oauth-scopes') ?? '').split(',').map(x => x.trim())
      if (scopes.some(x => ['repo', 'user', 'read:user'].includes(x))) {
        throw new Error('Calendar generation requires a token without private repository or read:user scopes.')
      }
    }
    return response.json()
  }
  async function profile(username: string) {
    const p = object(await request('/users/' + login(username)))
    if (p.type !== 'User') throw new Error('Choose an individual GitHub account.')
    return { login: login(p.login), followers: integer(p.followers) }
  }
  async function repositories(username: string) {
    const path = '/users/' + login(username) + '/repos?type=owner&per_page=100&sort=full_name&page='
    const result = new Map<string, ReturnType<typeof repository>>()
    for (let page = 1; page <= 101; page++) {
      const rows = list(await request(path + page), 100, object)
      if (page === 101 && rows.length) throw new Error('Repository limit of 10,000 exceeded.')
      for (const r of rows) {
        if (r.private !== false || r.visibility && r.visibility !== 'public') continue
        const item = repository({ name: r.name, stars: r.stargazers_count, forks: r.forks_count, fork: r.fork })
        result.set(item.name, item)
      }
      if (rows.length < 100) return [...result.values()].sort((a, b) => a.name.localeCompare(b.name, 'en'))
    }
    throw new Error('Repository pagination did not finish.')
  }
  async function calendar(username: string) {
    if (!token) throw new Error('GitHub GraphQL requires a GITHUB_TOKEN for calendar views.')
    const to = now()
    const from = new Date(to)
    from.setUTCHours(0, 0, 0, 0)
    from.setUTCDate(from.getUTCDate() - 364)
    const res = object(await request('/graphql', {
      query: calendarQuery, variables: { login: login(username), from: from.toISOString(), to: to.toISOString() }
    }))
    if (res.errors) throw new Error('GitHub GraphQL could not read the contribution calendar. Check token access.')
    const collection = object(object(object(res.data).user).contributionsCollection)
    if (integer(collection.restrictedContributionsCount) !== 0) {
      throw new Error('GitHub reported restricted contributions. Disable private contribution display to generate a public-only calendar.')
    }
    const days = list(object(collection.contributionCalendar).weeks, 54, week =>
      list(object(week).contributionDays, 7, raw => {
        const d = object(raw)
        return { date: d.date, count: d.contributionCount }
      })
    ).flat().filter(day => typeof day.date === 'string' &&
      day.date >= from.toISOString().slice(0, 10) && day.date <= to.toISOString().slice(0, 10))
    if (days.length !== 365) throw new Error('GitHub returned an incomplete 365-day calendar.')
    return snapshot({ schema: 1, login: username, followers: 0, days, repositories: [],
      languages: [], languagesIncluded: false }).days!
  }
  async function languages(username: string, repos: Awaited<ReturnType<typeof repositories>>): Promise<Language[]> {
    const original = repos.filter(repo => !repo.fork)
    if (original.length > 250) throw new Error('Language aggregation supports up to 250 non-fork public repositories.')
    const totals = new Map<string, number>()
    for (let i = 0; i < original.length; i += 4) {
      const maps = await Promise.all(original.slice(i, i + 4).map(r =>
        request('/repos/' + login(username) + '/' + encodeURIComponent(r.name) + '/languages')))
      for (const data of maps) {
        for (const [key, value] of Object.entries(object(data))) {
          const name = label(key)
          totals.set(name, integer((totals.get(name) ?? 0) + integer(value, 1)))
        }
      }
    }
    return [...totals].map(([name, bytes]) => ({ name, bytes }))
      .sort((a, b) => b.bytes - a.bytes || a.name.localeCompare(b.name, 'en'))
  }
  async function collect(username: string, include: { calendar: boolean; languages: boolean }) {
    const p = await profile(username)
    const [repos, days] = await Promise.all([repositories(p.login), include.calendar ? calendar(p.login) : null])
    return snapshot({
      schema: 1, ...p, repositories: repos, days, languagesIncluded: include.languages,
      languages: include.languages ? await languages(p.login, repos) : []
    })
  }
  return { profile, repositories, calendar, languages, collect }
}
