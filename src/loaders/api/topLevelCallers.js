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
    nr[fnName] = (...args) => agentRef[fnName](...args)
  })
}
