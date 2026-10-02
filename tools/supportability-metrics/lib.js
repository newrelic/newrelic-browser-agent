/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Shared logic for the supportability metric (SM) registry check and docs generator.
 * The scan is static: it parses `src/` and reads the metric name passed to the SM reporting functions, resolving template literals,
 * string concatenation and same-file string constants. Anything it cannot resolve becomes the wildcard `<*>`.
 */

const fs = require('fs')
const path = require('path')
const acorn = require('acorn')
const walk = require('acorn-walk')
const { WILDCARD, shapeOf, toRegExp, expandEntry } = require('./expand')

const ROOT = path.join(__dirname, '..', '..')
const SRC_DIR = path.join(ROOT, 'src')
const DOCS_PATH = path.join(ROOT, 'docs', 'supportability-metrics.md')
const INTERNAL_ERROR_EVENT = 'internal-error'

/** A comment matching this on (or directly above) an SM call declares that the call forwards a name reported and registered elsewhere. */
const FORWARDS_MARKER = /sm-registry:\s*forwards/

/** The functions that report an SM, and the index of the argument holding the metric name. `reportSupportabilityMetric(ee, name, value)` is the
 * one way to report from anywhere in the agent; `storeSupportabilityMetrics(name, value)` is the metrics feature storing its own metrics directly. */
const REPORTERS = { reportSupportabilityMetric: 1, storeSupportabilityMetrics: 0 }

/** The units a metric's value may have. */
const VALUE_UNITS = ['ms', 'bytes', 'count']

/**
 * @param {string} dir
 * @returns {string[]} Every non-test `.js` file under the directory.
 */
function listSourceFiles (dir = SRC_DIR) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === '__mocks__' ? [] : listSourceFiles(full)
    return entry.name.endsWith('.js') ? [full] : []
  })
}

/**
 * Resolves an expression to a metric name pattern, using `<*>` for any part that cannot be known statically.
 * @param {Object} node An acorn AST node.
 * @param {{constants: Map<string, Object>, functions: Map<string, Object>}} context Same-file `const NAME = <expression>` and
 *   `const name = (params) => <expression>` declarations, by name.
 * @param {number} [depth] Guards against self-referencing constants.
 * @param {Map<string, string>} [scope] Values bound to the parameters of a helper function being evaluated.
 * @returns {string}
 */
function resolve (node, context, depth = 0, scope = new Map()) {
  if (!node || depth > 8) return WILDCARD
  const next = (child) => resolve(child, context, depth + 1, scope)
  switch (node.type) {
    case 'Literal':
      return typeof node.value === 'string' ? node.value : WILDCARD
    case 'TemplateLiteral':
      return node.quasis.map((quasi, i) => quasi.value.cooked + (node.expressions[i] ? next(node.expressions[i]) : '')).join('')
    case 'BinaryExpression':
      return node.operator === '+' ? next(node.left) + next(node.right) : WILDCARD
    case 'Identifier':
      if (scope.has(node.name)) return scope.get(node.name)
      return context.constants.has(node.name) ? resolve(context.constants.get(node.name), context, depth + 1) : WILDCARD
    case 'CallExpression': {
      // a same-file helper such as `const tag = inject => `EventBuffer/${inject}/Dropped/Bytes``
      const helper = node.callee.type === 'Identifier' && context.functions.get(node.callee.name)
      if (!helper) return WILDCARD
      const bound = new Map(helper.params.map((param, i) => [param.name, node.arguments[i] ? next(node.arguments[i]) : WILDCARD]))
      return resolve(helper.body, context, depth + 1, bound)
    }
    default:
      return WILDCARD
  }
}

/**
 * @param {Object} callee An acorn callee node.
 * @returns {string | undefined} The name of the function or method being called.
 */
function calleeName (callee) {
  if (callee.type === 'Identifier') return callee.name
  if (callee.type === 'MemberExpression' && !callee.computed) return callee.property.name
}

/**
 * Finds every SM emitted by a source file.
 * @param {string} code
 * @param {string} [file] Used only to label the results.
 * @returns {Array<{pattern: string, file: string, line: number, hasValue?: boolean, unresolved?: boolean, forwarded?: boolean}>} Metric name patterns, which may contain `<*>`
 *   wildcards. `hasValue` is set when the call passes a value to aggregate with the metric. A call whose name cannot be determined at all is returned as `unresolved`, and `forwarded` when it carries an `sm-registry: forwards` comment.
 */
