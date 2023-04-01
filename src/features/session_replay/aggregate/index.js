import * as rrweb from 'rrweb'
import { drain } from '../../../common/drain/drain'
import { registerHandler } from '../../../common/event-emitter/register-handler'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { AggregateBase } from '../../utils/aggregate-base'
import { FEATURE_NAME } from '../constants'

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator, FEATURE_NAME)

    this.events = []
    this.harvestTimeSeconds = 10

    registerHandler('feat-sr', () => {
      this.start()

      document.addEventListener('visibilitychange', () => {
        console.log(document.visibilityState)
        if (document.visibilityState === 'hidden') this.stop()
        else {
          this.start()
          this.takeFullSnapshot()
        }
      })

      this.scheduler = new HarvestScheduler('session', {
        onFinished: this.onHarvestFinished.bind(this),
        retryDelay: this.harvestTimeSeconds,
        getPayload: this.prepareHarvest.bind(this)
      }, this)

      this.scheduler.startTimer(this.harvestTimeSeconds)
    }, this.featureName, this.ee)

    drain(this.agentIdentifier, this.featureName)
  }

  prepareHarvest (options) {
    if (this.events.length === 0) return

    return { body: { data: this.events } }
  }

  onHarvestFinished (result) {
    this.events = []
  }

  start () {
    this.stop = rrweb.record({
      emit: this.store.bind(this)
    })
  }

  store (event) {
    this.events.push(event)
    console.log(this.events.length)
  }

  takeFullSnapshot () {
    rrweb.record.takeFullSnapshot()
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
