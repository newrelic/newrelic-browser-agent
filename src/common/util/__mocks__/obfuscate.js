export const Obfuscator = jest.fn(function () {
  this.ruleValidationCache = []
  this.obfuscateString = jest.fn(input => input)
})

Obfuscator.prototype.validateObfuscationRule = jest.fn(rule => true)
Obfuscator.prototype.getRuleValidationCache = jest.fn(agentIdentifier => [])
