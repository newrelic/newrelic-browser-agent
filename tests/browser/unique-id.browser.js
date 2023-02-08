/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var ids = require("../../src/common/ids/unique-id");
var test = require("../../tools/jil/browser-test.js");

test("generateId", function (t) {
  window._log = t.comment;

  var uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  var id = ids.generateUuid();
  t.ok(id.match(uuidRe, "is uuid format"));
  t.end();
});
