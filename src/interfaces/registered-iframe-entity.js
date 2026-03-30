/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { isIFrameWindow } from '../common/dom/iframe'
import { now } from '../common/timing/now'
import { warn } from '../common/util/console'

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
    customAttributes: {}
  }

  /** @private Map to store pending promise resolvers keyed by message ID */
  #pendingMessages = new Map()
  /** @private Counter for generating unique message IDs */
  #messageIdCounter = 0
  /** @private Promise that resolves when registration with parent completes */
  #registrationPromise = null
  /** @private Original target descriptor (serializable) for postMessage */
  #targetDescriptor = null

  /**
   *
   * @param {RegisterAPIConstructor} opts The options for setting up the registered iframe entity.
   */
  constructor (opts) {
    this.metadata.target = opts
    // Store original descriptor for postMessage (before any function merging)
    this.#targetDescriptor = opts

    if (!isIFrameWindow(window)) {
      warn(70, 'Must be in iframe context to use this interface')
      this.blocked = true
      return
    }

    window.addEventListener('message', (event) => {
      // Validate message structure
      if (event.data?.type !== 'newrelic-iframe-api-response') return

      const { messageId, result, error, metadata } = event.data

      // Always sync metadata if provided to keep instance up to date
      if (metadata) {
        Object.assign(this.metadata, metadata)
      }

      const pending = this.#pendingMessages.get(messageId)
      if (pending) {
        if (error) {
          pending.reject(new Error(error))
        } else {
          pending.resolve(result)
        }
        this.#pendingMessages.delete(messageId)
      }
    })

    // Store the registration promise so other methods can wait for it
    this.#registrationPromise = this.register(opts)
      .then(response => {
        // Merge updated metadata from parent (includes full target info with server-generated IDs)
        if (response?.metadata) {
          Object.assign(this.metadata, response.metadata)
        }
        return response
      })
      .catch(err => {
        warn(72, `Failed to register with parent agent: ${err}`)
        this.blocked = true
        throw err
      })

    // Explicitly bind API methods as own properties for better console visibility
    this.addPageAction = this.addPageAction.bind(this)
    this.register = this.register.bind(this)
    this.deregister = this.deregister.bind(this)
    this.recordCustomEvent = this.recordCustomEvent.bind(this)
    this.measure = this.measure.bind(this)
    this.setCustomAttribute = this.setCustomAttribute.bind(this)
    this.noticeError = this.noticeError.bind(this)
    this.setUserId = this.setUserId.bind(this)
    this.setApplicationVersion = this.setApplicationVersion.bind(this)
    this.log = this.log.bind(this)
  }

  /**
   * Sends a message to the parent window's agent using postMessage API
   * @private
   * @param {string} method The API method name to invoke
   * @param {Array} args The arguments to pass to the method
   * @param {boolean} [skipRegistrationWait=false] Skip waiting for registration (only for register itself)
   * @returns {Promise<any>} Promise that resolves with the response from the agent
   */
  #postToAgent (method, args) {
    if (this.blocked) {
      return Promise.reject(new Error('Iframe interface is blocked'))
    }

    // For all methods except register itself, wait for registration to complete first
    const waitPromise = method === 'register' ? Promise.resolve() : this.#registrationPromise

    return waitPromise.then(() => new Promise((resolve, reject) => {
      try {
        const messageId = ++this.#messageIdCounter
        this.#pendingMessages.set(messageId, { resolve, reject })

        // Use original target descriptor (serializable) for postMessage
        const target = this.#targetDescriptor

        window.parent.postMessage({
          type: 'newrelic-iframe-api',
          messageId,
          target,
          method,
          args,
          timestamp: now()
        }, '*') // TODO: Consider restricting target origin for security

        // Timeout after 5 seconds
        setTimeout(() => {
          if (this.#pendingMessages.has(messageId)) {
            this.#pendingMessages.delete(messageId)
            reject(new Error(`Timeout waiting for response to ${method}`))
          }
        }, 5000)
      } catch (err) {
        warn(71, `Failed to post message to parent: ${err}`)
        reject(err)
      }
    }))
  }

  /**
   * Reports a browser PageAction event along with a name and optional attributes to the registered target.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/addpageaction/}
   * @param {string} name Name or category of the action. Reported as the actionName attribute.
   * @param {object} [attributes] JSON object with one or more key/value pairs. For example: {key:"value"}. The key is reported as its own PageAction attribute with the specified values.
   */
  addPageAction (name, attributes) {
    this.#postToAgent('addPageAction', [name, attributes])
  }

  /**
   * @experimental
   * IMPORTANT: This feature is being developed for use internally and is not in a public-facing production-ready state.
   * It is not recommended for use in production environments and will not receive support for issues.
   *
   * Registers an external caller to report through the base agent to a different target than the base agent. Will be related to this registered entity when called through this access point.
   * @param {import('../loaders/api/register-api-types').RegisterAPIConstructor} target the target object to report data to
    @returns {Promise<import('../loaders/api/register-api-types').RegisterAPI>} Returns a promise that resolves with an object that contains the available API methods and configurations to use with the external caller. See loaders/api/api.js for more information.
   */
  register (target) {
    return this.#postToAgent('register', [target])
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
    return this.#postToAgent('deregister', [])
  }

  /**
     * Records a custom event with a specified eventType and attributes.
     * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/recordCustomEvent/}
     * @param {string} eventType The eventType to store the event as.
     * @param {Object} [attributes] JSON object with one or more key/value pairs. For example: {key:"value"}.
     */
  recordCustomEvent (eventType, attributes) {
    this.#postToAgent('recordCustomEvent', [eventType, attributes])
  }

  /**
   * Measures a task that is recorded as a BrowserPerformance event.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/measure/}
   * @param {string} name The name of the task
   * @param {{start?: number|PerformanceMark, end?: number|PerformanceMark, customAttributes?: object}} [options] An object used to control the way the measure API operates
   * @returns {Promise<{start: number, end: number, duration: number, customAttributes: object}>} Measurement details
   */
  measure (name, options) {
    return this.#postToAgent('measure', [name, options])
  }

  /**
   * Adds a user-defined attribute name and value to subsequent events on the page for the registered target. Note -- the persist flag does not work with the register API.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/setcustomattribute/}
   * @param {string} name Name of the attribute. Appears as column in the PageView event. It will also appear as a column in the PageAction event if you are using it.
   * @param {string|number|boolean|null} value Value of the attribute. Appears as the value in the named attribute column in the PageView event. It will appear as a column in the PageAction event if you are using it. Custom attribute values cannot be complex objects, only simple types such as Strings, Integers and Booleans. Passing a null value unsets any existing attribute of the same name.
   * @param {boolean} [persist] Default false. If set to true, the name-value pair will also be set into the browser's storage API. Then on the following instrumented pages that load within the same session, the pair will be re-applied as a custom attribute.
   */
  setCustomAttribute (name, value, persist) {
    this.#postToAgent('setCustomAttribute', [name, value, persist])
  }

  /**
   * Identifies a browser error without disrupting your app's operations for the registered target.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/noticeerror/}
   * @param {Error|string} error Provide a meaningful error message that you can use when analyzing data on browser's JavaScript errors page.
   * @param {object} [customAttributes] An object containing name/value pairs representing custom attributes.
   */
  noticeError (error, customAttributes) {
    this.#postToAgent('noticeError', [error, customAttributes])
  }

  /**
   * Adds a user-defined identifier string to subsequent events on the page for the registered taret.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/setuserid/}
   * @param {string|null} value A string identifier for the end-user, useful for tying all browser events to specific users. The value parameter does not have to be unique. If IDs should be unique, the caller is responsible for that validation. Passing a null value unsets any existing user ID.
   * @param {boolean} [resetSession=false] Optional param. Should not be used from a registered entity context. To reset a session when updating user id, must be initiated by the main agent.
   */
  setUserId (value, resetSession = false) {
    this.#postToAgent('setUserId', [value, resetSession])
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
    this.#postToAgent('setApplicationVersion', [value])
  }

  /**
   * Capture a single log for the registered target.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/log/}
   * @param {string} message String to be captured as log message
   * @param {{customAttributes?: object, level?: 'ERROR'|'TRACE'|'DEBUG'|'INFO'|'WARN'}} [options] customAttributes defaults to `{}` if not assigned, level defaults to `info` if not assigned.
  */
  log (message, options) {
    this.#postToAgent('log', [message, options])
  }
}
