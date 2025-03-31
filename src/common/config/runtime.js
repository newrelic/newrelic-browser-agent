/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { getModeledObject } from './configurable'
import { originTime } from '../constants/runtime'
import { BUILD_ENV, DIST_METHOD, VERSION } from '../constants/env'

/**
 * Module level count of harvests. This property will auto-increment each time it is accessed.
 * @type {number}
 */
let harvestCount = 0

const readonly = {
  buildEnv: BUILD_ENV,
  distMethod: DIST_METHOD,
  version: VERSION,
  originTime
}

const RuntimeModel = {
  customTransaction: undefined,
  disabled: false,
  isolatedBacklog: false,
  loaderType: undefined,
  maxBytes: 30000,
  onerror: undefined,
  ptid: undefined,
  releaseIds: {},
  /** Agent-specific metadata found in the RUM call response. ex. entityGuid */
  appMetadata: {},
  session: undefined,
  denyList: undefined,
  timeKeeper: undefined,
  obfuscator: undefined,
  harvester: undefined,
  get harvestCount () {
    return ++harvestCount
  }
}

export const mergeRuntime = (runtime) => {
  return Object.assign(getModeledObject(runtime, RuntimeModel), readonly)
}
