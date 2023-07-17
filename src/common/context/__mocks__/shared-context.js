export const SharedContext = jest.fn(function () {
  this.sharedContext = {
    agentIdentifier: 'abcd',
    ee: {
      on: jest.fn()
    }
  }
})
