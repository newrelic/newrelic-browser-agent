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
 * @typedef {object} FeatureHarvestCallbackOptions Options for aggregating data for harvesting.
 * @property {boolean} options.retry Indicates if the feature should store the aggregated
 * data in anticipation of a possible need to retry the transmission.
 */

/**
 * @callback FeatureHarvestCallback
 * @param {FeatureHarvestCallbackOptions} options Options for aggregating data for harvesting.
 * @returns {HarvestPayload} Payload of data to transmit to bam endpoint.
 */

/**
 * @typedef {object} NetworkSendSpec
 * @property {HarvestEndpointIdentifier} endpoint The endpoint to use (jserrors, events, resources etc.)
 * @property {HarvestPayload} payload Object representing payload.
 * @property {object} opts Additional options for sending data
 * @property {boolean} opts.needResponse Specify whether the caller expects a response data.
 * @property {boolean} opts.unload Specify whether the call is a final harvest during page unload.
 * @property {boolean} opts.sendEmptyBody Specify whether the call should be made even if the body is empty. Useful for rum calls.
 * @property {boolean} opts.retry Indicates if the feature should store the aggregated data in anticipation of a possible need to
 * retry the transmission.
 * @property {import('../util/submit-data.js').NetworkMethods} submitMethod The network method to use {@link ../util/submit-data.js}
 * @property {string} customUrl Override the beacon url the data is sent to; must include protocol if defined
 * @property {boolean} raw If true, disables adding the license key to the url
 * @property {boolean} includeBaseParams Enables the use of base query parameters in the beacon url
 */

/* istanbul ignore next */
export const unused = {}
