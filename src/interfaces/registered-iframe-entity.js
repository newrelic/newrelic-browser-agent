/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// libraries
import { onCLS, onFCP, onINP, onLCP } from 'web-vitals'
// internal
import { globalScope } from '../common/constants/runtime'
import { isIFrameWindow } from '../common/dom/iframe'
import { now } from '../common/timing/now'
import { warn } from '../common/util/console'
import { findScriptTimings } from '../common/v2/script-tracker'
import { addUrl } from '../common/url/add-url'
import { IFRAME_TIMING_UPDATE, IFRAME_API, IFRAME_API_RESPONSE, IFRAME_VITALS_UPDATE, IFRAME_AJAX } from '../common/constants/iframe-constants'
import { castErrorEvent, castError, castPromiseRejectionEvent } from '../features/jserrors/shared/cast-error'

const REGISTER = 'register' // define it here to prevent importing the full list of constants for build size.
const VITALS = [[onCLS, 'cls'], [onLCP, 'lcp'], [onFCP, 'fcp'], [onINP, 'inp']]
const AJAX_INITIATOR_TYPES = { xmlhttprequest: 'xhr', fetch: 'fetch', beacon: 'beacon' }

/**
 * @typedef {import('../loaders/api/register-api-types').RegisterAPI} RegisterAPI
 * @typedef {import('../loaders/api/register-api-types').RegisterAPIMetadata} RegisterAPIMetadata
 * @typedef {import('../loaders/api/register-api-types').RegisterAPIConstructor} RegisterAPIConstructor
 */

/**
 * @experimental
 * IMPORTANT: This feature is being developed for use internally and is not in a public-facing production-ready state.
 * It is not recommended for use in production environments and will not receive support for issues.
 *
 * An interface for registering an external caller to report through the base agent to a different target than the base agent.
 */
export class RegisteredIframeEntity {
  /** @type {RegisterAPIMetadata} */
  metadata = {
    target: {},
    timings: {},
    customAttributes: {},
    vitals: {
      cls: { value: null },
      lcp: { value: null },
      fcp: { value: null },
      inp: { value: null }
    }
  }

