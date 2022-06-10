/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { registerHandler as register } from '../../../common/event-emitter/register-handler'
import { parseUrl } from '../../../common/url/parse-url'
import { shouldCollectEvent } from '../../../common/deny-list/deny-list'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { Serializer } from './serializer'
import { mapOwn } from '../../../common/util/map-own'
import { navTimingValues as navTiming } from '../../../common/timing/nav-timing'
import { generateUuid } from '../../../common/ids/unique-id'
import { metrics as paintMetrics } from '../../../../../agent/paint-metrics'
import { Interaction } from './Interaction'
import { getConfigurationValue, getRuntime, originals } from '../../../common/config/config'
import { eventListenerOpts } from '../../../common/event-listener/event-listener-opts'
import { FeatureBase } from '../../../common/util/feature-base'

var INTERACTION_EVENTS = [
  'click',
  'submit',
  'keypress',
  'keydown',
  'keyup',
  'change'
]

var MAX_TIMER_BUDGET = 999
var FN_START = 'fn-start'
var FN_END = 'fn-end'
var CB_START = 'cb-start'
var INTERACTION_API = 'api-ixn-'
var REMAINING = 'remaining'
var INTERACTION = 'interaction'
var SPA_NODE = 'spaNode'
var JSONP_NODE = 'jsonpNode'
var FETCH_START = 'fetch-start'
var FETCH_DONE = 'fetch-done'
var FETCH_BODY = 'fetch-body-'
var JSONP_END = 'jsonp-end'

var originalSetTimeout = originals.ST

export class Aggregate extends FeatureBase {
  constructor(agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator)

    this.serializer = new Serializer(this)

    this.initialPageURL = getRuntime(this.agentIdentifier).origin
    this.lastSeenUrl = this.initialPageURL
    this.lastSeenRouteName = null

    this.timerMap = {}
    this.timerBudget = MAX_TIMER_BUDGET
    this.currentNode = null
    this.prevNode = null
    this.nodeOnLastHashUpdate = null
    this.initialPageLoad = null
    this.pageLoaded = false
    this.childTime = 0
    this.depth = 0

    this.baseEE = this.ee
    this.mutationEE = this.baseEE.get('mutation')
    this.promiseEE = this.baseEE.get('promise')
    this.historyEE = this.baseEE.get('history')
    this.eventsEE = this.baseEE.get('events')
    this.timerEE = this.baseEE.get('timer')
    this.fetchEE = this.baseEE.get('fetch')
    this.jsonpEE = this.baseEE.get('jsonp')
    this.xhrEE = this.baseEE.get('xhr')
    this.tracerEE = this.baseEE.get('tracer')

    this.harvestTimeSeconds = getConfigurationValue(this.agentIdentifier, 'spa.harvestTimeSeconds') || 10
    this.interactionsToHarvest = []
    this.interactionsSent = []

    this.scheduler = new HarvestScheduler('events', { 
      onFinished: (...args) => this.onHarvestFinished(...args), 
      retryDelay: this.harvestTimeSeconds 
    }, this)
    this.scheduler.harvest.on('events', (...args) => this.onHarvestStarted(...args))

