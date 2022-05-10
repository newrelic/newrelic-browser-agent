/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// Turn on feature
import { getRuntime } from '../../../common/config/config'
import { FeatureBase } from '../../../common/util/feature-base'

export class Instrument extends FeatureBase {
  constructor(agentIdentifier) {
    super(agentIdentifier)

    if (!getRuntime(this.agentIdentifier).disabled) getRuntime(this.agentIdentifier).features.ins = true
  }
}
