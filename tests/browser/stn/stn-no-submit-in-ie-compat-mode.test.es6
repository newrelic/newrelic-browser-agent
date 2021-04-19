/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import jil from 'jil'
let matcher = require('../../../tools/jil/util/browser-matcher')
let supported = matcher.withFeature('cors').inverse()

jil.browserTest('stn aggregator does nothing in ie compatability mode', supported, function (t) {
  require('../../../agent/ie-version')
  var aggregator = require('../../../feature/stn/aggregate/index')
  var drain = require('../../../agent/drain')

  drain('feature')

  // When a user is running >= IE10 in compatibility mode
  // with standards <= IE9, we should not submit session trace
  // data. The agent avoids submission by bailing out of the
  // STN aggregation code. When the aggregator is required
  // under these circumstances, it will return an empty object
  t.deepEqual(aggregator, {})
  t.end()
})