    // childTime is used when calculating exclusive time for a cb duration.
    //
    // Exclusive time will be different than the total time for either callbacks
    // which synchronously invoke a customTracer callback or, trigger a synchronous
    // event (eg. onreadystate=1 or popstate).
    //
    // At fn-end, childTime will contain the total time of all timed callbacks and
    // event handlers which executed as a child of the current callback. At the
    // begining of every callback, childTime is saved to the event context (which at
    // that time contains the sum of its preceeding siblings) and is reset to 0. The
    // callback is then executed, and its children may increase childTime.  At the
    // end of the callback, it reports its exclusive time as its
    // execution time - exlcuded. childTime is then reset to its previous
    // value, and the totalTime of the callback that just finished executing is
    // added to the childTime time.
    //                                    | clock | childTime | ctx.ct | totalTime | exclusive |
    // click fn-start                     |   0   |    0     |    0   |           |           |
    //  | click begining:                 |   5   |    0     |    0   |           |           |
    //  |   | custom-1 fn-start           |   10  |    0     |    0   |           |           |
    //  |   |   |  custom-1 begining      |   15  |    0     |    0   |           |           |
    //  |   |   |    |  custom-2 fn-start |   20  |    0     |    0   |           |           |
    //  |   |   |    |  | custom-2        |   25  |    0     |    0   |           |           |
    //  |   |   |    |  custom-2 fn-end   |   30  |    10    |    0   |     10    |     10    |
    //  |   |   |  custom-1 middle        |   35  |    10    |    0   |           |           |
    //  |   |   |    |  custom-3 fn-start |   40  |    0     |    10  |           |           |
    //  |   |   |    |  | custom-3        |   45  |    0     |    10  |           |           |
    //  |   |   |    |  custom-3 fn-end   |   50  |    20    |    0   |     10    |     10    |
    //  |   |   |  custom-1 ending        |   55  |    20    |    0   |           |           |
    //  |     custom-1 fn-end             |   60  |    50    |    0   |     50    |     30    |
    //  | click ending:                   |   65  |    50    |        |           |           |
    // click fn-end                       |   70  |    0     |    0   |     70    |     20    |

