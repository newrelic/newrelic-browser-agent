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
    // // NREUM.debug("initialize page-action instrument!", agentIdentifier)
    const agentRuntime = getRuntime(this.agentIdentifier);
    if (!agentRuntime.disabled) agentRuntime.features.ins = true;
  }
}
