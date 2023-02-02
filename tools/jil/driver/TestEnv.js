/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// represents a definition of a browser with Selenium server connection info
class TestEnv {
  constructor(connectionInfo, browserSpec) {
    this.connectionInfo = connectionInfo;
    this.browserSpec = browserSpec;
  }

  toString() {
    return this.browserSpec.toString();
  }
}

module.exports = TestEnv;
