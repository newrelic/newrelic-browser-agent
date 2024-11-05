/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
/* eslint no-undef: "error" */
import { registerHandler as register } from '../../../common/event-emitter/register-handler'
import { parseUrl } from '../../../common/url/parse-url'
import { shouldCollectEvent } from '../../../common/deny-list/deny-list'
import { navTimingValues as navTiming } from '../../../common/timing/nav-timing'
import { generateUuid } from '../../../common/ids/unique-id'
import { Interaction } from './interaction'
import { eventListenerOpts } from '../../../common/event-listener/event-listener-opts'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { Serializer } from './serializer'
import { ee } from '../../../common/event-emitter/contextual-ee'
import * as CONSTANTS from '../constants'
import { FEATURE_NAMES, FEATURE_TO_ENDPOINT } from '../../../loaders/features/features'
import { AggregateBase } from '../../utils/aggregate-base'
import { firstContentfulPaint } from '../../../common/vitals/first-contentful-paint'
import { firstPaint } from '../../../common/vitals/first-paint'
import { bundleId } from '../../../common/ids/bundle-id'
import { loadedAsDeferredBrowserScript } from '../../../common/constants/runtime'
import { handle } from '../../../common/event-emitter/handle'
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../metrics/constants'
import { warn } from '../../../common/util/console'

