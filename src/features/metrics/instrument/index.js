/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { isBrowserScope } from '../../../common/constants/runtime'
import { handle } from '../../../common/event-emitter/handle'
import { InstrumentBase } from '../../utils/instrument-base'
import {
  FEATURE_NAME,
  SUPPORTABILITY_METRIC_CHANNEL
} from '../constants'

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  constructor (agentRef) {
    super(agentRef, FEATURE_NAME)

    if (isBrowserScope) {
      document.addEventListener('securitypolicyviolation', (e) => {
        handle(SUPPORTABILITY_METRIC_CHANNEL, ['Generic/CSPViolation/Detected'], undefined, this.featureName, this.ee)
      })
    }

    this.importAggregator(agentRef, () => import(/* webpackChunkName: "metrics-aggregate" */ '../aggregate'))
  }
}

export const Metrics = Instrument
