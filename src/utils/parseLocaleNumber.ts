/**
 * Parses numeric strings that may use US or European grouping/decimal separators.
 * Examples: "1000.50", "1,000.50", "1.000,50", "1000,50", "1.000"
 */
export function parseLocaleNumber(raw: string): number | null {
  const trimmed = raw.trim()

  if (!trimmed || !/\d/.test(trimmed)) {
    return null
  }

  let value = trimmed
    .replace(/\u00A0/g, ' ')
    .replace(/\s/g, '')
    .replace(/^[^\d+\-]+/, '')
    .replace(/[^\d.,]+$/, '')

  if (!value || !/\d/.test(value)) {
    return null
  }

  const lastComma = value.lastIndexOf(',')
  const lastDot = value.lastIndexOf('.')
  let normalized: string

  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      normalized = value.replace(/\./g, '').replace(',', '.')
    } else {
      normalized = value.replace(/,/g, '')
    }
  } else if (lastComma !== -1) {
    const parts = value.split(',')
    const lastPart = parts.at(-1) ?? ''

    if (parts.length === 2 && lastPart.length > 0 && lastPart.length <= 2) {
      normalized = value.replace(',', '.')
    } else {
      normalized = value.replace(/,/g, '')
    }
  } else if (lastDot !== -1) {
    const parts = value.split('.')
    const lastPart = parts.at(-1) ?? ''

    if (parts.length > 2 || (parts.length === 2 && lastPart.length === 3)) {
      normalized = value.replace(/\./g, '')
    } else {
      normalized = value
    }
  } else {
    normalized = value
  }

  const parsed = Number.parseFloat(normalized)

  return Number.isFinite(parsed) ? parsed : null
}
