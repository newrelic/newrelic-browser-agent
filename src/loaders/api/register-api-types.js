/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @typedef {Object} RegisterAPI
 * @property {Function} addPageAction - Add a page action for the registered entity.
 * @property {Function} log - Capture a log for the registered entity.
 * @property {Function} noticeError - Notice an error for the registered entity.
 * @property {Function} setApplicationVersion - Add an application.version attribute to all outgoing data for the registered entity.
 * @property {Function} setCustomAttribute - Add a custom attribute to outgoing data for the registered entity.
 * @property {Function} setUserId - Add an enduser.id attribute to all outgoing API data for the registered entity.
 * @property {RegisterAPIMetadata} metadata - The metadata object containing the custom attributes and target information for the registered entity.
 */

/**
 * @typedef {Object} RegisterAPIMetadata
 * @property {Object} customAttributes - The custom attributes to be sent with the registered entity's data.
 * @property {Object} target - The target information for the registered entity.
 */

export default {}
