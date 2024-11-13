/* eslint-disable n/handle-callback-err */

import { warn } from '../common/util/console'
import { SR_EVENT_EMITTER_TYPES } from '../features/session_replay/constants'
import { generateRandomHexString } from '../common/ids/unique-id'

export class MicroAgentBase {
  agentIdentifier

  constructor (agentIdentifier = generateRandomHexString(16)) {
    this.agentIdentifier = agentIdentifier
  }

  /**
   * Tries to execute the api and generates a generic warning message with the api name injected if unsuccessful
   * @param {string} methodName
   * @param  {...any} args
   */
  #callMethod (methodName, ...args) {
    if (typeof this.api?.[methodName] !== 'function') warn(35, methodName)
    else return this.api[methodName](...args)
  }

  // MicroAgent class custom defines its own start

  /**
   * Reports a browser PageAction event along with a name and optional attributes.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/addpageaction/}
   * @param {string} name Name or category of the action. Reported as the actionName attribute.
   * @param {object} [attributes] JSON object with one or more key/value pairs. For example: {key:"value"}. The key is reported as its own PageAction attribute with the specified values.
   */
  addPageAction (name, attributes) {
    return this.#callMethod('addPageAction', name, attributes)
  }

  /**
   * Groups page views to help URL structure or to capture the URL's routing information.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/setpageviewname/}
   * @param {string} name The page name you want to use. Use alphanumeric characters.
   * @param {string} [host] Default is http://custom.transaction. Typically set host to your site's domain URI.
   */
  setPageViewName (name, host) {
    return this.#callMethod('setPageViewName', name, host)
  }

  /**
   * Adds a user-defined attribute name and value to subsequent events on the page.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/setcustomattribute/}
   * @param {string} name Name of the attribute. Appears as column in the PageView event. It will also appear as a column in the PageAction event if you are using it.
   * @param {string|number|boolean|null} value Value of the attribute. Appears as the value in the named attribute column in the PageView event. It will appear as a column in the PageAction event if you are using it. Custom attribute values cannot be complex objects, only simple types such as Strings, Integers and Booleans. Passing a null value unsets any existing attribute of the same name.
   * @param {boolean} [persist] Default false. If set to true, the name-value pair will also be set into the browser's storage API. Then on the following instrumented pages that load within the same session, the pair will be re-applied as a custom attribute.
   */
  setCustomAttribute (name, value, persist) {
    return this.#callMethod('setCustomAttribute', name, value, persist)
  }

  /**
   * Identifies a browser error without disrupting your app's operations.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/noticeerror/}
   * @param {Error|string} error Provide a meaningful error message that you can use when analyzing data on browser's JavaScript errors page.
   * @param {object} [customAttributes] An object containing name/value pairs representing custom attributes.
   */
  noticeError (error, customAttributes) {
    return this.#callMethod('noticeError', error, customAttributes)
  }

  /**
   * Adds a user-defined identifier string to subsequent events on the page.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/setuserid/}
   * @param {string|null} value A string identifier for the end-user, useful for tying all browser events to specific users. The value parameter does not have to be unique. If IDs should be unique, the caller is responsible for that validation. Passing a null value unsets any existing user ID.
   */
  setUserId (value) {
    return this.#callMethod('setUserId', value)
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
    return this.#callMethod('setApplicationVersion', value)
  }

  /**
   * Allows selective ignoring and grouping of known errors that the browser agent captures.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/seterrorhandler/}
   * @param {(error: Error|string) => boolean | { group: string }} callback When an error occurs, the callback is called with the error object as a parameter. The callback will be called with each error, so it is not specific to one error.
   */
  setErrorHandler (callback) {
    return this.#callMethod('setErrorHandler', callback)
  }

  /**
   * Adds a unique name and ID to identify releases with multiple JavaScript bundles on the same page.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/addrelease/}
   * @param {string} name A short description of the component; for example, the name of a project, application, file, or library.
   * @param {string} id The ID or version of this release; for example, a version number, build number from your CI environment, GitHub SHA, GUID, or a hash of the contents.
   */
  addRelease (name, id) {
    return this.#callMethod('addRelease', name, id)
  }

  /**
   * Capture a single log.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/log/}
   * @param {string} message String to be captured as log message
   * @param {{customAttributes?: object, level?: 'ERROR'|'TRACE'|'DEBUG'|'INFO'|'WARN'}} [options] customAttributes defaults to `{}` if not assigned, level defaults to `info` if not assigned.
  */
  log (message, options) {
    return this.#callMethod('log', message, options)
  }
}

