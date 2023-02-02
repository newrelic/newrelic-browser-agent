/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require("jil");
const { setup } = require("../utils/setup");

jil.browserTest("parameters not modified", async function (t) {
  const { drain } = require("../../../src/common/drain/drain");
  const {
    Aggregate,
  } = require("../../../src/features/page_action/aggregate/index");

  const { agentIdentifier, baseEE, aggregator } = setup();

  new Aggregate(agentIdentifier, aggregator);

  let name = "MyEvent";
  let args = {
    foo: "bar",
    hello: { world: "again" },
  };

  baseEE.emit("feat-ins", []);
  drain(agentIdentifier, "feature");
  baseEE.emit("api-addPageAction", [t, name, args]);

  t.deepEqual(args, {
    foo: "bar",
    hello: { world: "again" },
  });

  t.end();
});
