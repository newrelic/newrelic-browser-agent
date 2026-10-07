import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '../../..')
const CONFIG_DIR = path.join(REPO_ROOT, 'src/common/config')

/**
 * Hand-maintained shape of this repo's browser-agent config models
 * (src/common/config/{info,init,loader-config}.js), transcribed directly
 * from those files rather than executed/imported - init.js in particular
 * imports DOM/browser-only helpers (isValidSelector, etc.) that aren't safe
 * to load in a plain Node script. Values are irrelevant; only key presence
 * matters. Keep this in sync when those files change - `checkForModelDrift`
 * below gives an informational (non-fatal) nudge for top-level drift, but
 * it cannot see nested drift.
 */
const INFO_SHAPE = {
  beacon: 0, errorBeacon: 0, licenseKey: 0, applicationID: 0, sa: 0, queueTime: 0,
  applicationTime: 0, ttGuid: 0, user: 0, account: 0, product: 0, extra: 0,
  jsAttributes: 0, userAttributes: 0, atts: 0, transactionName: 0, tNamePlain: 0
}

const LOADER_CONFIG_SHAPE = {
  accountID: 0, trustKey: 0, agentID: 0, licenseKey: 0, applicationID: 0, xpid: 0
}

const INIT_SHAPE = {
  ajax: { deny_list: 0, block_internal: 0, enabled: 0, autoStart: 0, capture_payloads: 0 },
  api: { register: { enabled: 0, duplicate_data_to_container: 0, allow_iframe_bridge: 0, iframe_domains: 0 } },
  browser_consent_mode: { enabled: 0 },
  distributed_tracing: {
    enabled: 0, exclude_newrelic_header: 0, cors_use_newrelic_header: 0,
    cors_use_tracecontext_headers: 0, allowed_origins: 0
  },
  feature_flags: 0,
  generic_events: { enabled: 0, autoStart: 0 },
  harvest: { interval: 0 },
  jserrors: { enabled: 0, autoStart: 0 },
  logging: { enabled: 0, autoStart: 0 },
  metrics: { enabled: 0, autoStart: 0 },
  obfuscate: 0,
  page_action: { enabled: 0 },
  page_view_event: { enabled: 0, autoStart: 0 },
  page_view_timing: { enabled: 0, autoStart: 0 },
  performance: {
    capture_marks: 0, capture_measures: 0, capture_detail: 0,
    resources: { enabled: 0, asset_types: 0, first_party_domains: 0, ignore_newrelic: 0 }
  },
  privacy: { cookies_enabled: 0 },
  proxy: { assets: 0, beacon: 0 },
  session: { expiresMs: 0, inactiveMs: 0 },
  session_replay: {
    autoStart: 0, enabled: 0, preload: 0, sampling_rate: 0, error_sampling_rate: 0,
    collect_fonts: 0, inline_images: 0, fix_stylesheets: 0, mask_all_inputs: 0,
    mask_text_selector: 0, block_class: 0, ignore_class: 0, mask_text_class: 0,
    block_selector: 0,
    // Real key set from init.js's hiddenState.mask_input_options default -
    // note the agent uses kebab-case 'datetime-local' and lowercase
    // textarea/select, NOT the camelCase datetimeLocal/textArea NerdGraph's
    // schema uses for the equivalent mutation input field. Whether the
    // live-rendered snippet preserves NerdGraph's camelCase or translates
    // to this casing is UNVERIFIED - session_replay never appeared in this
    // action's one successful live run to check. field-map.js's leaf
    // mappings for this object currently assume camelCase survives as-is;
    // that assumption needs a live test with session_replay actually
    // populated to confirm or correct.
    mask_input_options: {
      color: 0, date: 0, 'datetime-local': 0, email: 0, month: 0, number: 0,
      range: 0, search: 0, select: 0, tel: 0, text: 0, textarea: 0, time: 0,
      url: 0, week: 0, password: 0
    }
  },
  session_trace: { enabled: 0, autoStart: 0 },
  soft_navigations: { enabled: 0, autoStart: 0 },
  ssl: 0,
  user_actions: { enabled: 0, elementAttributes: 0 },
  web_sockets: { enabled: 0 }
}

export function getCanonicalModelPaths () {
  return {
    info: flattenPaths(INFO_SHAPE),
    loaderConfig: flattenPaths(LOADER_CONFIG_SHAPE),
    init: flattenPaths(INIT_SHAPE)
  }
}

function flattenPaths (shape, prefix = []) {
  return Object.entries(shape).flatMap(([key, value]) => {
    const nextPath = [...prefix, key]
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return flattenPaths(value, nextPath)
    }
    return [nextPath.join('.')]
  })
}

