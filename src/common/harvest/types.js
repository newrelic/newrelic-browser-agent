/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @file Contains types related to harvesting data.
 * @copyright 2023 New Relic Corporation. All rights reserved.
 * @license Apache-2.0
 */

/**
 * @typedef {'rum'|'jserrors'|'events'|'ins'|'resources'|'blob'} HarvestEndpointIdentifier
 */

/**
 * @typedef {object} HarvestPayload
 * @property {object} qs Map of values that should be sent as part of the request query string.
 * @property {object} body Map of values that should be sent as the body of the request.
 */

/**
 * @typedef {object} NetworkSendSpec
 * @property {HarvestEndpointIdentifier} endpoint The endpoint to use (jserrors, events, resources etc.)
 * @property {HarvestPayload} payload Object representing payload.
 * @property {object} [localOpts] Additional options for sending data
 * @property {boolean} [localOpts.isFinalHarvest] Specify whether the call is a final harvest during page unload.
 * @property {boolean} [localOpts.sendEmptyBody] Specify whether the call should be made even if the body is empty. Useful for rum calls.
 * @property {boolean} [localOpts.forceNoRetry] Don't save the buffered data in the case of a need to retry the transmission.
 * @property {import('../util/submit-data.js').NetworkMethods} submitMethod The network method to use {@link ../util/submit-data.js}
 * @property {function(object): void} [cbFinished] Callback invoked with the result once the network request completes. Receives an object with sent, status, retry, fullUrl, responseText, and either xhr or fetchResponse.
 * @property {boolean} [raw] If true, skips standard versioned URL path construction and uses a bare endpoint URL.
 * @property {string} [featureName] The feature name associated with this harvest, used for metadata tracking and the global harvest event.
 * @property {number} [endpointVersion] The endpoint version included in the URL path. Defaults to 1.
 */

export const unused = {}