function collectEmissions (code, file = '') {
  const comments = []
  const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module', locations: true, onComment: comments })
  const context = { constants: new Map(), functions: new Map() }
  walk.simple(ast, {
    VariableDeclarator (node) {
      if (node.id.type !== 'Identifier' || !node.init) return
      if (['Literal', 'TemplateLiteral', 'BinaryExpression'].includes(node.init.type)) context.constants.set(node.id.name, node.init)
      else if (node.init.type === 'ArrowFunctionExpression' && node.init.expression && node.init.params.every(param => param.type === 'Identifier')) context.functions.set(node.id.name, node.init)
    }
  })

  /** Lines a call may sit on to be marked as a forwarder: the comment's own last line, and the line right below it. */
  const forwarderLines = new Set(comments.filter(comment => FORWARDS_MARKER.test(comment.value)).flatMap(comment => [comment.loc.end.line, comment.loc.end.line + 1]))

  const emissions = []
  /** @param {Object | undefined} valueNode The argument holding the value, if the call has one. `undefined` passed explicitly is not a value. */
  const passesValue = (valueNode) => Boolean(valueNode) && !(valueNode.type === 'Identifier' && valueNode.name === 'undefined')
  const add = (pattern, node, valueNode) => {
    const line = node.loc.start.line
    emissions.push(pattern === WILDCARD ? { pattern, file, line, unresolved: true, forwarded: forwarderLines.has(line) } : { pattern, file, line, hasValue: passesValue(valueNode) })
  }
  walk.simple(ast, {
    CallExpression (node) {
      const name = calleeName(node.callee)
      if (name === 'emit' && resolve(node.arguments[0], context) === INTERNAL_ERROR_EVENT) {
        // ee.emit('internal-error', [error, reason]) is reported by the jserrors feature as Internal/Error/<reason>, or Other when no reason is given
        const args = node.arguments[1]
        if (args?.type !== 'ArrayExpression') return
        const reason = args.elements[1] ? resolve(args.elements[1], context) : 'Other'
        if (reason !== WILDCARD) add('Internal/Error/' + reason, node, undefined)
        return
      }
      if (name === 'handle') {
        // handle(SUPPORTABILITY_METRIC_CHANNEL, ['Name', value], ...) is the raw form that reportSupportabilityMetric wraps
        const channel = node.arguments[0]
        const isMetricChannel = (channel?.type === 'Identifier' && channel.name === 'SUPPORTABILITY_METRIC_CHANNEL') || (channel?.type === 'Literal' && channel.value === 'storeSupportabilityMetrics')
        const rawArgs = node.arguments[1]
        if (isMetricChannel && rawArgs?.type === 'ArrayExpression') add(resolve(rawArgs.elements[0], context), node, rawArgs.elements[1])
        return
      }
      if (!name || !Object.prototype.hasOwnProperty.call(REPORTERS, name)) return
      add(resolve(node.arguments[REPORTERS[name]], context), node, node.arguments[REPORTERS[name] + 1])
    }
  })
  return emissions
}

/**
 * @param {string} pattern An emitted pattern.
 * @param {import('./registry-types').RegistryEntry} entry A registry entry.
 * @returns {boolean} Whether the emitted pattern is covered by (i.e. produces or is an instance of) the entry.
 */
function emissionMatchesEntry (pattern, entry) {
  // a concrete name must be one of the entry's known values when it has them, so a new value has to be registered
  if (!pattern.includes(WILDCARD)) return entry.values ? expandEntry(entry).some(({ tag }) => tag === pattern) : toRegExp(entry.tag).test(pattern)
  return shapeOf(pattern) === shapeOf(entry.tag) || expandEntry(entry).some(({ tag }) => toRegExp(pattern.split(WILDCARD).join('<x>')).test(tag))
}

/**
 * Compares the SMs emitted by `src/` with the registry.
 * @param {Array<{pattern: string, file: string, line: number}>} emissions
 * @param {{entries: import('./registry-types').RegistryEntry[]}} registry
 * @returns {{unregistered: Array<{pattern: string, file: string, line: number}>, dead: import('./registry-types').RegistryEntry[]}} Emitted metrics no entry covers, and non-indirect entries that nothing emits.
 */
function compare (allEmissions, registry) {
  const emissions = allEmissions.filter(emission => !emission.unresolved)
  const unregistered = emissions.filter(emission => !registry.entries.some(entry => emissionMatchesEntry(emission.pattern, entry)))
  const dead = registry.entries.filter(entry => !entry.indirect && !emissions.some(emission => emissionMatchesEntry(emission.pattern, entry)))
  return { unregistered, dead }
}

