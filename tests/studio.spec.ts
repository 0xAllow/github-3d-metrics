import { expect, test } from '@playwright/test'
import { sample } from '../web/sample.ts'

test('renders all themes and creates the workflow and light embed', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Sample data')).toBeVisible()
  const image = page.getByRole('img', { name: 'Contribution City for sample-profile' })
  await expect(image).toBeVisible()
  for (const theme of ['Cyberpunk', 'Matrix', 'Midnight', 'Minimal Dark', 'Light', 'Transparent', 'Neon Universe']) {
    const choice = page.getByRole('button', { name: theme, exact: true })
    await choice.click()
    await expect(choice).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(() => image.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  }
  await page.getByLabel('GitHub username').fill('octocat')
  await expect(page.getByText('workflow_dispatch:', { exact: false })).toBeVisible()
  await page.getByLabel('Generate a separate light card', { exact: false }).check()
  await expect(page.getByText('prefers-color-scheme: light', { exact: false })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open Update Now on GitHub' })).toHaveAttribute('href',
    'https://github.com/octocat/octocat/actions/workflows/update-now.yml')
})

test('loads a published snapshot, and handles missing repositories', async ({ page }) => {
  await page.route('https://api.github.com/repos/octocat/octocat', route => route.fulfill({ json: { default_branch: 'main' } }))
  await page.route('**/contents/assets/github-3d-metrics.json?*', route => route.fulfill({ json: { ...sample, login: 'octocat' } }))
  await page.route('https://api.github.com/repos/missing/missing', route => route.fulfill({ status: 404 }))
  await page.goto('/')
  await page.getByLabel('GitHub username').fill('octocat')
  await page.getByRole('button', { name: 'Load snapshot' }).click()
  await expect(page.getByText('Published snapshot · @octocat')).toBeVisible()
  await page.getByLabel('GitHub username').fill('missing')
  await page.getByRole('button', { name: 'Load snapshot' }).click()
  await expect(page.getByRole('alert')).toContainText('No public profile repository found')
  await expect(page.getByText('Published snapshot · @octocat')).toBeVisible()
})

test('switches between 3D and SVG and enables camera reset or WebGL fallback', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '3D', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Reset camera' })).toBeVisible()
  await page.getByRole('button', { name: 'SVG', exact: true }).click()
  await expect(page.getByRole('img', { name: 'Contribution City for sample-profile' })).toBeVisible()
})
