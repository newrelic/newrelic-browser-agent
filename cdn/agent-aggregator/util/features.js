import { getFeatureDependencyNames } from './featureDependencies'
import agentIdentifier from '../../shared/agentIdentifier'
import { getEnabledFeatures } from '@newrelic/browser-agent-core/common/util/enabled-features'
import { Aggregator } from '@newrelic/browser-agent-core/common/aggregate/aggregator'

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

const lite = [modules.pageViewEvent, modules.pageViewTiming, modules.metrics]
const pro = [...lite, modules.jsErrors, modules.ajax, modules.pageAction, modules.sessionTrace]
const spa = [...pro, modules.spa]

const features = { lite, pro, spa }

const sharedAggregator = new Aggregator({agentIdentifier})

const aggregators = {
  notInitialized: {},
  staged: {},
  initialized: {}
}

export async function importFeatures(build) {
  const enabledFeatures = getEnabledFeatures(agentIdentifier) // determines if enabled from config --> ajax.enabled = false
  try {
    await Promise.all(features[build].map(async featureName => {
      if (enabledFeatures[featureName.replace(/-/g, '_')]) {
        const { Aggregate } = await import(`@newrelic/browser-agent-core/features/${featureName}/aggregate`) // AJAX -- load a small bundle specific to that feature agg
        aggregators.notInitialized[featureName] = Aggregate
      }
    }))
  } catch (err) {
    console.error("Failed to import one or more feature(s) for", build);
    throw (err);
  }
  return stageFeatures()
}

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