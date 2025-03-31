import { Interaction } from '../../../src/features/spa/aggregate/interaction'

let mockClearTimeoutCalls = 0; let mockSetTimeoutCalls = 0; let mockExecuteTimeoutCallback = true

jest.mock('../../../src/common/constants/runtime')
jest.mock('../../../src/common/config/info', () => ({
  __esModule: true,
  getInfo: jest.fn().mockReturnValue({})
}))
jest.mock('../../../src/common/config/init', () => ({
  __esModule: true,
  getConfigurationValue: jest.fn()
}))
jest.mock('../../../src/common/window/nreum', () => ({
  __esModule: true,
  gosNREUM: jest.fn().mockReturnValue({}),
  gosNREUMOriginals: jest.fn().mockReturnValue({
    o: {
      ST: function (cb) {
        mockSetTimeoutCalls++
        if (mockExecuteTimeoutCallback) cb()
        return mockSetTimeoutCalls
      },
      CT: function () { mockClearTimeoutCalls++ }
    }
  })
}))

const agentIdentifier = 'abcdefg'

test('checkFinish sets timers', () => {
  const interaction = new Interaction(undefined, undefined, undefined, undefined, undefined, agentIdentifier)
  const setTimeoutCallsStart = mockSetTimeoutCalls

  interaction.checkFinish()

  expect(mockSetTimeoutCalls).toEqual(setTimeoutCallsStart + 2)
})

test('checkFinish does not set timers when there is work in progress', () => {
  const interaction = new Interaction(undefined, undefined, undefined, undefined, undefined, agentIdentifier)
  const setTimeoutCallsStart = mockSetTimeoutCalls

  interaction.remaining = 1
  interaction.checkFinish()

  expect(mockSetTimeoutCalls).toEqual(setTimeoutCallsStart)
})

test('assigns url and routename to attributes', () => {
  const interaction = new Interaction(undefined, undefined, undefined, undefined, undefined, agentIdentifier)

  expect(interaction.root.attrs.newURL).toBeUndefined()
  expect(interaction.root.attrs.newRoute).toBeUndefined()

  interaction.setNewURL('some url')
  interaction.setNewRoute('some route name')

  expect(interaction.root.attrs.newURL).toEqual('some url')
  expect(interaction.root.attrs.newRoute).toEqual('some route name')
})

test('does not reset finishTimer if it has already been set', () => {
  const setTimeoutCallsStart = mockSetTimeoutCalls
  mockExecuteTimeoutCallback = false
  const interaction = new Interaction(undefined, undefined, undefined, undefined, undefined, agentIdentifier)

  interaction.checkFinish()
  expect(mockSetTimeoutCalls).toEqual(setTimeoutCallsStart + 1)
  interaction.checkFinish()
  expect(mockSetTimeoutCalls).toEqual(setTimeoutCallsStart + 1) // setTimeout has not be called again

  mockExecuteTimeoutCallback = true
})

test('if timer is in progress and there is work remaining, timer should be cancelled', () => {
  const clearTimeoutCallsStart = mockClearTimeoutCalls
  mockExecuteTimeoutCallback = false
  const interaction = new Interaction(undefined, undefined, undefined, undefined, undefined, agentIdentifier)

  interaction.checkFinish()
  interaction.remaining = 1
  interaction.checkFinish()
  expect(mockClearTimeoutCalls).toEqual(clearTimeoutCallsStart + 1) // clearTimeout has been called once

  mockExecuteTimeoutCallback = true
})
