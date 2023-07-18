/**
 * @file Contains a unique identifier for the running agent bundle
 * when loaded.
 * @copyright 2023 New Relic Corporation. All rights reserved.
 * @license Apache-2.0
 */

import { generateUuid } from './unique-id'

/**
 * Provides a unique id for the current agent bundle
 */
export const bundleId = generateUuid()
