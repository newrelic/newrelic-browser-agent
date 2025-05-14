/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { FEATURE_NAMES } from './features'

const featureNames = Object.values(FEATURE_NAMES)

export function getEnabledFeatures (agentInit) {
  const enabledFeatures = {}
  featureNames.forEach(featureName => {
    enabledFeatures[featureName] = !!agentInit[featureName]?.enabled
  })
  return enabledFeatures
}