    this.baseEE.on('feat-spa', () => {
      if (!this.isEnabled()) return

      this.initialPageLoad = new Interaction('initialPageLoad', 0, this.lastSeenUrl, this.lastSeenRouteName, (...args) => this.onInteractionFinished(...args), this)
      this.initialPageLoad.save = true
      this.currentNode = initialPageLoad.root // hint
      // ensure that checkFinish calls are safe during initialPageLoad
      this.initialPageLoad[REMAINING]++

      register.on(this.baseEE, FN_START, (...args) => this.callbackStart(...args))
      register.on(this.promiseEE, CB_START, (...args) => this.callbackStart(...args))

      // register plugins
      var pluginApi = {
        getCurrentNode: (...args) => this.getCurrentNode(...args),
        setCurrentNode: (...args) => this.setCurrentNode(...args)
      }

      register('spa-register', (init) => {
        if (typeof init === 'function') {
          init(pluginApi)
        }
      }, undefined, this.baseEE)


      register.on(this.baseEE, FN_END, (...args) => this.callbackEnd(...args))
      register.on(this.promiseEE, 'cb-end', (...args) => this.callbackEnd(...args))
      register.on(this.eventsEE, FN_START, (...args) => this.eventsEEStart(...args))

      /**
       * *** TIMERS ***
       * setTimeout call needs to keep the interaction active in case a node is started
       * in its callback.
       */

      // The context supplied to this callback will be shared with the fn-start/fn-end
      // callbacks that fire around the callback passed to setTimeout originally.
      register.on(this.timerEE, 'setTimeout-end', (...args) => this.saveId(...args))
      register.on(this.timerEE, 'clearTimeout-start', (...args) => this.clear(...args))
      register.on(this.timerEE, FN_START, (...args) => this.timerStart(...args))

      /**
       * *** XHR ***
       * - `new-xhr` event is fired when new instance of XHR is created. Here we create
       *    a new node and store it on the XHR object.
       * -  When the send method is called (`send-xhr-start` event), we tell the interaction
       *    to wait for this XHR to complete.
       * -  When any direct event handlers are invoked (`fn-start` on the `xhr` emitter),
       *    we restore the node in case other child nodes are started here.
       * -  Callbacks attached using `addEventListener` are handled using `fn-start` on the
       *    `events` emitter.
       * -  When `xhr-resolved` is emitted, we end the node. The node.finish() call also
       *    instructs the interaction to stop waiting for this node.
       */

      // context is shared with new-xhr event, and is stored on the xhr iteself.
      register.on(this.xhrEE, FN_START,(...args) =>  this.xhrStart(...args))
      // context is stored on the xhr and is shared with all callbacks associated
      // with the new xhr
      register.on(this.xhrEE, 'new-xhr', (...args) => this.xhrNew(...args))
      register.on(this.xhrEE, 'send-xhr-start', (...args) => this.xhrSend(...args))
      register.on(this.baseEE, 'xhr-resolved', (...args) => this.xhrResolved(...args))

      /**
       * *** JSONP ***
       *
       */
      register.on(this.jsonpEE, 'new-jsonp', (...args) => this.jsonPNew(...args))
      register.on(this.jsonpEE, 'cb-start', (...args) => this.jsonPStart(...args))
      register.on(this.jsonpEE, 'jsonp-error', (...args) => this.jsonPError(...args))
      register.on(this.jsonpEE, JSONP_END, (...args) => this.jsonPEnd(...args))
      /**
       * *** fetch ***
       *
       */
      register.on(this.fetchEE, FETCH_START, (...args) => this.fetchStart(...args))
      register.on(this.fetchEE, FETCH_BODY + 'start', (...args) => this.fetchBodyStart(...args))
      register.on(this.fetchEE, FETCH_BODY + 'end', (...args) => this.fetchBodyEnd(...args))
      register.on(this.fetchEE, FETCH_DONE, (...args) => this.fetchDone(...args))
      /**
       * *** history ***
       *
       */
      register.on(this.historyEE, 'newURL', (...args) => this.historyNew(...args))

      /**
       * SCRIPTS
       *   This is only needed to keep the interaction open while external scripts are being loaded.
       *   The script that is loaded could continue the interaction by making additional AJAX
       *   calls or changing the URL. The interaction context (currentNode) needs to be
       *   restored somehow, but this differs based on the specific customer code. In some cases, we
       *   could wrap a JSONP callback, in other cases we could wrap a higher-level API, and in
       *   some cases we may not be able to restore context automatically (customer would need
       *   to instrument their code manually).
       *
       * - We do not restore the original context in the load/error callbacks. This would not
       *   work for the scripts themselves because by the time the load event fires, the
       *   script content has already been executed.
       */

      // dom-start is emitted when appendChild or replaceChild are called. If the element being
      // inserted is script and we are inside an interaction, we will keep the interaction open
      // until the script is loaded.
      this.jsonpEE.on('dom-start', (...args) => this.jsonPDomStart(...args))

      register.on(this.mutationEE, FN_START, (...args) => this.mutationStart(...args))

      register.on(this.promiseEE, 'resolve-start', (...args) => this.resolvePromise(...args))
      register.on(this.promiseEE, 'executor-err', (...args) => this.resolvePromise(...args))
      register.on(this.promiseEE, 'propagate', (...args) => this.saveNode(...args))
      register.on(this.promiseEE, CB_START, (...args) => this.promiseCbStart(...args))

      register(INTERACTION_API + 'get', (...args) => this.interactionGet(...args), undefined, this.baseEE)
      register(INTERACTION_API + 'actionText', (...args) => this.interactionActionText(...args), undefined, this.baseEE)
      register(INTERACTION_API + 'setName', (...args) => this.interactionSetName(...args), undefined, this.baseEE)
      register(INTERACTION_API + 'setAttribute', (...args) => this.interactionSetAttribute(...args), undefined, this.baseEE)
      register(INTERACTION_API + 'end', (...args) => this.interactionEnd(...args), undefined, this.baseEE)
      register(INTERACTION_API + 'ignore', (...args) => this.interactionIgnore(...args), undefined, this.baseEE)
      register(INTERACTION_API + 'save', (...args) => this.interactionSave(...args), undefined, this.baseEE)
      register(INTERACTION_API + 'tracer', (...args) => this.interactionTracer(...args), undefined, this.baseEE)
      register(INTERACTION_API + 'getContext', (...args) => this.interactionGetContext(...args), undefined, this.baseEE)
      register(INTERACTION_API + 'onEnd', (...args) => this.interactionOnEnd(...args), undefined, this.baseEE)

      register.on(this.tracerEE, FN_START, (...args) => this.tracerDone(...args))
      register.on(this.tracerEE, 'no-' + FN_START, (...args) => this.tracerDone(...args))

      register('api-routeName', (...args) => this.apiRouteName(...args), undefined, this.baseEE)
    })

