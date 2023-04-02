import { record } from 'rrweb'
import { drain } from '../../../common/drain/drain'
import { registerHandler } from '../../../common/event-emitter/register-handler'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { AggregateBase } from '../../utils/aggregate-base'
import { FEATURE_NAME } from '../constants'

const MODE = {
  OFF: 0,
  FULL: 1,
  ERROR: 2
}

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator, FEATURE_NAME)

    this.events = []
    this.harvestTimeSeconds = 10
    this.initialized = false
    this.errorNoticed = false
    this.mode = MODE.OFF

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
        this.scheduler.startTimer(this.harvestTimeSeconds)
      }, this.featureName, this.ee)
      // more handling needed for error tracking here
      // subscribe to an error event, if receieved:
      // set noticeerror to true
      // start the harvest timer
    }
  }

  prepareHarvest (options) {
    if (this.events.length === 0) return

    return { body: { data: this.events } }
  }

  onHarvestFinished (result) {
    this.clearBuffer()
  }

  clearBuffer () {
    this.events = []
  }

  startRecording () {
    this.stopRecording = record({
      emit: this.store.bind(this),
      ...(this.mode === MODE.ERROR && { checkoutEveryNms: 30000 })
    })
  }

  store (event, isCheckout) {
    if (this.mode === MODE.ERROR && !this.errorNoticed && isCheckout) {
      this.clearBuffer()
    }

    this.events.push(event)
    console.log(this.events.length)
  }

  takeFullSnapshot () {
    record.takeFullSnapshot()
  }
}

/** RRWEB NOTES

  enum EventType {
    DomContentLoaded, - 0
    Load, - 1
    FullSnapshot, - 2
    IncrementalSnapshot, - 3
    Meta, - 4
  }

 */
