import { setValues } from './set-values'

const loader_config = {
  accountID: undefined,
  trustKey: undefined,
  agentID: undefined,
  licenseKey: undefined,
  applicationID: undefined,
  xpid: undefined
}

export function getLoaderConfig() {
  return loader_config
}

export function setLoaderConfig(obj) {
  setValues(obj, loader_config, 'loader_config')
}
