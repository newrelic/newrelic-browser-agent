import { NERDGRAPH_TO_AGENT_MAP, getAgentFieldsIntentionallyUnmapped } from './field-map.js'
import { getCanonicalModelPaths } from './config-model-reader.js'

const NAMESPACES = ['info', 'init', 'loaderConfig']

function flattenObject (obj, prefix = '') {
  const out = {}
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    if (prefix) out[prefix] = obj
    return out
  }
  for (const [key, value] of Object.entries(obj)) {
    const nextPrefix = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(out, flattenObject(value, nextPrefix))
    } else {
      out[nextPrefix] = Array.isArray(value) ? JSON.stringify(value) : value
    }
  }
  return out
}

function flattenExtracted (extracted) {
  const flat = {}
  for (const ns of NAMESPACES) {
    Object.assign(flat, prefixKeys(flattenObject(extracted[ns]), ns))
  }
  return flat
}

function prefixKeys (obj, prefix) {
  const out = {}
  for (const [k, v] of Object.entries(obj)) out[`${prefix}.${k}`] = v
  return out
}

/**
 * Bucket (1): before vs after, everything that's there, no judgment about
 * whether a change was expected - that judgment happens in bucket (3), which
 * consumes this bucket's `changed` set.
 */
export function computeBucket1 (beforeExtracted, afterExtracted) {
  const before = flattenExtracted(beforeExtracted)
  const after = flattenExtracted(afterExtracted)
  const allPaths = new Set([...Object.keys(before), ...Object.keys(after)])

  const changed = []
  for (const path of allPaths) {
    const b = before[path]
    const a = after[path]
    if (b !== a) changed.push({ path, before: b, after: a })
  }

  return { changed }
}

/**
 * Bucket (2): every key the live snippet actually defined, checked against
 * this repo's canonical model shape. A path here with no canonical
 * counterpart is exactly the silent-drop class configurable.js's
 * getModeledObject creates - the running browser agent would never see it.
 */
export function computeBucket2 (afterExtracted) {
  const canonical = getCanonicalModelPaths()
  const canonicalSets = {
    info: new Set(canonical.info),
    init: new Set(canonical.init),
    loaderConfig: new Set(canonical.loaderConfig)
  }

  const unknownFields = []
  for (const ns of NAMESPACES) {
    const flat = flattenObject(afterExtracted[ns])
    for (const path of Object.keys(flat)) {
      if (!canonicalSets[ns].has(path)) {
        unknownFields.push({ namespace: ns, path, value: flat[path] })
      }
    }
  }

  return { unknownFields }
}

/**
 * Bucket (3): for every NerdGraph field we deliberately mutated, did it
 * actually land where field-map.js says it should. Fields field-map.js
 * marks agentPath: null are excluded (they were never expected to appear).
 * Fields missing from field-map.js entirely are reported separately as
 * unreviewed, since silence there is a map gap, not a verified non-mapping.
 */
export function computeBucket3 (mutatedFieldPaths, beforeExtracted, afterExtracted) {
  const beforeFlat = flattenExtracted(beforeExtracted)
  const afterFlat = flattenExtracted(afterExtracted)

  const propagated = []
  const regressions = []
  const ambiguous = []
  const unreviewed = []

  for (const nerdgraphPath of mutatedFieldPaths) {
    const mapping = NERDGRAPH_TO_AGENT_MAP[nerdgraphPath]

    if (!mapping) {
      unreviewed.push({ nerdgraphPath })
      continue
    }

    if (mapping.agentPath === null) {
      continue // confirmed not expected in the snippet
    }

    const before = beforeFlat[mapping.agentPath]
    const after = afterFlat[mapping.agentPath]

    if (before !== after) {
      propagated.push({ nerdgraphPath, agentPath: mapping.agentPath, before, after })
    } else if (typeof after === 'boolean' || typeof before === 'boolean') {
      // Booleans only have two possible values, so our value-generation
      // heuristic (settings-generator.js alternates true/false without
      // reading the account's current setting first) can coincidentally
      // pick the value the field already had - "no visible change" here is
      // NOT strong evidence of a real regression the way it is for the
      // sentinel string/float/enum values, which would essentially never
      // already match a real account by chance. Confirmed live
      // (2026-09-04): browserMonitoring.distributedTracing.enabled showed
      // exactly this pattern.
      ambiguous.push({ nerdgraphPath, agentPath: mapping.agentPath, value: after })
    } else {
      regressions.push({ nerdgraphPath, agentPath: mapping.agentPath, value: after })
    }
  }

  return { propagated, regressions, ambiguous, unreviewed }
}

/**
 * Bucket (4): static capability-gap check - every canonical agent-model
 * field that is neither a mapping target in field-map.js nor explicitly
 * marked intentionally-unmapped is a setting the browser agent supports
 * that (as far as this map currently knows) NerdGraph has no way to set.
 */
