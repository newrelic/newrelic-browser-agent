import { FEATURE_NAMES } from './features'
import { getConfigurationValue } from '../../common/config/init'

const featureNames = Object.values(FEATURE_NAMES)

function isEnabled (name, agentIdentifier) {
  return getConfigurationValue(agentIdentifier, `${name}.enabled`) === true
}

export function getEnabledFeatures (agentIdentifier) {
  const enabledFeatures = {}
  featureNames.forEach(featureName => {
    enabledFeatures[featureName] = isEnabled(featureName, agentIdentifier)
  })
  return enabledFeatures
}
