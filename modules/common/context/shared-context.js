const model = {
  agentIdentifier: ''
}

export class SharedContext {
  constructor(context) {
    if (typeof context !== 'object') return console.error('shared context requires an object as input')
    this.sharedContext = {}
    Object.assign(this.sharedContext, model)
    Object.entries(context).forEach(([key, value]) => {
      if (Object.keys(model).includes(key)) this.sharedContext[key] = value
    })
  }
}
