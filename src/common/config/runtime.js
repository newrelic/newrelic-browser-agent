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
let _harvestCount = 0

const ReadOnly = {
  buildEnv: BUILD_ENV,
  distMethod: DIST_METHOD,
  version: VERSION,
  originTime
}

const RuntimeModel = {
  /** Agent-specific metadata found in the RUM call response. ex. entityGuid */
  appMetadata: {},
  customTransaction: undefined,
  denyList: undefined,
  disabled: false,
  entityManager: undefined,
  harvester: undefined,
  isolatedBacklog: false,
  loaderType: undefined,
  maxBytes: 30000,
  obfuscator: undefined,
  onerror: undefined,
  ptid: undefined,
  releaseIds: {},
  session: undefined,
  timeKeeper: undefined,
  get harvestCount () { return ++_harvestCount }
}

export const mergeRuntime = (runtime) => {
  const modeledObject = getModeledObject(runtime, RuntimeModel)
  const readonlyDescriptors = Object.keys(ReadOnly).reduce((descriptors, key) => {
    descriptors[key] = { value: ReadOnly[key], writable: false, configurable: true, enumerable: true }
    return descriptors
  }, {})
  return Object.defineProperties(modeledObject, readonlyDescriptors)
}
