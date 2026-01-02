/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { defaults as nrDefaults } from '../window/nreum'
import { getModeledObject } from './configurable'

/**
 * @typedef {Object} Info
 * @property {string} [beacon]
 * @property {string} [errorBeacon] - Base URL endpoint for all data harvested by the agent. Proxies should be defined in the init instead.
 * @property {string} licenseKey - New Relic license key provided by the website in user account.
 * @property {string} applicationID - New Relic application ID provided when creating a browser entity in the UI.
 * @property {number} [sa]
 * @property {number} [queueTime]
 * @property {number} [applicationTime]
 * @property {string} [ttGuid]
 * @property {string} [user]
 * @property {string} [account]
 * @property {string} [product]
 * @property {string} [extra]
 * @property {Object} [jsAttributes] - Custom attributes that are added to majority of agent's payloads. The `setCustomAttribute` API method affects this.
 * @property {string} [userAttributes]
 * @property {string} [atts]
 * @property {string} [transactionName]
 * @property {string} [tNamePlain]
 */

const InfoModel = {
  // preset defaults
  beacon: nrDefaults.beacon,
  errorBeacon: nrDefaults.errorBeacon,
  // others must be populated by user
  licenseKey: undefined,
  applicationID: undefined,
  sa: undefined,
  queueTime: undefined,
  applicationTime: undefined,
  ttGuid: undefined,
  user: undefined,
  account: undefined,
  product: undefined,
  extra: undefined,
  jsAttributes: {},
  userAttributes: undefined,
  atts: undefined,
  transactionName: undefined,
  tNamePlain: undefined
}

export function isValid (info) {
  try {
    return !!info.licenseKey && !!info.errorBeacon && !!info.applicationID
  } catch (err) {
    return false
  }
}

export const mergeInfo = (info) => {
  return getModeledObject(info, InfoModel)
}
