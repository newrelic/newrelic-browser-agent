/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const fs = require("fs");

function logToFile(filename, data) {
  if (typeof data === "object") data = JSON.stringify(data, null, 2);
  fs.appendFileSync(filename, data + "\n");
}

module.exports = logToFile;
