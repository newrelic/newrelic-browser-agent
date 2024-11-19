/* eslint-disable n/handle-callback-err */

import { warn } from '../common/util/console'
import { SR_EVENT_EMITTER_TYPES } from '../features/session_replay/constants'
import { MicroAgentBase } from './micro-agent-base'

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
