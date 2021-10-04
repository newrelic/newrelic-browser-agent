/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var register = require('../../../agent/register-handler')
var parseUrl = require('../../xhr/instrument/parse-url')
var shouldCollectEvent = require('../../xhr/aggregate/deny-list').shouldCollectEvent
var harvest = require('../../../agent/harvest')
var HarvestScheduler = require('../../../agent/harvest-scheduler')
var serializer = require('./serializer')
var loader = require('loader')
var baseEE = require('ee')
var mutationEE = baseEE.get('mutation')
var promiseEE = baseEE.get('promise')
var historyEE = baseEE.get('history')
var eventsEE = baseEE.get('events')
var timerEE = baseEE.get('timer')
var fetchEE = baseEE.get('fetch')
var jsonpEE = baseEE.get('jsonp')
var xhrEE = baseEE.get('xhr')
var tracerEE = baseEE.get('tracer')
var mapOwn = require('map-own')
var navTiming = require('../../../agent/nav-timing').nt
var uniqueId = require('unique-id')
var paintMetrics = require('../../../agent/paint-metrics').metrics
var Interaction = require('./Interaction')
var config = require('config')
var eventListenerOpts = require('event-listener-opts')

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

var originals = NREUM.o
var originalSetTimeout = originals.ST
var initialPageURL = loader.origin
var lastSeenUrl = initialPageURL
var lastSeenRouteName = null

var timerMap = {}
var timerBudget = MAX_TIMER_BUDGET
var currentNode = null
var prevNode = null
var nodeOnLastHashUpdate = null
var initialPageLoad = null
var pageLoaded = false
var childTime = 0
var depth = 0

module.exports = function () {
  return currentNode && currentNode.id
}

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

