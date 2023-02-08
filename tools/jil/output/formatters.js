/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
const DefaultFormatter = require('./default-formatter');
const MergedFormatter = require('./merged-tap-formatter');
const CIFormatter = require('./ci-formatter');
const RawFormatter = require('./raw-formatter');

module.exports = {
  pretty: DefaultFormatter,
  merged: MergedFormatter,
  ci: CIFormatter,
  raw: RawFormatter,
};
