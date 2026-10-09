import { stringHashCode } from '../../../src/features/jserrors/aggregate/string-hash-code'
import { Instrument as JsErrors } from '../../../src/features/jserrors/instrument'
import { SESSION_EVENTS, SESSION_EVENT_TYPES } from '../../../src/common/session/constants'
import { resetAgent, setupAgent } from '../setup-agent'

let mainAgent
beforeAll(() => {
  mainAgent = setupAgent({
    init: {
      jserrors: { enabled: true }
    }
  })
})

let jserrorsAggregate
beforeEach(async () => {
  const jserrorsInstrument = new JsErrors(mainAgent)
  await Promise.all([jserrorsInstrument.onAggregateImported])
  jserrorsAggregate = jserrorsInstrument.featAggregate

  jserrorsAggregate.ee.emit('rumresp', [{ err: 1 }]) // register rumresp event to activate and drain error buffer
  await new Promise(process.nextTick)
})
afterEach(() => {
  resetAgent(mainAgent)
})

// This function will generate an error with a stack trace that is larger than the maximum size allowed for the stack trace string
const generateTestError = (errorName) => {
  const maxSize = 65530
  const error = new Error(errorName)
  const stackHeader = error.stack.split('\n')[0]
  const stackLines = [stackHeader]
  let i = 0
  while (stackLines.join('\n').length < maxSize + 100) {
    stackLines.push(`    at generated${'F'.repeat(maxSize / 100)}rame (https://example.com/app.js:1:${i})`)
    i++
  }

  error.stack = stackLines.join('\n')
  return error
}

test('in error params, string hash code of max-sized stack trace equals browser stack hash', async () => {
  let harvestedData

  await new Promise(process.nextTick)
  jserrorsAggregate.processError(generateTestError('test message'), 100) // emit an error with max-sized stack trace

  harvestedData = jserrorsAggregate.events.get(jserrorsAggregate.harvestOpts)
  const stack_trace = harvestedData.err[0].params.stack_trace // get the stack trace

  jserrorsAggregate.events.clear() // pretend that we drained the data by clearing the buffer; needed to get browser stack hash

  await new Promise(process.nextTick)
  jserrorsAggregate.processError(generateTestError('test message'), 101) // emit the same error again

  harvestedData = jserrorsAggregate.events.get(jserrorsAggregate.harvestOpts)
  const browser_stack_hash = harvestedData.err[0].params.browser_stack_hash // get the browser stack hash

  expect(stringHashCode(stack_trace)).toEqual(browser_stack_hash) // string hashed stack_trace must equal browser_stack_hash
})

test('a session reset clears the stack hash memory, so the full stack trace is resent once', async () => {
  await new Promise(process.nextTick)
  jserrorsAggregate.processError(generateTestError('test message'), 100) // first occurrence: full stack trace

  jserrorsAggregate.events.clear()

  await new Promise(process.nextTick)
  jserrorsAggregate.processError(generateTestError('test message'), 101) // second occurrence: deduped to a hash

  let harvestedData = jserrorsAggregate.events.get(jserrorsAggregate.harvestOpts)
  expect(harvestedData.err[0].params.stack_trace).toBeUndefined()
  expect(harvestedData.err[0].params.browser_stack_hash).toBeDefined()

  jserrorsAggregate.events.clear()
  jserrorsAggregate.ee.emit(SESSION_EVENTS.RESET)

  await new Promise(process.nextTick)
  jserrorsAggregate.processError(generateTestError('test message'), 102) // after reset: full stack trace again

  harvestedData = jserrorsAggregate.events.get(jserrorsAggregate.harvestOpts)
  expect(harvestedData.err[0].params.stack_trace).toBeDefined()
  expect(harvestedData.err[0].params.browser_stack_hash).toBeUndefined()
})

describe('cross-tab session changes', () => {
  async function reportTwice () {
    await new Promise(process.nextTick)
    jserrorsAggregate.processError(generateTestError('test message'), 100)
    jserrorsAggregate.events.clear()
  }
  async function nextParams () {
    await new Promise(process.nextTick)
    jserrorsAggregate.processError(generateTestError('test message'), 101)
    return jserrorsAggregate.events.get(jserrorsAggregate.harvestOpts).err[0].params
  }

  test('a cross-tab update with a new session id resends the full stack trace', async () => {
    const id = mainAgent.runtime.session.state.value
    await reportTwice()
    jserrorsAggregate.ee.emit(SESSION_EVENTS.UPDATE, [SESSION_EVENT_TYPES.CROSS_TAB, { value: id + 'new' }])
    const params = await nextParams()
    expect(params.stack_trace).toBeDefined()
    expect(params.browser_stack_hash).toBeUndefined()
  })

  test('a cross-tab update with the same session id does not clear the memory', async () => {
    const id = mainAgent.runtime.session.state.value
    await reportTwice()
    jserrorsAggregate.ee.emit(SESSION_EVENTS.UPDATE, [SESSION_EVENT_TYPES.CROSS_TAB, { value: id }])
    const params = await nextParams()
    expect(params.stack_trace).toBeUndefined()
    expect(params.browser_stack_hash).toBeDefined()
  })

  test('a same-tab update with a new session id does not clear the memory', async () => {
    const id = mainAgent.runtime.session.state.value
    await reportTwice()
    jserrorsAggregate.ee.emit(SESSION_EVENTS.UPDATE, [SESSION_EVENT_TYPES.SAME_TAB, { value: id + 'new' }])
    const params = await nextParams()
    expect(params.stack_trace).toBeUndefined()
    expect(params.browser_stack_hash).toBeDefined()
  })

  test('a local reset followed by a cross-tab reset still clears the memory', async () => {
    mainAgent.runtime.session.reset()
    const newId = mainAgent.runtime.session.state.value
    await reportTwice()
    jserrorsAggregate.ee.emit(SESSION_EVENTS.UPDATE, [SESSION_EVENT_TYPES.CROSS_TAB, { value: newId + 'again' }])
    const params = await nextParams()
    expect(params.stack_trace).toBeDefined()
  })
})