/**
 * @typedef {import('./api/interaction-types').InteractionInstance} InteractionInstance
 */

export class AgentBase extends MicroAgentBase {
  /**
   * Tries to execute the api and generates a generic warning message with the api name injected if unsuccessful
   * @param {string} methodName
   * @param  {...any} args
   */
  #callMethod (methodName, ...args) {
    if (typeof this.api?.[methodName] !== 'function') warn(35, methodName)
    else return this.api[methodName](...args)
  }

  /**
   * Starts any and all features that are not running yet in "autoStart" mode
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/start/}
   */
  start () {
    return this.#callMethod('start')
  }

  /**
   * Records an additional time point as "finished" in a session trace and adds a page action.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/finished/}
   * @param {number} [timeStamp] Defaults to the current time of the call. If used, this marks the time that the page is "finished" according to your own criteria.
   */
  finished (timeStamp) {
    return this.#callMethod('finished', timeStamp)
  }

  /**
   * Forces a replay to record. If a replay is already actively recording, this call will be ignored.
   * If a recording has not been started, a new one will be created. If a recording has been started, but is currently not recording, it will resume recording.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/recordReplay/}
   */
  recordReplay () {
    return this.#callMethod(SR_EVENT_EMITTER_TYPES.RECORD)
  }

  /**
   * Forces an active replay to pause recording.  If a replay is already actively recording, this call will cause the recording to pause.
   * If a recording is not currently recording, this call will be ignored.  This API will pause both manual and automatic replays that are in progress.
   * The only way to resume recording after manually pausing a replay is to manually record again using the recordReplay() API.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/pauseReplay/}
   */
  pauseReplay () {
    return this.#callMethod(SR_EVENT_EMITTER_TYPES.PAUSE)
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
    return this.#callMethod('addToTrace', customAttributes)
  }

  /**
   * Gives SPA routes more accurate names than default names. Monitors specific routes rather than by default grouping.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/setcurrentroutename/}
   * @param {string} name Current route name for the page.
   *  - Note: Does not apply to MicroAgent
   */
  setCurrentRouteName (name) {
    return this.#callMethod('setCurrentRouteName', name)
  }

  /**
   * Returns a new API object that is bound to the current SPA interaction.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/interaction/}
   * @returns {InteractionInstance} An API object that is bound to a specific BrowserInteraction event. Each time this method is called for the same BrowserInteraction, a new object is created, but it still references the same interaction.
   *  - Note: Does not apply to MicroAgent
   *  - Deprecation Notice: interaction.createTracer is deprecated.  See https://docs.newrelic.com/eol/2024/04/eol-04-24-24-createtracer/ for more information.
  */
  interaction () {
    return this.#callMethod('interaction')
  }

  /**
   * Wrap a logger function to capture a log each time the function is invoked with the message and arguments passed
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/wraplogger/}
   * @param {object} parent The parent object containing the logger method
   * @param {string} functionName The property name of the function in the parent object to be wrapped
   * @param {{customAttributes?: object, level?: 'ERROR'|'TRACE'|'DEBUG'|'INFO'|'WARN'}} [options] customAttributes defaults to `{}` if not assigned, level defaults to `info` if not assigned.
  */
  wrapLogger (parent, functionName, options) {
    return this.#callMethod('wrapLogger', parent, functionName, options)
  }
}
