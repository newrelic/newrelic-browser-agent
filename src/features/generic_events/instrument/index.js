/* Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { getConfigurationValue } from '../../../common/config/init'
import { deregisterDrain } from '../../../common/drain/drain'
import { InstrumentBase } from '../../utils/instrument-base'
import { FEATURE_NAME } from '../constants'

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, { aggregator, eventManager }, auto = true) {
    super(agentIdentifier, { aggregator, eventManager }, FEATURE_NAME, auto)
    const genericEventSourceConfigs = [
      getConfigurationValue(this.agentIdentifier, 'page_action.enabled')
      // other future generic event source configs to go here, like M&Ms, PageResouce, etc.
    ]
    /** If any of the sources are active, import the aggregator. otherwise deregister */
    if (genericEventSourceConfigs.some(x => x)) this.importAggregator()
    else deregisterDrain(this.agentIdentifier, this.featureName)
  }
}

export const GenericEvents = Instrument
