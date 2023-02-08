/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const through = require('through');
const format = require('util').format;

class BaseFormatter {
  constructor(config) {
    this.stream = through();
    this.config = config;
    this.ok = true;
  }

  start() {
    // not required
  }

  addOutputParser(parser) {
    throw new Error('addOutputParser method of Formatter is not implemented');
  }

  log(...args) {
    var data = format(...args) + '\n';
    this.stream.queue(data);
  }

  finish(ok) {
    var formatter = this;
    this.stream.queue(null);
    process.on('exit', function () {
      process.exit(formatter.ok && ok ? 0 : 1);
    });
  }

  error(msg) {
    this.ok = false;
    console.error(new Error().stack);
    console.error(msg);

    setTimeout(function () {
      process.exit(1);
    }, 100);
  }
}

module.exports = BaseFormatter;
