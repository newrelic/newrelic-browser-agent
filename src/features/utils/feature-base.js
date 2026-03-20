/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { deregisterDrain } from '../../common/drain/drain'

export class FeatureBase {
  constructor (agentRef, featureName) {
    /** @type {Object} */
    this.agentRef = agentRef
    /** @type {import('../../common/event-emitter/contextual-ee').ee} */
    this.ee = agentRef?.ee
    /** @type {string} */
    this.featureName = featureName
    /**
     * Blocked can be used to prevent aggregation and harvest after initialization time of the feature.
     * This can currently happen if RUM response setToken flag is 0, which is tied to ingest account entitlement info.
     * @type {boolean}
     */
    this.blocked = false
  }

  deregisterDrain () {
    deregisterDrain(this.agentRef, this.featureName)
  }
}
