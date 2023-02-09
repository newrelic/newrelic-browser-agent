// loader files
import { getEnabledFeatures } from './features/enabled-features'
import { configure } from './configure/configure'
import { getFeatureDependencyNames } from './features/featureDependencies'
import { featurePriority } from './features/features'
// common files
import { Aggregator } from '../common/aggregate/aggregator'
import { gosNREUMInitializedAgents } from '../common/window/nreum'
import { generateRandomHexString } from '../common/ids/unique-id'
import { getConfiguration, getInfo, getLoaderConfig, getRuntime } from '../common/config/config'
import { warn } from '../common/util/console'

export class Agent {
  constructor (options, agentIdentifier = generateRandomHexString(16)) {
    this.agentIdentifier = agentIdentifier
    this.sharedAggregator = new Aggregator({ agentIdentifier: this.agentIdentifier })
    this.features = {}

    this.desiredFeatures = options.features || []
    this.desiredFeatures.sort((a, b) => featurePriority[a.featureName] - featurePriority[b.featureName])

    Object.assign(this, configure(this.agentIdentifier, options, options.loaderType || 'agent'))

    this.start()
  }

  get config () {
    return {
      info: getInfo(this.agentIdentifier),
      init: getConfiguration(this.agentIdentifier),
      loader_config: getLoaderConfig(this.agentIdentifier),
      runtime: getRuntime(this.agentIdentifier)
    }
  }

  start () {
    try {
      const enabledFeatures = getEnabledFeatures(this.agentIdentifier)
      this.desiredFeatures.forEach(f => {
        if (enabledFeatures[f.featureName]) {
          const dependencies = getFeatureDependencyNames(f.featureName)
          const hasAllDeps = dependencies.every(x => enabledFeatures[x])
          if (!hasAllDeps) warn(`${f.featureName} is enabled but one or more dependent features has been disabled (${JSON.stringify(dependencies)}). This may cause unintended consequences or missing data...`)
          this.features[f.featureName] = new f(this.agentIdentifier, this.sharedAggregator)
        }
      })
      gosNREUMInitializedAgents(this.agentIdentifier, this.features, 'features')
    } catch (err) {
      warn('Failed to initialize instrument classes', err)
      // unwrap window apis to their originals
      // remove agent if initialized to free resources ?
      return false
    }
  }
}
