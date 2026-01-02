/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { getModeledObject } from './configurable'

const LoaderConfigModel = {
  accountID: undefined,
  trustKey: undefined,
  agentID: undefined,
  licenseKey: undefined,
  applicationID: undefined,
  xpid: undefined
}

export const mergeLoaderConfig = (loaderConfig) => {
  return getModeledObject(loaderConfig, LoaderConfigModel)
}
