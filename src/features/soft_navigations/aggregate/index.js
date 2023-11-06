import { getConfigurationValue } from '../../../common/config/config'
import { registerHandler } from '../../../common/event-emitter/register-handler'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { AggregateBase } from '../../utils/aggregate-base'
import { FEATURE_NAME } from '../constants'
import { InitialPageLoadInteraction } from './initial-page-load-interaction'
import { Interaction } from './interaction'

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator, FEATURE_NAME)

    this.harvestTimeSeconds = getConfigurationValue(agentIdentifier, 'spa.harvestTimeSeconds') || 10

    this.initialPageLoadInteraction = new InitialPageLoadInteraction(this.agentIdentifier)
    this.initialPageLoadInteraction.on('finished', ixn => {
      if (!ixn) return
      this.interactionsToHarvest.push(ixn)
      this.scheduler.scheduleHarvest(0.1)
    })

    this.interactionInProgress = null
    this.interactionsToHarvest = []
    this.interactionsSent = []

    this.blocked = false

    // const tracerEE = this.ee.get('tracer') // used to get API-driven interactions

    this.scheduler = new HarvestScheduler('events', {
      onFinished: this.onHarvestFinished.bind(this),
      retryDelay: this.harvestTimeSeconds
    }, { agentIdentifier, ee: this.ee })
    this.scheduler.harvest.on('events', this.onHarvestStarted.bind(this))

    registerHandler('newInteraction', (timestamp, trigger) => this.startAnInteraction({ trigger, startedAt: timestamp }), this.featureName, this.ee)
    registerHandler('newURL', (timestamp, url, type) => this.interactionInProgress?.updateHistory(timestamp, url), this.featureName, this.ee)
    registerHandler('newDom', timestamp => this.interactionInProgress?.updateDom(timestamp), this.featureName, this.ee)

    this.drain()
  }

  onHarvestStarted (options) {
    if (this.interactionsToHarvest.length === 0 || this.blocked) return {}
    const ixn = this.interactionsToHarvest.shift()
    const payload = `bel.7;${ixn.serialize('bel')}`

    this.interactionsSent.push(ixn)

    if (this.interactionsToHarvest.length) this.scheduler.scheduleHarvest(0.1)

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

  startAnInteraction ({ trigger, startedAt }) {
    this.interactionInProgress?.cancel()
    this.interactionInProgress = new Interaction(this.agentIdentifier, startedAt)
    this.interactionInProgress.on('finished', this.completeInteraction.bind(this))
    this.interactionInProgress.on('cancelled', this.cancelInteraction.bind(this))
    if (trigger) this.interactionInProgress.trigger = trigger
  }

  cancelInteraction () {
    this.interactionInProgress = null
  }

  completeInteraction (ixn) {
    if (!ixn) return
    this.interactionsToHarvest.push(ixn)
    this.interactionInProgress = null
    this.scheduler.scheduleHarvest(0.1)
  }

  hasInteraction ({ timestamp }) {
    if (!timestamp) return { interaction: undefined }
    const interactions = [this.initialPageLoadInteraction, this.interactionInProgress, ...this.interactionsToHarvest].filter(ixn => !!ixn && ixn.containsEvent(timestamp))
    return { interactions }
  }
}
