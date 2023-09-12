import { CATEGORY } from '../constants'
import { navTimingValues } from '../../../common/timing/nav-timing'
import { Interaction } from './interaction'
import { globalScope, initialLocation } from '../../../common/constants/runtime'
import { nullable, numeric } from '../../../common/serialize/bel-serializer'
import { firstPaint } from '../../../common/vitals/first-paint'
import { firstContentfulPaint } from '../../../common/vitals/first-contentful-paint'
import { TimeToInteractive } from '../../../common/timing/time-to-interactive'

export class InitialPageLoadInteraction extends Interaction {
  constructor (...args) {
    super(...args)
    const pageUrl = initialLocation
    this.initialPageURL = pageUrl
    this.oldURL = pageUrl
    this.newURL = pageUrl
    this.trigger = 'initialPageLoad'
    this.start = 0
    this.category = CATEGORY.INITIAL_PAGE_LOAD

    new TimeToInteractive({
      startTimestamp: globalScope?.performance?.getEntriesByType('navigation')?.[0]?.loadEventEnd || globalScope?.performance?.timing?.loadEventEnd - globalScope?.performance?.timeOrigin,
      buffered: true
    }).then(({ value }) => {
      this.finish(value)
    })
  }

  get firstPaint () { return nullable(firstPaint.current.value, numeric, true) }
  get firstContentfulPaint () { return nullable(firstContentfulPaint.current.value, numeric, true) }

  get navTiming () {
    if (!navTimingValues) return
    let seperator = ','
    let navTimingNode = 'b'
    let prev = 0

    navTimingValues.slice(1, 21).forEach(v => {
      if (v !== undefined) {
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
    let serializedIxn = super.serialize()
    // fp & fcp need to go in the first block of nodes, with the base node list
    serializedIxn += `,${this.firstPaint}`
    serializedIxn += this.firstContentfulPaint
    serializedIxn += `;${this.navTiming}`
    return serializedIxn
  }
}
