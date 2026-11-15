import type { Snapshot } from '../src/model.ts'

export const sample: Snapshot = {
  schema: 1, login: 'sample-profile', followers: 284, languagesIncluded: true, updated: '2026-01-03',
  days: Array.from({ length: 365 }, (_, index) => {
    const phase = ((index * 1597 + index * index * 107) % 109) / 109
    const pulse = .3 + .7 * Math.abs(Math.sin(index / 30))
    return { date: new Date(Date.UTC(2025, 0, 4 + index)).toISOString().slice(0, 10),
      count: phase > .44 ? Math.ceil(phase ** 3 * 22 * pulse) : 0 }
  }),
  repositories: [
    { name: 'orbital-ui', stars: 229, forks: 38, fork: false },
    { name: 'stellar-kit', stars: 164, forks: 31, fork: false },
    { name: 'atlas-tools', stars: 87, forks: 8, fork: false },
    { name: 'signal-engine', stars: 53, forks: 5, fork: false },
    { name: 'lumen', stars: 33, forks: 8, fork: false },
    { name: 'transit', stars: 26, forks: 3, fork: false }
  ],
  languages: [
    { name: 'TypeScript', bytes: 52000 }, { name: 'Rust', bytes: 25500 },
    { name: 'CSS', bytes: 12500 }, { name: 'JavaScript', bytes: 6700 },
    { name: 'Shell', bytes: 3300 }
  ]
}
