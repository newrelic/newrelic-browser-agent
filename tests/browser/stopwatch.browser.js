/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import test from "../../tools/jil/browser-test";
import { setup } from "./utils/setup";
import * as stopwatch from "../../src/common/timing/stopwatch";

const { aggregator: agg, agentIdentifier } = setup();

test("stopwatch", function (t) {
  stopwatch.mark(agentIdentifier, "a", 0);
  stopwatch.mark(agentIdentifier, "b", 100);

  stopwatch.measure(agg, "first", "a", "b");
  stopwatch.measure(agg, "second", "a", "d");
  stopwatch.measure(agg, "third", "c", "b");

  t.equal(
    agg.get("measures", "first").params.value,
    100,
    "Able to measure marks"
  );
  t.equal(
    agg.get("measures", "second"),
    undefined,
    "Missing second mark turns into undefined measure"
  );
  t.equal(
    agg.get("measures", "third"),
    undefined,
    "Missing first mark turns into undefined measure"
  );

  t.end();
});
