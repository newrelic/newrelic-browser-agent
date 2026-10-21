/** Triggers for session-replay metrics. See tests/components/supportability-metrics/harness.js for the trigger shapes. */
import { Instrument as SessionReplay } from '../../../../src/features/session_replay/instrument'
import { stylesheetEvaluator } from '../../../../src/features/session_replay/shared/stylesheet-evaluator'
import { MODE, SESSION_EVENTS, SESSION_EVENT_TYPES } from '../../../../src/common/session/constants'
import { MAX_PAYLOAD_SIZE } from '../../../../src/common/constants/agent-constants'

/**
 * Builds a fresh Session Replay instrument and aggregate on the shared agent, since an aborted feature stays aborted. The RUM flags are
 * supplied through `runtime.activatedFeatures` while it is built, so the aggregate reacts to them exactly as it would after a RUM response.
 * Returns a `cleanup` that stops the recorder and neutralizes the aggregate so later tests sharing the agent's emitter cannot reach it.
 */
async function createReplay (ctx, flags) {
  const { agent } = ctx
  /* an existing session's replay mode wins over the RUM flags, and earlier triggers write OFF into the shared session */
  const originalMode = agent.runtime.session.state.sessionReplayMode
  agent.runtime.session.write({ sessionReplayMode: null })
  const originalFeatures = agent.runtime.activatedFeatures
  agent.runtime.activatedFeatures = flags
  let instrument
  try {
    instrument = new SessionReplay(agent)
    await ctx.settle()
  } finally {
    agent.runtime.activatedFeatures = originalFeatures
  }
  const aggregate = instrument.featAggregate
  const cleanup = () => {
    /* the handlers below are registered on the shared emitter and can never be removed, so they are turned into no-ops */
    aggregate.abort = () => {}
    aggregate.initializeRecording = async () => {}
    aggregate.recorder?.stopRecording()
    instrument.recorder?.stopRecording()
    agent.runtime.isRecording = false
    agent.runtime.session.write({ sessionReplayMode: originalMode })
  }
  return { instrument, aggregate, cleanup }
}

/** Runs a callback against a fresh replay, always cleaning up. */
async function withReplay (ctx, flags, fn) {
  const replay = await createReplay(ctx, flags)
  try { await fn(replay) } finally { replay.cleanup() }
}

const FULL_FLAGS = { sr: 1, srs: MODE.FULL }

/** A recorder with the stylesheet check and harvest triggering taken out of the way, so events can be audited directly. */
function quietRecorder (replay, ctx) {
  const { recorder } = replay.aggregate
  recorder.shouldFix = false
  jest.spyOn(stylesheetEvaluator, 'evaluate').mockReturnValue(0)
  jest.spyOn(ctx.agent.runtime.harvester, 'triggerHarvestFor').mockImplementation(() => {})
  return recorder
}

const event = (type, data = {}) => ({ type, data, timestamp: Date.now() })

module.exports = {
  'SessionReplay/EnabledNotEntitled/Detected': async (_, ctx) => {
    /* the feature only reports this if the preloaded recorder was already running when the RUM response said it wasn't entitled */
    ctx.agent.runtime.isRecording = true
    await withReplay(ctx, { sr: 0, srs: MODE.FULL }, () => {})
  },

  'SessionReplay/Harvest/Attempts': (_, ctx) => withReplay(ctx, FULL_FLAGS, async (replay) => {
    const recorder = quietRecorder(replay, ctx)
    recorder.audit(event(4))
    recorder.audit(event(2))
    replay.aggregate.makeHarvestPayload()
  }),

  'SessionReplay/Abort/<reason>': async (reason, ctx) => {
    switch (reason) {
      case 'Reset':
        return withReplay(ctx, FULL_FLAGS, ({ aggregate }) => { aggregate.ee.emit(SESSION_EVENTS.RESET) })
      case 'Import': {
        /* make the recorder module fail to import, which is what the aggregate aborts on */
        const importSpy = jest.spyOn(SessionReplay.prototype, 'importRecorder').mockRejectedValue(new Error('import failed'))
        try { await withReplay(ctx, FULL_FLAGS, () => {}) } finally { importSpy.mockRestore() }
        return
      }
      case 'Too-Big':
        return withReplay(ctx, FULL_FLAGS, async (replay) => {
          const recorder = quietRecorder(replay, ctx)
          /* with no compression the payload is measured as-is */
          replay.aggregate.shouldCompress = false
          replay.aggregate.gzipper = undefined
          recorder.audit(event(4))
          recorder.audit(event(2))
          recorder.audit(event(3, { text: 'x'.repeat(MAX_PAYLOAD_SIZE) }))
          replay.aggregate.makeHarvestPayload()
        })
      case 'Cross-Tab':
        return withReplay(ctx, FULL_FLAGS, ({ aggregate }) => {
          aggregate.ee.emit(SESSION_EVENTS.UPDATE, [SESSION_EVENT_TYPES.CROSS_TAB, { sessionReplayMode: MODE.OFF }])
        })
      case 'Entitlement':
        ctx.agent.runtime.isRecording = true
        return withReplay(ctx, { sr: 0, srs: MODE.FULL }, () => {})
      /* 'Too-Many' is intentionally absent: ABORT_REASONS.TOO_MANY is never passed to abort() anywhere in src */
    }
  },

  'SessionReplay/Payload/Missing-Inline-Css/<outcome>': async (outcome, ctx) => {
    await withReplay(ctx, FULL_FLAGS, async (replay) => {
      const recorder = replay.aggregate.recorder
      jest.spyOn(ctx.agent.runtime.harvester, 'triggerHarvestFor').mockImplementation(() => {})
      jest.spyOn(stylesheetEvaluator, 'evaluate').mockReturnValue(2)
      jest.spyOn(recorder, 'takeFullSnapshot').mockImplementation(() => {})
      if (outcome === 'Skipped') {
        recorder.shouldFix = false
      } else {
        recorder.shouldFix = true
        jest.spyOn(stylesheetEvaluator, 'fix').mockResolvedValue(outcome === 'Failed' ? 1 : 0)
      }
      recorder.audit(event(3))
      await ctx.settle()
    })
  },

  'rrweb/node/<type>/bytes': (type, ctx) => withReplay(ctx, FULL_FLAGS, (replay) => {
    quietRecorder(replay, ctx).audit(event(Number(type)))
  })
}
