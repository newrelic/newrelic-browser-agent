import { getConfigurationValue, getRuntime } from '../../../common/config/config'
import { drain } from '../../../common/drain/drain'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { AggregateBase } from '../../utils/aggregate-base'
import { FEATURE_NAME } from '../constants'
import { InitialPageLoadInteraction } from './initial-page-load-interaction'

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator, FEATURE_NAME)

    this.state = {
      initialPageURL: getRuntime(agentIdentifier).origin,
      lastSeenUrl: getRuntime(agentIdentifier).origin,
      lastSeenRouteName: null,
      harvestTimeSeconds: getConfigurationValue(agentIdentifier, 'spa.harvestTimeSeconds') || 10,
      interactionsToHarvest: [],
      interactionsSent: []
    }

    // this.serializer = new Serializer(this)
    const { state, serializer } = this

    const historyEE = this.ee.get('history')
    const eventsEE = this.ee.get('events')
    const tracerEE = this.ee.get('tracer')

    const scheduler = new HarvestScheduler('events', {
      // onFinished: onHarvestFinished,
      retryDelay: state.harvestTimeSeconds
    }, { agentIdentifier, ee: this.ee })
    // scheduler.harvest.on('events', onHarvestStarted)

    this.waitForFlags(['spa']).then(([isOn]) => {
      if (isOn) this.captureInitialPageLoad()
    })

    console.log('drain basic_spa...')
    drain(this.agentIdentifier, this.featureName)
  }

  hasInteraction ({ timestamp }) {
    if (!timestamp) return
    let shouldHold = false
    let interactions = this.state.interactionsToHarvest.filter(ixn => {
      if (ixn._start < timestamp) {
        if (!ixn._end) {
          shouldHold = true
          return false
        }
        return ixn._end > timestamp
      }
      return false
    })
    return { shouldHold, interactions }
  }

  captureInitialPageLoad () {
    this.state.interactionsToHarvest.push(new InitialPageLoadInteraction(this.agentIdentifier))
  }
}
