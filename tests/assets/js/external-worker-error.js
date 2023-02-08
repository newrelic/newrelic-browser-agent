/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

self.externalFunction = () => {
  // eslint-disable-line
  throw new Error('worker error');
};
