/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { FEATURE_NAMES } from '../../loaders/features/features'

export const INTERACTION_TRIGGERS = [
  'click', // e.g. user clicks link or the page back/forward buttons
  'keydown', // e.g. user presses left and right arrow key to switch between displayed photo gallery
  'submit' // e.g. user clicks submit butotn or presses enter while editing a form field
]
export const POPSTATE_TRIGGER = 'popstate' // e.g. user clicks browser back/forward button or history API is used programmatically
export const API_TRIGGER_NAME = 'api'
export const IPL_TRIGGER_NAME = 'initialPageLoad'

export const FEATURE_NAME = FEATURE_NAMES.softNav
export const NO_LONG_TASK_WINDOW = 5000 // purpose is to wait 5 seconds wherein no long task is detected
export const POPSTATE_MERGE_WINDOW = 500 // "coalesce" (discard) a popstate that happen within this period following an INTERACTION_TRIGGER opening ixn, e.g. click->popstate

export const INTERACTION_TYPE = {
  INITIAL_PAGE_LOAD: '',
  ROUTE_CHANGE: 1,
  UNSPECIFIED: 2
}

export const NODE_TYPE = {
  INTERACTION: 1,
  AJAX: 2,
  CUSTOM_END: 3,
  CUSTOM_TRACER: 4
}

export const INTERACTION_STATUS = {
  IP: 'in progress',
  PF: 'pending finish', // interaction meets the hard criteria but is awaiting flexible conditions to fully finish
  FIN: 'finished',
  CAN: 'cancelled'
}
