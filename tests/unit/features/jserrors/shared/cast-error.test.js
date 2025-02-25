import { castError, castErrorEvent, castPromiseRejectionEvent } from '../../../../../src/features/jserrors/shared/cast-error'
import { UncaughtError } from '../../../../../src/features/jserrors/shared/uncaught-error'

let err
describe('cast-error', () => {
  beforeEach(() => {
    err = new Error('message')
    err.filename = 'filename'
    err.lineno = 'lineno'
    err.colno = 'colno'
  })

  describe('castError', () => {
    test('returns Error directly when actual error with stack', () => {
      const castedError = castError(err)
      expect(castedError).toBeInstanceOf(Error)
      expect(castedError).toEqual(err)
    })

    test('returns UncaughtError when actual error with no stack', () => {
      ;['stack', 'filename', 'lineno', 'colno'].forEach(prop => {
        delete err[prop]
        const castedError = castError(err)
        expect(castedError).toBeInstanceOf(UncaughtError)
        expect(castedError).toMatchObject({
          name: 'UncaughtError',
          message: 'message',
          ...(err.filename && { sourceURL: 'filename' }),
          ...(err.lineno && { line: 'lineno' }),
          ...(err.colno && { column: 'colno' })
        })
      })
    })

    test('returns UncaughtError with various message types', () => {
      ;[1, true, false, ['test'], { test: 1 }].forEach(prop => {
        delete err.stack
        err.message = prop
        const castedError = castError(err)
        expect(castedError).toBeInstanceOf(UncaughtError)
        expect(castedError).toMatchObject({
          name: 'UncaughtError',
          message: JSON.stringify(prop)
        })
      })
    })

    test('returns UncaughtError when no message is supplied', () => {
      err.message = undefined
      delete err.stack
      const castedError = castError(err)
      expect(castedError).toBeInstanceOf(UncaughtError)
      expect(castedError).toMatchObject({
        name: 'UncaughtError',
        message: JSON.stringify(err)
      })
    })
  })

  describe('castErrorEvent', () => {
    test('castErrorEvent handles SyntaxErrors', () => {
      const err = new SyntaxError('message')
      const castedError = castErrorEvent({
        error: err,
        message: 'message',
        filename: 'filename',
        lineno: 'lineno',
        colno: 'colno'
      })
      expect(castedError).toMatchObject({
        name: 'SyntaxError',
        message: 'message',
        sourceURL: 'filename',
        line: 'lineno',
        column: 'colno'
      })
    })

    test('castErrorEvent handles other errors', () => {
      delete err.stack
      const castedError = castErrorEvent({ error: err, lineno: 'lineno', colno: 'colno', message: 'message', filename: 'filename' })
      expect(castedError).toMatchObject({
        name: 'UncaughtError',
        message: 'message',
        sourceURL: 'filename',
        line: 'lineno',
        column: 'colno'
      })
    })
  })

  describe('castPromiseRejectionEvent', () => {
    test('handles events with an error reason without stack', () => {
      delete err.stack
      const castedError = castPromiseRejectionEvent({ reason: err })
      expect(castedError).toMatchObject({
        name: 'UncaughtError',
        message: 'Unhandled Promise Rejection: message',
        sourceURL: 'filename',
        line: 'lineno',
        column: 'colno'
      })
    })

    test('handles events with an error reason with stack', () => {
      const castedError = castPromiseRejectionEvent({ reason: err })
      expect(castedError).toBeInstanceOf(Error)
      expect(castedError).toEqual(err)
    })

    test('handles events with an error reason missing a message', () => {
      err.message = undefined
      delete err.stack
      const castedError = castPromiseRejectionEvent({ reason: err })
      expect(castedError).toMatchObject({
        name: 'UncaughtError',
        message: 'Unhandled Promise Rejection: {"filename":"filename","lineno":"lineno","colno":"colno"}',
        sourceURL: 'filename',
        line: 'lineno',
        column: 'colno'
      })
    })

    test('handles events with a non-error reason', () => {
      delete err.stack
      const castedError = castPromiseRejectionEvent({ reason: 'test' })
      expect(castedError).toMatchObject({
        name: 'UncaughtError',
        message: 'Unhandled Promise Rejection: test',
        sourceURL: undefined,
        line: undefined,
        column: undefined
      })
    })

    test('handles promise rejections that already have a prefix (no prefix duplication)', () => {
      err.message = 'Unhandled Promise Rejection: test'
      const castedTrustedError = castPromiseRejectionEvent({ reason: err })
      expect(castedTrustedError.message).toEqual('Unhandled Promise Rejection: test')

      const castedError = castPromiseRejectionEvent({ reason: 'Unhandled Promise Rejection: test' })
      expect(castedError.message).toEqual('Unhandled Promise Rejection: test')
    })

    test('terminates for events with falsy reasons', () => {
      let castedError = castPromiseRejectionEvent({ reason: undefined })
      expect(castedError).toBeUndefined()
      castedError = castPromiseRejectionEvent({ reason: null })
      expect(castedError).toBeUndefined()
      castedError = castPromiseRejectionEvent({ reason: '' })
      expect(castedError).toBeUndefined()
    })
  })
})
