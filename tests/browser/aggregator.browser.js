/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import test from "../../tools/jil/browser-test";
import { setup } from "./utils/setup";

const { aggregator: agg } = setup();

test("aggregator", function (t) {
  // Test condensed metric data when there is only one data point
  agg.store("foo", "bar", { misc: "params" }, { value: 1 });
  t.equal(agg.get("foo", "bar").params.misc, "params", "params set first time");
  t.equal(
    agg.get("foo", "bar").metrics.value.min,
    undefined,
    "condensed undefined min"
  );
  t.equal(
    agg.get("foo", "bar").metrics.value.max,
    undefined,
    "condensed undefined max"
  );
  t.equal(
    agg.get("foo", "bar").metrics.value.sos,
    undefined,
    "condensed undefined sos"
  );
  t.equal(
    agg.get("foo", "bar").metrics.value.c,
    undefined,
    "condensed undefined c"
  );
  t.equal(
    agg.get("foo", "bar").metrics.value.t,
    1,
    "condensed total value set"
  );
  t.equal(agg.get("foo", "bar").metrics.count, 1, "condensed count set");

  // Test metric data aggregation
  agg.store("foo", "bar", { other: "blah" }, { value: 2 });
  agg.store("foo", "bar", null, { value: 3 });
  agg.store("foo", "bar", { misc: "stomp" }, { value: 5 });
  agg.store("foo", "bar", {}, { value: 4 });
  t.equal(agg.get("foo", "bar").metrics.value.min, 1, "min value");
  t.equal(agg.get("foo", "bar").metrics.value.max, 5, "max value");
  t.equal(agg.get("foo", "bar").metrics.value.t, 15, "total value");
  t.equal(agg.get("foo", "bar").metrics.value.sos, 55, "sos value");
  t.equal(agg.get("foo", "bar").metrics.value.c, 5, "c value");
  t.equal(agg.get("foo", "bar").metrics.count, 5, "total count");

  agg.store("foo", "asdf", { blah: 2 }, { value: "asd" });
  agg.store("foo", "qwerty");

  t.equal(agg.get("foo").bar, agg.get("foo", "bar"), "get type");
  t.equal(agg.get("foo", "asdf").metrics.count, 1, "get type, name");
  t.equal(agg.get("blah"), undefined, "undefined type");
  t.equal(agg.get("blah", "blah"), undefined, "undefined type, name");
  t.equal(agg.get("foo", "blah"), undefined, "real type, undefined name");

  var payload = agg.take(["foo"]);
  t.equal(payload.foo.length, 3, "Array foo");
  t.equal(payload.blah, undefined, "Array nonextant");

  t.equal(agg.take(["foo"]), null, "Cleared after take");

  t.end();
});

var singleValueMetric = {
  type: "condensed",
  name: "bar",
  metrics: { count: 1, value: { t: 4 } },
  params: { other: "blah" },
};

var metric = {
  type: "metric",
  name: "bar",
  metrics: {
    count: 2,
    value: { t: 6, min: 3, max: 3, sos: 18, c: 2 },
  },
  params: { other: "blah" },
};

test("params set when metric merged", function (t) {
  t.plan(1);

  agg.take(["paramTest"]);
  var testParams = {
    value: "param",
    example: "example",
  };

  agg.merge("paramTest", "bar", singleValueMetric.metrics, testParams);
  var params = agg.take(["paramTest"]).paramTest[0].params;

  t.deepEqual(params, testParams, "params set on merge");
});

test("get and take return the same data", function (t) {
  t.plan(8);

  // plan count is the sum of unique type/name combinations (first 2 store arguments)
  agg.store("foo", "bar", { name: "bar" }, { value: 3 });
  agg.store("foo", "bar", { name: "bar" }, { value: 4 });
  agg.store("foo", "foo", { name: "foo" }, { value: 2 });
  agg.store("bar", "foo", { name: "foo" }, { value: 3 });
  agg.store("bar", "bar", { name: "bar" }, { value: 4 });

  var getMetrics = {
    foo: agg.get("foo"),
    bar: agg.get("bar"),
  };
  var takeMetrics = agg.take(["foo", "bar"]);

  for (var type in takeMetrics) {
    takeMetrics[type].forEach(function (takeMetric) {
      var name = takeMetric.params.name;
      var getMetric = getMetrics[type][name];
      var hint = `type: ${type} name: ${name}`;

      t.deepEqual(
        takeMetric.params,
        getMetric.params,
        "params match for metric with " + hint
      );
      t.deepEqual(
        takeMetric.metrics,
        getMetric.metrics,
        "metrics match for metric with " + hint
      );
    });
  }
});

