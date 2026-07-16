import { Recorder } from '../../../../../src/features/session_replay/shared/recorder'
import { RRWEB_EVENT_TYPES } from '../../../../../src/features/session_replay/constants'
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../../../../src/features/metrics/constants'
import { FEATURE_NAMES } from '../../../../../src/loaders/features/features'
import { handle } from '../../../../../src/common/event-emitter/handle'
import { warn } from '../../../../../src/common/util/console'
import { stylesheetEvaluator } from '../../../../../src/features/session_replay/shared/stylesheet-evaluator'

jest.mock('@newrelic/rrweb', () => ({
  __esModule: true,
  record: Object.assign(jest.fn(() => jest.fn()), {
    takeFullSnapshot: jest.fn()
  })
}))
jest.mock('../../../../../src/common/event-emitter/handle', () => ({
  __esModule: true,
  handle: jest.fn()
}))
jest.mock('../../../../../src/common/util/console', () => ({
  __esModule: true,
  warn: jest.fn()
}))
jest.mock('../../../../../src/common/event-emitter/register-handler', () => ({
  __esModule: true,
  registerHandler: jest.fn()
}))
jest.mock('../../../../../src/features/session_replay/shared/stylesheet-evaluator', () => ({
  __esModule: true,
  stylesheetEvaluator: {
    evaluate: jest.fn(),
    fix: jest.fn(),
    invalidStylesheetsDetected: false
  }
}))

const CSS_SM_PREFIX = 'SessionReplay/Payload/Missing-Inline-Css/'

function makeSrInstrument ({ fix_stylesheets = true } = {}) {
  return {
    featureName: 'session_replay',
    agentRef: {
      init: {
        session_replay: { fix_stylesheets }
      },
      runtime: {
        isRecording: true,
        timeKeeper: { correctAbsoluteTimestamp: jest.fn(x => x) },
        harvester: { triggerHarvestFor: jest.fn() }
      }
    },
    ee: { on: jest.fn() },
    featAggregate: { drained: true, blocked: false }
  }
}

const metaEvent = () => ({ type: RRWEB_EVENT_TYPES.Meta, timestamp: 100 })
const fullSnapshotEvent = () => ({ type: RRWEB_EVENT_TYPES.FullSnapshot, timestamp: 100 })
const incrementalEvent = () => ({ type: RRWEB_EVENT_TYPES.IncrementalSnapshot, timestamp: 100 })

