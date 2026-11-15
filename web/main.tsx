import { lazy, Suspense, useState, type FormEvent } from 'react'
import { createRoot } from 'react-dom/client'
import { config, defaultConfig, login, requirements, snapshot, themes, views, type Config, type Snapshot, type Theme, type View } from '../src/model.ts'
import { renderSvg } from '../src/render.ts'
import { markdown, workflow } from '../src/install.ts'
import { sample } from './sample.ts'
import './style.css'
const Viewer = lazy(() => import('./viewer.tsx'))
const repository = 'https://github.com/0xAllow/github-3d-metrics'
const palette = (name: Theme) => themes[name]
const icons: Record<View, string> = { city: '▦', stats: '▤', languages: '▰', constellation: '✧', timeline: '⌁', combined: '◫' }

function Copy({ value, label }: { value: string; label: string }) {
  const [status, setStatus] = useState('')
  return <div className="code">
    <div className="code-head"><span>{label}</span><button type="button" onClick={async () => {
      try { await navigator.clipboard.writeText(value); setStatus('Copied') }
      catch { setStatus('Select the code to copy it') }
    }}>Copy</button></div>
    <pre tabIndex={0}>{value}</pre><span aria-live="polite" className={status ? 'copy-status' : ''}>{status}</span>
  </div>
}

async function loadProfile(raw: string) {
  const username = login(raw.trim())
  const url = 'https://api.github.com/repos/' + username + '/' + username
  const signal = AbortSignal.timeout(12000)
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(response.status === 404
    ? 'No public profile repository found. Create it and run Update Now, or continue with the sample.'
    : 'GitHub could not read the profile repository. Try again later.')
  const meta: { default_branch?: unknown } = await response.json()
  if (typeof meta.default_branch !== 'string' || !meta.default_branch) throw new Error('Unable to read the default branch.')
  const asset = await fetch(url + '/contents/assets/github-3d-metrics.json?ref=' + encodeURIComponent(meta.default_branch),
    { headers: { Accept: 'application/vnd.github.raw+json' }, signal })
  if (!asset.ok) throw new Error('No published snapshot could be loaded. Run Update Now on the profile repository’s default branch.')
  const data = snapshot(await asset.json())
  if (data.login.toLowerCase() !== username.toLowerCase()) throw new Error('The snapshot belongs to a different GitHub user.')
  return data
}