export function computeBucket4 () {
  const canonical = getCanonicalModelPaths()
  const intentionallyUnmapped = getAgentFieldsIntentionallyUnmapped()

  const mappedTargets = new Set(
    Object.values(NERDGRAPH_TO_AGENT_MAP)
      .map(m => m.agentPath)
      .filter(Boolean)
  )

  const gaps = []
  for (const ns of NAMESPACES) {
    for (const path of canonical[ns]) {
      const fullPath = `${ns}.${path}`
      if (mappedTargets.has(fullPath)) continue
      if (intentionallyUnmapped[fullPath]) continue
      gaps.push(fullPath)
    }
  }

  return { gaps }
}

export function hasRegressions ({ bucket2, bucket3 }) {
  return bucket2.unknownFields.length > 0 || bucket3.regressions.length > 0
}

/**
 * True when field-map.js's triage tables (NERDGRAPH_TO_AGENT_MAP's
 * unreviewed entries, or bucket (4)'s static gaps) are out of date relative
 * to what this run actually observed - i.e. a human needs to edit
 * field-map.js, independent of whether the run found a real regression.
 */
export function needsFieldMapUpdate ({ bucket3, bucket4 }) {
  return bucket3.unreviewed.length > 0 || bucket4.gaps.length > 0
}

export function buildMarkdownReport ({ meta, bucket1, bucket2, bucket3, bucket4 }) {
  const lines = []

  lines.push(`# Connect-service browser-config check`)
  lines.push('')
  lines.push(`Environment: \`${meta.environment}\` | Account ID: \`${meta.accountId}\` | App: \`${meta.appName}\``)
  lines.push('')

  if (needsFieldMapUpdate({ bucket3, bucket4 })) {
    const unmappedCount = bucket3.unreviewed.length
    const gapCount = bucket4.gaps.length
    lines.push(
      `> :memo: **Action needed:** this run found ${unmappedCount} field(s) NerdGraph accepted with no entry in \`field-map.js\` at all, ` +
      `and ${gapCount} agent-model field(s) with no NerdGraph mapping and no \`intentionallyUnmapped\` reason. ` +
      'Update `.github/actions/connect-service-check/field-map.js` — for each one, either add a mapping to where it lands in `init`/`info`/`loader_config` ' +
      '(see sections (3) and (4) below for the exact list), or mark it `intentionallyUnmapped`/`agentPath: null` with a one-line reason if it genuinely isn\'t expected to map.'
    )
    lines.push('')
  }

  lines.push('## (3) NerdGraph -> snippet propagation')
  if (bucket3.regressions.length === 0) {
    lines.push('All mapped, mutated non-boolean fields propagated to the snippet. :white_check_mark:')
  } else {
    lines.push('**Regressions - mutated but never showed up in the snippet:**')
    lines.push('')
    lines.push('| NerdGraph field | Expected agent path | Value |')
    lines.push('|---|---|---|')
    for (const r of bucket3.regressions) {
      lines.push(`| \`${r.nerdgraphPath}\` | \`${r.agentPath}\` | \`${JSON.stringify(r.value)}\` |`)
    }
  }
  if (bucket3.ambiguous.length > 0) {
    lines.push('')
    lines.push('**Ambiguous (boolean, no visible change) - may be a real regression, or the account may have already had this value; not conclusive either way:**')
    lines.push('')
    lines.push('| NerdGraph field | Expected agent path | Value |')
    lines.push('|---|---|---|')
    for (const a of bucket3.ambiguous) {
      lines.push(`| \`${a.nerdgraphPath}\` | \`${a.agentPath}\` | \`${JSON.stringify(a.value)}\` |`)
    }
  }
  if (bucket3.unreviewed.length > 0) {
    lines.push('')
    lines.push(`**Unreviewed (no entry in field-map.js at all):** ${bucket3.unreviewed.map(u => `\`${u.nerdgraphPath}\``).join(', ')}`)
  }
  lines.push('')

  lines.push('## (2) Snippet fields with no home in the agent model (silent-drop risk)')
  if (bucket2.unknownFields.length === 0) {
    lines.push('Every field the snippet defined has a home in `src/common/config`. :white_check_mark:')
  } else {
    lines.push('| Namespace | Path | Value |')
    lines.push('|---|---|---|')
    for (const f of bucket2.unknownFields) {
      lines.push(`| \`${f.namespace}\` | \`${f.path}\` | \`${JSON.stringify(f.value)}\` |`)
    }
  }
  lines.push('')

  lines.push('## (1) Everything that changed before -> after')
  if (bucket1.changed.length === 0) {
    lines.push('No differences at all - if you mutated anything, this is itself suspicious.')
  } else {
    lines.push('| Path | Before | After |')
    lines.push('|---|---|---|')
    for (const c of bucket1.changed) {
      lines.push(`| \`${c.path}\` | \`${JSON.stringify(c.before)}\` | \`${JSON.stringify(c.after)}\` |`)
    }
  }
  lines.push('')

  lines.push('## (4) Agent settings with no NerdGraph counterpart (static capability gap)')
  if (bucket4.gaps.length === 0) {
    lines.push('Every canonical agent-model field is either settable via NerdGraph or explicitly marked intentional in field-map.js.')
  } else {
    lines.push('Needs human triage - mark each as intentionally unmapped (with a reason) in `field-map.js`, or file it as a real gap:')
    lines.push('')
    for (const g of bucket4.gaps) lines.push(`- \`${g}\``)
  }
  lines.push('')

  return lines.join('\n')
}
