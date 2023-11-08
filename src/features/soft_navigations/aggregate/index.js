import { getConfigurationValue } from '../../../common/config/config'
import { handle } from '../../../common/event-emitter/handle'
import { registerHandler } from '../../../common/event-emitter/register-handler'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { timeToFirstByte } from '../../../common/vitals/time-to-first-byte'
import { FEATURE_NAMES } from '../../../loaders/features/features'
import { AggregateBase } from '../../utils/aggregate-base'
import { FEATURE_NAME, INTERACTION_STATUS } from '../constants'
import { AjaxNode } from './ajax-node'
import { InitialPageLoadInteraction } from './initial-page-load-interaction'
import { Interaction } from './interaction'

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator, FEATURE_NAME)

    const harvestTimeSeconds = getConfigurationValue(agentIdentifier, 'spa.harvestTimeSeconds') || 10
    this.interactionsToHarvest = []
    this.interactionsAwaitingRetry = []

    this.scheduler = new HarvestScheduler('events', {
      onFinished: this.onHarvestFinished.bind(this),
      retryDelay: harvestTimeSeconds
    }, { agentIdentifier, ee: this.ee })
    this.scheduler.harvest.on('events', this.onHarvestStarted.bind(this))

    this.initialPageLoadInteraction = new InitialPageLoadInteraction(agentIdentifier)
    // The page should've loaded at this point, with a single entry in TTFB.
    const loadEventTime = Math.round(timeToFirstByte.current.entries[0].loadEventEnd)
    this.initialPageLoadInteraction.finish(loadEventTime)
    this.interactionsToHarvest.push(this.initialPageLoadInteraction)
    this.scheduler.startTimer(harvestTimeSeconds, 1) // give buffered (ajax & jserror) events some time to settle before sending the initial page load

    this.interactionInProgress = null // aside from the "page load" interaction, there can only ever be 1 ongoing at a time

    this.blocked = false
    registerHandler('block-spa', () => { // if rum response determines that customer lacks entitlements for spa endpoint, this feature shouldn't harvest
      this.blocked = true
      this.scheduler.stopTimer(true)
    }, this.featureName, this.ee)

    // const tracerEE = this.ee.get('tracer') // used to get API-driven interactions

    registerHandler('newInteraction', (timestamp, trigger) => this.startAnInteraction(trigger, timestamp), this.featureName, this.ee)
    registerHandler('newURL', (timestamp, url) => {
      this.interactionInProgress?.updateHistory(timestamp, url)
      if (this.interactionInProgress?.seenHistoryAndDomChange) this.interactionInProgressFinished()
    }, this.featureName, this.ee)
    registerHandler('newDom', timestamp => {
      this.interactionInProgress?.updateDom(timestamp)
      if (this.interactionInProgress?.seenHistoryAndDomChange) this.interactionInProgressFinished()
    }, this.featureName, this.ee)

    registerHandler('ajax', this.#handleAjaxEvent.bind(this), this.featureName, this.ee)

    this.drain()
  }

  onHarvestStarted (options) {
    if (this.interactionsToHarvest.length === 0 || this.blocked) return

    const serializedIxnList = this.interactionsToHarvest.map(interaction => interaction.serialize())
    const payload = `bel.7;${serializedIxnList.join(';')}`

    if (options.retry) this.interactionsAwaitingRetry.push(...this.interactionsToHarvest)
    this.interactionsToHarvest = []

    return { body: { e: payload } }
  }

  onHarvestFinished (result) {
    if (result.sent && result.retry && this.interactionsAwaitingRetry.length > 0) {
      this.interactionsToHarvest = [...this.interactionsAwaitingRetry, ...this.interactionsToHarvest]
      this.interactionsAwaitingRetry = []
    }
  }

  startAnInteraction (eventName, startedAt) { // this is throttled by instrumentation so that it isn't excessively called
    this.interactionInProgress?.cancel()

    this.interactionInProgress = new Interaction(this.agentIdentifier, eventName, startedAt)
    this.interactionInProgress.on('cancelled', () => (this.interactionInProgress = null)) // since the ixn can be cancelled on its own
  }

  interactionInProgressFinished () {
    this.interactionInProgress.finish()
    this.interactionsToHarvest.push(this.interactionInProgress)
    this.interactionInProgress = null
  }

  /**
   * Find the active interaction (current or past) for a given timestamp. Note that historic lookups mostly only go as far back as the last harvest for this feature.
   * Also, the caller should check the status of the interaction returned if found via {@link Interaction.status}, if that's pertinent.
   * Cancelled (status) interactions are NOT returned!
   * @param {DOMHighResTimeStamp} timestamp
   * @returns An {@link Interaction} or undefined, if no active interaction was found.
   */
  getInteractionFor (timestamp) {
    if (this.interactionInProgress?.isActiveDuring(timestamp)) return this.interactionInProgress
    /* In the sole case wherein there can be two "interactions" overlapping (initialPageLoad + regular route-change),
      the regular interaction should get precedence in being assigned the "active" interaction in regards to our one-at-a-time model.
      Hence, in case the initialPageLoad is pending harvest, we reverse search for the latest completed interaction since iPL is always added first.
    */
    for (let idx = this.interactionsToHarvest.length - 1; idx >= 0; idx--) {
      const finishedInteraction = this.interactionsToHarvest[idx]
      if (finishedInteraction.isActiveDuring(timestamp)) return finishedInteraction
    }
    // Time must be when no interaction is happening, so return undefined.
  }

  /**
   * Handles or redirect ajax events based on the interaction, if any, that it's tied to.
   * @param {Object} event see Ajax feature's storeXhr function for object definition
   */
  #handleAjaxEvent (event) {
    const associatedInteraction = this.getInteractionFor(event.startTime)
    if (!associatedInteraction) { // no interaction was happening when this ajax started, so give it back to Ajax feature for processing
      handle('returnAjax', [event], undefined, FEATURE_NAMES.ajax, this.ee)
    } else {
      if (associatedInteraction.status === INTERACTION_STATUS.FIN) processAjax(event, associatedInteraction) // tack ajax onto the ixn object awaiting harvest
      else { // same thing as above, just at a later time -- if the interaction in progress is cancelled, just send the event back to ajax feat unmodified
        associatedInteraction.on('finished', () => processAjax(event, associatedInteraction))
        associatedInteraction.on('cancelled', () => handle('returnAjax', [event], undefined, FEATURE_NAMES.ajax, this.ee))
      }
    }

    function processAjax (event, parentInteraction) {
      const newNode = new AjaxNode(event)
      parentInteraction.addChild(newNode)
    }
  }
}