describe('Recorder', () => {
  test('should store event if no session present', () => {
    stylesheetEvaluator.evaluate.mockReturnValue(0)
    stylesheetEvaluator.fix.mockResolvedValue(0)
    const recorder = new Recorder(makeSrInstrument())
    recorder.store({ timestamp: 123 })
    expect(recorder.getEvents().events).toHaveLength(1)
  })

  describe('audit()', () => {
    describe('when fix_stylesheets is disabled', () => {
      test('stores the event directly when there are no incomplete stylesheets', () => {
        const recorder = new Recorder(makeSrInstrument({ fix_stylesheets: false }))
        recorder.audit(metaEvent())
        expect(recorder.getEvents().events).toHaveLength(1)
      })

      test('does not call stylesheetEvaluator.evaluate() when fix_stylesheets config is false', () => {
        const recorder = new Recorder(makeSrInstrument({ fix_stylesheets: false }))
        recorder.audit(metaEvent())
        expect(stylesheetEvaluator.evaluate).not.toHaveBeenCalled()
      })

      test('does not take new snapshot', async () => {
        const recorder = new Recorder(makeSrInstrument({ fix_stylesheets: false }))
        jest.spyOn(recorder, 'takeFullSnapshot')
        recorder.audit(metaEvent())
        await new Promise(resolve => setTimeout(resolve, 0))
        expect(recorder.takeFullSnapshot).not.toHaveBeenCalled()
      })

      test('still decorate events with inlinedAllStylesheets = false', async () => {
        const recorder = new Recorder(makeSrInstrument({ fix_stylesheets: false }))
        recorder.audit(metaEvent())
        await new Promise(resolve => setTimeout(resolve, 0))
        expect(recorder.events.inlinedAllStylesheets).toBe(false)
      })
    })

    describe('when fix_stylesheets is enabled', () => {
      describe('with no incomplete stylesheets', () => {
        test('stores the event when not in fixing state', () => {
          stylesheetEvaluator.evaluate.mockReturnValue(0)
          const recorder = new Recorder(makeSrInstrument())
          recorder.audit(metaEvent())
          expect(recorder.getEvents().events).toHaveLength(1)
          expect(recorder.events.inlinedAllStylesheets).toBe(true)
        })
      })

      describe('with incomplete stylesheets — snapshot/meta-type events', () => {
        test('drops events of non-Meta type while in fixing state', () => {
          stylesheetEvaluator.evaluate.mockReturnValue(1)
          stylesheetEvaluator.fix.mockResolvedValue(0)
          const recorder = new Recorder(makeSrInstrument())

          recorder.audit(metaEvent()) // triggers fixing state
          expect(recorder.getEvents().events).toHaveLength(0)
          expect(recorder.events.inlinedAllStylesheets).toBe(true)

          stylesheetEvaluator.evaluate.mockReturnValue(0)
          recorder.audit(fullSnapshotEvent()) // still fixing, not a Meta reset
          expect(recorder.getEvents().events).toHaveLength(0)
          expect(recorder.events.inlinedAllStylesheets).toBe(true)
        })

        test('stores a Meta event and clears fixing state when no incompletes remain', () => {
          stylesheetEvaluator.evaluate.mockReturnValue(1)
          stylesheetEvaluator.fix.mockResolvedValue(0)
          const recorder = new Recorder(makeSrInstrument())

          recorder.audit(metaEvent()) // triggers fixing state
          stylesheetEvaluator.evaluate.mockReturnValue(0)
          expect(recorder.events.inlinedAllStylesheets).toBe(true)

          recorder.audit(metaEvent()) // no incompletes + Meta clears fixing state
          expect(recorder.getEvents().events).toHaveLength(1)
          expect(recorder.events.inlinedAllStylesheets).toBe(true)
        })

        test('does not store a Meta event when there are incomplete stylesheets', () => {
          stylesheetEvaluator.evaluate.mockReturnValue(1)
          stylesheetEvaluator.fix.mockResolvedValue(0)
          const recorder = new Recorder(makeSrInstrument())
          recorder.audit(metaEvent())
          expect(recorder.getEvents().events).toHaveLength(0)
        })

        test('does not store a FullSnapshot event when there are incomplete stylesheets', () => {
          stylesheetEvaluator.evaluate.mockReturnValue(1)
          stylesheetEvaluator.fix.mockResolvedValue(0)
          const recorder = new Recorder(makeSrInstrument())
          recorder.audit(fullSnapshotEvent())
          expect(recorder.getEvents().events).toHaveLength(0)
        })

        test('calls stylesheetEvaluator.fix() when incompletes are found', () => {
          stylesheetEvaluator.evaluate.mockReturnValue(2)
          stylesheetEvaluator.fix.mockResolvedValue(0)
          const recorder = new Recorder(makeSrInstrument())
          recorder.audit(metaEvent())
          expect(stylesheetEvaluator.fix).toHaveBeenCalledTimes(1)
        })

        test('calls takeFullSnapshot after fix resolves on a Meta event', async () => {
          stylesheetEvaluator.evaluate.mockReturnValue(1)
          stylesheetEvaluator.fix.mockResolvedValue(1) // still broken
          const recorder = new Recorder(makeSrInstrument())
          jest.spyOn(recorder, 'takeFullSnapshot')
          recorder.audit(metaEvent())
          await Promise.resolve()
          expect(recorder.takeFullSnapshot).toHaveBeenCalledTimes(1)
        })
      })

      describe('with incomplete stylesheets — non-snapshot event types', () => {
        test('stores an IncrementalSnapshot event even when there are incomplete stylesheets', () => {
          stylesheetEvaluator.evaluate.mockReturnValue(1)
          stylesheetEvaluator.fix.mockResolvedValue(0)
          const recorder = new Recorder(makeSrInstrument())
          recorder.audit(incrementalEvent())
          expect(recorder.getEvents().events).toHaveLength(1)
        })

        test('still calls fix() and schedules takeFullSnapshot for non-snapshot events', async () => {
          stylesheetEvaluator.evaluate.mockReturnValue(1)
          stylesheetEvaluator.fix.mockResolvedValue(0)
          const recorder = new Recorder(makeSrInstrument())
          jest.spyOn(recorder, 'takeFullSnapshot')
          recorder.audit(incrementalEvent())
          await Promise.resolve()
          expect(stylesheetEvaluator.fix).toHaveBeenCalled()
          expect(recorder.takeFullSnapshot).toHaveBeenCalledTimes(1)
        })
      })

      describe('fix failure behavior', () => {
        test('sets inlinedAllStylesheets to false when fix partially fails', async () => {
          stylesheetEvaluator.evaluate.mockReturnValue(2)
          stylesheetEvaluator.fix.mockResolvedValue(1)
          const recorder = new Recorder(makeSrInstrument())
          recorder.audit(metaEvent())
          await Promise.resolve()
          expect(recorder.events.inlinedAllStylesheets).toBe(false)
        })

        test('still calls takeFullSnapshot even when fix fails', async () => {
          stylesheetEvaluator.evaluate.mockReturnValue(1)
          stylesheetEvaluator.fix.mockResolvedValue(1)
          const recorder = new Recorder(makeSrInstrument())
          jest.spyOn(recorder, 'takeFullSnapshot')
          recorder.audit(metaEvent())
          await Promise.resolve()
          expect(recorder.takeFullSnapshot).toHaveBeenCalledTimes(1)
        })

        test('emits Failed and Fixed SMs after fix resolves', async () => {
          stylesheetEvaluator.evaluate.mockReturnValue(4)
          stylesheetEvaluator.fix.mockResolvedValue(1) // 1 failed → 3 fixed
          const recorder = new Recorder(makeSrInstrument())
          recorder.audit(metaEvent())
          await Promise.resolve()
          expect(handle).toHaveBeenCalledWith(
            SUPPORTABILITY_METRIC_CHANNEL,
            [CSS_SM_PREFIX + 'Failed', 1],
            undefined,
            FEATURE_NAMES.metrics,
            recorder.ee
          )
          expect(handle).toHaveBeenCalledWith(
            SUPPORTABILITY_METRIC_CHANNEL,
            [CSS_SM_PREFIX + 'Fixed', 3],
            undefined,
            FEATURE_NAMES.metrics,
            recorder.ee
          )
        })

        describe('when shouldFix is degraded', () => {
          test('degrades shouldFix to false when any fix attempt fails', async () => {
            stylesheetEvaluator.evaluate.mockReturnValue(1)
            stylesheetEvaluator.fix.mockResolvedValue(1)
            const recorder = new Recorder(makeSrInstrument())
            recorder.audit(metaEvent())
            await Promise.resolve()
            expect(recorder.shouldFix).toBe(false)
          })

          test('sets inlinedAllStylesheets to false when shouldFix is false and incompletes exist', () => {
            // shouldFix starts as fix_stylesheets. To get incompletes with shouldFix=false,
            // we degrade shouldFix by first triggering a failed fix with fix_stylesheets=true,
            // then confirm the skipped-path behavior.
            stylesheetEvaluator.evaluate.mockReturnValue(2)
            stylesheetEvaluator.fix.mockResolvedValue(0)
            const recorder = new Recorder(makeSrInstrument({ fix_stylesheets: true }))
            // Manually set shouldFix=false to simulate degraded state while evaluate still runs
            recorder.shouldFix = false
            recorder.audit(metaEvent())
            expect(recorder.events.inlinedAllStylesheets).toBe(false)
          })

          test('emits the Skipped SM with the incomplete count', () => {
            stylesheetEvaluator.evaluate.mockReturnValue(3)
            stylesheetEvaluator.fix.mockResolvedValue(0)
            const recorder = new Recorder(makeSrInstrument({ fix_stylesheets: true }))
            recorder.shouldFix = false
            recorder.audit(metaEvent())
            expect(handle).toHaveBeenCalledWith(
              SUPPORTABILITY_METRIC_CHANNEL,
              [CSS_SM_PREFIX + 'Skipped', 3],
              undefined,
              FEATURE_NAMES.metrics,
              recorder.ee
            )
          })

          test('emits a warning when shouldFix is false and incompletes exist', () => {
            stylesheetEvaluator.evaluate.mockReturnValue(1)
            stylesheetEvaluator.fix.mockResolvedValue(0)
            const recorder = new Recorder(makeSrInstrument({ fix_stylesheets: true }))
            recorder.shouldFix = false
            recorder.audit(metaEvent())
            expect(warn).toHaveBeenCalledWith(47)
          })

          test('emits the warning only once across multiple audit calls', () => {
            stylesheetEvaluator.evaluate.mockReturnValue(1)
            stylesheetEvaluator.fix.mockResolvedValue(0)
            const recorder = new Recorder(makeSrInstrument({ fix_stylesheets: true }))
            recorder.shouldFix = false
            recorder.audit(metaEvent())
            recorder.audit(metaEvent())
            expect(warn).toHaveBeenCalledTimes(1)
          })
        })
      })
    })
  })
})
