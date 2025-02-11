/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ADD_EVENT_LISTENER_TAG } from '../../common/wrap/wrap-websocket'
import { FEATURE_NAMES } from '../../loaders/features/features'

export const FEATURE_NAME = FEATURE_NAMES.metrics
export const SUPPORTABILITY_METRIC = 'sm'
export const CUSTOM_METRIC = 'cm'
export const SUPPORTABILITY_METRIC_CHANNEL = 'storeSupportabilityMetrics'
export const CUSTOM_METRIC_CHANNEL = 'storeEventMetrics'

export const WATCHABLE_WEB_SOCKET_EVENTS = ['new', 'send', 'close', ADD_EVENT_LISTENER_TAG]
