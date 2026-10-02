/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Works out, from the source files a pull request changes, which supportability metrics names it might need Angler to track that no
 * registry entry can list on its own: the names for `init` settings and for feature flags. It parses the source with `acorn`, a dev
 * dependency, which may not be installed where this runs. Everything here therefore loads the parser lazily and reports `undefined`
 * when it is not available, and callers fall back to telling the author what to check instead.
 */

const INIT_FILE = 'src/common/config/init.js'

/**
 * @returns {{acorn: Object, walk: Object} | undefined} The parser, or undefined if it is not installed.
 */
function loadParser () {
  try {
    return { acorn: require('acorn'), walk: require('acorn-walk') }
  } catch (err) {
    return undefined
  }
}

const parse = (parser, code) => parser.acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module' })
const keyName = (property) => property.key.name ?? String(property.key.value)

/**
 * Lists the `init` settings a config model declares, and whether each is a boolean. The tag the agent reports for a setting depends on it:
 * `Config/<path>/Enabled` for booleans, `Config/<path>/Changed` for everything else.
 * @param {string} code The source of src/common/config/init.js.
 * @param {{acorn: Object, walk: Object}} parser
 * @returns {Map<string, 'boolean' | 'other'>} Slash separated setting paths (e.g. `session_replay/collect_fonts`) with their kind.
 */
function initSettings (code, parser) {
  const ast = parse(parser, code)
  let model
  parser.walk.simple(ast, {
    VariableDeclarator (node) {
      if (node.id.name !== 'InitModelFn' || !node.init?.body?.body) return
      const returned = node.init.body.body.find(statement => statement.type === 'ReturnStatement' && statement.argument?.type === 'ObjectExpression')
      model = returned?.argument
    }
  })

  const settings = new Map()
  const collect = (objectNode, prefix) => {
    objectNode.properties.forEach(property => {
      if (property.type !== 'Property' || property.kind === 'set') return // a setter pairs with a getter that is counted
      const path = [...prefix, keyName(property)]
      if (!prefix.length && path[0] === 'feature_flags') return // reported by name elsewhere
      if (property.value.type === 'ObjectExpression') return collect(property.value, path)
      // A getter is a boolean when it answers "is this flag or setting on", which is the case when it checks the feature flags
      const isBoolean = property.kind === 'get' ? code.slice(property.value.start, property.value.end).includes('.includes(') : property.value.type === 'Literal' && typeof property.value.value === 'boolean'
      settings.set(path.join('/'), isBoolean ? 'boolean' : 'other')
    })
  }
  if (model) collect(model, [])
  return settings
}

/**
 * Lists the feature flags a source file recognizes: string literals checked with `feature_flags.includes(...)`, and the values of a
 * `FEATURE_FLAGS` constant.
 * @param {string} code
 * @param {{acorn: Object, walk: Object}} parser
 * @returns {Set<string>}
 */
function featureFlags (code, parser) {
  const flags = new Set()
  parser.walk.simple(parse(parser, code), {
    CallExpression (node) {
      const callee = node.callee
      const receiver = callee.type === 'MemberExpression' && callee.property.name === 'includes' ? callee.object : undefined
      const isFlagList = receiver?.type === 'MemberExpression' && receiver.property.name === 'feature_flags'
      const argument = node.arguments[0]
      if (isFlagList && argument?.type === 'Literal' && typeof argument.value === 'string') flags.add(argument.value)
    },
    VariableDeclarator (node) {
      if (node.id.name !== 'FEATURE_FLAGS' || node.init?.type !== 'ObjectExpression') return
      node.init.properties.forEach(property => { if (property.value?.type === 'Literal') flags.add(property.value.value) })
    }
  })
  return flags
}

/**
 * @typedef {Object} DetectedChanges
 * @property {Array<{path: string, tag: string}>} settings Every `init` setting the agent has on this branch, with the metric name it reports for it.
 * @property {string[]} flags Every feature flag the source recognizes on this branch.
 * @property {Array<{path: string, tag: string}>} addedSettings `init` settings this change adds (or changes between boolean and other), with the metric name the agent reports for them.
 * @property {Array<{path: string, tag: string}>} removedSettings `init` settings this change removes (or changes between boolean and other).
 * @property {string[]} addedFlags Feature flags this change starts to recognize.
 */

/**
 * Compares the files a change touches before and after.
 * @param {{files: string[], listFiles?: function(): string[], readBase: function(string): (string|undefined), readHead: function(string): (string|undefined)}} source
 *   `files` are the changed source files. `listFiles` lists every source file on the branch, to find all of its feature flags (without it, only the changed files are
 *   searched). The readers return a file's text on the base and on the head, or undefined if it does not exist there.
 * @returns {DetectedChanges | undefined} undefined when the parser is not installed or a file could not be read, meaning "cannot tell".
 */
function detectChanges ({ files, listFiles, readBase, readHead }) {
  const parser = loadParser()
  if (!parser) return undefined
  try {
    const flagsOf = (read, file) => { const code = read(file); return code ? featureFlags(code, parser) : new Set() }
    const addedFlags = new Set()
    files.filter(file => file.endsWith('.js')).forEach(file => {
      const before = flagsOf(readBase, file)
      flagsOf(readHead, file).forEach(flag => { if (!before.has(flag)) addedFlags.add(flag) })
    })
    const flags = new Set()
    ;(listFiles ? listFiles() : files).filter(file => file.endsWith('.js')).forEach(file => {
      try { flagsOf(readHead, file).forEach(flag => flags.add(flag)) } catch (err) { /* a file that does not parse has no flags to find */ }
    })

    const tagFor = (path, kind) => `Config/${path}/${kind === 'boolean' ? 'Enabled' : 'Changed'}`
    const settingsAt = (read) => read(INIT_FILE) ? initSettings(read(INIT_FILE), parser) : new Map()
    const before = settingsAt(readBase)
    const after = settingsAt(readHead)
    const describe = ([path, kind]) => ({ path: path.replace(/\//g, '.'), tag: tagFor(path, kind) })
    return {
      settings: [...after].map(describe),
      flags: [...flags],
      addedSettings: [...after].filter(([path, kind]) => before.get(path) !== kind).map(describe),
      removedSettings: [...before].filter(([path, kind]) => after.get(path) !== kind).map(describe),
      addedFlags: [...addedFlags]
    }
  } catch (err) {
    return undefined
  }
}

module.exports = { INIT_FILE, initSettings, featureFlags, detectChanges, loadParser }
