import { defaults as nrDefaults } from '../../window/nreum'
import { setValues } from './set-values'

const info = {
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

export function getInfo() {
  return info
}

export function setInfo(obj) {
  setValues(obj, info, 'info')
}
