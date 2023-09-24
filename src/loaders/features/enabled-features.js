import { FEATURE_NAMES } from './features'

const featureNames = Object.values(FEATURE_NAMES)

function isEnabled (name, init) {
  return init?.[name]?.enabled !== false
}

export function getEnabledFeatures (init) {
  const enabledFeatures = {}
  featureNames.forEach(featureName => {
    enabledFeatures[featureName] = isEnabled(featureName, init)
  })
  return enabledFeatures
}
