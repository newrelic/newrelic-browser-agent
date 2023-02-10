import { FEATURE_NAMES } from '../../../loaders/features/features'

/**
 * Get an array of flags required by downstream (NR UI) based on the features initialized in this agent
 * (aka what is running on the page).
 * @param {String} agentId - the ID of the initialized agent on the page, mapping to the one under the global 'newrelic' object
 * @returns {String[]} Up to 5 short strings corresponding to ingest mapping of features.
 */
export function getActivatedFeaturesFlags (agentId) {
  const flagArr = []

  Object.keys(newrelic.initializedAgents[agentId].features).forEach(featName => {
    switch (featName) {
      case FEATURE_NAMES.ajax:
        flagArr.push('xhr'); break
      case FEATURE_NAMES.jserrors:
        flagArr.push('err'); break
      case FEATURE_NAMES.pageAction:
        flagArr.push('ins'); break
      case FEATURE_NAMES.sessionTrace:
        flagArr.push('stn'); break
      case FEATURE_NAMES.spa:
        flagArr.push('spa'); break
    }
  })

  return flagArr
}

// Note: this module and the "af" param in src/features/page_view_event/aggregate/index.js can be removed in the future at such time
// that it's no longer being used. For the browser agent, this is an unused flag system.
