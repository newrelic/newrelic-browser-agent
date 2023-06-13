export class Obfuscator {
  constructor () {
    this.sharedContext = {
      agentIdentifier: 'abcd'
    }

    this.shouldObfuscate = jest.fn(() => false)
    this.obfuscateString = jest.fn((input) => input)
  }
}

export const getRules = jest.fn(() => ([]))
export const validateRules = jest.fn(() => true)
