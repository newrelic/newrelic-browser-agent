import { record } from 'rrweb'
import { drain } from '../../../common/drain/drain'
import { registerHandler } from '../../../common/event-emitter/register-handler'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { AggregateBase } from '../../utils/aggregate-base'
import { FEATURE_NAME } from '../constants'
import { stringify } from '../../../common/util/stringify'

const MODE = {
  OFF: 0,
  FULL: 1,
  ERROR: 2
}

const MAX_PAYLOAD_SIZE = 1000000
const IDEAL_PAYLOAD_SIZE = 128000

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator, FEATURE_NAME)

    this.events = []
    this.overflow = []
    this.harvestTimeSeconds = 30
    this.initialized = false
    this.errorNoticed = false
    this.mode = MODE.OFF
    this.blocked = false

    Promise.all([
      new Promise(resolve => {
        this.errorSample = resolve
      }),
      new Promise(resolve => {
        this.fullSample = resolve
      })
    ]).then(([errorSample, fullSample]) => {
      this.initializeRecording(errorSample, fullSample)
    })

    this.stopRecording = () => { /* no-op until set by rrweb initializer */ }

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

    registerHandler('feat-srf', () => {
      console.log('feat-srf')
      this.fullSample(true)
    }, this.featureName, this.ee)

    registerHandler('feat-sre', () => {
      console.log('feat-sre')
      this.errorSample(true)
    }, this.featureName, this.ee)

    registerHandler('block-srf', () => {
      this.fullSample(false)
    }, this.featureName, this.ee)

    registerHandler('block-sre', () => {
      this.errorSample(false)
    }, this.featureName, this.ee)

    drain(this.agentIdentifier, this.featureName)
  }

  initializeRecording (errorSample, fullSample) {
    this.initialized = true
    if (fullSample) this.mode = MODE.FULL
    else if (errorSample) this.mode = MODE.ERROR

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
    return { body: { data: this.events } }
  }

  onHarvestFinished (result) {
    // The mutual decision for now is to stop recording and clear buffers if ingest is experiencing 429 rate limiting
    if (result.status === 429) {
      this.abort()
      return
    }

    // keep things in the buffer if they fail to send AND its not a rate limit issue
    if (result.sent && !result.retry) this.clearBuffer()
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
    if (this.isMaxPayloadSize(event)) return this.abort()

    if (this.mode === MODE.ERROR && !this.errorNoticed && isCheckout) {
      // we are still waiting for an error to throw, so keep wiping the buffer over time
      this.clearBuffer()
    }

    this.events.push(event)

    if (this.isIdealPayloadSize(event)) {
      // if we've made it to the ideal size of ~128kb before the interval timer, we should send early.
      this.scheduler.runHarvest()
    }
  }

  takeFullSnapshot () {
    record.takeFullSnapshot()
  }

  isMaxPayloadSize (newData) {
    const payload = this.getPayload()
    if (newData) {
      payload.body.data.push(newData)
    }
    return stringify(payload)?.length > MAX_PAYLOAD_SIZE
  }

  isIdealPayloadSize (newData) {
    const payload = this.getPayload()
    if (newData) {
      payload.body.data.push(newData)
    }
    const bytes = stringify(payload)?.length
    return bytes >= IDEAL_PAYLOAD_SIZE
  }

  abort () {
    this.blocked = true
    this.scheduler.stopTimer(true)
    this.stopRecording()
    this.clearBuffer()
  }
}
