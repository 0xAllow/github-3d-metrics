import { config, login } from './model.ts'

export function markdown(darkLight = false) {
  if (!darkLight) return '![GitHub 3D Metrics](./assets/github-3d-metrics.svg)'
  return '<picture>\n  <source media="(prefers-color-scheme: light)" srcset="./assets/github-3d-metrics-light.svg">\n' +
    '  <img src="./assets/github-3d-metrics.svg" alt="GitHub 3D Metrics">\n</picture>'
}
export function workflow(username: string, options: unknown, darkLight = false) {
  return `name: Update Now
on:
  workflow_dispatch:
permissions:
  contents: write
jobs:
  generate:
    uses: 0xAllow/github-3d-metrics/.github/workflows/update-reusable.yml@main
    with:
      username: ${JSON.stringify(login(username))}
      options: ${JSON.stringify(JSON.stringify(config(options)))}
      light-pair: ${darkLight}
`
}
