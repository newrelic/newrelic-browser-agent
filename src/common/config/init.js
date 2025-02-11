/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { FEATURE_FLAGS } from '../../features/generic_events/constants'
import { isValidSelector } from '../dom/query-selector'
import { DEFAULT_EXPIRES_MS, DEFAULT_INACTIVE_MS } from '../session/constants'
import { warn } from '../util/console'
import { getNREUMInitializedAgent } from '../window/nreum'
import { getModeledObject } from './configurable'

/**
 * @typedef {Object} Init
 * @property {Object} [ajax]
 * @property {Array<string>} [ajax.deny_list] - List of domain URLs to be excluded from AjaxRequest collection.
 * @property {boolean} [ajax.block_internal] - If true, agent requests going to harvest endpoint are treated as on deny list. In other words, agent will not self-report AJAX.
 * @property {boolean} [ajax.enabled] - Turn on/off the ajax feature (on by default).
 * @property {boolean} [ajax.autoStart] - If true, the agent will automatically start the ajax feature. Otherwise, it will be in a deferred state until the `start` API method is called.
 * @property {Object} [distributed_tracing]
 * @property {boolean} [distributed_tracing.enabled] - If true, distributed tracing headers will be added to outgoing requests. Requires ajax feature to be running.
 * @property {boolean} [distributed_tracing.exclude_newrelic_header]
 * @property {boolean} [distributed_tracing.cors_use_newrelic_header]
 * @property {boolean} [distributed_tracing.cors_use_tracecontext_headers]
 * @property {Array<string>} [distributed_tracing.allowed_origins]
 * @property {Array<string>} [feature_flags] - An array of feature flags to enable experimental features.
 * @property {Object} [generic_events]
 * @property {boolean} [generic_events.enabled] - Turn on/off the generic events feature (on by default). This is required for `PageAction`, `UserAction`, and `BrowserPerformance` events.
 * @property {boolean} [generic_events.autoStart] - If true, the agent will automatically start the generic events feature. Otherwise, it will be in a deferred state until the `start` API method is called.
 * @property {Object} [harvest]
 * @property {number} [harvest.interval] - The interval in seconds at which the agent will send out data. It's not recommended to change this value.
 * @property {Object} [jserrors]
 * @property {boolean} [jserrors.enabled] - Turn on/off the jserrors feature (on by default).
 * @property {boolean} [jserrors.autoStart] - If true, the agent will automatically start the jserrors feature. Otherwise, it will be in a deferred state until the `start` API method is called.
 * @property {Object} [logging]
 * @property {boolean} [logging.enabled] - Turn on/off the logging feature (on by default).
 * @property {boolean} [logging.autoStart] - If true, the agent will automatically start the logging feature. Otherwise, it will be in a deferred state until the `start` API method is called.
 * @property {Object} [metrics]
 * @property {boolean} [metrics.enabled] - Turn on/off the metrics feature (on by default).
 * @property {boolean} [metrics.autoStart] - If true, the agent will automatically start the metrics feature. Otherwise, it will be in a deferred state until the `start` API method is called.
 * @property {Array<Object>} [obfuscate] - Array of regexp and corresponding replacement patterns for obfuscating data.
 * @property {Object} [page_action]
 * @property {boolean} [page_action.enabled] - Must be true to allow PageAction events to be captured.
 * @property {Object} [page_view_event]
 * @property {boolean} [page_view_event.enabled] - This setting is ignored! PageViewEvent is always enabled by force.
 * @property {boolean} [page_view_event.autoStart] - If true, the agent will automatically send the RUM request. Otherwise, it will be in a deferred state until the `start` API method is called.
 * @property {Object} [page_view_timing]
 * @property {boolean} [page_view_timing.enabled] - Turn on/off the page view timing feature (on by default).
 * @property {boolean} [page_view_timing.autoStart] - If true, the agent will automatically start the page view timing feature. Otherwise, it will be in a deferred state until the `start` API method is called.
 * @property {Object} [performance]
 * @property {boolean} [performance.capture_marks] - If true, the agent will capture PerformanceMark events.
 * @property {boolean} [performance.capture_measures] - If true, the agent will capture PerformanceMeasure events.
 * @property {boolean} [performance.capture_detail] - If true, `BrowserPerformance` events from marks and measures will include, as attribute(s), the `detail` metadata provided to `markOptions` and `measureOptions`.
 * @property {Object} [performance.resources]
 * @property {boolean} [performance.resources.enabled] - If true, the agent will capture PerformanceResourceTiming entries.
 * @property {Array<string>} [performance.resources.asset_types] - Array of `initiatorType` strings to filter the desired ResourceTiming entries. By default, all resource types are captured.
 * @property {Array<string>} [performance.resources.first_party_domains] - Each resource URL will be checked against this list to determine if it should be labeled "first party" in the resulting `BrowserPerformance` event.
 * @property {boolean} [performance.resources.ignore_newrelic] - When true (default), resource entries associated with New Relic domains will be ignored.
 * @property {Object} [privacy]
 * @property {boolean} [privacy.cookies_enabled] - If true (default), session tracking of users across page loads is enabled in the agent. This is required for session trace, replay, and session-related features.
 * @property {Object} [proxy]
 * @property {string} [proxy.assets] - Set value will be used to overwrite the webpack asset path used to fetch agent assets.
 * @property {string} [proxy.beacon] - Set value will be used to overwrite the endpoint URL to which we send analytics.
 * @property {Object} [session]
 * @property {number} [session.expiresMs] - When session tracking is on, this determines how long a session will last before expiring. Modifying this value is not recommended.
 * @property {number} [session.inactiveMs] - When session tracking is on, this determines how long a session will last without user activity before expiring. Modifying this value is not recommended.
 * @property {Object} [session_replay]
 * @property {boolean} [session_replay.autoStart] - If true, the agent will automatically start the session replay feature. Otherwise, it will be in a deferred state until the `start` API method is called.
 * @property {boolean} [session_replay.enabled] - Turn on/off the session replay feature (off by default).
 * @property {boolean} [session_replay.preload] - If true, allow the agent to run rrweb recorder immediately instead of waiting until after the window.load event, for new sessions. Existing sessions ignore this setting.
 * @property {number} [session_replay.sampling_rate] - This setting is deprecated and ineffective. Sampling is controlled in New Relic by server-side configuration.
 * @property {number} [session_replay.error_sampling_rate] - This setting is deprecated and ineffective.
 * @property {boolean} [session_replay.collect_fonts] - When true, serialize fonts for collection without public asset url. This is currently broken -- https://github.com/rrweb-io/rrweb/issues/1304.
 * @property {boolean} [session_replay.inline_images] - When true, serialize images for collection without public asset url. Not recommended for use. This is currently for TESTING as it easily generates payloads too large to be harvested.
 * @property {boolean} [session_replay.fix_stylesheets] - When true, tries to fetch any missing stylesheets again to inline in replayer.
 * @property {boolean} [session_replay.mask_all_inputs] - If true, all input content will be masked with asterisks.
 * @property {string} [session_replay.mask_text_selector] - Set value should be in CSS selector syntax and is used to identify matching elements to mask.
 * @property {string} [session_replay.block_selector] - Set value should be in CSS selector syntax and is used to identify matching elements to block.
 * @property {Object} [session_replay.mask_input_options] - If mask_all_inputs is not true, this object will be used to select what input to mask. Passwords are forcibly always masked.
 * @property {Object} [session_trace]
 * @property {boolean} [session_trace.enabled] - Turn on/off the session trace feature (on by default).
 * @property {boolean} [session_trace.autoStart] - If true, the agent will automatically start the session trace feature. Otherwise, it will be in a deferred state until the `start` API method is called.
 * @property {Object} [soft_navigations]
 * @property {boolean} [soft_navigations.enabled] - Turn on/off the soft navigations feature (on by default).
 * @property {boolean} [soft_navigations.autoStart] - If true, the agent will automatically start the soft navigations feature. Otherwise, it will be in a deferred state until the `start` API method is called.
 * @property {Object} [spa]
 * @property {boolean} [spa.enabled] - Turn on/off the single page application feature (on by default). NOTE: the SPA feature is deprecated and under removal procedure.
 * @property {boolean} [spa.autoStart] - If true, the agent will automatically start the single page application feature. Otherwise, it will be in a deferred state until the `start` API method is called.
 * @property {boolean} [ssl] - If explicitly false, the agent will use HTTP instead of HTTPS. This setting should NOT be used.
 * @property {Object} [user_actions]
 * @property {boolean} [user_actions.enabled] - Must be true to allow UserAction events to be captured.
 * @property {Array<string>} [user_actions.elementAttributes] - List of HTML Element properties to be captured with UserAction events' target elements. This may help to identify the source element being interacted with in the UI.
 */

