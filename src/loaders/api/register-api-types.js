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
 * @property {Object} target - The options for the registered entity.
 * @property {string} [target.licenseKey] - The license key for the registered entity. If none was supplied, it will assume the license key from the main agent.
 * @property {string} target.id - The ID for the registered entity.
 * @property {string} target.name - The name returned for the registered entity.
 * @property {{[key: string]: any}} [target.tags] - The tags for the registered entity as key-value pairs.
 * @property {string} [target.parentId] - The parentId for the registered entity. If none was supplied, it will assume the entity guid from the main agent.
 * @property {boolean} [target.isolated] - When true, each registration creates an isolated instance. When false, multiple registrations with the same id and isolated: false will share a single instance, including all custom attributes, ids, names, and metadata. Calling deregister on a shared instance will deregister it for all entities using the instance. Defaults to true.
 */

export default {}
