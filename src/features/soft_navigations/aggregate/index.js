/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { handle } from '../../../common/event-emitter/handle'
import { registerHandler } from '../../../common/event-emitter/register-handler'
import { single } from '../../../common/util/invoke'
import { timeToFirstByte } from '../../../common/vitals/time-to-first-byte'
import { FEATURE_NAMES } from '../../../loaders/features/features'
import { AggregateBase } from '../../utils/aggregate-base'
import { API_TRIGGER_NAME, FEATURE_NAME, INTERACTION_STATUS, INTERACTION_TRIGGERS, IPL_TRIGGER_NAME } from '../constants'
import { AjaxNode } from './ajax-node'
import { InitialPageLoadInteraction } from './initial-page-load-interaction'
import { Interaction } from './interaction'

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME
  constructor (agentRef, { domObserver }) {
    super(agentRef, FEATURE_NAME)

    this.interactionsToHarvest = this.events
    this.domObserver = domObserver

    this.initialPageLoadInteraction = new InitialPageLoadInteraction(agentRef.agentIdentifier)
    this.initialPageLoadInteraction.onDone.push(() => { // this ensures the .end() method also works with iPL
      if (agentRef.runtime.session?.isNew) this.initialPageLoadInteraction.customAttributes.isFirstOfSession = true // mark the hard page load as first of its session
      this.initialPageLoadInteraction.forceSave = true // unless forcibly ignored, iPL always finish by default
      this.interactionsToHarvest.add(this.initialPageLoadInteraction)
      this.initialPageLoadInteraction = null
    })
    timeToFirstByte.subscribe(({ attrs }) => {
      const loadEventTime = attrs.navigationEntry.loadEventEnd
      this.initialPageLoadInteraction.done(loadEventTime)
      // Report metric on the initial page load time
      this.reportSupportabilityMetric('SoftNav/Interaction/InitialPageLoad/Duration/Ms', Math.round(loadEventTime))
    })

    this.latestRouteSetByApi = null
    this.interactionInProgress = null // aside from the "page load" interaction, there can only ever be 1 ongoing at a time
    this.latestHistoryUrl = null
    this.harvestOpts.beforeUnload = () => this.interactionInProgress?.done() // return any withheld ajax or jserr events so they can be sent with EoL harvest

    this.waitForFlags(['spa']).then(([spaOn]) => {
      if (spaOn) {
        this.drain()
        setTimeout(() => agentRef.runtime.harvester.triggerHarvestFor(this), 0) // send the IPL ixn on next tick, giving some time for any ajax to finish; we may want to just remove this?
      } else {
        this.blocked = true // if rum response determines that customer lacks entitlements for spa endpoint, this feature shouldn't harvest
        this.deregisterDrain()
      }
    })

    // By default, a complete UI driven interaction requires event -> URL change -> DOM mod in that exact order.
    registerHandler('newUIEvent', (event) => this.startUIInteraction(event.type, Math.floor(event.timeStamp), event.target), this.featureName, this.ee)
    registerHandler('newURL', (timestamp, url) => {
      // In the case of 'popstate' trigger, by the time the event fires, the URL has already changed, so we need to store what-will-be the *previous* URL for oldURL of next popstate ixn.
      this.latestHistoryUrl = url
      this.interactionInProgress?.updateHistory(timestamp, url)
    }, this.featureName, this.ee)
    registerHandler('newDom', timestamp => {
      this.interactionInProgress?.updateDom(timestamp)
      if (this.interactionInProgress?.seenHistoryAndDomChange()) this.interactionInProgress.done()
    }, this.featureName, this.ee)

    this.#registerApiHandlers()

    registerHandler('ajax', this.#handleAjaxEvent.bind(this), this.featureName, this.ee)
    registerHandler('jserror', this.#handleJserror.bind(this), this.featureName, this.ee)
  }

  serializer (eventBuffer) {
    // The payload depacker takes the first ixn of a payload (if there are multiple ixns) and positively offset the subsequent ixns timestamps by that amount.
    // In order to accurately portray the real start & end times of the 2nd & onward ixns, we hence need to negatively offset their start timestamps with that of the 1st ixn.
    let firstIxnStartTime
    const serializedIxnList = []
    for (const interaction of eventBuffer) {
      serializedIxnList.push(interaction.serialize(firstIxnStartTime))
      if (firstIxnStartTime === undefined) firstIxnStartTime = Math.floor(interaction.start) // careful not to match or overwrite on 0 value!
    }
    return `bel.7;${serializedIxnList.join(';')}`
  }

  startUIInteraction (eventName, startedAt, sourceElem) { // this is throttled by instrumentation so that it isn't excessively called
    if (this.interactionInProgress?.createdByApi) return // api-started interactions cannot be disrupted aka cancelled by UI events (and the vice versa applies as well)
    if (this.interactionInProgress?.done() === false) return // current in-progress is blocked from closing, e.g. by 'waitForEnd' api option

    const oldURL = eventName === INTERACTION_TRIGGERS[3] ? this.latestHistoryUrl : undefined // see related comment in 'newURL' handler above, 'popstate'
    this.interactionInProgress = new Interaction(this.agentIdentifier, eventName, startedAt, this.latestRouteSetByApi, oldURL)

    if (eventName === INTERACTION_TRIGGERS[0]) { // 'click'
      const sourceElemText = getActionText(sourceElem)
      if (sourceElemText) this.interactionInProgress.customAttributes.actionText = sourceElemText
    }
    this.interactionInProgress.cancellationTimer = setTimeout(() => {
      this.interactionInProgress.done()
      // Report metric on frequency of cancellation due to timeout for UI ixn
      this.reportSupportabilityMetric('SoftNav/Interaction/TimeOut')
    }, 30000) // UI ixn are disregarded after 30 seconds if it's not completed by then
    this.setClosureHandlers()
  }

  setClosureHandlers () {
    this.interactionInProgress.on('finished', () => {
      const ref = this.interactionInProgress
      this.interactionsToHarvest.add(this.interactionInProgress)
      this.interactionInProgress = null
      this.domObserver.disconnect() // can stop observing whenever our interaction logic completes a cycle

      // Report metric on the ixn duration
      this.reportSupportabilityMetric(
        `SoftNav/Interaction/${ref.newURL !== ref.oldURL ? 'RouteChange' : 'Custom'}/Duration/Ms`,
        Math.round(ref.end - ref.start)
      )
    })
    this.interactionInProgress.on('cancelled', () => {
      this.interactionInProgress = null
      this.domObserver.disconnect()
    })
  }

  /**
   * Find the active interaction (current or past) for a given timestamp. Note that historic lookups mostly only go as far back as the last harvest for this feature.
   * Also, the caller should check the status of the interaction returned if found via {@link Interaction.status}, if that's pertinent.
   * TIP: Cancelled (status) interactions are NOT returned!
   * IMPORTANT: Finished interactions are in queue for next harvest! It's highly recommended that consumer logic be synchronous for safe reference.
   * @param {DOMHighResTimeStamp} timestamp
   * @returns An {@link Interaction} or undefined, if no active interaction was found.
   */
  getInteractionFor (timestamp) {
    /* In the sole case wherein there can be two "interactions" overlapping (initialPageLoad + regular route-change),
      the regular interaction should get precedence in being assigned the "active" interaction in regards to our one-at-a-time model.
    */
    if (this.interactionInProgress?.isActiveDuring(timestamp)) return this.interactionInProgress
    let saveIxn
    const interactionsBuffer = this.interactionsToHarvest.get(this.agentRef.mainAppKey)[0].data
    for (let idx = interactionsBuffer.length - 1; idx >= 0; idx--) { // reverse search for the latest completed interaction for efficiency
      const finishedInteraction = interactionsBuffer[idx]
      if (finishedInteraction.isActiveDuring(timestamp)) {
        if (finishedInteraction.trigger !== IPL_TRIGGER_NAME) return finishedInteraction
        // It's possible that a complete interaction occurs before page is fully loaded, so we need to consider if a route-change ixn may have overlapped this iPL
        else saveIxn = finishedInteraction
      }
    }
    if (saveIxn) return saveIxn // if an iPL was determined to be active and no route-change was found active for the same time, then iPL is deemed the one
    if (this.initialPageLoadInteraction?.isActiveDuring(timestamp)) return this.initialPageLoadInteraction // lowest precedence and also only if it's still in-progress
    // Time must be when no interaction is happening, so return undefined.
  }

  /**
   * Handles or redirect ajax event based on the interaction, if any, that it's tied to.
   * @param {Object} event see Ajax feature's storeXhr function for object definition
   */
  #handleAjaxEvent (event) {
    const associatedInteraction = this.getInteractionFor(event.startTime)
    if (!associatedInteraction) { // no interaction was happening when this ajax started, so give it back to Ajax feature for processing
      handle('returnAjax', [event], undefined, FEATURE_NAMES.ajax, this.ee)
    } else {
      if (associatedInteraction.status === INTERACTION_STATUS.FIN) processAjax(this.agentIdentifier, event, associatedInteraction) // tack ajax onto the ixn object awaiting harvest
      else { // same thing as above, just at a later time -- if the interaction in progress is cancelled, just send the event back to ajax feat unmodified
        associatedInteraction.on('finished', () => processAjax(this.agentIdentifier, event, associatedInteraction))
        associatedInteraction.on('cancelled', () => handle('returnAjax', [event], undefined, FEATURE_NAMES.ajax, this.ee))
      }
    }

    function processAjax (agentId, event, parentInteraction) {
      const newNode = new AjaxNode(agentId, event)
      parentInteraction.addChild(newNode)
    }
  }

  /**
   * Decorate the passed-in params obj with properties relating to any associated interaction at the time of the timestamp.
   * @param {Object} params reference to the local var instance in Jserrors feature's storeError
   * @param {DOMHighResTimeStamp} timestamp time the jserror occurred
   */
  #handleJserror (params, timestamp) {
    const associatedInteraction = this.getInteractionFor(timestamp)
    if (!associatedInteraction) return // do not need to decorate this jserror params

    // Whether the interaction is in-progress or already finished, the id will let jserror buffer it under its index, until it gets the next step instruction.
    params.browserInteractionId = associatedInteraction.id
    if (associatedInteraction.status === INTERACTION_STATUS.FIN) {
      // This information cannot be relayed back via handle() that flushes buffered errs because this is being called by a jserror's handle() per se and before the err is buffered.
      params._softNavFinished = true // instead, signal that this err can be processed right away without needing to be buffered aka wait for an in-progress ixn
      params._softNavAttributes = associatedInteraction.customAttributes
    } else {
      // These callbacks may be added multiple times for an ixn, but just a single run will deal with all jserrors associated with the interaction.
      // As such, be cautious not to use the params object since that's tied to one specific jserror and won't affect the rest of them.
      associatedInteraction.on('finished', single(() =>
        handle('softNavFlush', [associatedInteraction.id, true, associatedInteraction.customAttributes], undefined, FEATURE_NAMES.jserrors, this.ee)))
      associatedInteraction.on('cancelled', single(() =>
        handle('softNavFlush', [associatedInteraction.id, false, undefined], undefined, FEATURE_NAMES.jserrors, this.ee))) // don't take custom attrs from cancelled ixns
    }
  }

  #registerApiHandlers () {
    const INTERACTION_API = 'api-ixn-'
    const thisClass = this

    registerHandler(INTERACTION_API + 'get', function (time, { waitForEnd } = {}) {
      // In here, 'this' refers to the EventContext specific to per InteractionHandle instance spawned by each .interaction() api call.
      // Each api call aka IH instance would therefore retain a reference to either the in-progress interaction *at the time of the call* OR a new api-started interaction.
      this.associatedInteraction = thisClass.getInteractionFor(time)
      if (this.associatedInteraction?.trigger === IPL_TRIGGER_NAME) this.associatedInteraction = null // the api get-interaction method cannot target IPL
      if (!this.associatedInteraction) {
        // This new api-driven interaction will be the target of any subsequent .interaction() call, until it is closed by EITHER .end() OR the regular seenHistoryAndDomChange process.
        this.associatedInteraction = thisClass.interactionInProgress = new Interaction(thisClass.agentIdentifier, API_TRIGGER_NAME, time, thisClass.latestRouteSetByApi)
        thisClass.domObserver.observe(document.body, { attributes: true, childList: true, subtree: true, characterData: true }) // start observing for DOM changes like a regular UI-driven interaction
        thisClass.setClosureHandlers()
      }
      if (waitForEnd === true) this.associatedInteraction.keepOpenUntilEndApi = true
    }, thisClass.featureName, thisClass.ee)
    registerHandler(INTERACTION_API + 'end', function (timeNow) { this.associatedInteraction.done(timeNow) }, thisClass.featureName, thisClass.ee)
    registerHandler(INTERACTION_API + 'save', function () { this.associatedInteraction.forceSave = true }, thisClass.featureName, thisClass.ee)
    registerHandler(INTERACTION_API + 'ignore', function () { this.associatedInteraction.forceIgnore = true }, thisClass.featureName, thisClass.ee)

    registerHandler(INTERACTION_API + 'getContext', function (time, callback) {
      if (typeof callback !== 'function') return
      setTimeout(() => callback(this.associatedInteraction.customDataByApi), 0)
    }, thisClass.featureName, thisClass.ee)
    registerHandler(INTERACTION_API + 'onEnd', function (time, callback) {
      if (typeof callback !== 'function') return
      this.associatedInteraction.onDone.push(callback)
    }, thisClass.featureName, thisClass.ee)

    registerHandler(INTERACTION_API + 'actionText', function (time, newActionText) {
      if (newActionText) this.associatedInteraction.customAttributes.actionText = newActionText
    }, thisClass.featureName, thisClass.ee)
    registerHandler(INTERACTION_API + 'setName', function (time, name, trigger) {
      if (name) this.associatedInteraction.customName = name
      if (trigger) this.associatedInteraction.trigger = trigger
    }, thisClass.featureName, thisClass.ee)
    registerHandler(INTERACTION_API + 'setAttribute', function (time, key, value) { this.associatedInteraction.customAttributes[key] = value }, thisClass.featureName, thisClass.ee)

    registerHandler(INTERACTION_API + 'routeName', function (time, newRouteName) { // notice that this fn tampers with the ixn IP, not with the linked ixn
      thisClass.latestRouteSetByApi = newRouteName
      if (thisClass.interactionInProgress) thisClass.interactionInProgress.newRoute = newRouteName
    }, thisClass.featureName, thisClass.ee)
  }
}

function getActionText (elem) {
  const tagName = elem.tagName.toLowerCase()
  const elementsOfInterest = ['a', 'button', 'input']
  if (elementsOfInterest.includes(tagName)) {
    return elem.title || elem.value || elem.innerText
  }
}
