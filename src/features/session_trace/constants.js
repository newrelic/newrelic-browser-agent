/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { FEATURE_NAMES } from '../../loaders/features/features'

export const FEATURE_NAME = FEATURE_NAMES.sessionTrace
export const BST_RESOURCE = 'bstResource'
export const RESOURCE = 'resource'
export const START = '-start'
export const END = '-end'
export const FN_START = 'fn' + START
export const FN_END = 'fn' + END
export const PUSH_STATE = 'pushState'
export const MAX_NODES_PER_HARVEST = 1000
