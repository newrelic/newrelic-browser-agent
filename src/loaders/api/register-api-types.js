/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
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
 * @property {(value: string | null) => void} setUserId - Add an enduser.id attribute to all outgoing API data for the registered entity.
 * @property {RegisterAPIMetadata} metadata - The metadata object containing the custom attributes and target information for the registered entity.
 */

/**
 * @typedef {Object} RegisterAPIConstructor
 * @property {string|number} id - The unique id for the registered entity. This will be assigned to any synthesized entities.
 * @property {string} name - The readable name for the registered entity. This will be assigned to any synthesized entities.
 * @property {boolean} [shared] - Whether the registered entity is intended to be shared. Subsequent registrations with the same id will return the same registration instance.
 * @property {string} [parentId] - The parentId for the registered entity. If none was supplied, it will assume the entity guid from the main agent.
 */

/**
 * @typedef {Object} RegisterAPIMetadata
 * @property {Object} customAttributes - The custom attributes for the registered entity.
 * @property {Object} target - The options for the registered entity.
 * @property {string} [target.licenseKey] - The license key for the registered entity. If none was supplied, it will assume the license key from the main agent.
 * @property {string} target.id - The ID for the registered entity.
 * @property {string} target.name - The name returned for the registered entity.
 * @property {string} [target.parentId] - The parentId for the registered entity. If none was supplied, it will assume the entity guid from the main agent.
 * @property {boolean} [target.shared] - Whether the registered entity is intended to be shared.
 */

export default {}
