import { config, requirements, snapshot, themes, views, type Snapshot } from './model.ts'

const escape = (x: string | number) => String(x).replace(/[&<>"']/g,
  ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[ch]!)
const count = (value: number) => value.toLocaleString('en-US')
const short = (value: string, limit: number) => [...value].length > limit ? [...value].slice(0, limit - 1).join('') + '…' : value

export function cityCells(days: NonNullable<Snapshot['days']>) {
  const offset = days.length ? new Date(days[0].date + 'T00:00:00Z').getUTCDay() : 0
  const max = Math.max(1, ...days.map(day => day.count))
  return days.map((day, i) => {
    const index = i + offset
    return { ...day, week: Math.floor(index / 7), weekday: index % 7,
      intensity: Math.sqrt(day.count / max) }
  })
}
export function renderSvg(data: unknown, options: unknown = {}): string {
  const s = snapshot(data)
  const c = config(options)
  const [themeName, base, a, b, violet, fg, quiet] = themes[c.theme]
  const bg = c.background || base
  const accent = c.accent || a
  const secondary = c.accent2 || b
  const main = c.theme === 'transparent' ? 'var(--fg, ' + fg + ')' : fg
  const muted = c.theme === 'transparent' ? 'var(--muted, ' + quiet + ')' : quiet
  const text = (x: number, y: number, value: string | number, size = 14, fill = muted, anchor = 'start', weight = 500) =>
    `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="${anchor}" font-weight="${weight}">${escape(value)}</text>`
  const line = (x: number, y: number, x2: number, y2: number, opacity = .23) =>
    `<path d="M${x} ${y}L${x2} ${y2}" stroke="${accent}" stroke-opacity="${opacity}"/>`
  const empty = (message: string) => text(500, 258, message, 19, muted, 'middle')
  const totals = {
    followers: s.followers, repositories: s.repositories.length,
    stars: s.repositories.reduce((n, r) => n + r.stars, 0),
    forks: s.repositories.reduce((n, r) => n + r.forks, 0)
  }
  const titles: Record<string, string> = {
    followers: 'Followers', repositories: 'Public repositories', stars: 'Repository stars', forks: 'Repository forks'
  }
  function prism(x: number, y: number, w: number, d: number, h: number, color: string) {
    const k = d / 2
    const filled = (fill: string) => c.style === 'outline'
      ? `fill="${fill}" fill-opacity=".13" stroke="${color}" stroke-opacity=".75" stroke-width=".8"`
      : `fill="${fill}"`
    return `<path ${filled(secondary)} d="M${x+w} ${y+w/4-h}l-${d} ${k}v${h}l${d} -${k}Z"/><path ${filled(violet)} d="M${x-d} ${y+k-h}l${w} ${w/4}v${h}l-${w} -${w/4}Z"/><path ${filled(color)} d="M${x} ${y-h}l${w} ${w/4}l-${d} ${k}l-${w} -${w/4}Z"/>`
  }
  function city() {
    if (!s.days?.length) return empty('No calendar data available')
    const cells = cityCells(s.days)
    const active = s.days.filter(day => day.count > 0).length
    const total = s.days.reduce((n, day) => n + day.count, 0)
    const floor = '<path d="M221 194L907 323L788 401L102 272Z" fill="' + secondary + '" fill-opacity=".09" stroke="' + accent + '" stroke-opacity=".27"/>'
    const buildings = cells.sort((l, r) => (l.week * 2 + l.weekday * 7) - (r.week * 2 + r.weekday * 7))
      .map(day => {
        const x = 227 + day.week * 12 - day.weekday * 16
        const y = 204 + day.week * 2.25 + day.weekday * 8
        if (!day.count) return `<path d="M${x} ${y}l9 2l-12 6l-9 -2Z" fill="${accent}" opacity=".15"/>`
        return '<g><title>' + day.date + ': ' + count(day.count) + ' contributions</title>' +
          prism(x, y, 9, 12, 3 + Math.round(day.intensity * 103), day.intensity > .43 ? accent : secondary) + '</g>'
      }).join('')
    return floor + buildings + text(50, 135, count(total), 27, main, 'start', 750) +
      text(50, 155, 'CONTRIBUTIONS · ' + active + ' ACTIVE DAYS', 11) +
      text(115, 332, s.days[0].date, 12) + text(897, 394, s.days.at(-1)!.date, 12, muted, 'end')
  }
  function stats(compact = false) {
    const gap = 900 / c.metrics.length
    return c.metrics.map((key, i) => {
      const x = 50 + i * gap
      const y = compact ? 145 : 285
      const w = gap - 36
      return (compact ? line(x, y + 32, x + w, y + 32) :
        prism(x + 20, y, Math.min(125, w - 14), 14, 34, accent) + line(x, y + 35, x + w, y + 35)) +
        text(x, y + (compact ? 0 : 88), titles[key], 15) +
        text(x, y + (compact ? 22 : 65), count(totals[key as keyof typeof totals]), compact ? 22 : 34, main, 'start', 750)
    }).join('')
  }
  function languages() {
    if (!s.languagesIncluded) return empty('Language data was not included in this snapshot')
    if (!s.languages.length) return empty('No languages reported for public non-fork repositories')
    const ordered = [...s.languages].sort((l, r) => r.bytes - l.bytes)
    const rows = ordered.slice(0, 6)
    if (ordered.length > 6) rows.push({ name: 'Other languages', bytes: ordered.slice(6).reduce((n, l) => n + l.bytes, 0) })
    const total = ordered.reduce((n, l) => n + l.bytes, 0)
    return rows.map((l, i) => {
      const y = 146 + i * 38
      const w = Math.max(1, Math.round(l.bytes / total * 570))
      return text(50, y + 9, short(l.name, 19), 15, main) +
        `<path d="M245 ${y}h570" stroke="${accent}" opacity=".14"/>` +
        `<path d="M245 ${y}h${w}v10h-${w}Z" fill="${secondary}" opacity=".65"/>` +
        `<path d="M245 ${y}l9 -7h${w}l-9 7Z" fill="${accent}"/>` +
        text(945, y + 8, (l.bytes / total * 100).toFixed(1) + '%', 16, main, 'end', 700)
    }).join('')
  }
  function constellation() {
    const repos = [...s.repositories].sort((l, r) => r.stars - l.stars || l.name.localeCompare(r.name, 'en')).slice(0, 12)
    if (!repos.length) return empty('No public repositories')
    return repos.map((r, i) => {
      const x = 132 + (i % 4) * 245
      const y = 155 + Math.floor(i / 4) * 91 + i % 2 * 14
      const radius = Math.min(20, 5 + Math.log2(1 + r.stars))
      return line(500, 265, x, y, .17) +
        `<circle cx="${x}" cy="${y}" r="${radius + 6}" fill="none" stroke="${accent}" opacity=".32"/><circle cx="${x}" cy="${y}" r="${radius}" fill="url(#orb)"><title>${escape(r.name)}: ${count(r.stars)} stars</title></circle>` +
        text(x + 31, y, short(r.name, 20), 13, main) + text(x + 31, y + 18, count(r.stars) + ' stars', 11)
    }).join('')
  }
  function timeline() {
    if (!s.days?.length) return empty('No calendar data available')
    const weeks: number[] = []
    for (const d of cityCells(s.days)) weeks[d.week] = (weeks[d.week] ?? 0) + d.count
    const max = Math.max(...weeks, 1)
    const pts = weeks.map((n, i) => [55 + i * 890 / Math.max(1, weeks.length - 1), 371 - n * 204 / max])
    const path = pts.map(([x,y]) => x.toFixed(1) + ' ' + y.toFixed(1)).join('L')
    return [167, 218, 269, 320, 371].map(y => line(55, y, 945, y, .13)).join('') +
      `<path d="M${path}L${pts.at(-1)![0]} 371H55Z" fill="url(#area)"/><path d="M${path}" fill="none" stroke="${accent}" stroke-width="2.5"/>` +
      text(55, 155, 'WEEKLY CONTRIBUTIONS · PEAK ' + count(Math.max(...weeks)), 12) +
      text(55, 401, s.days[0].date, 12) + text(945, 401, s.days.at(-1)!.date, 12, muted, 'end')
  }
  const viewMarkup = {
    city, stats: () => stats(), languages, constellation, timeline,
    combined: () => stats(true) + '<g transform="translate(60 122) scale(.88 .76)">' + city() + '</g>'
  }
  const caption = {
    city: 'DAILY ACTIVITY', stats: 'PUBLIC PROFILE', languages: 'BYTES BY LANGUAGE',
    constellation: 'TOP PUBLIC REPOSITORIES BY STARS', timeline: 'WEEKLY ACTIVITY', combined: 'PROFILE & DAILY ACTIVITY'
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${c.width}" height="${c.height}" viewBox="0 0 1000 480" role="img" aria-labelledby="title desc" font-family="system-ui, sans-serif">
<title id="title">${views[c.view]} for @${s.login}</title><desc id="desc">GitHub metrics · ${escape(caption[c.view])}</desc>
${c.theme === 'transparent' ? '<style>svg{--fg:#152842;--muted:#364d69}@media(prefers-color-scheme:dark){svg{--fg:#edf5ff;--muted:#a9b9d0}}</style>' : ''}
<defs><radialGradient id="orb" cx=".32" cy=".28"><stop stop-color="${accent}"/><stop offset="1" stop-color="${secondary}"/></radialGradient><linearGradient id="area" x1="0%" y1="0%" x2="0%" y2="100%"><stop stop-color="${secondary}" stop-opacity=".65"/><stop offset="1" stop-color="${secondary}" stop-opacity=".04"/></linearGradient><pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="${accent}" opacity=".12"/></pattern></defs>
<rect x="1" y="1" width="998" height="478" rx="22" fill="${bg}" stroke="${accent}" stroke-opacity=".32"/><rect x="12" y="12" width="976" height="456" rx="16" fill="url(#dots)"/>
${text(50, 43, '@' + s.login + '  /  ' + caption[c.view], 13, accent, 'start', 700)}
${text(50, 88, views[c.view], 39, main, 'start', 780)}
${text(950, 77, themeName, 13, muted, 'end')}
${line(50, 104, 950, 104)}
${viewMarkup[c.view]()}
${line(50, 427, 950, 427)}
${text(50, 452, 'GITHUB 3D METRICS', 12, accent, 'start', 700)}
${text(950, 452, c.showUpdated && s.updated ? 'Data changed ' + s.updated : 'GITHUB PUBLIC DATA', 12, muted, 'end')}
</svg>\n`
}

export function assertViewData(data: Snapshot, view: keyof typeof views) {
  const need = requirements(view)
  if (need.calendar && !data.days?.length) throw new Error('This view needs a contribution calendar.')
  if (need.languages && !data.languagesIncluded) throw new Error('This view needs language data.')
}
