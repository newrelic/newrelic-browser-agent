/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { InstrumentBase } from '../../utils/instrument-base'
import { FEATURE_NAME } from '../constants'
import { globalScope } from '../../../common/constants/runtime'
import { GLOBAL_EVENT_NAMESPACE } from '../../../common/dispatch/global-event'
import { reportSupportabilityMetric } from '../../../common/event-emitter/report-supportability-metric'

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  constructor (agentRef) {
    super(agentRef, FEATURE_NAME)

    globalScope.addEventListener(GLOBAL_EVENT_NAMESPACE, ({ detail }) => {
      const code = detail?.data?.code
      if (detail?.name === 'warn' && !!code) reportSupportabilityMetric(this.ee, `Warn/${code}/Seen`)
    })

    this.importAggregator(agentRef, () => import(/* webpackChunkName: "metrics-aggregate" */ '../aggregate'))
  }
}

export const Metrics = Instrument
