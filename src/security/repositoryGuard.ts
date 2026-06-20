import { execSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

export type SecretPattern = {
  id: string
  pattern: RegExp
}

export type SecretFinding = {
  filePath: string
  patternId: string
  line: number
  excerpt: string
}

export type ScanResult = {
  findings: SecretFinding[]
  scannedFiles: number
}

/**
 * High-confidence patterns for credentials that must never land on main.
 * Prefer specific vendor prefixes over generic "password=" heuristics to limit false positives.
 */
export const SECRET_PATTERNS: SecretPattern[] = [
  { id: 'aws-access-key', pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { id: 'github-pat', pattern: /\bghp_[A-Za-z0-9]{20,}\b/g },
  { id: 'github-fine-grained-pat', pattern: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g },
  { id: 'github-oauth', pattern: /\bgho_[A-Za-z0-9]{20,}\b/g },
  { id: 'stripe-secret', pattern: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/g },
  { id: 'slack-token', pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  { id: 'npm-token', pattern: /\bnpm_[A-Za-z0-9]{20,}\b/g },
  { id: 'private-key-block', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  {
    id: 'embedded-bearer-token',
    pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]{20,}\b/g,
  },
  {
    id: 'high-entropy-assignment',
    pattern:
      /\b(?:api[_-]?key|secret(?:[_-]?key)?|access[_-]?token|auth[_-]?token|client[_-]?secret)\b\s*[:=]\s*['"][^'"\s]{16,}['"]/gi,
  },
]

export const REQUIRED_GITIGNORE_PATTERNS = [
  '.env',
  '.env.*',
  '!.env.example',
  'node_modules/',
  'dist/',
  'coverage/',
  '*.pem',
  '*.key',
  'credentials.json',
  'secrets.json',
  'repomix-output.xml',
] as const

export const FORBIDDEN_TRACKED_PATH_PATTERNS: RegExp[] = [
  /^\.env$/i,
  /^\.env\.(?!example(?:\.|$))[^/]+$/i,
  /(?:^|\/)credentials\.json$/i,
  /(?:^|\/)secrets\.json$/i,
  /(?:^|\/)serviceAccountKey\.json$/i,
  /(?:^|\/)id_rsa$/i,
  /(?:^|\/)id_ed25519$/i,
  /\.pem$/i,
  /\.p12$/i,
  /\.pfx$/i,
  /(?:^|\/)repomix-output\.xml$/i,
  /(?:^|\/)coverage\//i,
  /(?:^|\/)node_modules\//i,
]

export const SCAN_SKIP_DIRECTORY_NAMES = new Set([
  '.git',
  'node_modules',
  'dist',
  'coverage',
])

export const SCAN_SKIP_FILE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.zip',
  '.gz',
])

export function normalizeRepoPath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/^\.\//, '')
}

export function validateGitignore(content: string): string[] {
  return REQUIRED_GITIGNORE_PATTERNS.filter(
    (pattern) => !content.split('\n').some((line) => line.trim() === pattern),
  )
}

export function isForbiddenTrackedPath(filePath: string): boolean {
  const normalized = normalizeRepoPath(filePath)
  return FORBIDDEN_TRACKED_PATH_PATTERNS.some((pattern) => pattern.test(normalized))
}

export function shouldSkipScanPath(relativePath: string): boolean {
  const normalized = normalizeRepoPath(relativePath)
  const segments = normalized.split('/')

  if (segments.some((segment) => SCAN_SKIP_DIRECTORY_NAMES.has(segment))) {
    return true
  }

  const extension = normalized.slice(normalized.lastIndexOf('.'))
  if (SCAN_SKIP_FILE_EXTENSIONS.has(extension)) {
    return true
  }

  if (normalized.endsWith('.lock') || normalized.endsWith('.tsbuildinfo')) {
    return true
  }

  return false
}

export function scanTextForSecrets(
  filePath: string,
  content: string,
  patterns: SecretPattern[] = SECRET_PATTERNS,
): SecretFinding[] {
  const findings: SecretFinding[] = []
  const lines = content.split('\n')

  for (const [index, line] of lines.entries()) {
    if (isLikelyBenignSecretLine(line)) {
      continue
    }

    for (const { id, pattern } of patterns) {
      pattern.lastIndex = 0
      if (pattern.test(line)) {
        findings.push({
          filePath,
          patternId: id,
          line: index + 1,
          excerpt: line.trim().slice(0, 160),
        })
      }
    }
  }

  return findings
}

function isLikelyBenignSecretLine(line: string): boolean {
  const trimmed = line.trim()

  if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) {
    return true
  }

  if (
    trimmed.includes('example.com') ||
    trimmed.includes('@university.edu') ||
    trimmed.includes('@school.edu')
  ) {
    return true
  }

  if (trimmed.includes('pattern:') || trimmed.includes('SECRET_PATTERNS')) {
    return true
  }

  return false
}

export function scanRepository(
  rootDir: string,
  patterns: SecretPattern[] = SECRET_PATTERNS,
): ScanResult {
  const findings: SecretFinding[] = []
  let scannedFiles = 0

  const walk = (absoluteDir: string) => {
    for (const entry of readdirSync(absoluteDir, { withFileTypes: true })) {
      const absolutePath = join(absoluteDir, entry.name)
      const relativePath = normalizeRepoPath(relative(rootDir, absolutePath))

      if (entry.isDirectory()) {
        if (!SCAN_SKIP_DIRECTORY_NAMES.has(entry.name)) {
          walk(absolutePath)
        }
        continue
      }

      if (shouldSkipScanPath(relativePath)) {
        continue
      }

      scannedFiles += 1
      const content = readFileSync(absolutePath, 'utf8')
      findings.push(...scanTextForSecrets(relativePath, content, patterns))
    }
  }

  walk(rootDir)
  return { findings, scannedFiles }
}

export function listGitTrackedFiles(rootDir: string): string[] {
  const output = execSync('git ls-files', {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map(normalizeRepoPath)
}

export function findForbiddenTrackedFiles(rootDir: string): string[] {
  return listGitTrackedFiles(rootDir).filter(isForbiddenTrackedPath)
}

export function formatSecretFindings(findings: SecretFinding[]): string {
  if (findings.length === 0) {
    return 'No secret patterns detected.'
  }

  return findings
    .map(
      (finding) =>
        `${finding.filePath}:${finding.line} [${finding.patternId}] ${finding.excerpt}`,
    )
    .join('\n')
}
