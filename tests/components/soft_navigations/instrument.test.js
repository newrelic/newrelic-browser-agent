import { SoftNav } from '../../../src/features/soft_navigations'
import { FEATURE_NAME } from '../../../src/features/soft_navigations/constants'
import * as handleModule from '../../../src/common/event-emitter/handle'
import { resetAgent, setupAgent } from '../setup-agent'
import { faker } from '@faker-js/faker'

let mainAgent

beforeAll(() => {
  mainAgent = setupAgent({
    agentOverrides: {
      runSoftNavOverSpa: true
    },
    init: {
      feature_flags: ['soft_nav'],
      soft_navigations: { enabled: true }
    }
  })
})

beforeEach(async () => {
  jest.spyOn(handleModule, 'handle')
  new SoftNav(mainAgent)
})

afterEach(() => {
  resetAgent(mainAgent.agentIdentifier)
  jest.clearAllMocks()
})

test('instrument detects heuristic steps', async () => {
  history.pushState({}, '/foo')
  expect(handleModule.handle).toHaveBeenLastCalledWith('newURL', [expect.any(Number), window.location.href], undefined, FEATURE_NAME, expect.any(Object))
  history.replaceState({}, '')
  expect(handleModule.handle).toHaveBeenLastCalledWith('newURL', [expect.any(Number), window.location.href], undefined, FEATURE_NAME, expect.any(Object))
  window.dispatchEvent(new Event('popstate'))
  expect(handleModule.handle).toHaveBeenLastCalledWith('newURL', [expect.any(Number), window.location.href], undefined, FEATURE_NAME, expect.any(Object))
  expect(handleModule.handle).toHaveBeenCalledTimes(3)

  handleModule.handle.mockClear()
  // document.dispatchEvent(new Event('click')) // feature only listens for UI events that has addEventListener callbacks tied to it
  // expect(handleSpy).not.toHaveBeenCalled()
  let count = 0
  document.addEventListener('click', function () { count++ })
  document.addEventListener('keydown', function () { count++ })
  document.addEventListener('submit', function () { count++ })
  document.dispatchEvent(new Event('click'))
  document.dispatchEvent(new Event('keydown'))
  document.dispatchEvent(new Event('submit'))
  expect(count).toEqual(3)
  expect(handleModule.handle).toHaveBeenCalledTimes(1) // our processing is debounced (set to 100ms) to fire once on these 3 consecutive UI
  expect(handleModule.handle).toHaveBeenLastCalledWith('newUIEvent', [expect.any(Event)], undefined, FEATURE_NAME, expect.any(Object))
  expect(handleModule.handle.mock.calls[0][1][0].type).toEqual('click') // furthermore, the first of the UI is what's captured

  jest.spyOn(window, 'requestAnimationFrame')
  document.body.innerHTML = `<span>${faker.lorem.sentence()}</span>`
  await new Promise(process.nextTick)
  await new Promise(process.nextTick)
  expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1)
  jest.mocked(window.requestAnimationFrame).mock.calls[0][0]()
  expect(handleModule.handle).toHaveBeenCalledTimes(2) // similary, dom change RAF callback should only be fired once instead of thrice
  expect(handleModule.handle).toHaveBeenLastCalledWith('newDom', [expect.any(Number)], undefined, FEATURE_NAME, expect.any(Object))
})
