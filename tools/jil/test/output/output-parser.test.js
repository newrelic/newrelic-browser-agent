/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var tape = require('tape');
var through = require('through');

var OutputParser = require('../../output/index').OutputParser;

tape('basic', function (t) {
  // tape harness streams into browser spec stream
  var s = through();
  let harness = tape.createHarness();
  harness.createStream().pipe(s);

  var parser = new OutputParser('test', s);

  let assertCount = 0;
  parser.on('assert', (d, indent, testNames) => {
    assertCount++;
  });

  harness('test1', (t2) => {
    t2.ok(true);
    t2.end();
  });

  harness('test2', (t2) => {
    t2.ok(true);
    t2.end();
  });

  setImmediate(() => {
    t.ok(assertCount, 'got 2 asserts');
    t.end();
  });
});
