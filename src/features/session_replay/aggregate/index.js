// import { record } from 'rrweb'
import { drain } from '../../../common/drain/drain'
import { registerHandler } from '../../../common/event-emitter/register-handler'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { FeatureBase } from '../../utils/feature-base'
import { FEATURE_NAME } from '../constants'
import { stringify } from '../../../common/util/stringify'
import { getConfigurationValue, getInfo, getRuntime } from '../../../common/config/config'
import { SESSION_EVENTS } from '../../../common/session/session-entity'

// would be better to get this dynamically in some way
export const RRWEB_VERSION = '2.0.0-alpha.8'

let recorder

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
    this.harvestTimeSeconds = getConfigurationValue(this.agentIdentifier, 'session_replay.harvestTimeSeconds') || 60
    this.initialized = false
    this.errorNoticed = false
    this.mode = MODE.OFF
    this.blocked = false

    this.isFirstChunk = false
    this.hasSnapshot = false
    this.hasError = false

    this.payloadBytesEstimation = 0

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

    registerHandler('err', (e) => {
      this.hasError = true
      if (this.errorNoticed) return
      // if the error was noticed AFTER the recorder was imported....
      if (this.mode === MODE.ERROR && !!recorder) {
        this.errorNoticed = true
        this.stopRecording()
        this.mode = MODE.FULL
        this.startRecording()
        this.scheduler.startTimer(this.harvestTimeSeconds)
      }
    }, this.featureName, this.ee)

    // TODO -- get this working with agreed structure
    // DISABLE FOR STEEL THREAD, RUN ON EVERY PAGE
    // THIS STILL ONLY HONORS NEW SESSIONS OR ONGOING RECORDINGS THO...
    // this.waitForFlags()
    this.initializeRecording(true, true, false) // and disable this when flags are working

    const { session } = getRuntime(this.agentIdentifier)
    // // if this isnt the FIRST load of a session AND
    // // we are not actively recording SR... DO NOT run the aggregator
    // // session replay samples can only be decided on the first load of a session
    // // session replays can continue if in progress
    if (session.isNew || !!session.state.sessionReplayActive) {
      drain(this.agentIdentifier, this.featureName)
      return
    }
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

  async initializeRecording (entitlements, errorSample, fullSample) {
    // console.log('initialize recording')
    this.initialized = true
    if (!entitlements) return // TODO -- re-enable this when flags are working

    const { session } = getRuntime(this.agentIdentifier)
    // if theres an existing session replay in progress, there's no need to sample, just check the entitlements response
    // if not, these sample flags need to be checked
    if (!session.isNew && !session.state.sessionReplayActive) return
    if (session.state.sessionReplayActive || (session.isNew && fullSample)) this.mode = MODE.FULL
    else if (errorSample) this.mode = MODE.ERROR

    console.log('MODE', this.mode)

    if (this.mode === MODE.FULL || (this.mode === MODE.ERROR && this.errorNoticed)) {
      this.mode = MODE.FULL
      this.scheduler.startTimer(this.harvestTimeSeconds)
      this.recording = true
      // we only set sessionReplayActive to true if "full"
      const { session } = getRuntime(this.agentIdentifier)
      session.write({ ...session.state, sessionReplayType: true })
    }
    if (this.mode !== MODE.OFF) {
      const { record } = await import(/* webpackChunkName: "recorder" */'rrweb')
      recorder = record
      this.startRecording()
    }
    this.isFirstChunk = !!session.isNew
  }

  prepareHarvest (options) {
    // console.log('prepare harvest')
    if (this.events.length === 0) return
    const payload = this.getPayload()
    console.log('rrweb payload', payload)
    this.clearBuffer()
    return payload
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
        blob: JSON.stringify(this.events), // this needs to be a stringified JSON array of rrweb nodes
        attributes: {
          session: agentRuntime.session.state.value,
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
    this.clearBuffer()

    if (this.blocked) this.scheduler.stopTimer(true)
  }

  clearBuffer () {
    this.events = []
    this.isFirstChunk = false
    this.hasSnapshot = false
    this.hasError = false
    this.payloadBytesEstimation = 0
  }

  startRecording () {
    if (!recorder) {
      warn('Recording library was never imported')
      return this.abort()
    }
    const { blockClass, ignoreClass, maskTextClass, blockSelector, maskInputOptions, maskTextSelector, maskAllInputs } = getConfigurationValue(this.agentIdentifier, 'session_replay')
    this.hasSnapshot = true
    // set up rrweb configurations for maximum privacy --
    // https://newrelic.atlassian.net/wiki/spaces/O11Y/pages/2792293280/2023+02+28+Browser+-+Session+Replay#Configuration-options
    this.stopRecording = recorder({
      emit: this.store.bind(this),
      blockClass,
      ignoreClass,
      maskTextClass,
      blockSelector,
      maskInputOptions,
      maskTextSelector,
      maskAllInputs,
      ...(this.mode === MODE.ERROR && { checkoutEveryNms: 30000 })
    })
  }

  store (event, isCheckout) {
    if (this.blocked) return
    const eventBytes = stringify(event).length
    const payloadSize = this.getPayloadSize(eventBytes)
    if (payloadSize > MAX_PAYLOAD_SIZE) {
      return this.abort()
    }
    if (this.mode === MODE.ERROR && !this.errorNoticed && isCheckout) {
      // we are still waiting for an error to throw, so keep wiping the buffer over time
      this.clearBuffer()
    }

    this.events.push(event)
    this.payloadBytesEstimation += eventBytes

    if (payloadSize > IDEAL_PAYLOAD_SIZE) {
      // if we've made it to the ideal size of ~64kb before the interval timer, we should send early.
      this.scheduler.runHarvest()
    }
  }

  takeFullSnapshot () {
    if (!recorder) return
    recorder.takeFullSnapshot()
    this.hasSnapshot = true
  }

  getPayloadSize (newBytes = 0) {
    // the 1KB gives us some padding for the other metadata
    return (this.payloadBytesEstimation + newBytes) + 1000
  }

  abort () {
    this.blocked = true
    this.stopRecording()
    const { session } = getRuntime(this.agentIdentifier)
    session.write({ ...session.state, sessionReplayActive: false })
  }

  estimateCompression (data) {
    return data.length * 0.11
  }
}
