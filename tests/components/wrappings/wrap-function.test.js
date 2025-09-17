import { ee } from '../../../src/common/event-emitter/contextual-ee'
import createWrapperWithEmitter from '../../../src/common/wrap/wrap-function'

const baseEE = ee.get('abc123')
const wrapFn = createWrapperWithEmitter(baseEE)
function thisCtx (args, obj) {
  return obj
}
function makeError (msg) {
  return function () { throw new Error(msg) }
}

describe('Wrap function', () => {
  let errorThrown
  beforeAll(() => {
    baseEE.on('internal-error', function (err) {
      // When an exception is thrown in emitter callbacks, they are emitted as internal errors and not bubbled up, so we need to catch the bad assertions ourself.
      // This is needed to ensure that if the expect in 'time-end' fails, we're actually failing the test...
      if (errorThrown !== undefined) console.error(err)
      errorThrown = true
    })
  })
  let args, takesTime
  beforeEach(() => { // clean slate
    args = (a, b, c) => c
    takesTime = function (ctx) {
      let counter = 0
      while (counter < 100000) counter++
      if (ctx) ctx.timeDone = performance.now()
      return this || window
    }
    errorThrown = false // reset any assertion failure btwn tests
  })
  afterEach(() => {
    expect(errorThrown).toEqual(false) // -- SEE CONSOLED ERROR for original issue if this is throwing!
  })

  test('does not mutate original function', () => {
    const wArgs = wrapFn(args)
    expect(wArgs[wrapFn.flag]).toBeTruthy() // wrapped flag set
    expect(wrapFn(wArgs)).toEqual(wArgs) // re-wrapping just returns same function

    baseEE.on('start', function (args, self, methodName) {
      expect(args[1]).toEqual(2) // event args make sense
    })
    baseEE.on('end', function (args, self, result) {
      expect(result).toEqual(3) // result of calling function reported
    })
    wArgs(1, 2, 3)
    expect(wArgs(1, 2, 3)).toEqual(args(1, 2, 3)) // wrapped returns same argument
  })

  test('copies enumerable properties', () => {
    args.foobar = 100
    const wArgs = wrapFn(args)
    expect(wArgs.foobar).toEqual(100)

    const obj = { args }
    wrapFn.inPlace(obj, ['args'], '-', thisCtx)
    wArgs.foobar = 2
    expect(obj.args.foobar).toEqual(2) // proxy accessors work
  })

  test('returns modified argument on wrapped object', () => {
    baseEE.on('args-start', function (args, self, methodName) {
      expect(methodName).toEqual('args') // method name passed to event handler
      args[2] = 42
    })
    const obj = { args }
    wrapFn.inPlace(obj, ['args'], '-', thisCtx)
    expect(obj.args(1, 2, 3)).toEqual(42)
  })

  test('does not wrap nonexistent prop in object', () => {
    const empty = {}
    wrapFn.inPlace(empty, ['foo'])
    if ('foo' in empty) throw new Error('Nonexistent fn should not be wrapped')
  })
  test('returns same value for non functions', () => {
    expect(wrapFn('foo')).toEqual('foo')
  })

  test('is synchronous wrt or blocked by original function', () => {
    const sameCtx = {}
    const wTakesTime = wrapFn(takesTime, 'calcTime-')

    baseEE.on('calcTime-start', function (args, self, methodName) {
      sameCtx.timeStarted = performance.now()
    })
    baseEE.on('calcTime-end', function (args, self, result) {
      expect(sameCtx.timeStarted).toBeLessThan(sameCtx.timeDone)
      expect(sameCtx.timeDone).toBeLessThan(performance.now())
    })
    wTakesTime(sameCtx)
  })

  test('keeps the same "this" context', () => {
    baseEE.on('args-start', function (args, self, methodName) {
      this.argsStart = true
    })
    baseEE.on('takesTime-start', function (args, self, methodName) {
      expect(this.argsStart).toEqual(true) // context reused among wrapped methods using sameCtx
    })

    const sameCtx = {}
    const obj = { args, takesTime }
    const wTakesTime = wrapFn(takesTime, 'time-', function () { return sameCtx })
    wrapFn.inPlace(obj, ['args', 'takesTime'], '-', thisCtx)

    obj.args(1, 2, 3)
    expect(takesTime()).toEqual(wTakesTime()) // Wrapped has same "this"
    expect(obj.takesTime()).toEqual(obj) // obj wrapped has same "this"
  })

  test('rethrows exceptions from original function', () => {
    let ran = false
    const errors = makeError('This is an error')
    const wErrors = wrapFn(errors, 'errFn-')

    baseEE.on('errFn-err', function (args, self, err) {
      expect(err.message).toEqual('This is an error') // got thrown error
      ran = true
    })
    expect(wErrors).toThrow('This is an error')
    expect(ran).toEqual(true)
  })

  test('does not throw exceptions from start and end event listeners', () => {
    errorThrown = undefined // signal we're expecting an error to avoid logging

    baseEE.on('prefix-start', makeError('baseEE.emit start'))
    baseEE.on('prefix-end', makeError('baseEE.emit end'))
    expect(wrapFn(() => { errorThrown = undefined }, 'prefix-')).not.toThrow()

    errorThrown = false // reset flag to avoid afterEach failure
  })

  test('does not throw or overwrite exception from orig fn in the err event listener', () => {
    errorThrown = undefined
    const origFn = makeError('This is an error')

    baseEE.on('prefixError-err', makeError('baseEE.emit err'))
    expect(wrapFn(origFn, 'prefixError-')).toThrow('This is an error')

    errorThrown = false
  })

  test('does not throw if getContext function throws', () => {
    errorThrown = undefined

    expect(wrapFn(args, 'getContextError', makeError('getContext'))).not.toThrow()
    expect(errorThrown).toBeTruthy() // however, the internal error is reported to us

    errorThrown = false
  })

  test('default context is not resused before a call is finished', () => {
    let count = 0
    function recurseOnce () {
      if (count++ < 1) recurseOnce()
    }
    const outer = wrapFn(recurseOnce, 'out-')

    let adder = 0
    baseEE.on('out-start', function (args) {
      expect(this.ok).toBeFalsy() // ctx not reused by outer start and inner start (#1 and #2 order of execution)
      expect(++adder).toBeGreaterThan(0)
      this.ok = true
    })
    baseEE.on('out-end', function (args) {
      expect(this.ok).toBeTruthy()
      adder -= 3
      expect(adder).toBeLessThan(0) // +1,+1,-3,-3 vs +1,-3,+1,-3
    })
    outer()
  })

  describe('long tasks', () => {
    let onLongTask, onShortTask
    afterEach(async () => {
      if (onLongTask) {
        baseEE.removeEventListener('long-task', onLongTask)
        onLongTask = null
      }
      if (onShortTask) {
        baseEE.removeEventListener('short-task', onShortTask)
        onShortTask = null
      }
    })

    test('does not emit long task event if fn takes less than 50ms', (done) => {
      onLongTask = function () {
        seenLongTask = true // set flag to check if long task event was emitted
      }
      onShortTask = function (_, __, ____) {
        expect(seenLongTask).toEqual(false) // no long task event emitted
        done()
      }
      let seenLongTask = false
      baseEE.on('long-task', onLongTask)

      baseEE.on('short-end', onShortTask)

      const shortTask = wrapFn(() => {}, 'short-')
      shortTask(thisCtx)
    })

    test('emits long task message if fn takes more than 50ms', (done) => {
      onLongTask = function (task) {
        expectLongTask(task)
        done()
      }

      const reallySlowFn = function reallySlowFn () {
        slowFn(100000000, 1000000000) // this should take more than 50ms
      }

      const longTask = wrapFn(reallySlowFn, 'long-', thisCtx, 'reallySlowFn', true)
      baseEE.on('long-task', onLongTask)

      longTask(thisCtx)
    })

    test('emits long task message if fn errors out', (done) => {
      const err = new Error('TEST')
      onLongTask = function (task) {
        expectLongTask(task, err)
        done()
      }

      const reallySlowFn = function reallySlowFn () {
        slowFn(100000000, 1000000000) // this should take more than 50ms
        throw err // this should throw an error
      }

      const longTask = wrapFn(reallySlowFn, 'long-', thisCtx, 'reallySlowFn', true)
      baseEE.on('long-task', onLongTask)

      try {
        expect(longTask(thisCtx)).throws('TEST') // should throw an error
      } catch (e) {
        // We expect the error to be thrown, so we catch it here to avoid failing the test.
        // The long task event should still be emitted and handled by onLongTask.
      }
    })

    test('nested long tasks emit twice', (done) => {
      const seenLongTasks = { fn1: false, fn2: false, calls: 0 }
      onLongTask = function (task) {
        expectLongTask(task)
        seenLongTasks[task.methodName] = true
        seenLongTasks.calls++
        if (seenLongTasks.calls === 2 && seenLongTasks.fn1 && seenLongTasks.fn2) {
          done() // both long tasks emitted
        }
      }

      baseEE.on('long-task', onLongTask)

      const fn2 = function fn2 (ctx) {
        return slowFn()
      }
      const wrappedFn2 = wrapFn(fn2, 'fn2-', thisCtx, 'fn2', true)

      const fn1 = function fn1 (ctx) {
        slowFn()
        return wrappedFn2(ctx)
      }
      const longTask = wrapFn(fn1, 'fn1-', thisCtx, 'fn1', true)
      longTask(thisCtx)
    })
  })

  function expectLongTask (task, error) {
    expect(task).toBeDefined() // task info is passed
    expect(task.duration).toBeGreaterThanOrEqual(50) // can tell that task took less than 50ms
    expect(task.isLongTask).toEqual(true) // task is marked as short task
    if (error) expect(task.thrownError).toEqual(error) // task has thrown error
    else expect(task.thrownError).toBeUndefined() // task has not thrown error
  }

  function slowFn (from = 100000000, to = 1000000000) {
    let i = 0
    const loops = getRandomInt(from, to)
    while (i < loops) {
      i++
    }
    function getRandomInt (min, max) {
      return Math.ceil(Math.floor(Math.random() * (max - min + 1)) + min)
    }
    return i
  }
})
