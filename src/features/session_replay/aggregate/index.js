import { record } from 'rrweb'
import { drain } from '../../../common/drain/drain'
import { registerHandler } from '../../../common/event-emitter/register-handler'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { FeatureBase } from '../../utils/feature-base'
import { FEATURE_NAME } from '../constants'
import { stringify } from '../../../common/util/stringify'
import { getInfo, getRuntime } from '../../../common/config/config'
import { SESSION_EVENTS } from '../../../common/session/session-entity'
import { EncodeUTF8, gzip } from 'fflate'
import { warn } from '../../../common/util/console'

// would be better to get this dynamically in some way
export const RRWEB_VERSION = '2.0.0-alpha.4'

const MODE = {
  OFF: 0,
  FULL: 1,
  ERROR: 2
}

const MAX_PAYLOAD_SIZE = 1000000
const IDEAL_PAYLOAD_SIZE = 64000

export class Aggregate extends FeatureBase {
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

    this.hasFirstChunk = false
    this.hasSnapshot = false

    this.utfEncoder = new EncodeUTF8((data, final) => {
      this.events.push(data)
    })

    const { session } = getRuntime(this.agentIdentifier)
    // // if this isnt the FIRST load of a session AND
    // // we are not actively recording SR... DO NOT run the aggregator
    // // session replay samples can only be decided on the first load of a session
    // // session replays can continue if in progress
    if (!session.isNew && !session.state.sessionReplayActive) {
      drain(this.agentIdentifier, this.featureName)
      return
    }

    // console.log('session ID at startup', session.state.value)

    this.stopRecording = () => { /* no-op until set by rrweb initializer */ }

    this.ee.on('session-reset', () => {
      // console.log('session-reset.... abort it!')
      this.abort()
    })

    this.ee.on(SESSION_EVENTS.PAUSE, () => { this.stopRecording() })
    this.ee.on(SESSION_EVENTS.RESUME, () => {
      if (!this.initialized || this.mode === MODE.OFF) return
      this.startRecording()
      this.takeFullSnapshot()
    })

    // https://vortex-alb.stg-single-tooth.cell.us.nr-data.net/blob
    this.scheduler = new HarvestScheduler('blob', {
      onFinished: this.onHarvestFinished.bind(this),
      retryDelay: this.harvestTimeSeconds,
      getPayload: this.prepareHarvest.bind(this),
      // TODO -- this stuff needs a better way to be handled
      includeBaseParams: false,
      customUrl: 'https://vortex-alb.stg-single-tooth.cell.us.nr-data.net/blob',
      raw: true,
      gzip: true
    }, this)

    // TODO -- get this working with agreed structure
    // DISABLE FOR STEEL THREAD, RUN ON EVERY PAGE
    // THIS STILL ONLY HONORS NEW SESSIONS OR ONGOING RECORDINGS THO...
    // this.waitForFlags()
    this.initializeRecording(true, false, true) // and disable this when flags are working

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
    // console.log('initialize recording')
    this.initialized = true
    if (!entitlements) return // TODO -- re-enable this when flags are working

    const { session } = getRuntime(this.agentIdentifier)
    // console.log('both', (!session.isNew && !session.state.sessionReplayActive))
    // console.log('active', session.state.sessionReplayActive)
    // console.log('new and sample', session.isNew && fullSample)
    // if theres an existing session replay in progress, there's no need to sample, just check the entitlements response
    // if not, these sample flags need to be checked
    if (!session.isNew && !session.state.sessionReplayActive) return
    if (session.state.sessionReplayActive || (session.isNew && fullSample)) this.mode = MODE.FULL
    else if (errorSample) this.mode = MODE.ERROR

    // console.log('mode --', this.mode)

    if (this.mode !== MODE.OFF) this.startRecording()
    if (this.mode === MODE.FULL) this.scheduler.startTimer(this.harvestTimeSeconds)
    if (this.mode === MODE.ERROR) {
      registerHandler('err', () => {
        this.hasError = true
        if (this.errorNoticed) return
        this.scheduler.runHarvest({ needResponse: true })
        this.scheduler.startTimer(this.harvestTimeSeconds)
        this.errorNoticed = true
      }, this.featureName, this.ee)
    }
    this.isFirstChunk = true
  }

  prepareHarvest (options) {
    // console.log('prepare harvest')
    if (this.events.length === 0) return
    return this.getPayload()
  }

  getPayload () {
    const agentRuntime = getRuntime(this.agentIdentifier)
    const info = getInfo(this.agentIdentifier)
    return {
      qs: { protocol_version: '0' },
      body: {
        type: 'Replay',
        appId: Number(info.applicationID),
        timestamp: Date.now(),
        blob: stringify(this.events),
        attributes: {
          session: agentRuntime.session.value,
          hasSnapshot: this.hasSnapshot,
          hasError: this.hasError,
          agentVersion: agentRuntime.version,
          isFirstChunk: this.isFirstChunk,
          'nr.rrweb.version': RRWEB_VERSION
        }
      }
    }
  }

  onHarvestFinished (result) {
    // The mutual decision for now is to stop recording and clear buffers if ingest is experiencing 429 rate limiting
    if (result.status === 429) {
      // console.log('429... abort it!')
      this.abort()
      return
    }

    // console.log(result)
    // keep things in the buffer if they fail to send AND its not a rate limit issue
    if (result.sent && !result.retry) this.clearBuffer()

    if (this.blocked) this.scheduler.stopTimer(true)
  }

  clearBuffer () {
    this.events = []
    this.isFirstChunk = false
    this.hasSnapshot = false
    this.hasError = false
    this.isFirstChunk = false
  }

  startRecording () {
    this.hasSnapshot = true
    this.stopRecording = record({
      emit: this.store.bind(this),
      ...(this.mode === MODE.ERROR && { checkoutEveryNms: this.harvestTimeSeconds * 1000 })
    })
  }

  async store (event, isCheckout) {
    if (this.blocked) return
    const payload = await this.getPayloadSize(event)
    if (payload.size > MAX_PAYLOAD_SIZE) {
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
        session.write({ ...session.state, sessionReplayActive: true })

        if (this.mode === MODE.ERROR) {
          this.stopRecording()
          this.mode = MODE.FULL
          this.startRecording()
        }
      }
    }

    this.events.push(event)

    if (payload.size > IDEAL_PAYLOAD_SIZE) {
      // if we've made it to the ideal size of ~128kb before the interval timer, we should send early.
      this.scheduler.runHarvest()
    }
  }

  takeFullSnapshot () {
    record.takeFullSnapshot()
    this.hasSnapshot = true
  }

  async getPayloadSize (newData) {
    const payload = this.getPayload()
    if (newData) {
      payload.body.blob += newData
    }
    const compressedData = await this.estimateCompression(payload.body, true)
    return { size: compressedData }
  }

  abort () {
    this.blocked = true
    this.stopRecording()
    const { session } = getRuntime(this.agentIdentifier)
    session.write({ ...session.state, sessionReplayActive: false })
  }

  estimateCompression (data, estimate) {
    return new Promise((resolve, reject) => {
      const d = stringify(data)
      if (estimate) return resolve(d.length * 0.11)
      gzip(d, (err, data) => {
        if (err) {
          warn('Failed to compress', err)
          return reject(err)
        }
        return resolve(data.length)
      })
    })
  }
}
