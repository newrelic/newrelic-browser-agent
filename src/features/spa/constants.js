/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { gosNREUMOriginals } from '../../common/window/nreum'
import { FEATURE_NAMES } from '../../loaders/features/features'

export const FEATURE_NAME = FEATURE_NAMES.spa
export const INTERACTION_EVENTS = [
  'click',
  'submit',
  'keypress',
  'keydown',
  'keyup',
  'change'
]

export const MAX_TIMER_BUDGET = 999
export const FN_START = 'fn-start'
export const FN_END = 'fn-end'
export const CB_START = 'cb-start'
export const INTERACTION_API = 'api-ixn-'
export const REMAINING = 'remaining'
export const INTERACTION = 'interaction'
export const SPA_NODE = 'spaNode'
export const JSONP_NODE = 'jsonpNode'
export const FETCH_START = 'fetch-start'
export const FETCH_DONE = 'fetch-done'
export const FETCH_BODY = 'fetch-body-'
export const JSONP_END = 'jsonp-end'

export const originalSetTimeout = gosNREUMOriginals().o.ST

export const START = '-start'
export const END = '-end'
export const BODY = '-body'
export const CB_END = 'cb' + END
export const JS_TIME = 'jsTime'
export const FETCH = 'fetch'
