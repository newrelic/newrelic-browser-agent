import { CATEGORY, TYPE_IDS } from '../constants'
import { paintMetrics } from '../../../common/metrics/paint-metrics'
import { navTimingValues } from '../../../common/timing/nav-timing'
import { Interaction } from './interaction'
import { globalScope } from '../../../common/constants/runtime'
import { getAddStringContext, nullable, numeric } from '../../../common/serialize/bel-serializer'
import { cleanURL } from '../../../common/url/clean-url'

export class InitialPageLoadInteraction extends Interaction {
  constructor (...args) {
    super(...args)

    this.trigger = 'initialPageLoad'
    this.start = 0
    this.end = Math.round(globalScope?.performance.timing.domInteractive - globalScope?.performance?.timeOrigin || globalScope?.performance?.timing?.navigationStart || Date.now())

    this.firstPaint = paintMetrics['first-paint']
    this.firstContentfulPaint = paintMetrics['first-contentful-paint']
    this.navTiming = navTimingValues
    this.category = CATEGORY.INITIAL_PAGE_LOAD
  }

  serialize () {
    const nodeList = []
    const addString = getAddStringContext(this.agentIdentifier)
    const fields = [
      // Type ID
      numeric(TYPE_IDS.INTERACTION),
      // Child count + Attr Count?
      numeric(0),
      // Start ms
      numeric(this.start),
      // End ms
      numeric(this.end),
      // callback end
      0,
      // callback duration
      0,
      // trigger
      addString(this.trigger),
      // initial page url
      addString(cleanURL(this.initialPageURL, true)),
      // old url
      addString(cleanURL(this.oldURL, true)),
      // new url
      addString(cleanURL(this.newURL, true)),
      // custom name
      addString(this.customName),
      // category index
      this.category,
      // queueTime, appTime, previousRoute, targetRoute, id
      nullable(this.queueTime, numeric, true) +
        nullable(this.appTime, numeric, true) +
        nullable(this.oldRoute, addString, true) +
        nullable(this.newRoute, addString, true) +
        addString(this.id),
      // node id
      addString(this.nodeId),
      // first paint
      nullable(this.firstPaint, numeric, true),
      // first contentful paint
      nullable(this.firstContentfulPaint, numeric, true)
    ]

    nodeList.push(fields)
    nodeList.push(serializeNavTiming(this.navTiming))

    return `bel.7;${nodeList.join(';')}`

    function serializeNavTiming (navTiming) {
      console.log('navTiming...', navTiming)
      let seperator = ','
      let navTimingNode = 'b'
      let prev = 0

      navTiming.slice(1, 21).forEach(v => {
        if (v !== void 0) {
          navTimingNode += seperator + numeric(v - prev)
          console.log(seperator + numeric(v - prev))
          seperator = ','
          prev = v
        } else {
          navTimingNode += seperator + '!'
          seperator = ''
        }
      })
      return navTimingNode
    }
  }
}
