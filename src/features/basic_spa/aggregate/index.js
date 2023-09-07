import { getConfigurationValue } from '../../../common/config/config'
import { drain } from '../../../common/drain/drain'
import { registerHandler } from '../../../common/event-emitter/register-handler'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { AggregateBase } from '../../utils/aggregate-base'
import { CATEGORY, FEATURE_NAME } from '../constants'
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
    this.drained = false

    // const tracerEE = this.ee.get('tracer') // used to get API-driven interactions

    this.scheduler = new HarvestScheduler('events', {
      onFinished: this.onHarvestFinished.bind(this),
      retryDelay: this.harvestTimeSeconds
    }, { agentIdentifier, ee: this.ee })
    this.scheduler.harvest.on('events', this.onHarvestStarted.bind(this))

    this.startInteraction({ isInitial: true })

    registerHandler('newInteraction', (timestamp, trigger, category) => this.startInteraction({ category, trigger, startedAt: timestamp }), this.featureName, this.ee)
    registerHandler('newURL', (timestamp, url, type) => this.interactionInProgress?.updateHistory(timestamp, url), this.featureName, this.ee)
    registerHandler('newDom', timestamp => this.interactionInProgress?.updateDom(timestamp), this.featureName, this.ee)
  }

  onHarvestStarted (options) {
    if (this.interactionsToHarvest.length === 0 || this.blocked) return {}
    const payload = `bel.7;${this.interactionsToHarvest.map(ixn => ixn.serialize('bel')).join(';')}`

    console.log('PAYLOAD!', payload)
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

  startInteraction ({ isInitial, trigger, category, startedAt }) {
    const Ixn = isInitial ? InitialPageLoadInteraction : Interaction
    this.interactionInProgress = new Ixn(this.agentIdentifier, { onFinished: this.completeInteraction.bind(this) })
    if (trigger) this.interactionInProgress.trigger = trigger
    if (category) this.interactionInProgress.category = CATEGORY.ROUTE_CHANGE
    if (startedAt) this.interactionInProgress.start = startedAt
    console.log(performance.now(), 'start ixn...', this.interactionInProgress)
  }

  completeInteraction () {
    console.log(performance.now(), 'interaction complete', this.interactionInProgress)
    this.interactionsToHarvest.push(this.interactionInProgress)
    this.interactionInProgress = null
    this.scheduler.scheduleHarvest(0)
    if (!this.drained) {
      this.drain = true
      drain(this.agentIdentifier, this.featureName)
    }
  }

  hasInteraction ({ timestamp }) {
    if (!timestamp) return { shouldHold: false, interaction: undefined }
    let shouldHold = false
    const interaction = [...this.interactionsToHarvest, ...this.interactionsSent].find(ixn => ixn.containsEvent(timestamp))
    if (!interaction && !!this.interactionInProgress) shouldHold = this.interactionInProgress.containsEvent(timestamp)
    return { shouldHold, interaction }
  }
}
