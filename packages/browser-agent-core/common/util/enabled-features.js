import { getConfigurationValue, getRuntime } from '../config/config'

export const featureNames = [
  "ajax",
  "jserrors",
  "metrics",
  "page_action",
  "page_view_event",
  "page_view_timing",
  "session_trace",
  "spa"
]

function isEnabled(name, agentIdentifier) {
  return getRuntime(agentIdentifier).disabled !== true && getConfigurationValue(agentIdentifier, `${name}.enabled`) !== false
}

export function isAuto(name, agentIdentifier) {
  return getConfigurationValue(agentIdentifier, `${name}.auto`) !== false
}

export function getEnabledFeatures(agentIdentifier) {
  const enabledFeatures = {}
  featureNames.forEach(featureName => {
    enabledFeatures[featureName] = isEnabled(featureName, agentIdentifier)
  })
  return enabledFeatures
}