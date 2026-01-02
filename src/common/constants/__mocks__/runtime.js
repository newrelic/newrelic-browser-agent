/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
export const isBrowserScope = true
export const isWorkerScope = false
export const globalScope = window
export const initialLocation = '' + globalScope?.location
export const isiOS = false
export const iOSBelow16 = false
export const ffVersion = 0

export const originTime = Date.now()
