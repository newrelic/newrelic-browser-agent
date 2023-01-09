import { getFeatureDependencyNames } from './featureDependencies'
import agentIdentifier from '../../shared/agentIdentifier'
import { getEnabledFeatures } from '@newrelic/browser-agent-core/src/common/util/enabled-features'
import { Aggregator } from '@newrelic/browser-agent-core/src/common/aggregate/aggregator'

/**
 * A mapping of the agent features from camelCase to kabob, which is used in the directory names
 */
export const modules = {
  pageViewEvent: 'page-view-event',
  pageViewTiming: 'page-view-timing',
  jsErrors: 'jserrors',
  ajax: 'ajax',
  pageAction: 'page-action',
  sessionTrace: 'session-trace',
  spa: 'spa',
  metrics: 'metrics'
}

const lite = [modules.pageViewEvent, modules.pageViewTiming] // lite agent cannot currently use metrics endpoint, because legacy lite customers are not provisioned access to that endpoint
const pro = [...lite, modules.metrics, modules.jsErrors, modules.ajax, modules.pageAction, modules.sessionTrace]
const spa = [...pro, modules.spa]
const worker = [ modules.metrics, modules.jsErrors, modules.ajax, modules.pageAction]

const features = { lite, pro, spa, worker }

const sharedAggregator = new Aggregator({agentIdentifier})

/**
 * Aggregator imports can happen in stages, which is utilized to ensure that dependencies are initialized first
 */
const aggregators = {
  notInitialized: {},
  staged: {},
  initialized: {}
}

/**
 * Import feature aggregators into the page, based on "build" type
 * @param {string} build - A property of "features" which contains an array of feature names to be used for importing
 * @returns {object} - Chained calls eventually return the aggregators variable, which attempts to bucket the imports into stages
 */
export async function importFeatures(build) {
  const enabledFeatures = getEnabledFeatures(agentIdentifier) // determines if enabled from config --> ajax.enabled = false
  try {
    await Promise.all(features[build].map(async featureName => {
      if (enabledFeatures[featureName.replace(/-/g, '_')]) {
        const { Aggregate } = await import(`@newrelic/browser-agent-core/src/features/${featureName}/aggregate`) // AJAX -- load a small bundle specific to that feature agg
        aggregators.notInitialized[featureName] = Aggregate
      }
    }))
  } catch (err) {
    console.error("Failed to import one or more feature(s) for", build);
    throw (err);
  }
  return stageFeatures()
}

/**
 * Checks if a chunked import class is ready to be initialized, or if it needs to wait for its dependencies to be imported first
 * @returns {object} - Chained calls eventually return the aggregators variable, which attempts to bucket the imports into stages
 */
function stageFeatures() {
  Object.entries(aggregators.notInitialized).forEach(([featureName, AggregateFeature]) => {
    const externalHarvests = getFeatureDependencyNames(featureName) // determine if there are external dependencies -->  (ajax --> ['jserrors'])
    // if it needs an external stage it, defer it
    if (externalHarvests.length) aggregators.staged[featureName] = AggregateFeature
    // otherwise initialize it and stash it for reference by staged aggs
    else {
      aggregators.initialized[featureName] = new AggregateFeature(agentIdentifier, sharedAggregator)
      delete aggregators.notInitialized[featureName]
    }
  })
  return initializeStagedFeatures()
}

/**
 * Finally attempts to initialize each feature aggregator class that has been staged for initialization
 * @param {number=0} passes 
 * @returns {object} - the aggregators variable, which attempts to bucket the imports into stages
 */
function initializeStagedFeatures(passes = 0) {
  Object.entries(aggregators.staged).forEach(([featureName, AggregateFeature]) => {
    const featureDependencyNames = getFeatureDependencyNames(featureName)
    const externalDependencies = featureDependencyNames.map(name => aggregators.initialized[name]).filter(x => x)
    if (externalDependencies.length === featureDependencyNames.length) {
      aggregators.initialized[featureName] = new AggregateFeature(agentIdentifier, sharedAggregator, externalDependencies)
      delete aggregators.staged[featureName]
      delete aggregators.notInitialized[featureName]
    }
  })
  if (passes < 3 && Object.keys(aggregators.staged).length) return initializeStagedFeatures(passes + 1)
  else {
    // these features failed to get all their external dependencies, initialize them any way but warn that they may be missing data or functionality
    Object.entries(aggregators.staged).forEach(([featureName, AggregateFeature]) => {
      const featureDependencyNames = getFeatureDependencyNames(featureName)
      const externalDependencies = featureDependencyNames.map(name => aggregators.initialized[name]).filter(x => x)
      console.warn(`Feature module ${featureName} depends on ${featureDependencyNames.join(", ")}, but one or more of those features were not included.  Some data or functionality may be impacted.`)
      aggregators.initialized[featureName] = new AggregateFeature(agentIdentifier, sharedAggregator, externalDependencies)
      delete aggregators.staged[featureName]
      delete aggregators.notInitialized[featureName]
    })
    return aggregators
  }
}

// These are exposed for testing purposes only
export { stageFeatures, features as buildToFeatsList, aggregators as aggChecklist };