baseEE.on('feat-spa', function () {
  if (!isEnabled()) return

  initialPageLoad = new Interaction('initialPageLoad', 0, lastSeenUrl, lastSeenRouteName, onInteractionFinished)
  initialPageLoad.save = true
  currentNode = initialPageLoad.root // hint
  // ensure that checkFinish calls are safe during initialPageLoad
  initialPageLoad[REMAINING]++

  register.on(baseEE, FN_START, callbackStart)
  register.on(promiseEE, CB_START, callbackStart)

  // register plugins
  var pluginApi = {
    getCurrentNode: getCurrentNode,
    setCurrentNode: setCurrentNode
  }

  register('spa-register', function(init) {
    if (typeof init === 'function') {
      init(pluginApi)
    }
  })

  function callbackStart () {
    depth++
    this.prevNode = currentNode
    this.ct = childTime
    childTime = 0
    timerBudget = MAX_TIMER_BUDGET
  }

  register.on(baseEE, FN_END, callbackEnd)
  register.on(promiseEE, 'cb-end', callbackEnd)

  function callbackEnd () {
    depth--
    var totalTime = this.jsTime || 0
    var exclusiveTime = totalTime - childTime
    childTime = this.ct + totalTime
    if (currentNode) {
      // transfer accumulated callback time to the active interaction node
      // run even if jsTime is 0 to update jsEnd
      currentNode.callback(exclusiveTime, this[FN_END])
      if (this.isTraced) {
        currentNode.attrs.tracedTime = exclusiveTime
      }
    }

    this.jsTime = currentNode ? 0 : exclusiveTime
    setCurrentNode(this.prevNode)
    this.prevNode = null
    timerBudget = MAX_TIMER_BUDGET
  }

  register.on(eventsEE, FN_START, function (args, eventSource) {
    var ev = args[0]
    var evName = ev.type
    var eventNode = ev.__nrNode

    if (!pageLoaded && evName === 'load' && eventSource === window) {
      pageLoaded = true
      // set to null so prevNode is set correctly
      this.prevNode = currentNode = null
      if (initialPageLoad) {
        eventNode = initialPageLoad.root
        initialPageLoad[REMAINING]--
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
      setCurrentNode(nodeOnLastHashUpdate)
      nodeOnLastHashUpdate = null
    } else if (eventSource instanceof XMLHttpRequest) {
      // If this event was emitted by an XHR, restore the node ID associated with
      // that XHR.
      setCurrentNode(baseEE.context(eventSource).spaNode)
    } else if (!currentNode) {
      // Otherwise, if no interaction is currently active, create a new node ID,
      // and let the aggregator know that we entered a new event handler callback
      // so that it has a chance to possibly start an interaction.
      if (INTERACTION_EVENTS.indexOf(evName) !== -1) {
        var ixn = new Interaction(evName, this[FN_START], lastSeenUrl, lastSeenRouteName, onInteractionFinished)
        setCurrentNode(ixn.root)

        if (evName === 'click') {
          var value = getActionText(ev.target)
          if (value) {
            currentNode.attrs.custom['actionText'] = value
          }
        }
        // @ifdef SPA_DEBUG
        console.timeStamp('start interaction, ID=' + currentNode.id + ', evt=' + evName)
        // @endif
      }
    }

    ev.__nrNode = currentNode
  })

  /**
   * *** TIMERS ***
   * setTimeout call needs to keep the interaction active in case a node is started
   * in its callback.
   */

  // The context supplied to this callback will be shared with the fn-start/fn-end
  // callbacks that fire around the callback passed to setTimeout originally.
  register.on(timerEE, 'setTimeout-end', function saveId (args, obj, timerId) {
    if (!currentNode || (timerBudget - this.timerDuration) < 0) return
    if (args && !(args[0] instanceof Function)) return
    currentNode[INTERACTION][REMAINING]++
    this.timerId = timerId
    timerMap[timerId] = currentNode
    this.timerBudget = timerBudget - 50
  })

  register.on(timerEE, 'clearTimeout-start', function clear (args) {
    var timerId = args[0]
    var node = timerMap[timerId]
    if (node) {
      var interaction = node[INTERACTION]
      interaction[REMAINING]--
      interaction.checkFinish(lastSeenUrl, lastSeenRouteName)
      delete timerMap[timerId]
    }
  })

  register.on(timerEE, FN_START, function () {
    timerBudget = this.timerBudget || MAX_TIMER_BUDGET
    var id = this.timerId
    var node = timerMap[id]
    setCurrentNode(node)
    delete timerMap[id]
    if (node) {
      node[INTERACTION][REMAINING]--
    }
  })

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
  register.on(xhrEE, FN_START, function () {
    setCurrentNode(this[SPA_NODE])
  })

  // context is stored on the xhr and is shared with all callbacks associated
  // with the new xhr
  register.on(xhrEE, 'new-xhr', function () {
    if (currentNode) {
      this[SPA_NODE] = currentNode.child('ajax', null, null, true)
    }
  })

  register.on(xhrEE, 'send-xhr-start', function () {
    var node = this[SPA_NODE]
    if (node && !this.sent) {
      this.sent = true
      node.dt = this.dt
      node.jsEnd = node.start = this.startTime
      node[INTERACTION][REMAINING]++
    }
  })

  register.on(baseEE, 'xhr-resolved', function () {
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
  })

  /**
   * *** JSONP ***
   *
   */

  register.on(jsonpEE, 'new-jsonp', function (url) {
    if (currentNode) {
      var node = this[JSONP_NODE] = currentNode.child('ajax', this[FETCH_START])
      node.start = this['new-jsonp']
      this.url = url
      this.status = null
    }
  })

  register.on(jsonpEE, 'cb-start', function (args) {
    var node = this[JSONP_NODE]
    if (node) {
      setCurrentNode(node)
      this.status = 200
    }
  })

  register.on(jsonpEE, 'jsonp-error', function () {
    var node = this[JSONP_NODE]
    if (node) {
      setCurrentNode(node)
      this.status = 0
    }
  })

  register.on(jsonpEE, JSONP_END, function () {
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
  })

  register.on(fetchEE, FETCH_START, function (fetchArguments, dtPayload) {
    if (currentNode && fetchArguments) {
      this[SPA_NODE] = currentNode.child('ajax', this[FETCH_START])
      if (dtPayload && this[SPA_NODE]) this[SPA_NODE].dt = dtPayload
    }
  })

  register.on(fetchEE, FETCH_BODY + 'start', function (args) {
    if (currentNode) {
      this[SPA_NODE] = currentNode
      currentNode[INTERACTION][REMAINING]++
    }
  })

  register.on(fetchEE, FETCH_BODY + 'end', function (args, ctx, bodyPromise) {
    var node = this[SPA_NODE]
    if (node) {
      node[INTERACTION][REMAINING]--
    }
  })

  register.on(fetchEE, FETCH_DONE, function (err, res) {
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
  })

  register.on(historyEE, 'newURL', function (url, hashChangedDuringCb) {
    if (currentNode) {
      if (lastSeenUrl !== url) {
        currentNode[INTERACTION].routeChange = true
      }
      if (hashChangedDuringCb) {
        nodeOnLastHashUpdate = currentNode
      }
    }

    lastSeenUrl = url
  })

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
    if (!currentNode) return

    var el = args[0]
    var isScript = (el && el.nodeName === 'SCRIPT' && el.src !== '')
    var interaction = currentNode.interaction

    if (isScript) {
      // increase remaining count to keep the interaction open
      interaction[REMAINING]++
      el.addEventListener('load', onload, eventListenerOpts(false))
      el.addEventListener('error', onerror, eventListenerOpts(false))
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
      interaction.checkFinish(lastSeenUrl, lastSeenRouteName)
    }

    function onerror() {
      interaction[REMAINING]--
      interaction.checkFinish(lastSeenUrl, lastSeenRouteName)
    }
  })

  register.on(mutationEE, FN_START, function () {
    setCurrentNode(prevNode)
  })

  register.on(promiseEE, 'resolve-start', resolvePromise)
  register.on(promiseEE, 'executor-err', resolvePromise)

  register.on(promiseEE, 'propagate', saveNode)

  register.on(promiseEE, CB_START, function () {
    var ctx = this.getCtx ? this.getCtx() : this
    setCurrentNode(ctx[SPA_NODE])
  })

  register(INTERACTION_API + 'get', function (t) {
    var interaction = this.ixn = currentNode ? currentNode[INTERACTION] : new Interaction('api', t, lastSeenUrl, lastSeenRouteName, onInteractionFinished)

    if (!currentNode) {
      interaction.checkFinish(lastSeenUrl, lastSeenRouteName)
      if (depth) setCurrentNode(interaction.root)
    }
  })

  register(INTERACTION_API + 'actionText', function (t, actionText) {
    var customAttrs = this.ixn.root.attrs.custom
    if (actionText) customAttrs.actionText = actionText
  })

  register(INTERACTION_API + 'setName', function (t, name, trigger) {
    var attrs = this.ixn.root.attrs
    if (name) attrs.customName = name
    if (trigger) attrs.trigger = trigger
  })

  register(INTERACTION_API + 'setAttribute', function (t, name, value) {
    this.ixn.root.attrs.custom[name] = value
  })

  register(INTERACTION_API + 'end', function (timestamp) {
    var interaction = this.ixn
    var node = activeNodeFor(interaction)
    setCurrentNode(null)
    node.child('customEnd', timestamp).finish(timestamp)
    interaction.finish()
  })

  register(INTERACTION_API + 'ignore', function () {
    this.ixn.ignored = true
  })

  register(INTERACTION_API + 'save', function () {
    this.ixn.save = true
  })

  register(INTERACTION_API + 'tracer', function (timestamp, name, store) {
    var interaction = this.ixn
    var parent = activeNodeFor(interaction)
    var ctx = baseEE.context(store)
    if (!name) {
      ctx.inc = ++interaction[REMAINING]
      return (ctx[SPA_NODE] = parent)
    }
    ctx[SPA_NODE] = parent.child('customTracer', timestamp, name)
  })

  register.on(tracerEE, FN_START, tracerDone)
  register.on(tracerEE, 'no-' + FN_START, tracerDone)

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
    hasCb ? setCurrentNode(node) : interaction.checkFinish(lastSeenUrl, lastSeenRouteName)
  }

  register(INTERACTION_API + 'getContext', function (t, cb) {
    var store = this.ixn.root.attrs.store
    setTimeout(function () {
      cb(store)
    }, 0)
  })

  register(INTERACTION_API + 'onEnd', function (t, cb) {
    this.ixn.handlers.push(cb)
  })

  register('api-routeName', function (t, currentRouteName) {
    lastSeenRouteName = currentRouteName
  })

  function activeNodeFor (interaction) {
    return (currentNode && currentNode[INTERACTION] === interaction) ? currentNode : interaction.root
  }
})

