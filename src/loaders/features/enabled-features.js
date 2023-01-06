import { asyncFeatures, syncFeatures } from './features'
import { getConfigurationValue, getRuntime } from '../../common/config/config'

const featureNames = [...asyncFeatures, ...syncFeatures]

function isEnabled(name, agentIdentifier) {
  return getRuntime(agentIdentifier).disabled !== true && getConfigurationValue(agentIdentifier, `${name}.enabled`) !== false
}

export function isAuto(name, agentIdentifier) {
  return getConfigurationValue(agentIdentifier, `${name}.auto`) !== false && !asyncFeatures.includes(name)
}

export function getEnabledFeatures(agentIdentifier) {
  const enabledFeatures = {}
  featureNames.forEach(featureName => {
    enabledFeatures[featureName] = isEnabled(featureName, agentIdentifier)
  })
  return enabledFeatures
}