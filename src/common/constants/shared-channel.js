/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @file Keeps an object alive that is passed to all feature aggregate modules.
 * The purpose is to have a way for communication and signals to relay across features at runtime.
 * This object can hold any arbitrary values and should be treated as on-the-fly dynamic.
 */

let onReplayReady
const sessionReplayInitialized = new Promise(resolve => { onReplayReady = resolve })

export const sharedChannel = Object.freeze({
  onReplayReady,
  sessionReplayInitialized
})
