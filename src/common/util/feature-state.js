import { gosNREUM } from '../window/nreum'

export const FEATURE_TYPE = {
  AGGREGATE: 0,
  INSTRUMENT: 1
}

export function getFeatureState ({ agentIdentifier, featureName, featureType = FEATURE_TYPE.AGGREGATE }) {
  const nr = gosNREUM()
  if (featureType === FEATURE_TYPE.AGGREGATE) return nr.initializedAgents[agentIdentifier]?.features?.[featureName]?.featAggregate || {}
  if (featureType === FEATURE_TYPE.INSTRUMENT) return nr.initializedAgents[agentIdentifier]?.features?.[featureName] || {}
  return {}
}
