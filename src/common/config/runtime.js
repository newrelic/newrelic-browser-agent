/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { getModeledObject } from './configurable'
import { getNREUMInitializedAgent } from '../window/nreum'
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

const model = {
  /** Agent-specific metadata found in the RUM call response. ex. entityGuid */
  appMetadata: {},
  customTransaction: undefined,
  denyList: undefined,
  disabled: false,
  entityManager: undefined,
  harvester: undefined,
  isolatedBacklog: false,
  isRecording: false, // true when actively recording, false when paused or stopped
  loaderType: undefined,
  maxBytes: 30000,
  obfuscator: undefined,
  onerror: undefined,
  ptid: undefined,
  releaseIds: {},
  session: undefined,
  timeKeeper: undefined
}

const _cache = {}

export function getRuntime (id) {
  if (!id) throw new Error('All runtime objects require an agent identifier!')
  if (!_cache[id]) throw new Error(`Runtime for ${id} was never set`)
  return _cache[id]
}

export function setRuntime (id, obj) {
  if (!id) throw new Error('All runtime objects require an agent identifier!')
  _cache[id] = {
    ...getModeledObject(obj, model),
    ...readonly
  }

  if (!Object.hasOwnProperty.call(_cache[id], 'harvestCount')) {
    // Harvest count needs to be added as a getter so the variable is updated each time it is accessed
    Object.defineProperty(_cache[id], 'harvestCount', {
      get: () => ++harvestCount
    })
  }

  const agentInst = getNREUMInitializedAgent(id)
  if (agentInst) agentInst.runtime = _cache[id]
}