const nrMask = '[data-nr-mask]'
const model = () => {
  const hiddenState = {
    feature_flags: [],
    experimental: {
      marks: false,
      measures: false,
      resources: false
    },
    mask_selector: '*',
    block_selector: '[data-nr-block]',
    mask_input_options: {
      color: false,
      date: false,
      'datetime-local': false,
      email: false,
      month: false,
      number: false,
      range: false,
      search: false,
      tel: false,
      text: false,
      time: false,
      url: false,
      week: false,
      // unify textarea and select element with text input
      textarea: false,
      select: false,
      password: true // This will be enforced to always be true in the setter
    }
  }
  return {
    ajax: { deny_list: undefined, block_internal: true, enabled: true, autoStart: true },
    distributed_tracing: {
      enabled: undefined,
      exclude_newrelic_header: undefined,
      cors_use_newrelic_header: undefined,
      cors_use_tracecontext_headers: undefined,
      allowed_origins: undefined
    },
    get feature_flags () { return hiddenState.feature_flags },
    set feature_flags (val) { hiddenState.feature_flags = val },
    generic_events: { enabled: true, autoStart: true },
    harvest: { interval: 30 },
    jserrors: { enabled: true, autoStart: true },
    logging: { enabled: true, autoStart: true },
    metrics: { enabled: true, autoStart: true },
    obfuscate: undefined,
    page_action: { enabled: true },
    page_view_event: { enabled: true, autoStart: true },
    page_view_timing: { enabled: true, autoStart: true },
    performance: {
      get capture_marks () { return hiddenState.feature_flags.includes(FEATURE_FLAGS.MARKS) || hiddenState.experimental.marks },
      set capture_marks (val) { hiddenState.experimental.marks = val },
      get capture_measures () { return hiddenState.feature_flags.includes(FEATURE_FLAGS.MEASURES) || hiddenState.experimental.measures },
      set capture_measures (val) { hiddenState.experimental.measures = val },
      capture_detail: true,
      resources: {
        get enabled () { return hiddenState.feature_flags.includes(FEATURE_FLAGS.RESOURCES) || hiddenState.experimental.resources },
        set enabled (val) { hiddenState.experimental.resources = val },
        asset_types: [],
        first_party_domains: [],
        ignore_newrelic: true
      }
    },
    privacy: { cookies_enabled: true },
    proxy: {
      assets: undefined,
      beacon: undefined
    },
    session: {
      expiresMs: DEFAULT_EXPIRES_MS,
      inactiveMs: DEFAULT_INACTIVE_MS
    },
    session_replay: {
      autoStart: true,
      enabled: false,
      preload: false,
      sampling_rate: 10,
      error_sampling_rate: 100,
      collect_fonts: false,
      inline_images: false,
      fix_stylesheets: true,
      // recording config settings
      mask_all_inputs: true,
      // this has a getter/setter to facilitate validation of the selectors
      get mask_text_selector () { return hiddenState.mask_selector },
      set mask_text_selector (val) {
        if (isValidSelector(val)) hiddenState.mask_selector = `${val},${nrMask}`
        else if (val === '' || val === null) hiddenState.mask_selector = nrMask
        else warn(5, val)
      },
      // these properties only have getters because they are enforcable constants and should error if someone tries to override them
      get block_class () { return 'nr-block' },
      get ignore_class () { return 'nr-ignore' },
      get mask_text_class () { return 'nr-mask' },
      // props with a getter and setter are used to extend enforcable constants with customer input
      // we must preserve data-nr-block no matter what else the customer sets
      get block_selector () {
        return hiddenState.block_selector
      },
      set block_selector (val) {
        if (isValidSelector(val)) hiddenState.block_selector += `,${val}`
        else if (val !== '') warn(6, val)
      },
      // password: must always be present and true no matter what customer sets
      get mask_input_options () {
        return hiddenState.mask_input_options
      },
      set mask_input_options (val) {
        if (val && typeof val === 'object') hiddenState.mask_input_options = { ...val, password: true }
        else warn(7, val)
      }
    },
    session_trace: { enabled: true, autoStart: true },
    soft_navigations: { enabled: true, autoStart: true },
    spa: { enabled: true, autoStart: true },
    ssl: undefined,
    user_actions: { enabled: true, elementAttributes: ['id', 'className', 'tagName', 'type'] }
  }
}

const _cache = {}
const missingAgentIdError = 'All configuration objects require an agent identifier!'

export function getConfiguration (id) {
  if (!id) throw new Error(missingAgentIdError)
  if (!_cache[id]) throw new Error(`Configuration for ${id} was never set`)
  return _cache[id]
}

export function setConfiguration (id, obj) {
  if (!id) throw new Error(missingAgentIdError)
  _cache[id] = getModeledObject(obj, model())
  const agentInst = getNREUMInitializedAgent(id)
  if (agentInst) agentInst.init = _cache[id]
}

export function getConfigurationValue (id, path) {
  if (!id) throw new Error(missingAgentIdError)
  var val = getConfiguration(id)
  if (val) {
    var parts = path.split('.')
    for (var i = 0; i < parts.length - 1; i++) {
      val = val[parts[i]]
      if (typeof val !== 'object') return
    }
    val = val[parts[parts.length - 1]]
  }
  return val
}

// TO DO: a setConfigurationValue equivalent may be nice so individual
//  properties can be tuned instead of reseting the whole model per call to `setConfiguration(agentIdentifier, {})`