test("merge single-value metric when there is no data in aggregator", function (t) {
  t.plan(2);

  // clear aggregator
  agg.take(["merge"]);

  // merge[singleValueMetric -> no-data]
  agg.merge(
    "merge",
    "bar",
    singleValueMetric.metrics,
    singleValueMetric.params
  );

  // validate
  var metrics = agg.get("merge").bar.metrics;
  t.equal(metrics.count, 1, "count value set");
  t.equal(
    metrics.value.t,
    singleValueMetric.metrics.value.t,
    "single-value t value set"
  );
});

test("merge metric when there is no data in aggregator", function (t) {
  t.plan(6);

  // clear aggregator
  agg.take(["merge"]);

  // merge[metric -> no-data]
  agg.merge("merge", "bar", metric.metrics, metric.params);

  // validate
  var metrics = agg.get("merge").bar.metrics;
  t.equal(metrics.count, metric.metrics.count, "count value set");
  t.equal(metrics.value.t, metric.metrics.value.t, "metric t value set");
  t.equal(metrics.value.min, metric.metrics.value.min, "metric min value set");
  t.equal(metrics.value.max, metric.metrics.value.max, "metric max value set");
  t.equal(metrics.value.sos, metric.metrics.value.sos, "metric sos value set");
  t.equal(metrics.value.c, metric.metrics.value.c, "metric c value set");
});

test("merge single-value metric into single-value metric", function (t) {
  t.plan(6);

  // clear aggregator
  agg.take(["merge"]);

  // merge[singleValueMetric -> singleValueMetric]
  agg.store("merge", "bar", { other: "blah" }, { value: 2 });
  agg.merge(
    "merge",
    "bar",
    singleValueMetric.metrics,
    singleValueMetric.params
  );

  // validate
  var metrics = agg.get("merge").bar.metrics;
  t.equal(metrics.count, 2, "count value set");
  t.equal(metrics.value.t, 6, "t value set");
  t.equal(metrics.value.min, 2, "min value set");
  t.equal(metrics.value.max, 4, "max value set");
  t.equal(metrics.value.sos, 20, "sos value set");
  t.equal(metrics.value.c, 2, "c value set");
});

test("merge metric into single-value metric", function (t) {
  t.plan(6);

  // clear aggregator
  agg.take(["merge"]);

  // merge[metric -> singleValueMetric]
  agg.store("merge", "bar", { other: "blah" }, { value: 3 });
  agg.merge("merge", "bar", metric.metrics, metric.params);

  // validate
  var metrics = agg.get("merge").bar.metrics;
  t.equal(metrics.count, 3, "count value set");
  t.equal(metrics.value.t, 9, "t value set");
  t.equal(metrics.value.min, 3, "min value set");
  t.equal(metrics.value.max, 3, "max value set");
  t.equal(metrics.value.sos, 27, "sos value set");
  t.equal(metrics.value.c, 3, "c value set");
});

test("merge single-value metric into metric", function (t) {
  t.plan(6);

  // clear aggregator
  agg.take(["merge"]);

  // merge[singleValueMetric -> metric]
  agg.store("merge", "bar", { other: "blah" }, { value: 2 });
  agg.store("merge", "bar", { other: "blah" }, { value: 3 });
  agg.merge(
    "merge",
    "bar",
    singleValueMetric.metrics,
    singleValueMetric.params
  );

  // validate
  var metrics = agg.get("merge").bar.metrics;
  t.equal(metrics.count, 3, "count value set");
  t.equal(metrics.value.t, 9, "t value set");
  t.equal(metrics.value.min, 2, "min value set");
  t.equal(metrics.value.max, 4, "max value set");
  t.equal(metrics.value.sos, 29, "sos value set");
  t.equal(metrics.value.c, 3, "c value set");
});

test("merge metric into metric", function (t) {
  t.plan(6);

  // clear aggregator
  agg.take(["merge"]);

  // merge[metric -> metric]
  agg.store("merge", "bar", { other: "blah" }, { value: 1 });
  agg.store("merge", "bar", { other: "blah" }, { value: 2 });
  agg.merge("merge", "bar", metric.metrics, metric.params);

  // validate
  var metrics = agg.get("merge").bar.metrics;
  t.equal(metrics.count, 4, "count value set");
  t.equal(metrics.value.t, 9, "t value set");
  t.equal(metrics.value.min, 1, "min value set");
  t.equal(metrics.value.max, 3, "max value set");
  t.equal(metrics.value.sos, 23, "sos value set");
  t.equal(metrics.value.c, 4, "c value set");
});
