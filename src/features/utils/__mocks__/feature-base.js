export const FeatureBase = jest.fn(function (agentIdentifier, aggregator, featureName) {
  this.agentIdentifier = agentIdentifier
  this.aggregator = aggregator
  this.featureName = featureName

  this.ee = {
    abort: jest.fn(),
    on: jest.fn(),
    emit: jest.fn()
  }
  this.blocked = false
})
