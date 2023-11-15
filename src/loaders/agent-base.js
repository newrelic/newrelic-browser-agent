/* eslint-disable n/handle-callback-err */

import { warn } from '../common/util/console'

export class AgentBase {
  /**
   * Reports a browser PageAction event along with a name and optional attributes.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/addpageaction/}
   * @param {string} name Name or category of the action. Reported as the actionName attribute.
   * @param {object} [attributes] JSON object with one or more key/value pairs. For example: {key:"value"}. The key is reported as its own PageAction attribute with the specified values.
   */
  addPageAction (name, attributes) {
    warn('Call to agent api addPageAction failed. The page action feature is not currently initialized.')
  }

  /**
   * Groups page views to help URL structure or to capture the URL's routing information.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/setpageviewname/}
   * @param {string} name The page name you want to use. Use alphanumeric characters.
   * @param {string} [host] Default is http://custom.transaction. Typically set host to your site's domain URI.
   */
  setPageViewName (name, host) {
    warn('Call to agent api setPageViewName failed. The page view feature is not currently initialized.')
  }

  /**
   * Adds a user-defined attribute name and value to subsequent events on the page.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/setcustomattribute/}
   * @param {string} name Name of the attribute. Appears as column in the PageView event. It will also appear as a column in the PageAction event if you are using it.
   * @param {string|number|null} value Value of the attribute. Appears as the value in the named attribute column in the PageView event. It will appear as a column in the PageAction event if you are using it. Custom attribute values cannot be complex objects, only simple types such as Strings and Integers.
   * @param {boolean} [persist] Default false. f set to true, the name-value pair will also be set into the browser's storage API. Then on the following instrumented pages that load within the same session, the pair will be re-applied as a custom attribute.
   */
  setCustomAttribute (name, value, persist) {
    warn('Call to agent api setCustomAttribute failed. The js errors feature is not currently initialized.')
  }

  /**
   * Identifies a browser error without disrupting your app's operations.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/noticeerror/}
   * @param {Error|string} error Provide a meaningful error message that you can use when analyzing data on browser's JavaScript errors page.
   * @param {object} [customAttributes] An object containing name/value pairs representing custom attributes.
   */
  noticeError (error, customAttributes) {
    warn('Call to agent api noticeError failed. The js errors feature is not currently initialized.')
  }

  /**
   * Adds a user-defined identifier string to subsequent events on the page.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/setuserid/}
   * @param {string|null} value A string identifier for the end-user, useful for tying all browser events to specific users. The value parameter does not have to be unique. If IDs should be unique, the caller is responsible for that validation. Passing a null value unsets any existing user ID.
   */
  setUserId (value) {
    warn('Call to agent api setUserId failed. The js errors feature is not currently initialized.')
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
    warn('Call to agent api setApplicationVersion failed. The agent is not currently initialized.')
  }

  /**
   * Allows selective ignoring and grouping of known errors that the browser agent captures.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/seterrorhandler/}
   * @param {(error: Error|string) => boolean | { group: string }} callback When an error occurs, the callback is called with the error object as a parameter. The callback will be called with each error, so it is not specific to one error.
   */
  setErrorHandler (callback) {
    warn('Call to agent api setErrorHandler failed. The js errors feature is not currently initialized.')
  }

  /**
   * Records an additional time point as "finished" in a session trace, and sends the event to New Relic.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/finished/}
   * @param {number} [timeStamp] Defaults to the current time of the call. If used, this marks the time that the page is "finished" according to your own criteria.
   */
  finished (timeStamp) {
    warn('Call to agent api finished failed. The page action feature is not currently initialized.')
  }

  /**
   * Adds a unique name and ID to identify releases with multiple JavaScript bundles on the same page.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/addrelease/}
   * @param {string} name A short description of the component; for example, the name of a project, application, file, or library.
   * @param {string} id The ID or version of this release; for example, a version number, build number from your CI environment, GitHub SHA, GUID, or a hash of the contents.
   */
  addRelease (name, id) {
    warn('Call to agent api addRelease failed. The js errors feature is not currently initialized.')
  }

  /**
   * Starts a set of agent features if not running in "autoStart" mode
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/start/}
   * @param {string|string[]} [featureNames] The name(s) of the features to start.  If no name(s) are passed, all features will be started
   */
  start (featureNames) {
    warn('Call to agent api addRelease failed. The agent is not currently initialized.')
  }

  /**
   * Forces a replay to record. If a replay is already actively recording, this call will be ignored.
   * If a recording has not been started, a new one will be created. If a recording has been started, but is currently not recording, it will resume recording.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/recordReplay/}
   */
  recordReplay () {
    warn('Call to agent api recordReplay failed. The agent is not currently initialized.')
  }

  /**
   * Forces an active replay to pause recording.  If a replay is already actively recording, this call will cause the recording to pause.
   * If a recording is not currently recording, this call will be ignored.  This API will pause both manual and automatic replays that are in progress.
   * The only way to resume recording after manually pausing a replay is to manually record again using the recordReplay() API.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/recordReplay/}
   */
  pauseReplay () {
    warn('Call to agent api pauseReplay failed. The agent is not currently initialized.')
  }
}
