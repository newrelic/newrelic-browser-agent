/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const tape = require("tape");
const concat = require("concat-stream");

const TestHarness = require("../driver/harness");

tape("outputs well-formatted TAP", (t) => {
  const harness = new TestHarness();

  const concatStream = concat((data) => {
    // assert that the TAP output is correct
    const tapLines = data.split("\n");

    t.ok(tapLines[0] === "TAP version 13", "TAP preamble in place");

    t.ok(tapLines[1] === "# first fake test", "Test name in TAP output");
    t.ok(tapLines[2] === "ok 1 should be truthy");
    t.ok(tapLines[3] === "# second fake test", "Test name in TAP output");
    t.ok(tapLines[4] === "ok 2 should be truthy");

    t.ok(data.includes("1..2"), "Test plan in TAP output");

    t.end();
  });

  harness.stream.pipe(concatStream);

  harness.addTest("first fake test", null, (t) => {
    t.ok("first fake test passed");
    t.end();
  });

  harness.addTest("second fake test", null, (t) => {
    t.ok("second fake test passed");
    t.end();
  });

  harness.run();

  harness.on("done", () => {
    concatStream.end();
  });
});

tape("maintains test numbering when the harness is paused", (t) => {
  const harness = new TestHarness();

  const concatStream = concat((data) => {
    const tapLines = data.split("\n");

    t.ok(tapLines[1] === "# first fake test", "first test name in output");
    t.ok(tapLines[2] === "ok 1 should be truthy", "first assertion is numbered correctly");
    t.ok(tapLines[3] === "ok 2 should be truthy", "second assertion is numbered correctly");
    t.ok(tapLines[4] === "# third fake test", "third test name in output");
    t.ok(tapLines[5] === "ok 3 should be truthy", "first assertion is numbered correctly");
    t.ok(tapLines[6] === "ok 4 should be truthy", "second assertion is numbered correctly");

    t.end();
  });

  harness.stream.pipe(concatStream);

  harness.addTest("first fake test", null, (t) => {
    t.ok("first assertion");
    t.ok("second assertion");
    t.end();
    harness.resume();
    harness.pause();
  });

  harness.addTest("second fake test", null, (t) => {
    t.ok("first assertion");
    t.ok("second assertion");
    t.end();
    harness.clear();
    harness.resume();
  });

  harness.addTest("third fake test", null, (t) => {
    t.ok("first assertion");
    t.ok("second assertion");
    t.end();
    harness.resume();
  });

  harness.pause();
  harness.run();

  harness.on("done", () => {
    concatStream.end();
  });
});
