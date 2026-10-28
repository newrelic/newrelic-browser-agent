import { introspectType, EnumLiteral } from './nerdgraph-client.js'

// Fields on AgentApplicationSettingsUpdateInput that are browser-monitoring
// related. Everything else on that input (apmConfig, errorCollector,
// mobileSettings, dataManagement, jfr, profiling, slowSql, threadProfiler,
// tracerType, transactionTracer, useCrashReports, aiMonitoring, ...) is APM
// or mobile-only and deliberately excluded. sessionReplay/sessionTrace are
// browser-only despite not starting with "browser" — confirmed via live
// introspection against staging-api.newrelic.com/graphql (this repo's
// connect-service-check plan/research).
const BROWSER_FIELD_PATTERN = /^browser/i
const EXTRA_BROWSER_FIELDS = new Set(['sessionReplay', 'sessionTrace'])

const MAX_DEPTH = 6

/**
 * Introspects AgentApplicationSettingsUpdateInput live and builds a settings
 * object that pushes every browser-related leaf field to a value that's
 * deliberately different from a fresh app's defaults, so the before/after
 * connect diff has something to find everywhere. Returns both the settings
 * object (for the mutation) and a flat list of the field paths it set (for
 * the field-map cross-reference in report.js).
 *
 * This is intentionally schema-driven, not hand-maintained: a browser
 * setting NerdGraph adds later shows up here automatically next run.
 */
export async function generateMaximalBrowserSettings (client) {
  const rootType = await introspectType(client, 'AgentApplicationSettingsUpdateInput')
  if (!rootType || !rootType.inputFields) {
    throw new Error('Could not introspect AgentApplicationSettingsUpdateInput - is the NerdGraph schema unreachable or has this type been renamed?')
  }

  const browserFields = rootType.inputFields.filter(
    f => BROWSER_FIELD_PATTERN.test(f.name) || EXTRA_BROWSER_FIELDS.has(f.name)
  )

  const settings = {}
  const fieldPaths = []

  for (const field of browserFields) {
    const value = await buildValueForField(client, field, [field.name], fieldPaths)
    if (value !== undefined) settings[field.name] = value
  }

  return { settings, fieldPaths }
}

async function buildValueForField (client, field, path, fieldPaths, depth = 0) {
  if (depth > MAX_DEPTH) return undefined

  const named = unwrapType(field.type)

  if (named.isList) {
    const itemNamed = named
    const leaf = await buildLeafOrObject(client, { ...itemNamed, isList: false }, path, fieldPaths, depth)
    return leaf === undefined ? undefined : [leaf]
  }

  return buildLeafOrObject(client, named, path, fieldPaths, depth)
}

async function buildLeafOrObject (client, named, path, fieldPaths, depth) {
  if (named.kind === 'INPUT_OBJECT') {
    const nestedType = await introspectType(client, named.name)
    if (!nestedType || !nestedType.inputFields) return undefined

    const nested = {}
    for (const field of nestedType.inputFields) {
      const value = await buildValueForField(client, field, [...path, field.name], fieldPaths, depth + 1)
      if (value !== undefined) nested[field.name] = value
    }
    return nested
  }

  if (named.kind === 'ENUM') {
    const enumType = await introspectType(client, named.name)
    const values = enumType?.enumValues?.map(v => v.name) || []
    if (values.length === 0) return undefined
    // last value tends to be less "default-shaped" than the first in these schemas
    fieldPaths.push(path.join('.'))
    return new EnumLiteral(values[values.length - 1])
  }

  if (named.kind === 'SCALAR') {
    const value = generateLeafValue(path[path.length - 1], named.name)
    if (value === undefined) return undefined
    fieldPaths.push(path.join('.'))
    return value
  }

  return undefined
}

function unwrapType (typeDescriptor) {
  let current = typeDescriptor
  let isList = false

  while (current) {
    if (current.kind === 'NON_NULL') {
      current = current.ofType
      continue
    }
    if (current.kind === 'LIST') {
      isList = true
      current = current.ofType
      continue
    }
    break
  }

  return { kind: current?.kind, name: current?.name, isList }
}

/**
 * Heuristic leaf-value generation - see the plan's Design section for the
 * rationale. Not a promise these are all semantically "valid" server-side
 * (e.g. a bogus regex could be rejected); widen/fix per-field as this is
 * exercised against real data.
 */
let booleanToggle = 0

function generateLeafValue (fieldName, scalarName) {
  const lower = fieldName.toLowerCase()

  if (scalarName === 'Boolean') {
    booleanToggle = 1 - booleanToggle
    return booleanToggle === 1
  }

  if (scalarName === 'Float' || scalarName === 'Int') {
    if (lower.includes('rate')) return 42.5
    if (lower.includes('apdex')) return 7
    return scalarName === 'Int' ? 3 : 1.5
  }

  if (scalarName === 'String') {
    if (lower === 'regex') return '__connect_check__'
    if (lower === 'replacement') return '***'
    if (lower.includes('selector')) return '.__connect-check__'
    if (lower.includes('origin') || lower.includes('domain')) return 'https://__connect-check__.example.com'
    // pinnedVersion is validated server-side against real *published*
    // agent releases (confirmed live: a format-valid but nonexistent
    // version got "Unsupported agent version") - there's no safe fuzz
    // value here without hardcoding a real release that will go stale, so
    // leave it unset rather than mutate it.
    if (lower === 'pinnedversion') return undefined
    return '__connect_check__'
  }

  return undefined
}