const {
  FEATURE_NAME, INTERACTION_EVENTS, MAX_TIMER_BUDGET, FN_START, FN_END, CB_START, INTERACTION_API, REMAINING,
  INTERACTION, SPA_NODE, JSONP_NODE, FETCH_START, FETCH_DONE, FETCH_BODY, JSONP_END, originalSetTimeout
} = CONSTANTS
export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME
  constructor (agentRef) {
    super(agentRef, FEATURE_NAME)

    const state = this.state = {
      initialPageURL: agentRef.runtime.origin,
      lastSeenUrl: agentRef.runtime.origin,
      lastSeenRouteName: null,
      timerMap: {},
      timerBudget: MAX_TIMER_BUDGET,
      currentNode: null,
      prevNode: null,
      nodeOnLastHashUpdate: null,
      initialPageLoad: null,
      pageLoaded: false,
      childTime: 0,
      depth: 0,
      harvestTimeSeconds: agentRef.init.spa.harvestTimeSeconds || 10,
      // The below feature flag is used to disable the SPA ajax fix for specific customers, see https://new-relic.atlassian.net/browse/NR-172169
      disableSpaFix: (agentRef.init.feature_flags || []).indexOf('disable-spa-fix') > -1
    }
    this.spaSerializerClass = new Serializer(this)

    const classThis = this
    let scheduler

    const baseEE = ee.get(agentRef.agentIdentifier) // <-- parent baseEE
    const mutationEE = baseEE.get('mutation')
    const promiseEE = baseEE.get('promise')
    const historyEE = baseEE.get('history')
    const eventsEE = baseEE.get('events') // ajax --> ee(123).emit() ee()
    const timerEE = baseEE.get('timer')
    const fetchEE = baseEE.get('fetch')
    const jsonpEE = baseEE.get('jsonp')
    const xhrEE = baseEE.get('xhr')
    const tracerEE = baseEE.get('tracer')

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

    this.waitForFlags((['spa'])).then(([spaFlag]) => {
      if (spaFlag) {
        scheduler = new HarvestScheduler(FEATURE_TO_ENDPOINT[this.featureName], {
          onFinished: (result) => this.postHarvestCleanup(result.sent && result.retry),
          retryDelay: state.harvestTimeSeconds
        }, this)
        scheduler.harvest.on(FEATURE_TO_ENDPOINT[this.featureName], (options) => this.makeHarvestPayload(options.retry))
        this.drain()
      } else {
        this.blocked = true
        this.deregisterDrain()
      }
    })

    if (agentRef.init.spa.enabled !== true) return

    state.initialPageLoad = new Interaction('initialPageLoad', 0, state.lastSeenUrl, state.lastSeenRouteName, onInteractionFinished, agentRef.agentIdentifier)
    state.initialPageLoad.save = true
    state.prevInteraction = state.initialPageLoad
    state.currentNode = state.initialPageLoad.root // hint
    // ensure that checkFinish calls are safe during initialPageLoad
    state.initialPageLoad[REMAINING]++

    register(FN_START, callbackStart, this.featureName, baseEE)
    register(CB_START, callbackStart, this.featureName, promiseEE)

    // register plugins
    var pluginApi = {
      getCurrentNode,
      setCurrentNode
    }

    register('spa-register', function (init) {
      if (typeof init === 'function') {
        init(pluginApi)
      }
    }, FEATURE_NAMES.spa, baseEE)

    function callbackStart () {
      state.depth++
      this.prevNode = state.currentNode
      this.ct = state.childTime
      state.childTime = 0
      state.timerBudget = MAX_TIMER_BUDGET
    }

    register(FN_END, callbackEnd, this.featureName, baseEE)
    register('cb-end', callbackEnd, this.featureName, promiseEE)

    function callbackEnd () {
      state.depth--
      var totalTime = this.jsTime || 0
      var exclusiveTime = totalTime - state.childTime
      state.childTime = this.ct + totalTime
      if (state.currentNode) {
        // transfer accumulated callback time to the active interaction node
        // run even if jsTime is 0 to update jsEnd
        state.currentNode.callback(exclusiveTime, this[FN_END])
        if (this.isTraced) {
          state.currentNode.attrs.tracedTime = exclusiveTime
        }
      }

      this.jsTime = state.currentNode ? 0 : exclusiveTime
      setCurrentNode(this.prevNode)
      this.prevNode = null
      state.timerBudget = MAX_TIMER_BUDGET
    }

    register(FN_START, function (args, eventSource) {
      var ev = args[0]
      var evName = ev.type
      var eventNode = ev[`__nrNode:${bundleId}`]

      if (!state.pageLoaded && ((evName === 'load' && eventSource === window) || loadedAsDeferredBrowserScript)) {
        state.pageLoaded = true
        // set to null so prevNode is set correctly
        this.prevNode = state.currentNode = null
        if (state.initialPageLoad) {
          eventNode = state.initialPageLoad.root

          // Even if initialPageLoad has remaining callbacks, force the initialPageLoad
          // interaction to complete when the page load event occurs.
          state.initialPageLoad[REMAINING] = 0

          originalSetTimeout(function () {
            INTERACTION_EVENTS.push('popstate')
          })
        }
      }

      if (eventNode) {
        // If we've already seen a previous handler for this specific event object,
        // just restore that. We want multiple handlers for the same event to share
        // a node.
        setCurrentNode(eventNode)
      } else if (evName === 'hashchange') {
        setCurrentNode(state.nodeOnLastHashUpdate)
        state.nodeOnLastHashUpdate = null
      } else if (eventSource instanceof XMLHttpRequest) {
        // If this event was emitted by an XHR, restore the node ID associated with
        // that XHR.
        setCurrentNode(baseEE.context(eventSource).spaNode)
      } else if (!state.currentNode && INTERACTION_EVENTS.indexOf(evName) !== -1) {
        // Otherwise, if no interaction is currently active, create a new node ID,
        // and let the aggregator know that we entered a new event handler callback
        // so that it has a chance to possibly start an interaction.
        var ixn = new Interaction(evName, this[FN_START], state.lastSeenUrl, state.lastSeenRouteName, onInteractionFinished, agentRef.agentIdentifier)

        // Store the interaction as prevInteraction in case it is prematurely discarded
        state.prevInteraction = ixn

        setCurrentNode(ixn.root)

        if (evName === 'click') {
          var value = getActionText(ev.target)
          if (value) {
            state.currentNode.attrs.custom.actionText = value
          }
        }
      }

      ev[`__nrNode:${bundleId}`] = state.currentNode
    }, this.featureName, eventsEE)

    /**
     * *** TIMERS ***
     * setTimeout call needs to keep the interaction active in case a node is started
     * in its callback.
     */

    // The context supplied to this callback will be shared with the fn-start/fn-end
    // callbacks that fire around the callback passed to setTimeout originally.
    register('setTimeout-end', function saveId (args, obj, timerId) {
      if (!state.currentNode || (state.timerBudget - this.timerDuration) < 0) return
      if (args && !(args[0] instanceof Function)) return
      state.currentNode[INTERACTION][REMAINING]++
      this.timerId = timerId
      state.timerMap[timerId] = state.currentNode
      this.timerBudget = state.timerBudget - 50
    }, this.featureName, timerEE)

    register('clearTimeout-start', function clear (args) {
      var timerId = args[0]
      var node = state.timerMap[timerId]
      if (node) {
        var interaction = node[INTERACTION]
        interaction[REMAINING]--
        interaction.checkFinish()
        delete state.timerMap[timerId]
      }
    }, this.featureName, timerEE)

    register(FN_START, function () {
      state.timerBudget = this.timerBudget || MAX_TIMER_BUDGET
      var id = this.timerId
      var node = state.timerMap[id]
      setCurrentNode(node)
      delete state.timerMap[id]
      if (node) node[INTERACTION][REMAINING]--
    }, this.featureName, timerEE)

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
    register(FN_START, function () {
      setCurrentNode(this[SPA_NODE])
    }, this.featureName, xhrEE)

    // context is stored on the xhr and is shared with all callbacks associated
    // with the new xhr
    register('new-xhr', function () {
      if (!state.disableSpaFix && !state.currentNode && state.prevInteraction && !state.prevInteraction.ignored) {
        /*
         * The previous interaction was discarded before a route change. Restore the interaction
         * in case this XHR is associated with a route change.
         */
        const interaction = state.prevInteraction
        state.currentNode = interaction.root
        interaction.root.end = null
      }

      if (state.currentNode) {
        this[SPA_NODE] = state.currentNode.child('ajax', null, null, true)
      }
    }, this.featureName, xhrEE)

    register('send-xhr-start', function () {
      var node = this[SPA_NODE]
      if (node && !this.sent) {
        this.sent = true
        node.dt = this.dt
        if (node.dt?.timestamp) {
          node.dt.timestamp = agentRef.runtime.timeKeeper.correctAbsoluteTimestamp(node.dt.timestamp)
        }
        node.jsEnd = node.start = this.startTime
        node[INTERACTION][REMAINING]++
      }
    }, this.featureName, xhrEE)

    register('xhr-resolved', function () {
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
        if (!!this.currentNode && !!this.currentNode.interaction) this.currentNode.interaction.checkFinish()
      }
    }, this.featureName, baseEE)

    /**
     * *** JSONP ***
     *
     */

    register('new-jsonp', function (url) {
      if (state.currentNode) {
        var node = this[JSONP_NODE] = state.currentNode.child('ajax', this[FETCH_START])
        node.start = this['new-jsonp']
        this.url = url
        this.status = null
      }
    }, this.featureName, jsonpEE)

    register('cb-start', function (args) {
      var node = this[JSONP_NODE]
      if (node) {
        setCurrentNode(node)
        this.status = 200
      }
    }, this.featureName, jsonpEE)

    register('jsonp-error', function () {
      var node = this[JSONP_NODE]
      if (node) {
        setCurrentNode(node)
        this.status = 0
      }
    }, this.featureName, jsonpEE)

    register(JSONP_END, function () {
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
    }, this.featureName, jsonpEE)

    register(FETCH_START, function (fetchArguments, dtPayload) {
      if (fetchArguments) {
        if (!state.disableSpaFix && !state.currentNode && state.prevInteraction && !state.prevInteraction.ignored) {
          /*
           * The previous interaction was discarded before a route change. Restore the interaction
           * in case this XHR is associated with a route change.
           */
          const interaction = state.prevInteraction
          state.currentNode = interaction.root
          interaction.root.end = null
        }

        if (state.currentNode) {
          this[SPA_NODE] = state.currentNode.child('ajax', this[FETCH_START])
          if (dtPayload && this[SPA_NODE]) {
            this[SPA_NODE].dt = dtPayload
            if (this[SPA_NODE].dt?.timestamp) {
              this[SPA_NODE].dt.timestamp = agentRef.runtime.timeKeeper.correctAbsoluteTimestamp(this[SPA_NODE].dt.timestamp)
            }
          }
        }
      }
    }, this.featureName, fetchEE)

    register(FETCH_BODY + 'start', function (args) {
      if (state.currentNode) {
        this[SPA_NODE] = state.currentNode
        state.currentNode[INTERACTION][REMAINING]++
      }
    }, this.featureName, fetchEE)

    register(FETCH_BODY + 'end', function (args, ctx, bodyPromise) {
      var node = this[SPA_NODE]
      if (node) node[INTERACTION][REMAINING]--
    }, this.featureName, fetchEE)

    register(FETCH_DONE, function (err, res) {
      var node = this[SPA_NODE]
      if (node) {
        if (err || !shouldCollectEvent(this.params)) {
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
    }, this.featureName, fetchEE)

    register('newURL', function (url, hashChangedDuringCb) {
      if (state.currentNode) {
        state.currentNode[INTERACTION].setNewURL(url)
      } else if (state.prevInteraction && !state.prevInteraction.ignored) {
        /*
         * The previous interaction was discarded before the route was changed. This can happen in SPA
         * frameworks when using lazy loading. We have also seen this in version 11+ of Nextjs where
         * some route changes re-use cached resolved promises.
         */
        const interaction = state.prevInteraction
        interaction.setNewURL(url)
        interaction.root.end = null

        setCurrentNode(interaction.root)
      }

      if (state.currentNode) {
        if (state.lastSeenUrl !== url) {
          state.currentNode[INTERACTION].routeChange = true
        }
        if (hashChangedDuringCb) {
          state.nodeOnLastHashUpdate = state.currentNode
        }
      }

      state.lastSeenUrl = url
    }, this.featureName, historyEE)

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
    jsonpEE.on('dom-start', function (args) {
      if (!state.currentNode) return

      var el = args[0]
      var isScript = (el && el.nodeName === 'SCRIPT' && el.src !== '')
      var interaction = state.currentNode.interaction

      if (isScript) {
        // increase remaining count to keep the interaction open
        interaction[REMAINING]++
        el.addEventListener('load', onload, eventListenerOpts(false))
        el.addEventListener('error', onerror, eventListenerOpts(false))
      }

      function onload () {
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
        interaction.checkFinish()
      }

      function onerror () {
        interaction[REMAINING]--
        interaction.checkFinish()
      }
    })

    register(FN_START, function () {
      setCurrentNode(state.prevNode)
    }, this.featureName, mutationEE)

    register('resolve-start', resolvePromise, this.featureName, promiseEE)
    register('executor-err', resolvePromise, this.featureName, promiseEE)

    register('propagate', saveNode, this.featureName, promiseEE)

    register(CB_START, function () {
      var ctx = this.getCtx ? this.getCtx() : this
      setCurrentNode(ctx[SPA_NODE])
    }, this.featureName, promiseEE)

    register(INTERACTION_API + 'get', function (t) {
      var interaction
      if (state?.currentNode?.[INTERACTION]) interaction = this.ixn = state.currentNode[INTERACTION]
      else if (state?.prevNode?.end === null && state?.prevNode?.[INTERACTION]?.root?.[INTERACTION]?.eventName !== 'initialPageLoad') interaction = this.ixn = state.prevNode[INTERACTION]
      else interaction = this.ixn = new Interaction('api', t, state.lastSeenUrl, state.lastSeenRouteName, onInteractionFinished, agentRef.agentIdentifier)
      if (!state.currentNode) {
        interaction.checkFinish()
        if (state.depth) setCurrentNode(interaction.root)
      }
    }, this.featureName, baseEE)

    register(INTERACTION_API + 'actionText', function (t, actionText) {
      var customAttrs = this.ixn.root.attrs.custom
      if (actionText) customAttrs.actionText = actionText
    }, this.featureName, baseEE)

    register(INTERACTION_API + 'setName', function (t, name, trigger) {
      var attrs = this.ixn.root.attrs
      if (name) attrs.customName = name
      if (trigger) attrs.trigger = trigger
    }, this.featureName, baseEE)

    register(INTERACTION_API + 'setAttribute', function (t, name, value) {
      this.ixn.root.attrs.custom[name] = value
    }, this.featureName, baseEE)

    register(INTERACTION_API + 'end', function (timestamp) {
      var interaction = this.ixn
      var node = activeNodeFor(interaction)
      setCurrentNode(null)
      node.child('customEnd', timestamp)?.finish(timestamp)
      interaction.finish()
    }, this.featureName, baseEE)

    register(INTERACTION_API + 'ignore', function (t) {
      this.ixn.ignored = true
    }, this.featureName, baseEE)

    register(INTERACTION_API + 'save', function (t) {
      this.ixn.save = true
    }, this.featureName, baseEE)

    register(INTERACTION_API + 'tracer', function (timestamp, name, store) {
      var interaction = this.ixn
      var parent = activeNodeFor(interaction)
      var ctx = baseEE.context(store)
      if (!name) {
        ctx.inc = ++interaction[REMAINING]

        return (ctx[SPA_NODE] = parent)
      }
      ctx[SPA_NODE] = parent.child('customTracer', timestamp, name)
    }, this.featureName, baseEE)

    register(FN_START, tracerDone, this.featureName, tracerEE)
    register('no-' + FN_START, tracerDone, this.featureName, tracerEE)

    function tracerDone (timestamp, interactionContext, hasCb) {
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
      hasCb ? setCurrentNode(node) : interaction.checkFinish()
    }

    register(INTERACTION_API + 'getContext', function (t, cb) {
      var store = this.ixn.root.attrs.store
      setTimeout(function () {
        cb(store)
      }, 0)
    }, this.featureName, baseEE)

    register(INTERACTION_API + 'onEnd', function (t, cb) {
      this.ixn.handlers.push(cb)
    }, this.featureName, baseEE)

    register('api-routeName', function (t, currentRouteName) {
      state.lastSeenRouteName = currentRouteName
      if (state.currentNode) state.currentNode[INTERACTION].setNewRoute(currentRouteName)
    }, this.featureName, baseEE)

    function activeNodeFor (interaction) {
      return (state.currentNode && state.currentNode[INTERACTION] === interaction) ? state.currentNode : interaction.root
    }

    function saveNode (val, overwrite) {
      if (overwrite || !this[SPA_NODE]) this[SPA_NODE] = state.currentNode
    }

    function resolvePromise () {
      if (!this.resolved) {
        this.resolved = true
        this[SPA_NODE] = state.currentNode
      }
    }

    function getCurrentNode () {
      return state.currentNode
    }

    function setCurrentNode (newNode) {
      if (!state.pageLoaded && !newNode && state.initialPageLoad) newNode = state.initialPageLoad.root
      if (state.currentNode) {
        state.currentNode[INTERACTION].checkFinish()
      }

      state.prevNode = state.currentNode
      state.currentNode = (newNode && !newNode[INTERACTION].root.end) ? newNode : null
    }

    function onInteractionFinished (interaction) {
      if (interaction === state.initialPageLoad) state.initialPageLoad = null

      var root = interaction.root
      var attrs = root.attrs

      // make sure that newrelic[INTERACTION]() works in end handler
      state.currentNode = root
      Object.values(interaction.handlers || {}).forEach(function (cb) {
        cb(attrs.store)
      })
      setCurrentNode(null)
    }

    baseEE.on('spa-jserror', function (type, name, params, metrics) {
      if (!state.currentNode) return
      params._interactionId = state.currentNode.interaction.id
      // do not capture parentNodeId when in root node
      if (state.currentNode.type && state.currentNode.type !== 'interaction') {
        params._interactionNodeId = state.currentNode.id
      }
    })

    register('function-err', function (args, obj, error) {
      if (!state.currentNode) return
      error.__newrelic ??= {}
      error.__newrelic[agentRef.agentIdentifier] = { interactionId: state.currentNode.interaction.id }
      if (state.currentNode.type && state.currentNode.type !== 'interaction') {
        error.__newrelic[agentRef.agentIdentifier].interactionNodeId = state.currentNode.id
      }
    }, this.featureName, baseEE)

    baseEE.on('interaction', saveInteraction)

    function getActionText (node) {
      var nodeType = node.tagName.toLowerCase()
      var goodNodeTypes = ['a', 'button', 'input']
      var isGoodNode = goodNodeTypes.indexOf(nodeType) !== -1
      if (isGoodNode) {
        return node.title || node.value || node.innerText
      }
    }

    function saveInteraction (interaction) {
      if (interaction.ignored || (!interaction.save && !interaction.routeChange)) {
        baseEE.emit('interactionDone', [interaction, false])
        return
      }

      if (state.prevInteraction === interaction) {
        // If the interaction is being saved, remove it from prevInteraction variable
        // to prevent the interaction from possibly being sent twice or causing an internal
        // recursive loop issue.
        state.prevInteraction = null
      }

      // assign unique id, this is serialized and used to link interactions with errors
      interaction.root.attrs.id = generateUuid()

      if (interaction.root.attrs.trigger === 'initialPageLoad') {
        interaction.root.attrs.firstPaint = firstPaint.current.value
        interaction.root.attrs.firstContentfulPaint = firstContentfulPaint.current.value
      }
      baseEE.emit('interactionDone', [interaction, true])
      classThis.events.add(interaction)

      let smCategory
      if (interaction.root?.attrs?.trigger === 'initialPageLoad') smCategory = 'InitialPageLoad'
      else if (interaction.routeChange) smCategory = 'RouteChange'
      else smCategory = 'Custom'
      handle(SUPPORTABILITY_METRIC_CHANNEL, [`Spa/Interaction/${smCategory}/Duration/Ms`, Math.max((interaction.root?.end || 0) - (interaction.root?.start || 0), 0)], undefined, FEATURE_NAMES.metrics, baseEE)

      scheduler?.scheduleHarvest(0)
      if (!scheduler) warn(19)
    }
  }

  serializer (eventBuffer) {
    return this.spaSerializerClass.serializeMultiple(eventBuffer, 0, navTiming)
  }
}
