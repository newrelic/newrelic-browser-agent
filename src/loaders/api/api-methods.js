/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { SR_EVENT_EMITTER_TYPES } from '../../features/session_replay/constants'

export const apiMethods = [
  'setErrorHandler', 'finished', 'addToTrace', 'addRelease', 'recordCustomEvent',
  'addPageAction', 'setCurrentRouteName', 'setPageViewName', 'setCustomAttribute',
  'interaction', 'noticeError', 'setUserId', 'setApplicationVersion', 'start',
  SR_EVENT_EMITTER_TYPES.RECORD, SR_EVENT_EMITTER_TYPES.PAUSE, 'log', 'wrapLogger'
]

export const asyncApiMethods = [
  'setErrorHandler', 'finished', 'addToTrace', 'addRelease'
]