function App() {
  const [settings, setSettings] = useState<Config>({ ...defaultConfig })
  const [data, setData] = useState<Snapshot>(sample)
  const [username, setUsername] = useState('')
  const [interactive, setInteractive] = useState(false)
  const [lightPair, setLightPair] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  let target = ''
  try { target = login(username.trim()) } catch { /* The form describes the problem when submitted. */ }
  const update = (patch: Partial<Config>) => setSettings(current => ({ ...current, ...patch }))
  const needs = requirements(settings.view)
  const previewData = !needs.calendar || data.days?.length ? data : sample
  const activeData = needs.languages && !previewData.languagesIncluded ? sample : previewData
  let svg = '', invalid = ''
  try { svg = renderSvg(activeData, settings) } catch (e) { invalid = (e as Error).message }
  const mode = interactive && settings.view === 'city' && activeData.days?.length && !invalid
  const image = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  const activeDays = activeData.days?.filter(d => d.count > 0).length
  const total = activeData.days?.reduce((sum, d) => sum + d.count, 0)
  const canInstall = Boolean(target && !invalid)
  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try { setData(await loadProfile(username)) }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load the snapshot.') }
    finally { setBusy(false) }
  }
  return <>
    <header className="top"><div className="top-inner">
      <a className="brand" href="#"><span className="brand-icon" aria-hidden="true">◇</span> GitHub 3D Metrics</a>
      <nav aria-label="Main"><a href="#studio">Studio</a><a href="#install">Setup</a><a href="#mcp">MCP</a></nav>
      <a className="repo" href={repository}>GitHub ↗</a>
    </div></header>
    <main>
      <section className="hero">
        <div className="kicker"><span></span> OPEN-SOURCE GITHUB PROFILE VISUALS</div>
        <h1>Your code.<br /><strong>Your universe.</strong></h1>
        <p>Turn public GitHub activity into a 3D city, constellation, or statistics card for your profile README.</p>
        <a className="action" href="#studio">Customize a visualization <span aria-hidden="true">↘</span></a>
      </section>
      <section id="studio" aria-labelledby="studio-title">
        <div className="section-head"><div><h2 id="studio-title">Visualization studio</h2><p>Pick a view and tune the appearance of your README card.</p></div></div>
        <div className="studio">
          <aside className="panel settings">
            <fieldset>
              <legend>Visualization</legend>
              {Object.entries(views).map(([key, name]) => <button className="view-choice" type="button" key={key}
                aria-pressed={settings.view === key} onClick={() => { update({ view: key as View }); setInteractive(false) }}>
                <span aria-hidden="true">{icons[key as View]}</span>{name}</button>)}
            </fieldset>
            <fieldset className="theme-list">
              <legend>Theme</legend>
              {Object.keys(themes).map(key => {
                const theme = key as Theme
                const [name, bg, a, b] = palette(theme)
                return <button type="button" key={theme} aria-pressed={settings.theme === theme} onClick={() => update({ theme })}
                  className="swatch"><i style={{ background: bg === 'none' ? 'transparent' : bg, color: a, boxShadow: 'inset -4px -4px 0 ' + b }} />{name}</button>
              })}
            </fieldset>
          </aside>
          <div className="panel preview">
            <div className="preview-head">
              <div><h3>{views[settings.view]}</h3><span className="data-label">{activeData === sample ? 'Sample data' : 'Published snapshot · @' + activeData.login}</span></div>
              {settings.view === 'city' && <div className="tabs" aria-label="Preview format">
                <button type="button" aria-pressed={!interactive} onClick={() => setInteractive(false)}>SVG</button>
                <button type="button" aria-pressed={interactive} onClick={() => setInteractive(true)}>3D</button>
              </div>}
            </div>
            <div className="preview-frame">
              {invalid ? <p role="alert">{invalid}</p> : mode ? <Suspense fallback={<p>Loading 3D viewer…</p>}>
                <Viewer key={activeData.login} days={activeData.days!} settings={settings} /></Suspense> :
                <img src={image} alt={views[settings.view] + ' for ' + activeData.login} />}
            </div>
            {data !== sample && activeData === sample && <p className="feedback">The selected view needs data that this snapshot does not include. Generate a snapshot with this view to see your activity here.</p>}
            <div className="preview-foot">
              <span>{needs.calendar && total !== undefined ? total.toLocaleString('en-US') + ' contributions · ' + activeDays + ' active days' :
                activeData.repositories.length + ' public repositories'}</span>
              {!invalid && <a href={image} download="github-3d-metrics.svg">Download SVG ↓</a>}
            </div>
            <form className="profile-form" onSubmit={submit}>
              <label htmlFor="username">GitHub username</label>
              <div><input id="username" spellCheck={false} maxLength={39} value={username} onChange={e => setUsername(e.target.value)}
                placeholder="octocat" required /><button type="submit" disabled={busy}>{busy ? 'Loading…' : 'Load snapshot'}</button></div>
              <p>A snapshot is available after Update Now succeeds in your profile repository.</p>
              {error && <p className="feedback" role="alert">{error}</p>}
            </form>
          </div>
        </div>
        <details className="panel advanced">
          <summary>Customize dimensions, colors, and metrics</summary>
          <div className="fields">
            <label>Width <input type="number" min={480} max={2000} value={settings.width || ''} onChange={e => update({ width: Number(e.target.value) })} /></label>
            <label>Height <input type="number" min={300} max={1200} value={settings.height || ''} onChange={e => update({ height: Number(e.target.value) })} /></label>
            <label>Style <select value={settings.style} onChange={e => update({ style: e.target.value as Config['style'] })}><option value="solid">Solid</option><option value="outline">Outline</option></select></label>
            <label>Accent <input value={settings.accent} placeholder="#00E5FF" maxLength={7} onChange={e => update({ accent: e.target.value })} /></label>
            <label>Secondary <input value={settings.accent2} placeholder="#2563EB" maxLength={7} onChange={e => update({ accent2: e.target.value })} /></label>
            <label>Background <input value={settings.background} placeholder="#070B14" maxLength={7} onChange={e => update({ background: e.target.value })} /></label>
          </div>
          <fieldset className="checks"><legend>Statistics shown on Stats and Combined cards</legend>
            {defaultConfig.metrics.map(metric => <label key={metric}><input type="checkbox" checked={settings.metrics.includes(metric)}
              disabled={settings.metrics.length === 1 && settings.metrics.includes(metric)}
              onChange={e => update({ metrics: e.target.checked ? [...settings.metrics, metric] : settings.metrics.filter(m => m !== metric) })} /> {metric}</label>)}
          </fieldset>
          <label className="check"><input type="checkbox" checked={settings.showUpdated} onChange={e => update({ showUpdated: e.target.checked })} /> Show the date the data changed</label>
        </details>
      </section>
      <section id="install" className="guide">
        <h2>Install on your GitHub profile</h2>
        <ol><li>Create a public GitHub repository with the same name as your username. Include a README.</li>
          <li>Save the workflow below as <code>.github/workflows/update-now.yml</code> in that repository.</li>
          <li>Open Actions → Update Now → Run workflow. Use the default branch.</li>
          <li>After a successful run, add the embed below to your README. GitHub’s image cache may take time to refresh.</li></ol>
        <label className="check"><input type="checkbox" checked={lightPair} onChange={e => setLightPair(e.target.checked)} /> Generate a separate light card for GitHub’s light appearance</label>
        {canInstall ? <Copy value={workflow(target, config(settings), lightPair)} label="GitHub Actions workflow" /> :
          <p className="feedback">Enter a valid GitHub username and card settings to generate your workflow.</p>}
        <Copy value={markdown(lightPair)} label="README embed" />
        {target && <a className="action" href={'https://github.com/' + target + '/' + target + '/actions/workflows/update-now.yml'}>Open Update Now on GitHub ↗</a>}
      </section>
      <section id="mcp" className="guide">
        <h2>Use with an MCP client</h2>
        <p>Run the local stdio server to fetch GitHub metrics, generate SVG text, and prepare README markup.</p>
        <a href={repository + '/blob/main/docs/mcp.md'}>Read the MCP setup guide ↗</a>
      </section>
    </main>
    <footer><span>GitHub 3D Metrics · Created by 0xAllow</span><a href={repository + '/blob/main/LICENSE'}>MIT License ↗</a></footer>
  </>
}
createRoot(document.getElementById('root')!).render(<App />)
