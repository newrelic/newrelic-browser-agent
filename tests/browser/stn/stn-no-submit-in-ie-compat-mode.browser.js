/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require("jil");
const { setup } = require("../utils/setup");

const setupData = setup();
const { agentIdentifier, aggregator } = setupData;

jil.browserTest(
  "stn aggregator does nothing in ie compatability mode",
  function (t) {
    require("../../../src/common/browser-version/ie-version");
    var {
      Aggregate: StnAggregate,
    } = require("../../../src/features/session_trace/aggregate/index");
    var stnAgg = new StnAggregate(agentIdentifier, aggregator);
    var { drain } = require("../../../src/common/drain/drain");

    drain(agentIdentifier, "feature");

    // When a user is running >= IE10 in compatibility mode
    // with standards <= IE9, we should not submit session trace
    // data. The agent avoids submission by bailing out of the
    // STN aggregation code. When the aggregator is required
    // under these circumstances, it will return an empty object
    t.deepEqual(stnAgg.trace, {});
    t.end();
  }
);
