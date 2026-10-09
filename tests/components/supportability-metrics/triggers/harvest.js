/** Triggers for harvest metrics. See tests/components/supportability-metrics/harness.js for the trigger shapes. */
import { Instrument as PageViewTiming } from '../../../../src/features/page_view_timing/instrument'
import { Instrument as Metrics } from '../../../../src/features/metrics/instrument'
import { IDEAL_PAYLOAD_SIZE } from '../../../../src/common/constants/agent-constants'

/**
 * Temporarily reports as another feature. Features such as 'spa' or 'Combined' cannot be instantiated in this test file, so the
 * event buffer of a real aggregate is used and only its featureName is overridden. The drop/early-harvest code path is unchanged.
 */
async function asFeature (ctx, name, fn) {
  const aggregate = await ctx.feature(PageViewTiming)
  const original = aggregate.featureName
  const originalMax = aggregate.events.maxPayloadSize
  aggregate.featureName = name
  try {
    await fn(aggregate)
  } finally {
    aggregate.featureName = original
    aggregate.events.maxPayloadSize = originalMax
    aggregate.events.clear()
  }
}

const bigEvent = (size) => ({ data: 'x'.repeat(size) })

const auditCases = {
  'audit/page_view/hasReplay/false/positive': { page_view_event: { hasReplay: true } },
  'audit/page_view/hasReplay/true/positive': { page_view_event: { hasReplay: true }, session_replay: {} },
  'audit/page_view/hasReplay/false/negative': { page_view_event: {}, session_replay: {} },
  'audit/page_view/hasReplay/true/negative': { page_view_event: {} },
  'audit/page_view/hasTrace/false/positive': { page_view_event: { hasTrace: true } },
  'audit/page_view/hasTrace/true/positive': { page_view_event: { hasTrace: true }, session_trace: {} },
  'audit/page_view/hasTrace/false/negative': { page_view_event: {}, session_trace: {} },
  'audit/page_view/hasTrace/true/negative': { page_view_event: {} },
  'audit/session_replay/hasError/false/positive': { session_replay: { hasError: true } },
  'audit/session_replay/hasError/true/positive': { session_replay: { hasError: true }, jserrors: {} },
  'audit/session_replay/hasError/false/negative': { session_replay: {}, jserrors: {} },
  'audit/session_replay/hasError/true/negative': { session_replay: {} }
}

module.exports = {
  'EventBuffer/<feature>/Dropped/Bytes': (name, ctx) => asFeature(ctx, name === 'Combined' ? 'page_view_timing' : name, (aggregate) => {
    aggregate.events.maxPayloadSize = 10
    aggregate.events.add(bigEvent(100))
  }),

  '<feature>/Harvest/Early/Seen': (name, ctx) => asFeature(ctx, name, (aggregate) => {
    const trigger = jest.spyOn(ctx.agent.runtime.harvester, 'triggerHarvestFor').mockImplementation(() => {})
    aggregate.events.add(bigEvent(IDEAL_PAYLOAD_SIZE + 100))
    expect(trigger).toHaveBeenCalled()
  }),

  ...Object.fromEntries([['page_view', 'hasReplay'], ['page_view', 'hasTrace'], ['session_replay', 'hasError']].map(([feature, flag]) => [
    `audit/${feature}/${flag}/<outcome>`,
    async (outcome, ctx) => {
      const metrics = await ctx.feature(Metrics)
      metrics.singleChecks() // registers the 'harvest-metadata' handler
      ctx.forceDrain(metrics) // the handler is registered against the metrics feature group, so drain it or metadata emitted next stays buffered
      await ctx.settle()
      const original = metrics.harvestMetadata
      metrics.harvestMetadata = {}
      try {
        ctx.agent.ee.emit('harvest-metadata', [auditCases[`audit/${feature}/${flag}/${outcome}`]])
        await ctx.settle()
        metrics.harvestOpts.beforeUnload()
      } finally {
        metrics.harvestMetadata = original
      }
    }
  ]))
}
