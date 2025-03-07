/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { GenericEvents } from '../../generic_events'

/**
 * @deprecated This feature has been replaced by Generic Events. Use/Import `GenericEvents` instead. This wrapper will be removed in a future release
 */
export class Instrument extends GenericEvents {
  constructor (agentIdentifier, aggregator, auto = true) {
    super(agentIdentifier, aggregator, auto)
  }
}

/**
 * @deprecated This feature has been replaced by Generic Events. Use/Import `GenericEvents` instead. This wrapper will be removed in a future release
 */
export const PageAction = Instrument
