import * as handleModule from '../../../src/common/event-emitter/handle'
import * as sendModule from '../../../src/common/harvest/send'
import { Aggregate as MetricsAggregate } from '../../../src/features/metrics/aggregate'
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../../src/features/metrics/constants'

const { expandEntry } = require('../../../tools/supportability-metrics/lib')
const registry = require('../../../tools/supportability-metrics/registry')

/**
 * Runs a scenario and returns every supportability metric name that was reported while it ran. Metrics are observed where they enter
 * the metrics feature: emitted over the event emitter on the supportability channel (everything that goes through `reportSupportabilityMetric`), stored
 * directly by the metrics aggregate, or sent as raw `{ params, stats }` objects in a harvest payload (the browser connect response errors).
 * Harvest sends are replaced with a no-op so no scenario reaches the network; a scenario can still install its own `send` implementation.
 * @param {function(): (void|Promise<void>)} scenario
 * @returns {Promise<Set<string>>}
 */
export async function observe (scenario) {
  const handleSpy = jest.spyOn(handleModule, 'handle')
  const storeSpy = jest.spyOn(MetricsAggregate.prototype, 'storeSupportabilityMetrics')
  const sendSpy = jest.spyOn(sendModule, 'send').mockImplementation(() => {})
  try {
    await scenario()
    const emitted = handleSpy.mock.calls.filter(([channel]) => channel === SUPPORTABILITY_METRIC_CHANNEL).map(([, args]) => args[0])
    const stored = storeSpy.mock.calls.map(([name]) => name)
    const sent = sendSpy.mock.calls.flatMap(([, options]) => options?.payload?.body?.sm ?? []).map(sm => sm?.params?.name)
    return new Set([...emitted, ...stored, ...sent].filter(Boolean))
  } finally {
    sendSpy.mockRestore()
    handleSpy.mockRestore()
    storeSpy.mockRestore()
  }
}

/**
 * A trigger is how a test makes a registry entry's metrics get reported. It is one of:
 * - a function `(value, ctx) => void`, called once per known value of the entry (or once with `undefined` for a single tag), or
 * - `{ samples: [...], run(sample, ctx) }` for an open-ended family with no `values`, where each sample replaces the entry's placeholder, or
 * - `{ tags: [...], run(tag, ctx) }` when the metric names cannot be made by filling one placeholder (e.g. several placeholders).
 * @typedef {function(string|undefined, Object): (void|Promise<void>) | {samples?: string[], tags?: string[], run: function(string, Object): (void|Promise<void>)}} Trigger
 */

/**
 * Lists every metric the generated tests must cover, with the entry it belongs to and the value handed to its trigger.
 * @param {Object<string, Trigger>} triggers
 * @returns {Array<{tag: string, entryTag: string, value?: string}>}
 */
export function listTargets (triggers) {
  return registry.entries.flatMap(entry => {
    const trigger = triggers[entry.tag]
    if (entry.values) return expandEntry(entry).map(({ tag }, i) => ({ tag, entryTag: entry.tag, value: Array.isArray(entry.values[i]) ? entry.values[i][0] : entry.values[i] }))
    if (trigger?.tags) return trigger.tags.map(tag => ({ tag, entryTag: entry.tag, value: tag }))
    if (trigger?.samples) return trigger.samples.map(sample => ({ tag: entry.tag.replace(/<[^>]*>/, sample), entryTag: entry.tag, value: sample }))
    return [{ tag: entry.tag, entryTag: entry.tag }]
  })
}
