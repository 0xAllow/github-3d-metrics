# Verification status

| Check | Result |
| --- | --- |
| Node core suite | Eight tests passed, including all 42 view/theme combinations, SVG escaping, public repository pagination, language totals, GraphQL calendar normalization, rate limits, deterministic output, and preserving prior assets when generation validation fails. The API tests use fixtures. |
| Sample assets | The city SVG and all seven gallery SVGs parsed as XML. The city card rendered locally in Inkscape and was visually inspected. |
| Workflow definitions | Parsed locally as YAML. The manual live smoke workflow can exercise the REST and GraphQL paths with a real account in Actions without committing any assets. |
| Dependency installation and audit | The local environment returned HTTP 403 for npm. The archive has no lockfile. Strict type checking, the Vite build, Playwright, the MCP protocol smoke test, and npm audit still need a run with registry access. |
| Live GitHub API | The execution environment returned HTTP 403 from GitHub’s API. The built-in Actions token and actual GitHub calendar responses still need a live run. |
| Actual profile README, reusable Actions, and GitHub Pages | Pending authorized publication and hosted verification. |
| MCP compatible clients | Pending an npm-backed run of the official SDK client smoke test and a manual run in a compatible host. |

## Hosted acceptance

1. Run **Live GitHub API smoke test**. The third generation should report unchanged unless GitHub’s data changed during the run.
2. In a public profile test repository, install the reusable workflow and run **Update Now** twice. Check the SVG, snapshot, and git history. Try an invalid username and confirm the previous committed SVG still renders.
3. Add the README embed. Repeat with the light pair in GitHub’s light and dark appearances. Inspect the actual published README.
4. Deploy Pages from **Deploy GitHub Pages** and use the environment URL to check the desktop and mobile layouts, snapshot loader, theme switching, downloadable SVG, copy controls, and interactive and SVG modes.
5. Run CI and the local MCP test. Connect a compatible MCP host over stdio and call `get_available_themes` and `generate_3d_svg` with a public account. Save and open the returned SVG.
6. Generate and commit a dependency lockfile in the release tree after a successful npm install. Update CI and Pages installation to `npm ci` and verify it before tagging a release.