/**
 * Checks that the registry's `value` declarations match the code: a call that passes a value needs its entry to declare the unit, a
 * declared value needs a call that passes one, and the unit must be a known one.
 * @param {Array<{pattern: string, file: string, line: number, hasValue?: boolean, unresolved?: boolean}>} emissions
 * @param {{entries: import('./registry-types').RegistryEntry[]}} registry
 * @returns {string[]} Problems, empty when they agree.
 */
function checkValues (emissions, registry) {
  const errors = []
  const known = emissions.filter(emission => !emission.unresolved)
  const matching = (entry) => known.filter(emission => emissionMatchesEntry(emission.pattern, entry))

  registry.entries.forEach(entry => {
    const reporting = matching(entry).filter(emission => emission.hasValue)
    if (!entry.value && reporting.length) {
      const { file, line } = reporting[0]
      errors.push(`"${entry.tag}" is reported with a value (${file}:${line}) but its registry entry has no \`value\`. Add \`value: { unit: '${VALUE_UNITS.join("' | '")}' }\`.`)
    }
    if (entry.value && !entry.indirect && matching(entry).length && !reporting.length) {
      errors.push(`"${entry.tag}" declares a \`value\` but nothing in src/ passes one. Remove \`value\`, or mark the entry \`indirect\` if it is reported some other way.`)
    }
    if (entry.value && !VALUE_UNITS.includes(entry.value.unit)) {
      errors.push(`"${entry.tag}" has the value unit "${entry.value.unit}". Replace it with one of: ${VALUE_UNITS.join(', ')}.`)
    }
    const unknownValues = (entry.value?.for || []).filter(name => !(entry.values || []).some(value => (Array.isArray(value) ? value[0] : value) === name))
    if (unknownValues.length) errors.push(`"${entry.tag}" lists value names that are not among its values: ${unknownValues.join(', ')}.`)
  })
  return errors
}

/**
 * Renders the docs page from the registry.
 * @param {import('./registry-types').Registry} registry
 * @returns {string}
 */
function renderDocs (registry) {
  const out = [registry.header, '']
  registry.sections.forEach(section => {
    const entries = registry.entries.filter(entry => entry.section === section.id)
    if (!entries.length) return
    out.push(`### ${section.title}`)
    if (section.intro) out.push(section.intro)
    entries.forEach(entry => {
      const only = entry.value?.for ? ', only for ' + entry.value.for.join(', ') : ''
      const unit = entry.value ? ` Reports a value (${entry.value.unit}${only}).` : ''
      out.push(`<!--- ${entry.description}${unit} --->`, `* ${entry.tag}`)
      if (entry.values) expandEntry(entry).forEach(({ tag, description }) => out.push(`  <!--- ${description} --->`, `  * ${tag}`))
    })
    out.push('')
  })
  return out.join('\n')
}

/**
 * @returns {Array<{pattern: string, file: string, line: number}>} Every SM emitted anywhere in `src/`.
 */
function scanRepo () {
  return listSourceFiles().flatMap(file => collectEmissions(fs.readFileSync(file, 'utf8'), path.relative(ROOT, file)))
}

/** Marks a generated stub so the check keeps failing until a person has written a real description. */
const TODO_DESCRIPTION = 'TODO: describe this metric'

/**
 * Builds registry entry source text for emitted metrics the registry does not cover yet.
 * @param {Array<{pattern: string, file: string, line: number}>} unregistered
 * @param {{sections: Array<{id: string}>}} registry
 * @returns {string} Source for the entries, ready to insert into the registry's `entries` array.
 */
function renderStubs (unregistered, registry) {
  const sectionIds = registry.sections.map(section => section.id)
  const seen = new Set()
  return unregistered.filter(({ pattern }) => !seen.has(pattern) && seen.add(pattern)).map(({ pattern, file, line, hasValue }) => {
    const tag = pattern.split(WILDCARD).join('<name>')
    const guess = tag.split('/')[0].toLowerCase().replace(/[^a-z]+/g, '_')
    const section = sectionIds.find(id => id === guess || id === guess + 's') || 'generic'
    const value = hasValue ? ", value: { unit: 'TODO' }" : ''
    return `    // ${file}:${line}\n    { section: '${section}', tag: '${tag}', description: '${TODO_DESCRIPTION}'${value} }`
  }).join(',\n')
}