function saveNode (val, overwrite) {
  if (overwrite || !this[SPA_NODE]) this[SPA_NODE] = currentNode
}

function resolvePromise () {
  if (!this.resolved) {
    this.resolved = true
    this[SPA_NODE] = currentNode
  }
}

function getCurrentNode() {
  return currentNode
}

function setCurrentNode (newNode) {
  if (!pageLoaded && !newNode && initialPageLoad) newNode = initialPageLoad.root
  if (currentNode) {
    currentNode[INTERACTION].checkFinish(lastSeenUrl, lastSeenRouteName)
  }

  prevNode = currentNode
  currentNode = (newNode && !newNode[INTERACTION].root.end) ? newNode : null
}

function onInteractionFinished(interaction) {
  if (interaction === initialPageLoad) initialPageLoad = null

  var root = interaction.root
  var attrs = root.attrs

  // make sure that newrelic[INTERACTION]() works in end handler
  currentNode = root
  mapOwn(interaction.handlers, function (i, cb) {
    cb(attrs.store)
  })
  setCurrentNode(null)
}

var harvestTimeSeconds = config.getConfiguration('spa.harvestTimeSeconds') || 10
var interactionsToHarvest = []
var interactionsSent = []

var scheduler = new HarvestScheduler(loader, 'events', { onFinished: onHarvestFinished, retryDelay: harvestTimeSeconds })

