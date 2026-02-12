/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @typedef {Object} RegisterAPI
 * @property {(name: string, attributes?: object) => void} addPageAction - Add a page action for the registered entity.
 * @property {(message: string, options?: { customAttributes?: object, level?: 'ERROR' | 'TRACE' | 'DEBUG' | 'INFO' | 'WARN'}) => void} log - Capture a log for the registered entity.
 * @property {(error: Error | string, customAttributes?: object) => void} noticeError - Notice an error for the registered entity.
 * @property {(target: RegisterAPIConstructor) => RegisterAPI} register - Record a custom event for the registered entity.
 * @property {() => void} deregister - Deregister the registered entity, which blocks its use and captures end of life timings.
 * @property {(eventType: string, attributes?: Object) => void} recordCustomEvent - Record a custom event for the registered entity.
 * @property {(eventType: string, options?: {start: number, end: number, duration: number, customAttributes: object}) => ({start: number, end: number, duration: number, customAttributes: object})} measure - Measures a task that is recorded as a BrowserPerformance event.
 * @property {(value: string | null) => void} setApplicationVersion - Add an application.version attribute to all outgoing data for the registered entity.
 * @property {(name: string, value: string | number | boolean | null, persist?: boolean) => void} setCustomAttribute - Add a custom attribute to outgoing data for the registered entity.
 * @property {(value: string | null, resetSession?: boolean) => void} setUserId - Add an enduser.id attribute to all outgoing API data for the registered entity.  Note: a registered entity will not be able to initiate a session reset.  It must be done from the main agent.
 * @property {RegisterAPIMetadata} metadata - The metadata object containing the custom attributes and target information for the registered entity.
 */

/**
 * @typedef {Object} RegisterAPIConstructor
 * @property {string|number} id - The unique id for the registered entity. This will be assigned to any synthesized entities.
 * @property {string} name - The readable name for the registered entity. This will be assigned to any synthesized entities.
 * @property {{[key: string]: any}} [tags] - The tags for the registered entity as key-value pairs. This will be assigned to any synthesized entities. Tags are converted to source.* attributes (e.g., {environment: 'production'} becomes source.environment: 'production').
 * @property {boolean} [isolated] - When true, each registration creates an isolated instance. When false, multiple registrations with the same id and isolated: false will share a single instance, including all custom attributes, ids, names, and metadata. Calling deregister on a shared instance will deregister it for all entities using the instance. Defaults to true.
 * @property {string} [parentId] - The parentId for the registered entity. If none was supplied, it will assume the entity guid from the main agent.
 */

/**
 * @typedef {Object} RegisterAPIMetadata
 * @property {Object} customAttributes - The custom attributes for the registered entity.
 * @property {RegisterAPITimings} timings - The timing metrics for the registered entity.
 * @property {RegisterAPITarget} target - The options for the registered entity.
 */

/**
 * @typedef {Object} RegisterAPITarget
 * @property {string} id - The ID for the registered entity.
 * @property {string} name - The name returned for the registered entity.
 * @property {{[key: string]: any}} [tags] - The tags for the registered entity as key-value pairs.
 * @property {string} [parentId] - The parentId for the registered entity. If none was supplied, it will assume the entity guid from the main agent.
 * @property {boolean} [isolated] - When true, each registration creates an isolated instance. When false, multiple registrations with the same id and isolated: false will share a single instance, including all custom attributes, ids, names, and metadata. Calling deregister on a shared instance will deregister it for all entities using the instance. Defaults to true.
 */

/**
 * @typedef {Object} RegisterAPITimings
 * @property {number} registeredAt - The timestamp when the registered entity was created.
 * @property {number} [reportedAt] - The timestamp when the registered entity was deregistered.
 * @property {number} fetchStart - The timestamp when the registered entity began fetching.
 * @property {number} fetchEnd - The timestamp when the registered entity finished fetching.
 * @property {Object} [asset] - The asset path (if found) for the registered entity.
 * @property {string} type - The type of timing associated with the registered entity, 'script' or 'link' if found with the performance resource API, 'inline' if found to be associated with the root document URL, or 'unknown' if no associated resource could be found.
 */

export default {}
