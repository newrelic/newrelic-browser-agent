/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/** create a jest mock of the Harvester class */
export const Harvester = jest.fn().mockImplementation(() => ({
  startTimer: jest.fn(),
  triggerHarvestFor: jest.fn(),
  initializedAggregates: []
}))
