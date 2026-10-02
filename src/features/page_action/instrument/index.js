/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { GenericEvents } from '../../generic_events'
// import { reportSupportabilityMetric } from '../../../common/event-emitter/report-supportability-metric'

/**
 * @deprecated This feature has been replaced by Generic Events. Use/Import `GenericEvents` instead. This wrapper will be removed in a future release
 */
export class Instrument extends GenericEvents {
//   constructor () {
//     super()
//     reportSupportabilityMetric(this.ee, 'PageAction/Instrument/Deprecated')
//   }
}

/**
 * @deprecated This feature has been replaced by Generic Events. Use/Import `GenericEvents` instead. This wrapper will be removed in a future release
 */
export const PageAction = Instrument
