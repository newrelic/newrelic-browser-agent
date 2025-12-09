/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
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
export class RegisteredEntity {
  /** @type {RegisterAPIMetadata} */
  metadata = {
    target: {},
    customAttributes: {}
  }

  /**
   *
   * @param {RegisterAPIConstructor} opts The options for setting up the registered entity.
   */
  constructor (opts) {
    try {
      if (!window?.newrelic) return warn(51)
      Object.assign(this, window?.newrelic?.register(opts) || {})
    } catch (err) {
      warn(50, err)
    }
  }

  /**
   * Reports a browser PageAction event along with a name and optional attributes to the registered target.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/addpageaction/}
   * @param {string} name Name or category of the action. Reported as the actionName attribute.
   * @param {object} [attributes] JSON object with one or more key/value pairs. For example: {key:"value"}. The key is reported as its own PageAction attribute with the specified values.
   */
  addPageAction (name, attributes) {
    /** this method will be overset once register is successful */
    warn(35, 'addPageAction')
  }

  /**
     * Records a custom event with a specified eventType and attributes.
     * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/recordCustomEvent/}
     * @param {string} eventType The eventType to store the event as.
     * @param {Object} [attributes] JSON object with one or more key/value pairs. For example: {key:"value"}.
     */
  recordCustomEvent (eventType, attributes) {
    warn(35, 'recordCustomEvent')
  }

  /**
   * Measures a task that is recorded as a BrowserPerformance event.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/measure/}
   * @param {string} name The name of the task
   * @param {{start: number, end: number, duration: number, customAttributes: object}} [options] An object used to control the way the measure API operates
   * @returns {{start: number, end: number, duration: number, customAttributes: object}} Measurement details
   */
  measure (name, options) {
    warn(35, 'measure')
  }

  /**
   * Adds a user-defined attribute name and value to subsequent events on the page for the registered target. Note -- the persist flag does not work with the register API.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/setcustomattribute/}
   * @param {string} name Name of the attribute. Appears as column in the PageView event. It will also appear as a column in the PageAction event if you are using it.
   * @param {string|number|boolean|null} value Value of the attribute. Appears as the value in the named attribute column in the PageView event. It will appear as a column in the PageAction event if you are using it. Custom attribute values cannot be complex objects, only simple types such as Strings, Integers and Booleans. Passing a null value unsets any existing attribute of the same name.
   * @param {boolean} [persist] Default false. If set to true, the name-value pair will also be set into the browser's storage API. Then on the following instrumented pages that load within the same session, the pair will be re-applied as a custom attribute.
   */
  setCustomAttribute (name, value, persist) {
    /** this method will be overset once register is successful */
    warn(35, 'setCustomAttribute')
  }

  /**
   * Identifies a browser error without disrupting your app's operations for the registered target.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/noticeerror/}
   * @param {Error|string} error Provide a meaningful error message that you can use when analyzing data on browser's JavaScript errors page.
   * @param {object} [customAttributes] An object containing name/value pairs representing custom attributes.
   */
  noticeError (error, customAttributes) {
    /** this method will be overset once register is successful */
    warn(35, 'noticeError')
  }

  /**
   * Adds a user-defined identifier string to subsequent events on the page for the registered taret.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/setuserid/}
   * @param {string|null} value A string identifier for the end-user, useful for tying all browser events to specific users. The value parameter does not have to be unique. If IDs should be unique, the caller is responsible for that validation. Passing a null value unsets any existing user ID.
   * @param {boolean} [resetSession=false] Optional param. Should not be used from a registered entity context. To reset a session when updating user id, must be initiated by the main agent.
   */
  setUserId (value, resetSession = false) {
    /** this method will be overset once register is successful */
    warn(35, 'setUserId')
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
    /** this method will be overset once register is successful */
    warn(35, 'setApplicationVersion')
  }

  /**
   * Capture a single log for the registered target.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/log/}
   * @param {string} message String to be captured as log message
   * @param {{customAttributes?: object, level?: 'ERROR'|'TRACE'|'DEBUG'|'INFO'|'WARN'}} [options] customAttributes defaults to `{}` if not assigned, level defaults to `info` if not assigned.
  */
  log (message, options) {
    /** this method will be overset once register is successful */
    warn(35, 'setCustomAttribute')
  }
}
