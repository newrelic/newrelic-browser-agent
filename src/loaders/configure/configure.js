import { setAPI, setTopLevelCallers } from '../api/api'
import { addToNREUM, gosCDN, gosNREUMInitializedAgents, defaults } from '../../common/window/nreum'
import { getConfiguration, getInfo, setConfiguration, setInfo, setLoaderConfig, setRuntime } from '../../common/config/config'
import { activatedFeatures } from '../../common/util/feature-flags'
import { isWorkerScope } from '../../common/constants/runtime'
import { validateServerUrl } from '../../common/url/check-url'
import { redefinePublicPath } from './public-path'
import { warn } from '../../common/util/console'

export function configure (agentIdentifier, opts = {}, loaderType, forceDrain) {
  // eslint-disable-next-line camelcase
  let { init, info, loader_config, runtime = { loaderType }, exposed = true } = opts
  const nr = gosCDN()
  if (!info) {
    init = nr.init
    info = nr.info
    // eslint-disable-next-line camelcase
    loader_config = nr.loader_config
  }

  if (init.assetsPath) tryConfigureAssetsPath(init)
  setConfiguration(agentIdentifier, init || {})
  // eslint-disable-next-line camelcase
  setLoaderConfig(agentIdentifier, loader_config || {})

  info.jsAttributes ??= {}
  if (isWorkerScope) { // add a default attr to all worker payloads
    info.jsAttributes.isWorker = true
  }
  ['beacon', 'errorBeacon'].forEach(prop => tryConfigureBeacon(info, prop, init.ssl))
  setInfo(agentIdentifier, info)

  const updatedInit = getConfiguration(agentIdentifier)
  const updatedInfo = getInfo(agentIdentifier)
  runtime.denyList = [
    ...(updatedInit.ajax?.deny_list || []),
    ...(updatedInit.ajax?.block_internal
      ? [
          updatedInfo.beacon,
          updatedInfo.errorBeacon
        ]
      : [])
  ]
  setRuntime(agentIdentifier, runtime)

  setTopLevelCallers()
  const api = setAPI(agentIdentifier, forceDrain)
  gosNREUMInitializedAgents(agentIdentifier, api, 'api')
  gosNREUMInitializedAgents(agentIdentifier, exposed, 'exposed')
  addToNREUM('activatedFeatures', activatedFeatures)

  return api
}

function tryConfigureAssetsPath (init) {
  init.assetsPath = validateServerUrl(init.assetsPath)
  if (init.assetsPath !== '') redefinePublicPath(init.assetsPath)
  else warn('New public path must be a valid URL. Chunk origin remains unchanged.')
}

function tryConfigureBeacon (info, propName, ssl) {
  // The defaults constant have the old exact beacon string. Comparison should support old-style configs.
  if (info[propName] === defaults[propName]) {
    delete info[propName] // however this means the new-style default defined in info.js should be used instead
    return
  }

  const checkedUrl = validateServerUrl(info[propName], ssl === false) // Future to do: can remove ssl?
  if (checkedUrl !== '') {
    info[propName] = checkedUrl
  } else {
    warn(`New ${propName} is not an acceptable URL. Reverting to static default.`)
    delete info[propName] // again, preventing the new-style default from being overwritten by setInfo(info)
  }
}
