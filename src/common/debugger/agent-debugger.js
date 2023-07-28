import { DebugLogger } from './debug-logger'
import { FEATURE_NAMES } from '../../loaders/features/features'
import { stringify } from '../util/stringify'
import { gosNREUMInitializedAgents } from '../window/nreum'
import { generateRandomHexString } from '../ids/unique-id'

export class AgentDebugger {
  #agent
  #logger
  #data

  constructor (agent) {
    this.#agent = agent
    this.#logger = new DebugLogger(agent)
    this.#data = {
      agentIdentifier: agent.agentIdentifier,
      debuggerErrors: [],
      applicationErrors: [],
      internalErrors: [],
      drainedFeatures: [],
      eventLog: []
    }

    gosNREUMInitializedAgents(this.#agent.agentIdentifier, { saveDebuggingLog: this.saveDebuggingLog.bind(this) }, 'debugger')
    this.#data.desiredFeatures = Array.from(this.#agent.desiredFeatures)
      .map(featureCtor => featureCtor.featureName)

    this.#logger.log('Agent debugger attached')
  }

  saveDebuggingLog () {
    this.#data.featuresSnapshot = Object.values(this.#agent.features)
      .map(feature => this.#extractFeatureInfo(feature))
    this.#data.configSnapshot = this.#agent.config

    const blob = new Blob([stringify(this.#data)], { type: 'application/json' })

    const elem = document.createElement('a')
    elem.href = URL.createObjectURL(blob)
    elem.download = `nrba-debug.${Date.now()}.log`
    document.body.appendChild(elem)
    elem.click()
    document.body.removeChild(elem)
    URL.revokeObjectURL(blob)
  }

  handleEvent ({ channel, type, args, context }) {
    try {
      if (context && !context.debuggerId) {
        context.debuggerId = generateRandomHexString(8)
      }

      // Use JSON.parse(stringify()) to create a snapshot in time of the event data
      const parsedEvent = JSON.parse(stringify({
        uniqueId: generateRandomHexString(8),
        contextId: context?.debuggerId,
        eeTimestamp: performance.now(), // Not sure this adds value or detracts a lot of events will have time values, this might cause confusion
        channel,
        type,
        context,
        args
      }))

      this.#data.eventLog.push(parsedEvent)

      if (type === 'errorAgg') {
        this.#data[parsedEvent.args[0] === 'ierr' ? 'internalErrors' : 'applicationErrors'].push(
          this.#createEventPointer(parsedEvent)
        )
      }

      if (type.startsWith('drain')) {
        const featName = type.replace('drain-', '')
        if (!this.#data.drainedFeatures.includes(featName)) {
          this.#data.drainedFeatures.push(featName)
        }
      }
    } catch (err) {
      this.#data.debuggerErrors.push({
        timestamp: performance.now(),
        msg: err.message,
        stack: err.stack || err.stackTrace
      })
    }
  }

  #attachSpaLogger () {
    let spaFeature
    for (const feature of this.#agent.desiredFeatures) {
      if (feature && feature.featureName === FEATURE_NAMES.spa) {
        spaFeature = feature
      }
    }

    if (!spaFeature) {
      this.#logger.log('Could not connect spa logger. SPA feature does not appear to be loaded.')
    }

    let wrappedSpaFeature = new Proxy(spaFeature, {
      construct: (trapTarget, argumentList) => {
        this.#logger.log('Instrumenting spa feature')

        const instrument = Reflect.construct(trapTarget, argumentList)
        instrument.onAggregateImported.then((success) => {
          if (success) {
            const aggregate = instrument.featAggregate

            if (!aggregate) {
              return this.#logger.error('Could not attach to SPA feature aggregate instance.')
            }

            let interactionDepth = aggregate.state.depth
            Object.defineProperty(aggregate.state, 'depth', {
              configurable: true,
              enumerable: true,
              get: () => {
                return interactionDepth
              },
              set: (value) => {
                if (value < interactionDepth) {
                  this.#logger.log('SPA interaction depth decreased', interactionDepth, value)
                } else if (value > interactionDepth) {
                  this.#logger.log('SPA interaction depth increased', interactionDepth, value)
                }
                interactionDepth = value
              }
            })

            let interactionsToHarvest = aggregate.state.interactionsToHarvest
            Object.defineProperty(aggregate.state, 'interactionsToHarvest', {
              configurable: true,
              enumerable: true,
              get: () => {
                return interactionsToHarvest
              },
              set: (value) => {
                if (Array.isArray(value) && value.length === 0) {
                  this.#logger.log('SPA feature harvesting interaction', ...interactionsToHarvest)
                }

                interactionsToHarvest = value
              }
            })
          }
        })

        return instrument
      }
    })
    this.#agent.desiredFeatures.delete(spaFeature)
    this.#agent.desiredFeatures.add(wrappedSpaFeature)
  }

  #extractFeatureInfo (feature) {
    return {
      featureName: feature.featureName,
      auto: feature.auto,
      blocked: feature.blocked,
      aggregateLoaded: !!feature.featAggregate
    }
  }

  #createEventPointer (event) {
    return {
      uniqueId: event.uniqueId,
      contextId: event.contextId,
      eeTimestamp: event.eeTimestamp,
      type: event.type
    }
  }
}
