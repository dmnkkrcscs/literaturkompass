/**
 * Minimal robots.txt checker — no external dependency, covers the common
 * case (User-agent: * with plain Disallow/Allow prefixes). Wildcards and
 * $ end-anchors in rules aren't supported; good enough to avoid crawling
 * pages a site explicitly blocks without pulling in a full parser.
 */

interface RobotsRules {
  disallow: string[]
  allow: string[]
}

const robotsCache = new Map<string, RobotsRules | null>()

function parseRobotsTxt(text: string): RobotsRules {
  const rules: RobotsRules = { disallow: [], allow: [] }
  let appliesToUs = false
  let sawAnyGroup = false

  for (const rawLine of text.split('\n')) {
    const line = rawLine.split('#')[0].trim()
    if (!line) continue

    const [rawField, ...rest] = line.split(':')
    const field = rawField.trim().toLowerCase()
    const value = rest.join(':').trim()

    if (field === 'user-agent') {
      sawAnyGroup = true
      appliesToUs = value === '*'
    } else if (appliesToUs && field === 'disallow' && value) {
      rules.disallow.push(value)
    } else if (appliesToUs && field === 'allow' && value) {
      rules.allow.push(value)
    }
  }

  // No groups at all → nothing restricts us
  if (!sawAnyGroup) return { disallow: [], allow: [] }
  return rules
}

async function getRobotsRules(origin: string): Promise<RobotsRules | null> {
  if (robotsCache.has(origin)) return robotsCache.get(origin)!

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5_000)
    const response = await fetch(`${origin}/robots.txt`, { signal: controller.signal })
    clearTimeout(timeout)

    if (!response.ok) {
      robotsCache.set(origin, null)
      return null
    }

    const rules = parseRobotsTxt(await response.text())
    robotsCache.set(origin, rules)
    return rules
  } catch {
    // Unreachable robots.txt → don't block crawling on it
    robotsCache.set(origin, null)
    return null
  }
}

/** Returns false if the site's robots.txt disallows crawling this URL. */
export async function isAllowedByRobots(url: string): Promise<boolean> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return true
  }

  const rules = await getRobotsRules(parsed.origin)
  if (!rules) return true

  const path = parsed.pathname + parsed.search
  const matchingAllow = rules.allow
    .filter((rule) => path.startsWith(rule))
    .sort((a, b) => b.length - a.length)[0]
  const matchingDisallow = rules.disallow
    .filter((rule) => path.startsWith(rule))
    .sort((a, b) => b.length - a.length)[0]

  if (!matchingDisallow) return true
  if (matchingAllow && matchingAllow.length >= matchingDisallow.length) return true
  return false
}
