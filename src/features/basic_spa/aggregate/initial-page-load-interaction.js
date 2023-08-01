import { CATEGORY } from '../constants'
import { paintMetrics } from '../../../common/metrics/paint-metrics'
import { navTimingValues } from '../../../common/timing/nav-timing'
import { Interaction } from './interaction'
import { globalScope, initialLocation } from '../../../common/constants/runtime'
import { nullable, numeric } from '../../../common/serialize/bel-serializer'

export class InitialPageLoadInteraction extends Interaction {
  constructor (...args) {
    super(...args)
    const pageUrl = initialLocation
    this.initialPageURL = pageUrl
    this.oldURL = pageUrl
    this.newURL = pageUrl
    this.trigger = 'initialPageLoad'
    this.start = 0
    this.end = Math.round(globalScope?.performance.timing.domInteractive - globalScope?.performance?.timeOrigin || globalScope?.performance?.timing?.navigationStart || Date.now())
    this.category = CATEGORY.INITIAL_PAGE_LOAD

    setTimeout(() => this.finish(), 0)
  }

  get firstPaint () { return nullable(paintMetrics['first-paint'], numeric, true) }
  get firstContentfulPaint () { return nullable(paintMetrics['first-contentful-paint'], numeric, true) }
  get navTiming () {
    if (!navTimingValues) return
    let seperator = ','
    let navTimingNode = 'b'
    let prev = 0

    navTimingValues.slice(1, 21).forEach(v => {
      if (v !== void 0) {
        navTimingNode += seperator + numeric(v - prev)
        seperator = ','
        prev = v
      } else {
        navTimingNode += seperator + '!'
        seperator = ''
      }
    })
    return navTimingNode
  }

  serialize () {
    const nodeList = super.serialize()

    // fp & fcp need to go in the first block of nodes, with the base node list
    nodeList[0].push(this.firstPaint)
    nodeList[0].push(this.firstContentfulPaint)

    nodeList.push(this.navTiming)

    return nodeList
  }
}
