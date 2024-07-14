import { warn } from '../util/console'

const model = {
  agentIdentifier: '',
  ee: undefined
}

export class SharedContext {
  constructor (context) {
    try {
      if (typeof context !== 'object') return warn(8)
      this.sharedContext = {}
      Object.assign(this.sharedContext, model)
      Object.entries(context).forEach(([key, value]) => {
        if (Object.keys(model).includes(key)) this.sharedContext[key] = value
      })
    } catch (err) {
      warn(9, err)
    }
  }
}
