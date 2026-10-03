/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Minimal terminal colors for the supportability metric tools, so the messages that ask a person to do something stand out. There is no
 * dependency on purpose. Colors are off when `NO_COLOR` is set, on when `FORCE_COLOR` is set (the pre-commit hook sets it), and otherwise
 * only when output is a terminal, so CI logs and piped output stay plain text.
 */

const CODES = { bold: [1, 22], dim: [2, 22], underline: [4, 24], red: [31, 39], green: [32, 39], yellow: [33, 39], cyan: [36, 39], magenta: [35, 39] }

/**
 * @param {Object<string, string | undefined>} env The environment variables.
 * @param {boolean} isTTY Whether the output stream is a terminal.
 * @returns {boolean} Whether to use color.
 */
function shouldUseColor (env, isTTY) {
  if (env.NO_COLOR) return false
  if (env.FORCE_COLOR !== undefined) return env.FORCE_COLOR !== '0' && env.FORCE_COLOR !== 'false'
  return Boolean(isTTY)
}

/**
 * Builds the style functions. Each wraps text in its ANSI codes, or returns it unchanged when color is off.
 * @param {boolean} enabled
 * @returns {Object<string, function(string): string>} `bold`, `dim`, `red`, `green`, `yellow`, `cyan`, `magenta`, `underline`, and the
 *   semantic styles `tag` (a metric name), `path` (a file path and line), `label` (the start of an instruction) and `required` / `optional`.
 */
function createStyle (enabled) {
  const paint = (names) => (text) => enabled ? names.reduce((out, name) => `\u001b[${CODES[name][0]}m${out}\u001b[${CODES[name][1]}m`, String(text)) : String(text)
  const style = Object.fromEntries(Object.keys(CODES).map(name => [name, paint([name])]))
  return {
    ...style,
    tag: paint(['bold', 'yellow']),
    path: paint(['cyan']),
    label: paint(['bold']),
    required: paint(['bold', 'red']),
    optional: paint(['bold', 'yellow'])
  }
}

/**
 * Colors the metric names and file paths inside a plain error message, so it reads at a glance. Quoted text is treated as a metric name.
 * @param {string} message
 * @param {ReturnType<typeof createStyle>} style
 * @returns {string}
 */
function highlight (message, style) {
  return message
    .replace(/"([^"]+)"/g, (_, tag) => `"${style.tag(tag)}"`)
    .replace(/\b((?:src|tools|tests|docs)\/[\w./-]+(?::\d+)?)/g, (_, file) => style.path(file))
}

module.exports = { shouldUseColor, createStyle, highlight }