/**
 * Cheap, best-effort staleness check: collapses every balanced {...} group
 * in each source file down to `{}` repeatedly, which flattens nested
 * objects/getter-bodies away and leaves only the *top-level* keys of the
 * model literal directly regex-matchable. Reports any top-level key found
 * in source that isn't in our hand-maintained shape above - a signal this
 * file needs updating, not a hard failure (nested drift is invisible to
 * this check).
 */
export function checkForModelDrift () {
  const warnings = []

  warnings.push(...driftFor('info.js', INFO_SHAPE))
  warnings.push(...driftFor('loader-config.js', LOADER_CONFIG_SHAPE))
  warnings.push(...driftFor('init.js', INIT_SHAPE))

  return warnings
}

// info.js/loader-config.js declare `const XModel = { ... }`; init.js builds
// its model inside a function and returns it (`return { ... }`) - each
// file needs its own anchor to isolate just the model object literal from
// unrelated top-level code (e.g. init.js's `hiddenState` object) before we
// can safely collapse-and-scan it for keys.
const ANCHORS = {
  'info.js': /Model\s*=\s*\{/,
  'loader-config.js': /Model\s*=\s*\{/,
  'init.js': /return\s*\{/
}

// Collapsing leaves bare `keyword (...)` control-flow statements without
// braces (e.g. a brace-less `if (...) doThing()`) looking like a getter -
// exclude known JS keywords from being treated as property names.
const JS_KEYWORDS = new Set([
  'if', 'else', 'for', 'while', 'switch', 'catch', 'function', 'return',
  'typeof', 'new', 'delete', 'void', 'in', 'of', 'instanceof', 'do', 'try', 'finally'
])

function driftFor (filename, shape) {
  const filePath = path.join(CONFIG_DIR, filename)
  let source
  try {
    source = fs.readFileSync(filePath, 'utf8')
  } catch (err) {
    return [`Could not read ${filePath} to check for model drift: ${err.message}`]
  }

  const objectLiteral = extractObjectLiteral(source, ANCHORS[filename])
  if (!objectLiteral) {
    return [`${filename}: could not locate the model object literal (anchor pattern not found) - config-model-reader.js's drift check needs updating.`]
  }

  const topLevelKeys = extractTopLevelKeys(objectLiteral)
  const knownTopLevelKeys = new Set(Object.keys(shape))

  return topLevelKeys
    .filter(key => !knownTopLevelKeys.has(key))
    .map(key => `${filename}: top-level key "${key}" found in source but not in config-model-reader.js's hand-maintained shape - update it.`)
}

/**
 * Finds `anchorPattern`'s trailing `{` and returns the substring up to its
 * matching `}`, via depth-counted scanning (not regex) so nested braces
 * inside the literal don't confuse the boundary.
 */
function extractObjectLiteral (source, anchorPattern) {
  const anchorMatch = anchorPattern.exec(source)
  if (!anchorMatch) return null

  const openBraceIndex = anchorMatch.index + anchorMatch[0].length - 1
  let depth = 0
  for (let i = openBraceIndex; i < source.length; i++) {
    if (source[i] === '{') depth++
    else if (source[i] === '}') {
      depth--
      if (depth === 0) return source.slice(openBraceIndex, i + 1)
    }
  }
  return null
}

function extractTopLevelKeys (objectLiteralSource) {
  // Strip the literal's own enclosing braces first, then repeatedly erase
  // (not merely collapse-to-`{}`) innermost balanced brace groups within
  // the remaining content. Erasing to '' - rather than replacing with `{}`
  // - is what lets this converge correctly once a level has multiple
  // object/function-valued siblings: after one pass, siblings that
  // collapsed to `{}` still contain brace characters, which would keep
  // blocking their shared parent from ever matching `[^{}]*` on a later
  // pass. Erasing leaves brace-free text behind instead, so parents with
  // several nested children still resolve to a flat top-level key list.
  // Excluding the outer braces from this pass means the top-level key
  // list itself is never at risk of being erased the same way.
  const inner = objectLiteralSource.slice(1, -1)

  let collapsed = inner
  let previous
  do {
    previous = collapsed
    collapsed = collapsed.replace(/\{[^{}]*\}/g, '')
  } while (collapsed !== previous)

  const keys = new Set()
  const propertyPattern = /(?:^|[{,])\s*(?:get\s+|set\s+)?([A-Za-z_$][A-Za-z0-9_$]*)\s*(?::|\()/g
  let match
  while ((match = propertyPattern.exec(collapsed))) {
    if (!JS_KEYWORDS.has(match[1])) keys.add(match[1])
  }

  return [...keys]
}