    this.baseEE.on('errorAgg', (...args) => this.onErrAgg(...args))
    this.baseEE.on('interaction',(...args) =>  this.saveInteraction(...args))
  }

  callbackStart() {
    this.depth++
    this.prevNode = currentNode
    this.ct = childTime
    this.childTime = 0
    this.timerBudget = MAX_TIMER_BUDGET
  }

  callbackEnd() {
    this.depth--
    var totalTime = this.jsTime || 0
    var exclusiveTime = totalTime - this.childTime
    this.childTime = this.ct + totalTime
    if (this.currentNode) {
      // transfer accumulated callback time to the active interaction node
      // run even if jsTime is 0 to update jsEnd
      this.currentNode.callback(exclusiveTime, this[FN_END])
      if (this.isTraced) {
        this.currentNode.attrs.tracedTime = exclusiveTime
      }
    }

    this.jsTime = currentNode ? 0 : exclusiveTime
    this.setCurrentNode(this.prevNode)
    this.prevNode = null
    timerBudget = MAX_TIMER_BUDGET
  }

  onErrAgg(type, name, params, metrics) {
    if (!this.currentNode) return
    params._interactionId = this.currentNode.interaction.id
    // do not capture parentNodeId when in root node
    if (this.currentNode.type && this.currentNode.type !== 'interaction') {
      params._interactionNodeId = this.currentNode.id
    }
  }

  activeNodeFor(interaction) {
    return (this.currentNode && this.currentNode[INTERACTION] === interaction) ? this.currentNode : interaction.root
  }

  tracerDone(timestamp, interactionContext, hasCb) {
    var node = this[SPA_NODE]
    if (!node) return
    var interaction = node[INTERACTION]
    var inc = this.inc
    this.isTraced = true
    if (inc) {
      interaction[REMAINING]--
    } else if (node) {
      node.finish(timestamp)
    }
    hasCb ? this.setCurrentNode(node) : interaction.checkFinish(lastSeenUrl, lastSeenRouteName)
  }

  apiRouteName(t, currentRouteName) {
    this.lastSeenRouteName = currentRouteName
  }

  interactionOnEnd(t, cb) {
    this.ixn.handlers.push(cb)
  }

  interactionGetContext(t, cb) {
    var store = this.ixn.root.attrs.store
    setTimeout(function () {
      cb(store)
    }, 0)
  }

  interactionTracer(timestamp, name, store) {
    var interaction = this.ixn
    var parent = this.activeNodeFor(interaction)
    var ctx = this.baseEE.context(store)
    if (!name) {
      ctx.inc = ++interaction[REMAINING]
      return (ctx[SPA_NODE] = parent)
    }
    ctx[SPA_NODE] = parent.child('customTracer', timestamp, name)
  }

  interactionSave() {
    this.ixn.save = true
  }

  interactionIgnore() {
    this.ixn.ignored = true
  }

  interactionEnd(timestamp) {
    var interaction = this.ixn
    var node = this.activeNodeFor(interaction)
    this.setCurrentNode(null)
    node.child('customEnd', timestamp).finish(timestamp)
    interaction.finish()
  }

  interactionSetAttribute(t, name, value) {
    this.ixn.root.attrs.custom[name] = value
  }

  interactionSetName(t, name, trigger) {
    var attrs = this.ixn.root.attrs
    if (name) attrs.customName = name
    if (trigger) attrs.trigger = trigger
  }

  interactionActionText(t, actionText) {
    var customAttrs = this.ixn.root.attrs.custom
    if (actionText) customAttrs.actionText = actionText
  }

  interactionGet(t) {
    var interaction = this.ixn = this.currentNode ? this.currentNode[INTERACTION] : new Interaction('api', t, this.lastSeenUrl, this.lastSeenRouteName, (...args) => this.onInteractionFinished(...args), this)

    if (!this.currentNode) {
      interaction.checkFinish(lastSeenUrl, lastSeenRouteName)
      if (this.depth) this.setCurrentNode(interaction.root)
    }
  }

  promiseCbStart() {
    var ctx = this.getCtx ? this.getCtx() : this
    this.setCurrentNode(ctx[SPA_NODE])
  }

  mutationStart() {
    this.setCurrentNode(this.prevNode)
  }

  jsonPDomStart(args) {
    if (!this.currentNode) return

    var el = args[0]
    var isScript = (el && el.nodeName === 'SCRIPT' && el.src !== '')
    var interaction = this.currentNode.interaction

    if (isScript) {
      // increase remaining count to keep the interaction open
      interaction[REMAINING]++
      el.addEventListener('load', () => onload(), eventListenerOpts(false))
      el.addEventListener('error', () => onerror(), eventListenerOpts(false))
    }

    function onload() {
      // decrease remaining to allow interaction to finish
      interaction[REMAINING]--

      // checkFinish is what initiates closing interaction, but is only called
      // when setCurrentNode is called. Since we are not restoring a node here,
      // we need to initiate the check manually.
      // The reason we are not restoring the node here is because 1) this is not
      // where the code of the external script runs (by the time the load event
      // fires, it has already executed), and 2) it would require storing the context
      // probably on the DOM node and restoring in all callbacks, which is a different
      // use case than lazy loading.
      interaction.checkFinish(this.lastSeenUrl, this.lastSeenRouteName)
    }

    function onerror() {
      interaction[REMAINING]--
      interaction.checkFinish(this.lastSeenUrl, this.lastSeenRouteName)
    }
  }

  historyNew(url, hashChangedDuringCb) {
    if (this.currentNode) {
      if (this.lastSeenUrl !== url) {
        this.currentNode[INTERACTION].routeChange = true
      }
      if (hashChangedDuringCb) {
        this.nodeOnLastHashUpdate = currentNode
      }
    }

    this.lastSeenUrl = url
  }

  fetchDone(err, res) {
    var node = this[SPA_NODE]
    if (node) {
      if (err) {
        node.cancel()
        return
      }

      var attrs = node.attrs
      attrs.params = this.params
      attrs.metrics = {
        txSize: this.txSize,
        rxSize: this.rxSize
      }
      attrs.isFetch = true

      node.finish(this[FETCH_DONE])
    }
  }

  fetchBodyEnd(args, ctx, bodyPromise) {
    var node = this[SPA_NODE]
    if (node) {
      node[INTERACTION][REMAINING]--
    }
  }

  fetchBodyStart(args) {
    if (this.currentNode) {
      this[SPA_NODE] = this.currentNode
      currentNode[INTERACTION][REMAINING]++
    }
  }

  fetchStart(fetchArguments, dtPayload) {
    if (this.currentNode && fetchArguments) {
      this[SPA_NODE] = this.currentNode.child('ajax', this[FETCH_START])
      if (dtPayload && this[SPA_NODE]) this[SPA_NODE].dt = dtPayload
    }
  }

  jsonPEnd() {
    var node = this[JSONP_NODE]
    if (node) {
      // if no status is set then cb never fired - so it's not a valid JSONP
      if (this.status === null) {
        node.cancel()
        return
      }
      var attrs = node.attrs
      var params = attrs.params = {}

      var parsed = parseUrl(this.url)
      params.method = 'GET'
      params.pathname = parsed.pathname
      params.host = parsed.hostname + ':' + parsed.port
      params.status = this.status

      attrs.metrics = {
        txSize: 0,
        rxSize: 0
      }

      attrs.isJSONP = true
      node.jsEnd = this[JSONP_END]
      node.jsTime = this[CB_START] ? (this[JSONP_END] - this[CB_START]) : 0
      node.finish(node.jsEnd)
    }
  }

  jsonPError() {
    var node = this[JSONP_NODE]
    if (node) {
      this.setCurrentNode(node)
      this.status = 0
    }
  }

  jsonPStart(args) {
    var node = this[JSONP_NODE]
    if (node) {
      this.setCurrentNode(node)
      this.status = 200
    }
  }

  jsonPNew(url) {
    if (this.currentNode) {
      var node = this[JSONP_NODE] = this.currentNode.child('ajax', this[FETCH_START])
      node.start = this['new-jsonp']
      this.url = url
      this.status = null
    }
  }

  xhrResolved() {
    var node = this[SPA_NODE]
    if (node) {
      if (!shouldCollectEvent(this.params)) {
        node.cancel()
        return
      }

      var attrs = node.attrs
      attrs.params = this.params
      attrs.metrics = this.metrics

      node.finish(this.endTime)
    }
  }

  xhrSend() {
    var node = this[SPA_NODE]
    if (node && !this.sent) {
      this.sent = true
      node.dt = this.dt
      node.jsEnd = node.start = this.startTime
      node[INTERACTION][REMAINING]++
    }
  }

  xhrNew() {
    if (this.currentNode) {
      this[SPA_NODE] = this.currentNode.child('ajax', null, null, true)
    }
  }

  xhrStart() {
    this.setCurrentNode(this[SPA_NODE])
  }

  timerStart() {
    timerBudget = this.timerBudget || MAX_TIMER_BUDGET
    var id = this.timerId
    var node = this.timerMap[id]
    this.setCurrentNode(node)
    delete this.timerMap[id]
    if (node) {
      node[INTERACTION][REMAINING]--
    }
  }

  clear(args) {
    var timerId = args[0]
    var node = timerMap[timerId]
    if (node) {
      var interaction = node[INTERACTION]
      interaction[REMAINING]--
      interaction.checkFinish(lastSeenUrl, lastSeenRouteName)
      delete this.timerMap[timerId]
    }
  }

  saveId(args, obj, timerId) {
    if (!this.currentNode || (this.timerBudget - this.timerDuration) < 0) return
    if (args && !(args[0] instanceof Function)) return
    this.currentNode[INTERACTION][REMAINING]++
    this.timerId = timerId
    this.timerMap[this.timerId] = currentNode
    this.timerBudget = this.timerBudget - 50
  }

  eventsEEStart(args, eventSource) {
    var ev = args[0]
    var evName = ev.type
    var eventNode = ev.__nrNode

    if (!this.pageLoaded && evName === 'load' && eventSource === window) {
      this.pageLoaded = true
      // set to null so prevNode is set correctly
      this.prevNode = this.currentNode = null
      if (this.initialPageLoad) {
        eventNode = this.initialPageLoad.root
        this.initialPageLoad[REMAINING]--
        originalSetTimeout(() => {
          INTERACTION_EVENTS.push('popstate')
        })
      }
    }

    if (eventNode) {
      // If we've already seen a previous handler for this specific event object,
      // just restore that. We want multiple handlers for the same event to share
      // a node.
      this.setCurrentNode(eventNode)
    } else if (evName === 'hashchange') {
      this.setCurrentNode(nodeOnLastHashUpdate)
      this.nodeOnLastHashUpdate = null
    } else if (eventSource instanceof XMLHttpRequest) {
      // If this event was emitted by an XHR, restore the node ID associated with
      // that XHR.
      this.setCurrentNode(this.baseEE.context(eventSource).spaNode)
    } else if (!this.currentNode) {
      // Otherwise, if no interaction is currently active, create a new node ID,
      // and let the aggregator know that we entered a new event handler callback
      // so that it has a chance to possibly start an interaction.
      if (INTERACTION_EVENTS.indexOf(evName) !== -1) {
        var ixn = new Interaction(evName, this[FN_START], this.lastSeenUrl, this.lastSeenRouteName, (...args) => this.onInteractionFinished(...args), this)
        this.setCurrentNode(ixn.root)

        if (evName === 'click') {
          var value = this.getActionText(ev.target)
          if (value) {
            this.currentNode.attrs.custom['actionText'] = value
          }
        }
        // @ifdef SPA_DEBUG
        console.timeStamp('start interaction, ID=' + currentNode.id + ', evt=' + evName)
        // @endif
      }
    }

    ev.__nrNode = currentNode
  }

  saveNode(val, overwrite) {
    if (overwrite || !this[SPA_NODE]) this[SPA_NODE] = this.currentNode
  }

  resolvePromise() {
    if (!this.resolved) {
      this.resolved = true
      this[SPA_NODE] = this.currentNode
    }
  }

  getCurrentNode() {
    return this.currentNode
  }

  setCurrentNode(newNode) {
    if (!this.pageLoaded && !newNode && this.initialPageLoad) newNode = this.initialPageLoad.root
    if (this.currentNode) {
      this.currentNode[INTERACTION].checkFinish(this.lastSeenUrl, this.lastSeenRouteName)
    }

    this.prevNode = this.currentNode
    this.currentNode = (newNode && !newNode[INTERACTION].root.end) ? newNode : null
  }

  onInteractionFinished(interaction) {
    if (interaction === this.initialPageLoad) this.initialPageLoad = null

    var root = this.interaction.root
    var attrs = root.attrs

    // make sure that newrelic[INTERACTION]() works in end handler
    this.currentNode = root
    mapOwn(interaction.handlers, (i, cb) => {
      cb(attrs.store)
    })
    this.setCurrentNode(null)
  }

  onHarvestStarted(options) {
    if (this.interactionsToHarvest.length === 0) return {}
    var payload = this.serializer.serializeMultiple(this.interactionsToHarvest, 0, navTiming)

    if (options.retry) {
      this.interactionsToHarvest.forEach((interaction) => {
        this.interactionsSent.push(interaction)
      })
    }
    this.interactionsToHarvest = []

    return { body: { e: payload } }
  }

  onHarvestFinished(result) {
    if (result.sent && result.retry && this.interactionsSent.length > 0) {
      this.interactionsSent.forEach((interaction) => {
        this.interactionsToHarvest.push(interaction)
      })
      this.interactionsSent = []
    }
  }

  getActionText(node) {
    var nodeType = node.tagName.toLowerCase()
    var goodNodeTypes = ['a', 'button', 'input']
    var isGoodNode = goodNodeTypes.indexOf(nodeType) !== -1
    if (isGoodNode) {
      return node.title || node.value || node.innerText
    }
  }

  saveInteraction(interaction) {
    if (interaction.ignored || (!interaction.save && !interaction.routeChange)) {
      this.baseEE.emit('interactionDiscarded', [interaction])
      return
    }

    // assign unique id, this is serialized and used to link interactions with errors
    interaction.root.attrs.id = generateUuid()

    if (interaction.root.attrs.trigger === 'initialPageLoad') {
      interaction.root.attrs.firstPaint = paintMetrics['first-paint']
      interaction.root.attrs.firstContentfulPaint = paintMetrics['first-contentful-paint']
    }
    this.baseEE.emit('interactionSaved', [interaction])
    this.interactionsToHarvest.push(interaction)
    this.scheduler.scheduleHarvest(0)
  }

  isEnabled() {
    var configuration = getConfigurationValue(this.agentIdentifier, 'spa')
    if (configuration && configuration.enabled === false) {
      return false
    }
    return true
  }

}
// module.exports = function () {
//   return currentNode && currentNode.id
// }



