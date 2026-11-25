/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { FEATURE_NAMES } from '../../loaders/features/features'

export const FEATURE_NAME = FEATURE_NAMES.ajax
export const CAPTURE_PAYLOAD_SETTINGS = {
  NONE: 'none',
  FAILURES: 'failures',
  ALL: 'all'
}
export const AJAX_ID = 'ajaxRequest.id'
/**
 * Values of the `reason` attribute set on AjaxRequest events that did not resolve normally. Such events always have a status of 0.
 * @type {{ TIMED_OUT: string, ABORTED: string, PAGE_UNLOADED: string }}
 */
export const AJAX_REASONS = {
  TIMED_OUT: 'timedOut',
  ABORTED: 'aborted',
  PAGE_UNLOADED: 'pageUnloaded'
}
