import { generateUuid } from '../../../common/ids/unique-id'
import { now } from '../../../common/timing/now'
import { CATEGORY } from '../constants'

let nodesSeen = 0

/**
 * link https://github.com/newrelic/nr-querypack/blob/main/schemas/bel/7.qpschema
 **/
export class Interaction {
  constructor (agentIdentifier, { trigger = '', end = null, initialPageURL, oldURL, newURL, customName, category = CATEGORY.ROUTE_CHANGE, queueTime = null, appTime = null, previousRouteName = null, targetRouteName = null }) {
    this.agentIdentifier = agentIdentifier

    this.id = generateUuid()
    this.children = []
    this.start = now()
    this.end = end
    this.callbackEnd = 0
    this.callbackDuration = 0
    this.nodeId = String(++nodesSeen)

    this.trigger = trigger
    this.initialPageURL = initialPageURL
    this.oldURL = oldURL
    this.newURL = newURL
    this.customName = customName
    this.category = category
    this.queueTime = queueTime
    this.appTime = appTime
    this.previousRouteName = previousRouteName
    this.targetRouteName = targetRouteName
  }
}
