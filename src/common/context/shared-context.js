import { warn } from '../util/console'
import { TimeKeeper } from '../timing/time-keeper'

const model = {
  agentIdentifier: '',
  ee: undefined
}

export class SharedContext {
  constructor (context) {
    try {
      if (typeof context !== 'object') return warn('shared context requires an object as input')
      this.sharedContext = {}
      Object.assign(this.sharedContext, model)
      Object.entries(context).forEach(([key, value]) => {
        if (Object.keys(model).includes(key)) this.sharedContext[key] = value
      })
    } catch (err) {
      warn('An error occured while setting SharedContext', err)
    }

    this.timeKeeper = TimeKeeper.getTimeKeeperByAgentIdentifier(this.sharedContext.agentIdentifier)
  }
}