harvest.on('events', onHarvestStarted)

function onHarvestStarted(options) {
  if (interactionsToHarvest.length === 0) return {}
  var payload = serializer.serializeMultiple(interactionsToHarvest, 0, navTiming)

  if (options.retry) {
    interactionsToHarvest.forEach(function(interaction) {
      interactionsSent.push(interaction)
    })
  }
  interactionsToHarvest = []

  return { body: { e: payload } }
}

function onHarvestFinished(result) {
  if (result.sent && result.retry && interactionsSent.length > 0) {
    interactionsSent.forEach(function(interaction) {
      interactionsToHarvest.push(interaction)
    })
    interactionsSent = []
  }
}

baseEE.on('errorAgg', function (type, name, params, metrics) {
  if (!currentNode) return
  params._interactionId = currentNode.interaction.id
  // do not capture parentNodeId when in root node
  if (currentNode.type && currentNode.type !== 'interaction') {
    params._interactionNodeId = currentNode.id
  }
})

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
    baseEE.emit('interactionDiscarded', [interaction])
    return
  }

  // assign unique id, this is serialized and used to link interactions with errors
  interaction.root.attrs.id = uniqueId.generateUuid()

  if (interaction.root.attrs.trigger === 'initialPageLoad') {
    interaction.root.attrs.firstPaint = paintMetrics['first-paint']
    interaction.root.attrs.firstContentfulPaint = paintMetrics['first-contentful-paint']
  }
  baseEE.emit('interactionSaved', [interaction])
  interactionsToHarvest.push(interaction)
  scheduler.scheduleHarvest(0)
}

function isEnabled() {
  var configuration = config.getConfiguration('spa')
  if (configuration && configuration.enabled === false) {
    return false
  }
  return true
}
