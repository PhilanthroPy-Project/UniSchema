import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  findForbiddenTrackedFiles,
  formatSecretFindings,
  scanRepository,
  scanTextForSecrets,
  validateGitignore,
} from '../src/security/repositoryGuard.js'

const REPO_ROOT = join(import.meta.dirname, '..')

describe('repository security guard', () => {
  it('keeps required sensitive-path rules in .gitignore', () => {
    const gitignore = readFileSync(join(REPO_ROOT, '.gitignore'), 'utf8')
    const missing = validateGitignore(gitignore)

    expect(missing, `Missing .gitignore entries: ${missing.join(', ')}`).toEqual([])
  })

  it('does not track forbidden sensitive file paths', () => {
    const forbidden = findForbiddenTrackedFiles(REPO_ROOT)

    expect(
      forbidden,
      `Remove these tracked sensitive paths and add them to .gitignore:\n${forbidden.join('\n')}`,
    ).toEqual([])
  })

  it('scans the repository for high-confidence secret patterns', () => {
    const { findings, scannedFiles } = scanRepository(REPO_ROOT)

    expect(scannedFiles).toBeGreaterThan(0)
    expect(
      findings,
      `Potential secrets detected:\n${formatSecretFindings(findings)}`,
    ).toEqual([])
  })

  it('detects injected secret patterns in file content', () => {
    const fakeGithubPat = ['ghp', '1234567890abcdefghijklmnopqrstuvwxyz'].join('_')
    const sample = ['const config = {', `  token: "${fakeGithubPat}",`, '}'].join('\n')

    const findings = scanTextForSecrets('fixture.ts', sample)

    expect(findings.some((finding) => finding.patternId === 'github-pat')).toBe(true)
  })

  it('ignores documented example emails in fixtures', () => {
    const sample = 'const email = "jane.doe@university.edu"'

    expect(scanTextForSecrets('fixture.ts', sample)).toEqual([])
  })
})
