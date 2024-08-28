const OriginalMO = window.MutationObserver
let mutationEE
beforeEach(async () => {
  const { wrapMutation } = await import('../../../src/common/wrap/wrap-mutation')
  mutationEE = wrapMutation()
})
afterEach(() => {
  jest.resetModules()
})

test('works', done => {
  let callbackInvocations = 0
  const observer = new MutationObserver(function () {
    callbackInvocations++
  })
  let el = document.createElement('div')
  document.body.appendChild(el)

  // Observing the same element twice should still result in the callback being invoked only once.
  observer.observe(el, { attributes: true })
  observer.observe(el, { attributes: true })

  el.setAttribute('foo', 'bar')
  setTimeout(() => {
    expect(callbackInvocations).toEqual(1)
    observer.disconnect()

    el.setAttribute('bar', 'baz')
    setTimeout(() => {
      expect(callbackInvocations).toEqual(1)
      done()
    })
  })
})

test('wrapped is still instanceof original MutationObserver', () => {
  const observer = new MutationObserver(function () {})
  expect(observer instanceof MutationObserver).toBeTruthy()
  expect(observer instanceof OriginalMO).toBeTruthy()
})

test('no issues with double-instrumentation', () => {
  // This simulates what zone.js does when they wrap MutationObserver
  const WrappedObserver = function (cb) {
    return new OriginalMO(cb)
  }
  window.MutationObserver = WrappedObserver

  const observer = new MutationObserver(function () {})
  expect(observer).toBeTruthy() // successfully created new double-wrapped MutationObserver instance
})

test('callbacks get passthrough args', done => {
  const el = document.createElement('div')
  document.body.appendChild(el)

  mutationEE.on('fn-start', function (args) {
    expect(args.length).toEqual(2)
  })

  const observer = new MutationObserver(function (mutationRecords, o) {
    expect(mutationRecords.length).toEqual(1)
    expect(o).toBe(observer)
    done()
  })
  observer.observe(el, { attributes: true })
  el.setAttribute('foo', 'bar')
})
