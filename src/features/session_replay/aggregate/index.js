import { record } from 'rrweb'
import { drain } from '../../../common/drain/drain'
import { registerHandler } from '../../../common/event-emitter/register-handler'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { AggregateBase } from '../../utils/aggregate-base'
import { FEATURE_NAME } from '../constants'
import { stringify } from '../../../common/util/stringify'
import { getRuntime } from '../../../common/config/config'
// import { SESSION_REPLAY_ID, SESSION_REPLAY_START_TIME, getOrSet, get, isNew } from '../../../common/session/session-manager'

const MODE = {
  OFF: 0,
  FULL: 1,
  ERROR: 2
}

const MAX_PAYLOAD_SIZE = 1000000
const IDEAL_PAYLOAD_SIZE = 64000

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator, FEATURE_NAME)

    this.events = []
    this.overflow = []
    this.harvestTimeSeconds = 10
    this.initialized = false
    this.errorNoticed = false
    this.mode = MODE.OFF
    this.blocked = false

    const { session } = getRuntime(this.agentIdentifier)
    // // if this isnt the FIRST load of a session AND
    // // we are not actively recording SR... DO NOT run the aggregator
    // // session replay samples can only be decided on the first load of a session
    // // session replays can continue if in progress
    if (!session.isNew && !session.sessionReplayActive) {
      drain(this.agentIdentifier, this.featureName)
      return
    }

    console.log('session ID at startup', session.value)

    this.stopRecording = () => { /* no-op until set by rrweb initializer */ }

    this.ee.on('session-reset', () => {
      console.log('session-reset.... abort it!')
      this.abort()
    })

    document.addEventListener('visibilitychange', () => {
      if (!this.initialized || this.mode === MODE.OFF) return
      if (document.visibilityState === 'hidden') this.stopRecording()
      else {
        this.startRecording()
        this.takeFullSnapshot()
      }
    })

    this.scheduler = new HarvestScheduler('session', {
      onFinished: this.onHarvestFinished.bind(this),
      retryDelay: this.harvestTimeSeconds,
      getPayload: this.prepareHarvest.bind(this)
    }, this)

    this.waitForFlags()

    drain(this.agentIdentifier, this.featureName)
  }

  setupFlagResponseHandlers () {
    const sessionReplayFlagChecks = [
      // this must run every time
      new Promise(resolve => {
        this.entitlementsResponse = resolve
      }),
      new Promise(resolve => {
        this.errorSample = resolve
      }),
      new Promise(resolve => {
        this.fullSample = resolve
      })
    ]

    Promise.all(sessionReplayFlagChecks).then(([entitlements, errorSample, fullSample]) => {
      this.initializeRecording(entitlements, errorSample, fullSample)
    })
  }

  waitForFlags () {
    this.setupFlagResponseHandlers()

    registerHandler('feat-sr', () => {
      this.entitlementsResponse(true)
    }, this.featureName, this.ee)

    registerHandler('feat-srf', () => {
      this.fullSample(true)
    }, this.featureName, this.ee)

    registerHandler('feat-sre', () => {
      this.errorSample(true)
    }, this.featureName, this.ee)

    registerHandler('block-sr', () => {
      this.entitlementsResponse(false)
    }, this.featureName, this.ee)

    registerHandler('block-srf', () => {
      this.fullSample(false)
    }, this.featureName, this.ee)

    registerHandler('block-sre', () => {
      this.errorSample(false)
    }, this.featureName, this.ee)
  }

  initializeRecording (entitlements, errorSample, fullSample) {
    console.log('initialize recording')
    this.initialized = true
    if (!entitlements) return

    const { session } = getRuntime(this.agentIdentifier)
    console.log('both', (!session.isNew && !session.sessionReplayActive))
    console.log('active', session.sessionReplayActive)
    console.log('new and sample', session.isNew && fullSample)
    // if theres an existing session replay in progress, there's no need to sample, just check the entitlements response
    // if not, these sample flags need to be checked
    if (!session.isNew && !session.sessionReplayActive) return
    if (session.sessionReplayActive || (session.isNew && fullSample)) this.mode = MODE.FULL
    else if (errorSample) this.mode = MODE.ERROR

    console.log('mode --', this.mode)

    if (this.mode !== MODE.OFF) this.startRecording()
    if (this.mode === MODE.FULL) this.scheduler.startTimer(this.harvestTimeSeconds)
    if (this.mode === MODE.ERROR) {
      registerHandler('err', () => {
        this.errorNoticed = true
        this.scheduler.runHarvest({ needResponse: true })
        this.scheduler.startTimer(this.harvestTimeSeconds)
      }, this.featureName, this.ee)
    }
  }

  prepareHarvest (options) {
    if (this.events.length === 0) return

    return this.getPayload()
  }

  getPayload () {
    return { body: { data: [...this.events] } }
  }

  onHarvestFinished (result) {
    // The mutual decision for now is to stop recording and clear buffers if ingest is experiencing 429 rate limiting
    if (result.status === 429) {
      console.log('429... abort it!')
      this.abort()
      return
    }

    console.log(result)
    // keep things in the buffer if they fail to send AND its not a rate limit issue
    if (result.sent && !result.retry) this.clearBuffer()

    if (this.blocked) this.scheduler.stopTimer(true)
  }

  clearBuffer () {
    this.events = []
  }

  startRecording () {
    this.stopRecording = record({
      emit: this.store.bind(this),
      ...(this.mode === MODE.ERROR && { checkoutEveryNms: this.harvestTimeSeconds * 1000 })
    })
  }

  store (event, isCheckout) {
    if (this.blocked) return
    if (this.exceedsSizeLimit(MAX_PAYLOAD_SIZE, event)) {
      return this.abort()
    }

    if (this.mode === MODE.ERROR && !this.errorNoticed && isCheckout) {
      // we are still waiting for an error to throw, so keep wiping the buffer over time
      this.clearBuffer()
    } else {
      // set once
      if (!this.recording) {
        this.recording = true
        const { session } = getRuntime(this.agentIdentifier)
        session.write({ ...session.read(), sessionReplayActive: true })
      }
    }

    this.events.push(event)
    console.log('this.events', this.events)

    if (this.exceedsSizeLimit(IDEAL_PAYLOAD_SIZE)) {
      // if we've made it to the ideal size of ~128kb before the interval timer, we should send early.
      this.scheduler.runHarvest()
    }
  }

  takeFullSnapshot () {
    record.takeFullSnapshot()
  }

  exceedsSizeLimit (limit, newData) {
    const payload = this.getPayload()
    if (newData) {
      payload.body.data.push(newData)
    }
    return stringify(payload)?.length > limit
  }

  abort () {
    console.log('ABORT SESSION REPLAY!')
    this.blocked = true
    this.stopRecording()
  }
}
