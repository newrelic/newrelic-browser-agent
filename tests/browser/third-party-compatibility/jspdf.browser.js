/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import test from "../../../tools/jil/browser-test";
import { setup } from "../utils/setup";
import { wrapPromise } from "../../../src/common/wrap/wrap-promise";

const { baseEE } = setup();
wrapPromise(baseEE);

test("jspdf should recognize native promise after wrapping", function (t) {
  t.match(
    self.Promise.toString(),
    /\[native code\]/,
    "toString should retain native code indicator"
  );
  t.equal(
    self.Promise.name,
    "Promise",
    "name should retain original value of Promise"
  );
  t.end();
});
