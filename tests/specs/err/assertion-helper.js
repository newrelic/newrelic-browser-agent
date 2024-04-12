import canonicalFunctionName from '../../lib/canonical-function-name'
import stringHashCode from '../../lib/string-hash-code'

function computeExpectedCanonicalStack (expectedStack) {
  return expectedStack.map((frame) => {
    let line = ''
    if (frame.f) line += `${canonicalFunctionName(frame.f)}@`
    if (frame.u) line += frame.u
    if (frame.l) line += `:${frame.l}`
    return line
  }).join('\n')
}

export function assertExpectedErrors (actualErrors, expectedErrors, assetURL) {
  expect(actualErrors.length).toEqual(expectedErrors.length)

  for (const expectedError of expectedErrors) {
    const matchingErrors = actualErrors.filter((e) => {
      return e.params.message.search(expectedError.message) !== -1
    })
    const actualError = matchingErrors[0]

    expect(actualError).toBeTruthy()
    // This is a bit hacky here, where we check if the message is
    // 'uncaught error' before testing the class name
    if (expectedError.message === 'uncaught error') {
      const errorClass = actualError.params.exceptionClass
      expect(errorClass).toEqual('UncaughtException')
    }

    // Test that instrumentation is filtered out from stack traces
    const expectedStack = expectedError.stack
    const actualStack = actualError.params.stack_trace

    expect(actualStack && actualStack.match(/nrWrapper/)).toBeFalsy() // instrumentation not filtered out

    const expectedCanonicalStack = computeExpectedCanonicalStack(expectedStack)
    const expectedStackHash = stringHashCode(expectedCanonicalStack)

    expect(actualError.params.stackHash).toBeTruthy()

    if (actualError.params.stackHash !== expectedStackHash && actualError.params.canonicalStack) {
      console.log('Actual stack from browser:\n' + actualError.params.origStack)
      console.log('\nActual canonical stack from browser:\n' + actualError.params.canonicalStack)
      console.log('\nExpected canonical stack:\n' + expectedCanonicalStack + '\n')
      console.log(actualError.params.origStackInfo)
    }

    const expectedPath = new URL(assetURL).pathname
    expect(actualError.params.request_uri).toEqual(expectedPath) // has correct request_uri attribute
  }
}
