/* global expect */
import { now } from '../../../src/common/timing/now'
import { INTERACTION_API } from '../../../src/features/spa/constants'
import { gosNREUMOriginals } from '../../../src/common/window/nreum'

class InteractionValidator {
  static TIMED_NODE_TYPES = [
    'customTracer',
    'interaction',
    'ajax'
  ]

  static HANDLED_KEYS = ['attrs', 'children', 'jsTime', 'name', 'type']

  constructor (json) {
    this.json = json
    this.count = 0
    this.initialize()
  }

  initialize () {
    const validator = this
    validator.count += 2 // end time
    this.forEachNode(null, function count (node) {
      validator.count += 2 // children
      validator.count += 1 // name
      if (node.jsTime) validator.count += 1
      if (node.attrs) validator.count += Object.keys(node.attrs).length
      if (InteractionValidator.TIMED_NODE_TYPES.indexOf(node.name || node.type) !== -1) validator.count += 5
    })
  }

  forEachNode (interactionNode, fn) {
    (function runNode (node, interactionNode) {
      fn(node, interactionNode)
      if (interactionNode) interactionNode.children.sort((a, b) => a.id > b.id ? 1 : -1)
      if (node.children) {
        for (let i = 0; i < node.children.length; ++i) {
          runNode(node.children[i], interactionNode ? interactionNode.children[i] : null)
        }
      }
    })(this.json, interactionNode)
  }

  validate (interaction) {
    const root = InteractionValidator.#filterInternal(interaction.root)
    let totalDuration = 0; let endTime = 0

    this.forEachNode(root, function validateNode (expected, actual) {
      // make sure we don't pass because of a typo
      Object.keys(expected).forEach(key => expect(InteractionValidator.HANDLED_KEYS.indexOf(key)).not.toEqual(-1)) // unknown key in expected

      if (actual.jsTime) totalDuration += actual.jsTime
      if (expected.jsTime) expect(actual.jsTime).toBeGreaterThanOrEqual(expected.jsTime)
      if (expected.attrs) Object.entries(expected.attrs).forEach(([key, val]) => expect(actual.attrs[key]).toEqual(val))

      let expectedChildCount = expected.children ? expected.children.length : 0
      expect(actual.children).toBeTruthy() // node should have children
      expect(actual.type).toEqual(expected.type || expected.name)
      expect(actual.children.length).toEqual(expectedChildCount) // node should have expected number of children

      if (InteractionValidator.TIMED_NODE_TYPES.indexOf(actual.type) !== -1) {
        if (actual.type === 'interaction' && actual.attrs.trigger === 'initialPageLoad') {
          expect(actual.start).toEqual(0) // node has a zero start time for initial page loads
        } else {
          expect(actual.start).toBeGreaterThan(0)
        }

        expect(actual.end).toBeGreaterThanOrEqual(actual.start)
        expect(actual.jsTime).toBeGreaterThanOrEqual(0)
        expect(actual.jsEnd).toBeGreaterThanOrEqual(actual.start)
        expect(actual.jsEnd).toBeGreaterThanOrEqual(actual.start + actual.jsTime)
        endTime = Math.max(endTime, actual.jsEnd, actual.end)
      }
    })

    expect(root.end).toBeGreaterThanOrEqual(root.start + totalDuration) // root node should have an end time >= than its start time + all sync js time
    expect(root.end).toEqual(endTime)
  }

  static #filterInternal (original) {
    const filtered = {}
    Object.assign(filtered, original)
    filtered.children = filteredChildren(original.children)
    return filtered

