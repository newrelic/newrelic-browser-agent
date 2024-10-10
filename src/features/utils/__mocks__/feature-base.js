export const FeatureBase = jest.fn(function (agentIdentifier, featureName) {
  this.agentIdentifier = agentIdentifier
  this.featureName = featureName

  this.ee = {
    abort: jest.fn(),
    on: jest.fn(),
    emit: jest.fn()
  }
  this.blocked = false
})
