import { stringHashCode } from '../../../src/features/jserrors/aggregate/string-hash-code'
import { Instrument as JsErrors } from '../../../src/features/jserrors/instrument'
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
