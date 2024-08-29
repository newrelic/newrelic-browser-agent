import { navTimingValues } from '../../../common/timing/nav-timing'
import { Interaction } from './interaction'
import { numeric } from '../../../common/serialize/bel-serializer'
import { firstPaint } from '../../../common/vitals/first-paint'
import { firstContentfulPaint } from '../../../common/vitals/first-contentful-paint'
import { getInfo } from '../../../common/config/info'

export class InitialPageLoadInteraction extends Interaction {
  constructor (agentIdentifier) {
    super(agentIdentifier, 'initialPageLoad', 0, null)
    const agentInfo = getInfo(agentIdentifier)
    this.queueTime = agentInfo.queueTime
    this.appTime = agentInfo.applicationTime
  }

  get firstPaint () { return firstPaint.current.value }
  get firstContentfulPaint () { return firstContentfulPaint.current.value }

  /**
   * Build the navTiming node. This assumes the navTimingValues array in nav-timing.js has already been filled with values via the PageViewEvent feature having
   * executed the addPT function first and foremost.
   */
  get navTiming () {
    if (!navTimingValues.length) return
    /*
    1. we initialize the seperator to ',' (seperates the nodeType id from the first value)
    2. we initialize the navTiming node to 'b' (the nodeType id)
    3. if the value is present, we add the seperator followed by the value;
       otherwise:
        - we add null seperator ('!') to the navTimingNode
        - we set the seperator to an empty string since we already wrote it above
      the reason for writing the null seperator instead of setting the seperator
      is to ensure we still write it if the null is the last navTiming value.
    */
    let seperator = ','
    let navTimingNode = 'b'
    let prev = 0

    // Get all navTiming values except offset aka timeOrigin since we just consider that (this.start) 0.
    // These are the latter 20 of the 21 timings appended by addPT:
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
}
