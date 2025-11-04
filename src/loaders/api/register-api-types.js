/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @typedef {Object} RegisterAPI
 * @property {Function} addPageAction - Add a page action for the registered entity.
 * @property {Function} log - Capture a log for the registered entity.
 * @property {Function} noticeError - Notice an error for the registered entity.
 * @property {(RegisterAPIConstructor) => RegisterAPI} register - Register a new entity as a child of this entity
 * @property {Function} setApplicationVersion - Add an application.version attribute to all outgoing data for the registered entity.
 * @property {Function} setCustomAttribute - Add a custom attribute to outgoing data for the registered entity.
 * @property {Function} setUserId - Add an enduser.id attribute to all outgoing API data for the registered entity.
 * @property {RegisterAPIMetadata} metadata - The metadata object containing the custom attributes and target information for the registered entity.
 */

/**
 * @typedef {Object} RegisterAPIConstructor
 * @property {Object} opts - The options for the registered entity.
 * @property {string} opts.id - The unique id for the registered entity. This will be assigned to any synthesized entities.
 * @property {string} opts.name - The readable name for the registered entity. This will be assigned to any synthesized entities.
 * @property {string} [opts.parentId] - The parentId for the registered entity. If none was supplied, it will assume the entity guid from the main agent.
 */

/**
 * @typedef {Object} RegisterAPIMetadata
 * @property {Object} customAttributes - The custom attributes for the registered entity.
 * @property {Object} target - The options for the registered entity.
 * @property {string} [target.licenseKey] - The license key for the registered entity. If none was supplied, it will assume the license key from the main agent.
 * @property {string} target.id - The ID for the registered entity.
 * @property {string} target.name - The name returned for the registered entity.
 * @property {string} [target.parentId] - The parentId for the registered entity. If none was supplied, it will assume the entity guid from the main agent.
 */

export default {}
