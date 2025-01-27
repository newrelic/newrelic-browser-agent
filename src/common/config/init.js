/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { FEATURE_FLAGS } from '../../features/generic_events/constants'
import { LOG_LEVELS } from '../../features/logging/constants'
import { isValidSelector } from '../dom/query-selector'
import { DEFAULT_EXPIRES_MS, DEFAULT_INACTIVE_MS } from '../session/constants'
import { warn } from '../util/console'
import { getNREUMInitializedAgent } from '../window/nreum'
import { getModeledObject } from './configurable'

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
    external: { capture_registered_data: false },
    get feature_flags () { return hiddenState.feature_flags },
    set feature_flags (val) { hiddenState.feature_flags = val },
    generic_events: { enabled: true, autoStart: true },
    harvest: { interval: 30 },
    jserrors: { enabled: true, autoStart: true },
    logging: { enabled: true, autoStart: true, level: LOG_LEVELS.INFO },
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
        // whether to run this subfeature or not in the generic_events feature. false by default through experimental phase, but flipped to true once GA'd
        get enabled () { return hiddenState.feature_flags.includes(FEATURE_FLAGS.RESOURCES) || hiddenState.experimental.resources },
        set enabled (val) { hiddenState.experimental.resources = val },
        asset_types: [], // MDN types to collect, empty array will collect all types
        first_party_domains: [], // when included, will decorate the resource as first party if matching
        ignore_newrelic: true // ignore capturing internal agent scripts and harvest calls
      }
    },
    privacy: { cookies_enabled: true }, // *cli - per discussion, default should be true
    proxy: {
      assets: undefined, // if this value is set, it will be used to overwrite the webpack asset path used to fetch assets
      beacon: undefined // likewise for the url to which we send analytics
    },
    session: {
      expiresMs: DEFAULT_EXPIRES_MS,
      inactiveMs: DEFAULT_INACTIVE_MS
    },
    session_replay: {
      // feature settings
      autoStart: true,
      enabled: false,
      preload: false, // if true, enables the agent to load rrweb immediately instead of waiting to do so after the window.load event
      sampling_rate: 10, // float from 0 - 100
      error_sampling_rate: 100, // float from 0 - 100
      collect_fonts: false, // serialize fonts for collection without public asset url, this is currently broken in RRWeb -- https://github.com/rrweb-io/rrweb/issues/1304.  When fixed, revisit with test cases
      inline_images: false, // serialize images for collection without public asset url -- right now this is only useful for testing as it easily generates payloads too large to be harvested
      fix_stylesheets: true, // fetch missing stylesheet resources for inlining
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
    user_actions: { enabled: true }
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