  /** @private Map to store pending promise resolvers keyed by message ID */
  #pendingMessages = new Map()
  /** @private Unique ID for this iframe interface instance to correlate messages */
  #iframeInterfaceId = Math.random()
  /** @private Counter for generating unique message IDs */
  #messageIdCounter = 0
  /** @private Promise that resolves when registration with parent completes */
  #registrationPromise = null
  /** @private Resource timing observer used to seed AJAX state */
  #resourceObserver = null
  /** @private Original target descriptor (serializable) for postMessage */
  #targetDescriptor = null
  /** @private Parent window origin for secure postMessage */
  #parentOrigin = (() => {
    try {
      return globalScope?.location?.ancestorOrigins?.[0] || (globalScope?.document?.referrer ? new URL(globalScope.document.referrer).origin : '*')
    } catch (e) {
      return '*'
    }
  })()

  /**
   *
   * @param {RegisterAPIConstructor} opts The options for setting up the registered iframe entity.
   */
  constructor (opts) {
    warn(54)
    // Store original descriptor for postMessage (before any function merging)
    this.metadata.target = this.#targetDescriptor = opts

    if (!isIFrameWindow(window)) {
      warn(72)
      this.blocked = true
      return
    }

    // Store the registration promise so other methods can wait for it
    this.#registrationPromise = this.#register(opts)

    this.#setupErrorListeners()
    this.#setupVitalsListeners()
    this.#setupAjaxObserver()
    this.#setupResponseListener()
    this.#bindPublicMethods()
  }

  /**
   * Registers this entity with the parent agent, then seeds initial timings and FCP.
   * @private
   * @param {RegisterAPIConstructor} opts
   * @returns {Promise<void>}
   */
  async #register (opts) {
    try {
      const response = await this.#postMethodToAgent(REGISTER, [opts])
      if (response.metadata) Object.assign(this.metadata, response.metadata)

      const timings = findScriptTimings()
      // Send initial timing values
      for (const [key, value] of Object.entries(timings)) {
        if (key !== 'correlation') {
          this.#postTimingToAgent(key, value)
        }
      }
      // Proxy the timings object to watch for updates to fetchStart, fetchEnd, asset, type
      this.metadata.timings = new Proxy(timings, {
        set: (target, key, value) => {
          const changed = target[key] !== value
          target[key] = value

          // Send updates for these 4 properties when they change
          if (changed && this.metadata.target.id && key !== 'correlation') {
            this.#postTimingToAgent(key, value)
          }
          return true
        }
      })
      return response
    } catch (err) {
      warn(73, err)
      this.blocked = true
    }
  }

  /**
   * Wires up global error/rejection listeners that funnel into noticeError.
   * @private
   */
  #setupErrorListeners () {
    globalScope.addEventListener('error', err => {
      this.noticeError(castErrorEvent(err))
    })

    globalScope.addEventListener('unhandledrejection', event => {
      this.noticeError(castPromiseRejectionEvent(event))
    })
  }

  /**
   * Wires up web-vitals callbacks to report vitals updates to the parent.
   * @private
   */
  #setupVitalsListeners () {
    VITALS.forEach(([vitalFn, property]) => {
      vitalFn(({ value }) => {
        this.metadata.vitals[property].value = value
        this.#postMessageToParent(IFRAME_VITALS_UPDATE, {
          property,
          value
        })
      }, { reportAllChanges: property === 'cls' || property === 'inp' })
    })
  }

  /**
   * Instruments ajax using buffered resource timing so pre-registration entries are included.
   * @private
   */
  #setupAjaxObserver () {
    if (!globalScope.PerformanceObserver?.supportedEntryTypes?.includes('resource')) return

    this.#resourceObserver = new globalScope.PerformanceObserver(list => {
      list.getEntries().forEach(resource => this.#processResourceEntry(resource))
    })
    this.#resourceObserver.observe({ type: 'resource', buffered: true })
  }

  /**
   * Reports a single resource timing entry as an AJAX event, if it looks like a network request.
   * @private
   * @param {PerformanceResourceTiming} resource
   */
  #processResourceEntry (resource) {
    if (!(resource.initiatorType in AJAX_INITIATOR_TYPES) || resource.responseStatus === 0) return
    const params = { status: resource.responseStatus }
    const metrics = { rxSize: resource.transferSize, duration: Math.floor(resource.duration), cbTime: 0 }
    addUrl(params, resource.name)

    this.#postMessageToParent(IFRAME_AJAX, {
      params,
      metrics,
      start: resource.startTime,
      end: resource.responseEnd,
      initiatorType: AJAX_INITIATOR_TYPES[resource.initiatorType]
    })
  }

  /**
   * Listens for postMessage responses from the parent window and routes them to pending resolvers.
   * @private
   */
  #setupResponseListener () {
    globalScope.addEventListener('message', (event) => {
      if (this.blocked) return
      // Validate message structure
      if (event.data?.type !== IFRAME_API_RESPONSE) return

      // Validate origin if we have specific allowed origins
      if (!this.#isAllowedOrigin(event.origin)) {
        warn(74, event.origin)
        return
      }

      // Validate iframeInterfaceId to prevent spoofing (message must be for this instance)
      if (event.data.iframeInterfaceId !== this.#iframeInterfaceId) {
        warn(75)
        return
      }

      // Always sync metadata if provided to keep instance up to date
      // if (event.data.metadata) Object.assign(this.metadata, event.data.metadata)
      this.#closePending(event.data)
    })
  }

  /**
   * Explicitly binds API methods as own properties for better console visibility.
   * @private
   */
  #bindPublicMethods () {
    this.addPageAction = this.addPageAction.bind(this)
    this.deregister = this.deregister.bind(this)
    this.recordCustomEvent = this.recordCustomEvent.bind(this)
    this.measure = this.measure.bind(this)
    this.setCustomAttribute = this.setCustomAttribute.bind(this)
    this.noticeError = this.noticeError.bind(this)
    this.setUserId = this.setUserId.bind(this)
    this.setApplicationVersion = this.setApplicationVersion.bind(this)
    this.log = this.log.bind(this)
  }

  // ---------------------------------------------------------------------------
  // postMessage plumbing
  // ---------------------------------------------------------------------------

  /**
   * Checks if an origin matches the parent origin
   * @private
   * @param {string} origin - The origin to check
   * @returns {boolean}
   */
  #isAllowedOrigin (origin) {
    return this.#parentOrigin === '*' || origin === this.#parentOrigin
  }

  /**
   * Low-level helper to send postMessage to parent window with error handling
   * @private
   * @param {string} type - The message type to send
   * @param {object} data - The message payload to send
   * @param {boolean} [bypassRegistration=false] - Whether to bypass waiting for registration
   * @param {boolean} [needsResponse=false] - Whether to wait for a response from the parent
   * @returns {Promise<void>}
   */
  async #postMessageToParent (type, data, bypassRegistration = false, needsResponse = false) {
    if (this.blocked) return

    const timestamp = now()
    try {
      await (bypassRegistration ? Promise.resolve() : this.#registrationPromise)
      const messageId = ++this.#messageIdCounter
      const pending = needsResponse ? this.#openPending(messageId) : Promise.resolve()
      globalScope.parent.postMessage({
        type,
        target: this.#targetDescriptor,
        timestamp,
        iframeInterfaceId: this.#iframeInterfaceId,
        messageId,
        ...data
      }, this.#parentOrigin)
      return await pending
    } catch (err) {
      // If the postMessage never responded with a new message, it will surface here -- but, this could be expected, as many messages are sent to the parent that don't require a response.
    }
  }

  /**
   * Sends a timing property update message to the parent window
   * @private
   * @param {string} property - The property name that changed
   * @param {*} value - The new value
   */
  #postTimingToAgent (property, value) {
    this.#postMessageToParent(IFRAME_TIMING_UPDATE, {
      property,
      value
    })
  }

  /**
   * Sends a message to the parent window's agent using postMessage API
   * @private
   * @param {string} method The API method name to invoke
   * @param {Array} args The arguments to pass to the method
   * @returns {Promise<any>} Promise that resolves with the response from the agent
   */
  async #postMethodToAgent (method, args) {
    return await this.#postMessageToParent(IFRAME_API, {
      method,
      args
    }, method === REGISTER, true)
  }

  /**
   * Opens a pending entry for a message awaiting a response, auto-rejecting after a timeout.
   * @private
   * @param {number} messageId
   * @returns {Promise<any>}
   */
  #openPending (messageId) {
    const resolvers = {}
    const pending = new Promise((resolve, reject) => {
      resolvers.resolve = resolve
      resolvers.reject = reject
    })
    this.#pendingMessages.set(messageId, resolvers)
    // Timeout after 10 seconds
    setTimeout(() => this.#closePending({ messageId, error: 'Timed out' }), 10000)
    return pending
  }

  /**
   * Resolves or rejects a pending message by ID, based on an incoming response (or timeout).
   * @private
   * @param {{messageId: number, error?: string, result?: any, metadata?: object}} event
   */
  #closePending (event = {}) {
    const { messageId, error, result, metadata } = event
    const pending = this.#pendingMessages.get(messageId)
    if (pending) {
      if (error) pending.reject(new Error(error))
      else pending.resolve({ result, metadata })
      this.#pendingMessages.delete(messageId)
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Reports a browser PageAction event along with a name and optional attributes to the registered target.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/addpageaction/}
   * @param {string} name Name or category of the action. Reported as the actionName attribute.
   * @param {object} [attributes] JSON object with one or more key/value pairs. For example: {key:"value"}. The key is reported as its own PageAction attribute with the specified values.
   */
  addPageAction (name, attributes) {
    this.#postMethodToAgent('addPageAction', [name, attributes])
  }

  /**
   * @experimental
   * IMPORTANT: This feature is being developed for use internally and is not in a public-facing production-ready state.
   * It is not recommended for use in production environments and will not receive support for issues.
   *
   * Deregister the registered entity (this), which blocks its use and captures end of life timings.
   * @returns {Promise<void>}
   */
  deregister () {
    try {
      this.#resourceObserver?.disconnect()
    } catch (err) { }

    this.#resourceObserver = null
    return this.#postMethodToAgent('deregister', [])
  }

  /**
     * Records a custom event with a specified eventType and attributes.
     * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/recordCustomEvent/}
     * @param {string} eventType The eventType to store the event as.
     * @param {Object} [attributes] JSON object with one or more key/value pairs. For example: {key:"value"}.
     */
  recordCustomEvent (eventType, attributes) {
    this.#postMethodToAgent('recordCustomEvent', [eventType, attributes])
  }

  /**
   * Measures a task that is recorded as a BrowserPerformance event.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/measure/}
   * @param {string} name The name of the task
   * @param {{start?: number|PerformanceMark, end?: number|PerformanceMark, customAttributes?: object}} [options] An object used to control the way the measure API operates
   * @returns {Promise<{start: number, end: number, duration: number, customAttributes: object}>} Measurement details
   */
  async measure (name, options) {
    return (await this.#postMethodToAgent('measure', [name, options])).result
  }

  /**
   * Adds a user-defined attribute name and value to subsequent events on the page for the registered target. Note -- the persist flag does not work with the register API.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/setcustomattribute/}
   * @param {string} name Name of the attribute. Appears as column in the PageView event. It will also appear as a column in the PageAction event if you are using it.
   * @param {string|number|boolean|null} value Value of the attribute. Appears as the value in the named attribute column in the PageView event. It will appear as a column in the PageAction event if you are using it. Custom attribute values cannot be complex objects, only simple types such as Strings, Integers and Booleans. Passing a null value unsets any existing attribute of the same name.
   * @param {boolean} [persist] Default false. If set to true, the name-value pair will also be set into the browser's storage API. Then on the following instrumented pages that load within the same session, the pair will be re-applied as a custom attribute.
   */
  setCustomAttribute (name, value, persist) {
    this.#postMethodToAgent('setCustomAttribute', [name, value, persist])
  }

  /**
   * Identifies a browser error without disrupting your app's operations for the registered target.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/noticeerror/}
   * @param {Error|string} error Provide a meaningful error message that you can use when analyzing data on browser's JavaScript errors page.
   * @param {object} [customAttributes] An object containing name/value pairs representing custom attributes.
   */
  noticeError (error, customAttributes) {
    this.#postMethodToAgent('noticeError', [castError(error), customAttributes])
  }

  /**
   * Adds a user-defined identifier string to subsequent events on the page for the registered taret.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/setuserid/}
   * @param {string|null} value A string identifier for the end-user, useful for tying all browser events to specific users. The value parameter does not have to be unique. If IDs should be unique, the caller is responsible for that validation. Passing a null value unsets any existing user ID.
   * @param {boolean} [resetSession=false] Optional param. Should not be used from a registered entity context. To reset a session when updating user id, must be initiated by the main agent.
   */
  setUserId (value, resetSession = false) {
    this.#postMethodToAgent('setUserId', [value, resetSession])
  }

  /**
   * Adds a user-defined application version string to subsequent events on the page for the registered target.
   * This decorates all payloads with an attribute of `application.version` which is queryable in NR1.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/setapplicationversion/}
   * @param {string|null} value A string identifier for the application version, useful for
   * tying all browser events to a specific release tag. The value parameter does not
   * have to be unique. Passing a null value unsets any existing value.
   */
  setApplicationVersion (value) {
    this.#postMethodToAgent('setApplicationVersion', [value])
  }

  /**
   * Capture a single log for the registered target.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/log/}
   * @param {string} message String to be captured as log message
   * @param {{customAttributes?: object, level?: 'ERROR'|'TRACE'|'DEBUG'|'INFO'|'WARN'}} [options] customAttributes defaults to `{}` if not assigned, level defaults to `info` if not assigned.
  */
  log (message, options) {
    this.#postMethodToAgent('log', [message, options])
  }
}