    function filteredChildren (children) {
      return children.reduce((list, child) => {
        if (child.type !== 'timer' || child.attrs.method !== 'setTimeout (internal)') return list.concat([InteractionValidator.#filterInternal(child)])
        return list.concat(filteredChildren(child.children))
      }, [])
    }
  }
}

let lastId = 0
function startInteraction (onInteractionStart, afterInteractionFinish, options = {}) {
  let interactionId = null
  let done = false
  let eventType = options.eventType || 'click'

  if (eventType === 'initialPageLoad') {
    onInteractionStart(() => { done = true })
  } else if (eventType === 'api') {
    interactionId = lastId++
    options.handle.command('setAttribute', undefined, '__interactionId', interactionId)
    onInteractionStart(() => { done = true })
  } else {
    gosNREUMOriginals().o.ST(startFromUnwrappedTask, 100)
  }

  options.baseEE.on('interaction', function (interaction) {
    let id = interaction.root.attrs.custom.__interactionId
    let isInitialPageLoad = eventType === 'initialPageLoad' && interaction.root.attrs.trigger === 'initialPageLoad'
    if (done) {
      if (isInitialPageLoad) {
        afterInteractionFinish(interaction)
      } else if (id === interactionId) {
        delete interaction.root.attrs.custom.__interactionId
        afterInteractionFinish(interaction)
      }
    }
  })

  function startFromUnwrappedTask () {
    switch (eventType) {
      case 'click': {
        let el = options.element || document.createElement('div')
        document.body.appendChild(el)
        el.addEventListener('click', handleInteractionEvent)
        simulateClick(el)
        break
      }
      case 'popstate':
        window.addEventListener('popstate', handleInteractionEvent)
        window.history.back()
        break
      case 'keypress':
      case 'keyup':
      case 'keydown':
      case 'change':
        window.addEventListener(eventType, handleInteractionEvent)
        simulateEvent('input', eventType)
        break
      default:
        window.addEventListener(eventType, handleInteractionEvent)
        simulateEvent('div', eventType)
        break
    }

    function handleInteractionEvent (event) {
      interactionId = lastId++
      const ixnCtx = options.baseEE.emit(INTERACTION_API + 'get', [performance.now()])
      options.baseEE.emit(INTERACTION_API + 'setAttribute', [performance.now(), '__interactionId', interactionId], ixnCtx)
      event.preventDefault()
      event.stopPropagation()
      onInteractionStart(() => { done = true })
    }
  }
}
function simulateClick (el, ev) {
  let evt = new Event(ev || 'click', { bubbles: true, cancelable: false })
  el.dispatchEvent(evt)
}
function simulateEvent (elType, evtType) {
  const el = document.createElement(elType)
  document.body.appendChild(el)
  const evt = new Event(evtType, { bubbles: true })
  el.dispatchEvent(evt)
}

/** Mock the window.newrelic global that makes avail SPA API. */
function getNewrelicGlobal (apiEventsEE) {
  const tracerEE = apiEventsEE.get('tracer')
  return {
    interaction: function () {
      const newSandboxHandle = { // will have its own clean 'this' context specific to each newrelic.interaction() call
        command: function (cmd, customTime = now(), ...args) {
          apiEventsEE.emit(INTERACTION_API + cmd, [customTime, ...args], this)
          return this // most spa APIs should return a handle obj that allows for chaining further commands
        },
        createTracer: function (name, cb) {
          const contextStore = {}; const hasCb = typeof cb === 'function'
          apiEventsEE.emit(INTERACTION_API + 'tracer', [now(), name, contextStore], this)
          return function () {
            tracerEE.emit((hasCb ? '' : 'no-') + 'fn-start', [now(), this, hasCb], contextStore)
            if (hasCb) {
              try {
                return cb.apply(this, arguments)
              } catch (err) {
                tracerEE.emit('fn-err', [arguments, this, err], contextStore)
                // the error came from outside the agent, so don't swallow
                throw err
              } finally {
                tracerEE.emit('fn-end', [now()], contextStore)
              }
            }
          }
        }
      }
      return newSandboxHandle.command('get')
    },
    setCurrentRouteName: function (name) {
      apiEventsEE.emit('api-routeName', [now(), name], this)
      // this fn returns nothing
    }
  }
}

export default {
  InteractionValidator, startInteraction, getNewrelicGlobal
}
