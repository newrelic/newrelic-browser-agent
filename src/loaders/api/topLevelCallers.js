/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { gosCDN } from '../../common/window/nreum'
import { ApiBase } from '../api-base'

export function setTopLevelCallers (agentRef) {
  const nr = gosCDN()

  Object.getOwnPropertyNames(ApiBase.prototype).forEach(fnName => {
    const origFn = ApiBase.prototype[fnName]
    if (typeof origFn !== 'function' || origFn === 'constructor') return
    /** if the method already exists on the top and we are allowed to -- we can call it multiple times */
    let origNrFn = nr[fnName]
    if (!agentRef[fnName] || !agentRef.exposed || agentRef.runtime?.loaderType === 'micro-agent') return // dont set the top level callers if we are not allowed to

    nr[fnName] = (...args) => {
      const thisAgentFnResult = agentRef[fnName](...args)
      if (!origNrFn) return thisAgentFnResult
      return origNrFn(...args) // if origFn is defined, we want to return the value from that call (ie the first agent that was set)
    }
  })
}