/**
 * Appends stub entries to the registry source file so a new metric only needs its description written.
 * @param {string} stubs The output of renderStubs.
 * @param {string} registryPath
 */
function appendToRegistry (stubs, registryPath = path.join(__dirname, 'registry.js')) {
  const source = fs.readFileSync(registryPath, 'utf8')
  const end = source.lastIndexOf('\n  ]\n}')
  if (end < 0) throw new Error('Could not find the end of the entries array in registry.js')
  fs.writeFileSync(registryPath, source.slice(0, end) + ',\n\n' + stubs + source.slice(end))
}

const REGISTRY_PATH = path.join(__dirname, 'registry.js')
const PENDING_PATH = path.join(ROOT, 'tests', 'components', 'supportability-metrics', 'pending.js')

/**
 * @param {string} tag A registry entry's tag.
 * @param {string} [registryPath]
 * @returns {string} `path/to/registry.js:LINE` for the entry, relative to the repo root, or just the path if the entry is not found.
 */
function registryLocation (tag, registryPath = REGISTRY_PATH) {
  const relative = path.relative(ROOT, registryPath)
  const lines = fs.readFileSync(registryPath, 'utf8').split('\n')
  const index = lines.findIndex(line => line.includes(`tag: '${tag}'`))
  return index < 0 ? relative : `${relative}:${index + 1}`
}

/**
 * Adds metrics to the list of those without a generated test yet, so a new metric lands as a visible warning rather than a failing build.
 * @param {string[]} tags The metric tags, as the generated coverage test lists them.
 * @param {string} [pendingPath]
 */
function appendToPending (tags, pendingPath = PENDING_PATH) {
  const source = fs.readFileSync(pendingPath, 'utf8')
  const end = source.lastIndexOf('\n]')
  if (end < 0) throw new Error('Could not find the end of the pending list in pending.js')
  const existing = source.slice(0, end).trimEnd()
  const separator = existing.endsWith('[') ? '\n' : /,$/.test(existing) ? '\n' : ',\n'
  fs.writeFileSync(pendingPath, existing + separator + tags.map(tag => `  '${tag}'`).join(',\n') + source.slice(end))
}

/**
 * Runs every check against the real repository.
 * @param {{registry?: import('./registry-types').Registry, docs?: string}} [overrides] Lets tests supply their own registry and current docs text.
 * @returns {string[]} Human readable problems. Empty when everything is in sync.
 */
function checkRepo ({ registry = require('./registry'), docs } = {}) {
  const errors = []
  const scanned = scanRepo()
  const { unregistered, dead } = compare(scanned, registry)
  scanned.filter(emission => emission.unresolved && !emission.forwarded).forEach(({ file, line }) => errors.push(
    `Cannot determine the metric name at ${file}:${line}. Pass a string literal or a same-file constant, or if this call forwards a name that is reported and registered elsewhere, add a \`/* sm-registry: forwards <where> */\` comment on the line above.`
  ))

  const seen = new Set()
  unregistered.forEach(({ pattern, file, line }) => {
    if (seen.has(pattern)) return
    seen.add(pattern)
    errors.push(`Emitted but not in the registry: "${pattern}" (${file}:${line}). Add it to tools/supportability-metrics/registry.js.`)
  })
  errors.push(...checkValues(scanned, registry))
  dead.forEach(entry => errors.push(`In the registry but never emitted by src/: "${entry.tag}". Delete the entry, or set \`indirect\` if the scan cannot see the emitter.`))

  registry.entries.filter(entry => entry.description === TODO_DESCRIPTION).forEach(entry => errors.push(`Registry entry "${entry.tag}" still has a placeholder description. Fill in the stub at ${registryLocation(entry.tag)}: write what the metric means, then commit it.`))

  const current = docs ?? (fs.existsSync(DOCS_PATH) ? fs.readFileSync(DOCS_PATH, 'utf8') : '')
  if (current !== renderDocs(registry)) errors.push('docs/supportability-metrics.md is out of date. Run `npm run supportability-metrics:generate-docs`.')
  return errors
}

module.exports = { DOCS_PATH, TODO_DESCRIPTION, VALUE_UNITS, checkValues, collectEmissions, compare, expandEntry, renderDocs, renderStubs, appendToRegistry, appendToPending, registryLocation, checkRepo, scanRepo, listSourceFiles, shapeOf, toRegExp, emissionMatchesEntry }
