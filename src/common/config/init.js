/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { FEATURE_FLAGS } from '../../features/generic_events/constants'
import { isValidSelector } from '../dom/query-selector'
import { DEFAULT_EXPIRES_MS, DEFAULT_INACTIVE_MS } from '../session/constants'
import { warn } from '../util/console'
import { getModeledObject } from './configurable'

/**
 * @typedef {import('./init-types').Init} Init
 */

const nrMask = '[data-nr-mask]'

/**
 * @returns {Init} the default configuration object
 */
const InitModelFn = () => {
  const hiddenState = {
    feature_flags: [],
    experimental: {
      allow_registered_children: false,
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
    api: {
      get allow_registered_children () { return hiddenState.feature_flags.includes(FEATURE_FLAGS.REGISTER) || hiddenState.experimental.allow_registered_children },
      set allow_registered_children (val) { hiddenState.experimental.allow_registered_children = val },
      duplicate_registered_data: false
    },
    browser_consent_mode: { enabled: false },
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
      capture_marks: false,
      capture_measures: false,
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

export const mergeInit = (init) => {
  return getModeledObject(init, InitModelFn())
}
