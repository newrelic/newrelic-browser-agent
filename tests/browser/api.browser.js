/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import test from '../../tools/jil/browser-test'
import { setup } from './utils/setup'
import { getRuntime } from '@newrelic/browser-agent-core/src/common/config/config'
import { drain } from '@newrelic/browser-agent-core/src/common/drain/drain'
import { initializeAPI } from '../../cdn/agent-aggregator/util/api.js'
import { Instrument as MetricsInstrum } from '@newrelic/browser-agent-core/src/features/metrics/instrument/index'
import { Aggregate as MetricsAggreg } from '@newrelic/browser-agent-core/src/features/metrics/aggregate/index'

const { aggregator: agg, agentIdentifier, nr } = setup();
// api loads registers several event listeners, but does not have any exports
initializeAPI(agentIdentifier);   // maps finished() which handles 'record-custom'
new MetricsInstrum(agentIdentifier);  // registers 'record-custom' which handles 'storeEventMetrics'
new MetricsAggreg(agentIdentifier, agg); // registers 'storeEventMetrics'

test('api', function (t) {
  t.equal(getRuntime(agentIdentifier).customTransaction, undefined)
  nr.setPageViewName('bar/baz')
  drain(agentIdentifier, 'api')
  drain(agentIdentifier) // drains 'feature' bucket too
  t.equal(getRuntime(agentIdentifier).customTransaction, 'http://custom.transaction/bar/baz')

  setTimeout(() => {
    nr.finished()
    nr.finished()
    nr.finished()

    nr.noticeError(new Error('test'))

    var finishedTime = 0
    var cm

    try {
      var aggs = agg.take(['cm'])
      cm = aggs.cm
      finishedTime = cm[0].metrics.time.t
    } catch (e) {}

    t.ok(finishedTime > 0, `Set custom metric for finished time: ${finishedTime} > 0`)
    t.equal(typeof cm[1], 'undefined', 'only finish once')

    nr.finished()

    t.equal(agg.take(['cm']), null, 'really only finish once')

    t.end()
  }, 100)
})
