import { getConfigurationValue, getInfo, getRuntime } from '../config/config'
import { isBrowserScope } from '../constants/runtime'
import { HarvestScheduler } from '../harvest/harvest-scheduler'
import { cleanURL } from '../url/clean-url'
import { warn } from '../util/console'
import { stringify } from '../util/stringify'
import { GenericEvent } from './generic-event'

const referrerUrl = isBrowserScope && document.referrer ? cleanURL(document.referrer) : undefined

class GenericEventHandler {
  #instances = {}

  addEvent (event, feature) {
    if (!feature || !feature.agentIdentifier) {
      warn('must supply a valid feature with events to allow for instance handling.')
      return
    }
    const agentIdentifier = feature.agentIdentifier
    if (!this.#instances[agentIdentifier]) {
      this.#instances[agentIdentifier] = {
        agentIdentifier,
        blocked: false,
        currentEvents: null,
        events: [],
        scheduler: new HarvestScheduler('ins', { onFinished: (...args) => this.onHarvestFinished(this.#instances[agentIdentifier], ...args) }, feature)
      }

      this.#instances[agentIdentifier].scheduler.harvest.on('ins', (...args) => this.onHarvestStarted(this.#instances[agentIdentifier], ...args))
      this.#instances[agentIdentifier].scheduler.startTimer(getConfigurationValue(feature.agentIdentifier, 'ins.harvestTimeSeconds'), 0)
    }

    if (!event || !Object.keys(event).length) return
    if (!(event instanceof GenericEvent)) {
      warn('Invalid event passed to generic event handler.')
      return
    }

    for (let key in event) {
      const val = event[key]
      event[key] = (val && typeof val === 'object' ? stringify(val) : val)
    }

    const eventAttributes = {
      timeSinceLoad: (event.timestampOffset) / 1000,
      referrerUrl,
      currentUrl: cleanURL('' + location),
      pageUrl: cleanURL(getRuntime(agentIdentifier).origin),
      ...getInfo(agentIdentifier).jsAttributes,
      ...event
    }

    this.#instances[agentIdentifier].events.push(eventAttributes)
  }

  block (feature) {
    if (this.#instances[feature.agentIdentifier]) this.#instances[feature.agentIdentifier].blocked = true
  }

  onHarvestStarted (instance, options) {
    if (instance.blocked) return
    const { userAttributes, atts } = getInfo(instance.agentIdentifier)
    var payload = ({
      qs: {
        ua: userAttributes,
        at: atts
      },
      body: {
        ins: instance.events
      }
    })

    if (options.retry) {
      instance.currentEvents = instance.events
    }

    instance.events = []
    return payload
  }

  onHarvestFinished (instance, result) {
    if (result && result.sent && result.retry && instance.currentEvents) {
      instance.events = instance.events.concat(instance.currentEvents)
      instance.currentEvents = null
    }
  }
}

export const genericEventHandler = new GenericEventHandler()
