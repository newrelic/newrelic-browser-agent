const canonicalFunctionNameRe = /([a-z0-9]+)$/i
function canonicalFunctionName (orig) {
  if (!orig) return

  let match = orig.match(canonicalFunctionNameRe)
  if (match) return match[1]
}

function stringHashCode (string) {
  let hash = 0
  let charVal

  if (!string || !string.length) return hash
  for (let i = 0; i < string.length; i++) {
    charVal = string.charCodeAt(i)
    hash = ((hash << 5) - hash) + charVal
    hash = hash | 0 // Convert to 32bit integer
  }
  return hash
}

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

  for (let expectedError of expectedErrors) {
    let matchingErrors = actualErrors.filter((e) => {
      if (!expectedError.message) return !e.params.message
      return e.params.message.search(expectedError.message) !== -1
    })
    let actualError = matchingErrors[0]

    expect(actualError).toBeTruthy()
    // This is a bit hacky here, where we check if the message is
    // 'uncaught error' before testing the class name
    if (expectedError.message === 'uncaught error') {
      const errorClass = actualError.params.exceptionClass
      expect(errorClass).toEqual('UncaughtException')
    }

    // Test that instrumentation is filtered out from stack traces
    let expectedStack = expectedError.stack
    let actualStack = actualError.params.stack_trace

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

    let expectedPath = new URL(assetURL).pathname
    expect(actualError.params.request_uri).toEqual(expectedPath) // has correct request_uri attribute
  }
}

export function assertErrorAttributes (query) {
  expect(query.pve).toEqual('1')
}
