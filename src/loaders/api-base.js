/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { warn } from '../common/util/console'
import { ADD_PAGE_ACTION, ADD_RELEASE, ADD_TO_TRACE, FINISHED, INTERACTION, LOG, NOTICE_ERROR, PAUSE_REPLAY, RECORD_CUSTOM_EVENT, RECORD_REPLAY, REGISTER, SET_APPLICATION_VERSION, SET_CURRENT_ROUTE_NAME, SET_CUSTOM_ATTRIBUTE, SET_ERROR_HANDLER, SET_PAGE_VIEW_NAME, SET_USER_ID, START, WRAP_LOGGER, MEASURE } from './api/constants'

/**
 * @typedef {import('./api/interaction-types').InteractionInstance} InteractionInstance
 */
export class ApiBase {
  #callMethod (methodName, ...args) {
    if (this[methodName] === ApiBase.prototype[methodName]) warn(35, methodName)
    else return this[methodName](...args)
  }

  // MicroAgent class custom defines its own start

  /**
   * Reports a browser PageAction event along with a name and optional attributes.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/addpageaction/}
   * @param {string} name Name or category of the action. Reported as the actionName attribute.
   * @param {object} [attributes] JSON object with one or more key/value pairs. For example: {key:"value"}. The key is reported as its own PageAction attribute with the specified values.
   */
  addPageAction (name, attributes) {
    return this.#callMethod(ADD_PAGE_ACTION, name, attributes)
  }

  /**
   * @experimental
   * IMPORTANT: This feature is being developed for use internally and is not in a public-facing production-ready state.
   * It is not recommended for use in production environments and will not receive support for issues.
   *
   * Registers an external caller to report through the base agent to a different target than the base agent.
   * @param {import('./api/register-api-types').RegisterAPIConstructor} target the target object to report data to
  @returns {import('./api/register-api-types').RegisterAPI} Returns an object that contains the available API methods and configurations to use with the external caller. See loaders/api/api.js for more information.
   */
  register (target) {
    return this.#callMethod(REGISTER, target)
  }

  /**
   * Records a custom event with a specified eventType and attributes.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/recordCustomEvent/}
   * @param {string} eventType The eventType to store the event as.
   * @param {Object} [attributes] JSON object with one or more key/value pairs. For example: {key:"value"}.
   */
  recordCustomEvent (eventType, attributes) {
    return this.#callMethod(RECORD_CUSTOM_EVENT, eventType, attributes)
  }

  /**
   * Groups page views to help URL structure or to capture the URL's routing information.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/setpageviewname/}
   * @param {string} name The page name you want to use. Use alphanumeric characters.
   * @param {string} [host] Default is http://custom.transaction. Typically set host to your site's domain URI.
   */
  setPageViewName (name, host) {
    return this.#callMethod(SET_PAGE_VIEW_NAME, name, host)
  }

  /**
   * Adds a user-defined attribute name and value to subsequent events on the page.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/setcustomattribute/}
   * @param {string} name Name of the attribute. Appears as column in the PageView event. It will also appear as a column in the PageAction event if you are using it.
   * @param {string|number|boolean|null} value Value of the attribute. Appears as the value in the named attribute column in the PageView event. It will appear as a column in the PageAction event if you are using it. Custom attribute values cannot be complex objects, only simple types such as Strings, Integers and Booleans. Passing a null value unsets any existing attribute of the same name.
   * @param {boolean} [persist] Default false. If set to true, the name-value pair will also be set into the browser's storage API. Then on the following instrumented pages that load within the same session, the pair will be re-applied as a custom attribute.
   */
  setCustomAttribute (name, value, persist) {
    return this.#callMethod(SET_CUSTOM_ATTRIBUTE, name, value, persist)
  }

  /**
   * Identifies a browser error without disrupting your app's operations.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/noticeerror/}
   * @param {Error|string} error Provide a meaningful error message that you can use when analyzing data on browser's JavaScript errors page.
   * @param {object} [customAttributes] An object containing name/value pairs representing custom attributes.
   */
  noticeError (error, customAttributes) {
    return this.#callMethod(NOTICE_ERROR, error, customAttributes)
  }

  /**
   * Adds a user-defined identifier string to subsequent events on the page.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/setuserid/}
   * @param {string|null} value A string identifier for the end-user, useful for tying all browser events to specific users. The value parameter does not have to be unique. If IDs should be unique, the caller is responsible for that validation. Passing a null value unsets any existing user ID.
   */
  setUserId (value) {
    return this.#callMethod(SET_USER_ID, value)
  }

  /**
   * Adds a user-defined application version string to subsequent events on the page.
   * This decorates all payloads with an attribute of `application.version` which is queryable in NR1.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/setapplicationversion/}
   * @param {string|null} value A string identifier for the application version, useful for
   * tying all browser events to a specific release tag. The value parameter does not
   * have to be unique. Passing a null value unsets any existing value.
   */
  setApplicationVersion (value) {
    return this.#callMethod(SET_APPLICATION_VERSION, value)
  }

  /**
   * Allows selective ignoring and grouping of known errors that the browser agent captures.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/seterrorhandler/}
   * @param {(error: Error|string) => boolean | { group: string }} callback When an error occurs, the callback is called with the error object as a parameter. The callback will be called with each error, so it is not specific to one error.
   */
  setErrorHandler (callback) {
    return this.#callMethod(SET_ERROR_HANDLER, callback)
  }

  /**
   * Adds a unique name and ID to identify releases with multiple JavaScript bundles on the same page.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/addrelease/}
   * @param {string} name A short description of the component; for example, the name of a project, application, file, or library.
   * @param {string} id The ID or version of this release; for example, a version number, build number from your CI environment, GitHub SHA, GUID, or a hash of the contents.
   */
  addRelease (name, id) {
    return this.#callMethod(ADD_RELEASE, name, id)
  }

  /**
   * Capture a single log.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/log/}
   * @param {string} message String to be captured as log message
   * @param {{customAttributes?: object, level?: 'ERROR'|'TRACE'|'DEBUG'|'INFO'|'WARN'}} [options] customAttributes defaults to `{}` if not assigned, level defaults to `info` if not assigned.
  */
  log (message, options) {
    return this.#callMethod(LOG, message, options)
  }

  /**
   * Starts any and all features that are not running yet in "autoStart" mode
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/start/}
   */
  start () {
    return this.#callMethod(START)
  }

  /**
   * Records an additional time point as "finished" in a session trace and adds a page action.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/finished/}
   * @param {number} [timeStamp] integer (UNIX time) - Defaults to the current time of the call. If used, this marks the time that the page is "finished" according to your own criteria.
   */
  finished (timeStamp) {
    return this.#callMethod(FINISHED, timeStamp)
  }

  /**
   * Forces a replay to record. If a replay is already actively recording, this call will be ignored.
   * If a recording has not been started, a new one will be created. If a recording has been started, but is currently not recording, it will resume recording.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/recordReplay/}
   */
  recordReplay () {
    return this.#callMethod(RECORD_REPLAY)
  }

  /**
   * Forces an active replay to pause recording.  If a replay is already actively recording, this call will cause the recording to pause.
   * If a recording is not currently recording, this call will be ignored.  This API will pause both manual and automatic replays that are in progress.
   * The only way to resume recording after manually pausing a replay is to manually record again using the recordReplay() API.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/pauseReplay/}
   */
  pauseReplay () {
    return this.#callMethod(PAUSE_REPLAY)
  }

  /**
   * Adds a JavaScript object with a custom name, start time, etc. to an in-progress session trace.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/addtotrace/}
   * @param {{name: string, start: number, end?: number, origin?: string, type?: string}} customAttributes Supply a JavaScript object with these required and optional name/value pairs:
   *
   * - Required name/value pairs: name, start
   * - Optional name/value pairs: end, origin, type
   * - Note: Does not apply to MicroAgent
   *
   * If you are sending the same event object to New Relic as a PageAction, omit the TYPE attribute. (type is a string to describe what type of event you are marking inside of a session trace.) If included, it will override the event type and cause the PageAction event to be sent incorrectly. Instead, use the name attribute for event information.
   */
  addToTrace (customAttributes) {
    return this.#callMethod(ADD_TO_TRACE, customAttributes)
  }

  /**
   * Gives SPA routes more accurate names than default names. Monitors specific routes rather than by default grouping.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/setcurrentroutename/}
   * @param {string} name Current route name for the page.
   *  - Note: Does not apply to MicroAgent
   */
  setCurrentRouteName (name) {
    return this.#callMethod(SET_CURRENT_ROUTE_NAME, name)
  }

  /**
   * Returns a new API object that is bound to the current SPA interaction.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/interaction/}
   * @param {Object} [opts] Options to configure the new or existing interaction with
   * @param {boolean} [opts.waitForEnd=false] To forcibly keep the interaction open until the `.end` method is called on its handle, set to true. Defaults to false. After an interaction is earmarked with this, it cannot be undone.
   * @returns {InteractionInstance} An API object that is bound to a specific BrowserInteraction event. Each time this method is called for the same BrowserInteraction, a new object is created, but it still references the same interaction.
   *  - Note: Does not apply to MicroAgent
   *  - Deprecation Notice: interaction.createTracer is deprecated.  See https://docs.newrelic.com/eol/2024/04/eol-04-24-24-createtracer/ for more information.
  */
  interaction (opts) {
    return this.#callMethod(INTERACTION, opts)
  }

  /**
   * Wrap a logger function to capture a log each time the function is invoked with the message and arguments passed
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/wraplogger/}
   * @param {object} parent The parent object containing the logger method
   * @param {string} functionName The property name of the function in the parent object to be wrapped
   * @param {{customAttributes?: object, level?: 'ERROR'|'TRACE'|'DEBUG'|'INFO'|'WARN'}} [options] customAttributes defaults to `{}` if not assigned, level defaults to `info` if not assigned.
  */
  wrapLogger (parent, functionName, options) {
    return this.#callMethod(WRAP_LOGGER, parent, functionName, options)
  }

  /**
   * Measures a task that is recorded as a BrowserPerformance event.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/measure/}
   * @param {string} name The name of the task
   * @param {object?} options An object used to control the way the measure API operates
   * @returns {{start: number, end: number, duration: number, customAttributes: object}} Measurement details
   */
  measure (name, options) {
    return this.#callMethod(MEASURE, name, options)
  }
}
