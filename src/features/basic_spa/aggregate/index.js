import { getConfigurationValue } from '../../../common/config/config'
import { drain } from '../../../common/drain/drain'
import { registerHandler } from '../../../common/event-emitter/register-handler'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { debounce } from '../../../common/util/invoke'
import { AggregateBase } from '../../utils/aggregate-base'
import { CATEGORY, FEATURE_NAME, INTERACTION_EVENTS } from '../constants'
import { InitialPageLoadInteraction } from './initial-page-load-interaction'
import { Interaction } from './interaction'

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator, FEATURE_NAME)

    this.harvestTimeSeconds = getConfigurationValue(agentIdentifier, 'spa.harvestTimeSeconds') || 10
    this.interactionInProgress = null
    this.interactionsToHarvest = []
    this.interactionsSent = []

    this.blocked = false

    const historyEE = this.ee.get('history')
    const eventsEE = this.ee.get('events')
    const tracerEE = this.ee.get('tracer')

    this.scheduler = new HarvestScheduler('events', {
      onFinished: this.onHarvestFinished.bind(this),
      retryDelay: this.harvestTimeSeconds
    }, { agentIdentifier, ee: this.ee })
    this.scheduler.harvest.on('events', this.onHarvestStarted.bind(this))

    this.waitForFlags(['spa']).then(([isOn]) => {
      if (isOn) this.captureInitialPageLoad()
    })

    const debouncedIxn = debounce((trigger) => {
      this.interactionInProgress = new Interaction(this.agentIdentifier)
      this.interactionInProgress.trigger = trigger
      this.interactionInProgress.category = CATEGORY.ROUTE_CHANGE
      console.log('new IXN!', this.interactionInProgress)
    }, 2000, { leading: true })

    registerHandler('fn-end', evts => {
      const type = evts?.[0]?.type
      if (INTERACTION_EVENTS.includes(type)) {
        debouncedIxn(type)
      }
    }, this.featureName, eventsEE)

    registerHandler('newURL', url => {
      const ixn = this.interactionInProgress
      if (!ixn) return
      ixn.finish(url)
      console.log('ixn finished...', ixn)

      this.interactionsToHarvest.push(ixn)
      this.interactionInProgress = null

      this.scheduler.scheduleHarvest(0)
    }, this.featureName, historyEE)

    drain(this.agentIdentifier, this.featureName)
  }

  onHarvestStarted (options) {
    if (this.interactionsToHarvest.length === 0 || this.blocked) return {}
    const payload = `bel.7;${this.interactionsToHarvest.map(ixn => ixn.serialize('bel')).join(';')}`

    if (options.retry) {
      this.interactionsToHarvest.forEach((interaction) => {
        this.interactionsSent.push(interaction)
      })
    }
    this.interactionsToHarvest = []

    return { body: { e: payload } }
  }

  onHarvestFinished (result) {
    if (result.sent && result.retry && this.interactionsSent.length > 0) {
      this.interactionsSent.forEach((interaction) => {
        this.interactionsToHarvest.unshift(interaction)
      })
      this.interactionsSent = []
    }
  }

  hasInteraction ({ timestamp }) {
    if (!timestamp) return { shouldHold: false, interaction: undefined }
    let shouldHold = false
    const interaction = [...this.interactionsToHarvest, ...this.interactionsSent].find(ixn => ixn.containsEvent(timestamp))
    if (!interaction && !!this.interactionInProgress) shouldHold = this.interactionInProgress.containsEvent(timestamp)
    return { shouldHold, interaction }
  }

  captureInitialPageLoad () {
    this.interactionsToHarvest.push(new InitialPageLoadInteraction(this.agentIdentifier))
    this.scheduler.scheduleHarvest(0)
  }
}
