/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { canCapturePayload } from '../../../../../src/common/payloads/payloads'
import { hasGQLErrors } from '../../../../../src/features/ajax/aggregate/gql'

describe('canCapturePayload logic', () => {
  const genEvent = () => {
    const event = { payloadHostname: 'example.com', statusCode: 200, hasGQLErrors: false }
    event.status = (statusCode) => { event.statusCode = statusCode; return event }
    event.gqlErrors = (hasGQLErrors) => { event.hasGQLErrors = hasGQLErrors; return event }
    return event
  }

  describe('none mode', () => {
    test('never captures payloads', () => {
      expect(canCapturePayload('none', genEvent().status(200).gqlErrors(false))).toBe(false)
      expect(canCapturePayload('none', genEvent().status(404).gqlErrors(false))).toBe(false)
      expect(canCapturePayload('none', genEvent().status(500).gqlErrors(false))).toBe(false)
      expect(canCapturePayload('none', genEvent().status(0).gqlErrors(false))).toBe(false)
      expect(canCapturePayload('none', genEvent().status(200).gqlErrors(true))).toBe(false)
    })

    test('treats null/undefined as none', () => {
      expect(canCapturePayload(null, genEvent().status(200).gqlErrors(false))).toBe(false)
      expect(canCapturePayload(undefined, genEvent().status(200).gqlErrors(false))).toBe(false)
    })
  })

  describe('all mode', () => {
    test('captures all payloads regardless of status', () => {
      expect(canCapturePayload('all', genEvent().status(200))).toBe(true)
      expect(canCapturePayload('all', genEvent().status(201))).toBe(true)
      expect(canCapturePayload('all', genEvent().status(204))).toBe(true)
      expect(canCapturePayload('all', genEvent().status(301))).toBe(true)
      expect(canCapturePayload('all', genEvent().status(400))).toBe(true)
      expect(canCapturePayload('all', genEvent().status(404))).toBe(true)
      expect(canCapturePayload('all', genEvent().status(500))).toBe(true)
      expect(canCapturePayload('all', genEvent().status(0))).toBe(true)
    })

    test('captures all payloads regardless of GraphQL errors', () => {
      expect(canCapturePayload('all', genEvent().gqlErrors(false))).toBe(true)
      expect(canCapturePayload('all', genEvent().gqlErrors(true))).toBe(true)
    })

    test('canCapturePayload returns false for hostname matching a beacon', () => {
      const beacons = ['example.com']
      const event = {
        statusCode: 200,
        hasGQLErrors: false,
        payloadHostname: 'example.com',
        payloadPathname: '/path'
      }
      const actual = canCapturePayload('all', event, beacons)
      expect(actual).toBe(false)
    })

    test('canCapturePayload returns false for hostname + pathname matching a beacon', () => {
      const beacons = ['example.com/path']
      const event = {
        statusCode: 200,
        hasGQLErrors: false,
        payloadHostname: 'example.com',
        payloadPathname: '/path'
      }
      const actual = canCapturePayload('all', event, beacons)
      expect(actual).toBe(false)
    })

    test('canCapturePayload returns true for hostname (no pathname) partially matching a beacon', () => {
      const beacons = ['example.com/path']
      const event = {
        statusCode: 200,
        hasGQLErrors: false,
        payloadHostname: 'example.com'
      }
      const actual = canCapturePayload('all', event, beacons)
      expect(actual).toBe(true)
    })

    test('canCapturePayload returns false for hostname + pathname partially matching a beacon', () => {
      const beacons = ['example.com/path']
      const event = {
        statusCode: 200,
        hasGQLErrors: false,
        payloadHostname: 'example.com',
        payloadPathname: '/path/to/foobar'
      }
      const actual = canCapturePayload('all', event, beacons)
      expect(actual).toBe(false)
    })

    test('canCapturePayload returns true for unrelated hostname + pathname partially matching a beacon', () => {
      const beacons = ['example.com/path']
      const event = {
        statusCode: 200,
        hasGQLErrors: false,
        payloadHostname: 'example.com',
        payloadPathname: '/pathFoo'
      }
      const actual = canCapturePayload('all', event, beacons)
      expect(actual).toBe(true)
    })

    test('canCapturePayload returns false for host + pathname matching a beacon with port', () => {
      const beacons = ['example.com:8080/path']
      const event = {
        statusCode: 200,
        hasGQLErrors: false,
        payloadHost: 'example.com:8080',
        payloadHostname: 'example.com',
        payloadPathname: '/path'
      }
      const actual = canCapturePayload('all', event, beacons)
      expect(actual).toBe(false)
    })

    test('canCapturePayload returns true for host + pathname NOT matching a beacon with port', () => {
      const beacons = ['example.com:58467/path']
      const event = {
        statusCode: 200,
        hasGQLErrors: false,
        payloadHost: 'example.com:58466',
        payloadHostname: 'example.com',
        payloadPathname: '/path'
      }
      const actual = canCapturePayload('all', event, beacons)
      expect(actual).toBe(true)
    })
  })

  describe('failures mode (default)', () => {
    test('captures status code 0 (network errors)', () => {
      expect(canCapturePayload('failures', genEvent().status(0).gqlErrors(false))).toBe(true)
      expect(canCapturePayload('failures', genEvent().status(0).gqlErrors(null))).toBe(true)
      expect(canCapturePayload('failures', genEvent().status(0).gqlErrors(undefined))).toBe(true)
    })

    test('does not capture 1xx status codes', () => {
      expect(canCapturePayload('failures', genEvent().status(100))).toBe(false)
      expect(canCapturePayload('failures', genEvent().status(101))).toBe(false)
    })

    test('does not capture 2xx success status codes', () => {
      expect(canCapturePayload('failures', genEvent().status(200))).toBe(false)
      expect(canCapturePayload('failures', genEvent().status(201))).toBe(false)
      expect(canCapturePayload('failures', genEvent().status(204))).toBe(false)
    })

    test('does not capture 3xx redirect status codes', () => {
      expect(canCapturePayload('failures', genEvent().status(301))).toBe(false)
      expect(canCapturePayload('failures', genEvent().status(302))).toBe(false)
      expect(canCapturePayload('failures', genEvent().status(304))).toBe(false)
    })

    test('captures 400 status code', () => {
      expect(canCapturePayload('failures', genEvent().status(400))).toBe(true)
    })

    test('captures 4xx client errors > 400', () => {
      expect(canCapturePayload('failures', genEvent().status(401))).toBe(true)
      expect(canCapturePayload('failures', genEvent().status(403))).toBe(true)
      expect(canCapturePayload('failures', genEvent().status(404))).toBe(true)
      expect(canCapturePayload('failures', genEvent().status(429))).toBe(true)
    })

    test('captures 5xx server errors', () => {
      expect(canCapturePayload('failures', genEvent().status(500))).toBe(true)
      expect(canCapturePayload('failures', genEvent().status(502))).toBe(true)
      expect(canCapturePayload('failures', genEvent().status(503))).toBe(true)
      expect(canCapturePayload('failures', genEvent().status(504))).toBe(true)
    })

    test('captures GraphQL errors with 2xx status codes', () => {
      const gqlError = JSON.stringify({
        errors: [{ message: 'Field not found' }],
        data: null
      })

      expect(canCapturePayload('failures', genEvent().status(200).gqlErrors(hasGQLErrors(gqlError)))).toBe(true)
      expect(canCapturePayload('failures', genEvent().status(201).gqlErrors(hasGQLErrors(gqlError)))).toBe(true)
    })

    test('captures GraphQL errors with partial data', () => {
      const gqlPartialError = JSON.stringify({
        errors: [{ message: 'Partial failure' }],
        data: { user: { name: 'John', email: null } }
      })

      expect(canCapturePayload('failures', genEvent().status(200).gqlErrors(hasGQLErrors(gqlPartialError)))).toBe(true)
    })

    test('does not capture successful GraphQL responses', () => {
      const gqlSuccess = JSON.stringify({
        data: { user: { name: 'John', email: 'john@example.com' } }
      })

      expect(canCapturePayload('failures', genEvent().status(200).gqlErrors(hasGQLErrors(gqlSuccess)))).toBe(false)
    })

    test('captures GraphQL errors even with error status codes', () => {
      const gqlError = JSON.stringify({
        errors: [{ message: 'Server error' }],
        data: null
      })

      // Should capture due to status code (isHttpError is true)
      expect(canCapturePayload('failures', genEvent().status(500).gqlErrors(hasGQLErrors(gqlError)))).toBe(true)
    })

    test('handles non-JSON response bodies', () => {
      expect(canCapturePayload('failures', genEvent().status(200).gqlErrors(hasGQLErrors('plain text response')))).toBe(false)
      expect(canCapturePayload('failures', genEvent().status(200).gqlErrors(hasGQLErrors('<html>content</html>')))).toBe(false)
      expect(canCapturePayload('failures', genEvent().status(200).gqlErrors(hasGQLErrors(null)))).toBe(false)
      expect(canCapturePayload('failures', genEvent().status(200).gqlErrors(hasGQLErrors(undefined)))).toBe(false)
    })
  })

  describe('edge cases', () => {
    test('handles empty response bodies', () => {
      expect(canCapturePayload('failures', genEvent().status(200).gqlErrors(hasGQLErrors('')))).toBe(false)
      expect(canCapturePayload('failures', genEvent().status(404).gqlErrors(hasGQLErrors('')))).toBe(true)
      expect(canCapturePayload('failures', genEvent().status(0).gqlErrors(hasGQLErrors('')))).toBe(true)
    })

    test('handles malformed GraphQL responses', () => {
      expect(canCapturePayload('failures', genEvent().status(200).gqlErrors(hasGQLErrors('{ invalid json')))).toBe(false)
      expect(canCapturePayload('failures', genEvent().status(200).gqlErrors(hasGQLErrors(JSON.stringify({ errors: [] }))))).toBe(false)
      expect(canCapturePayload('failures', genEvent().status(200).gqlErrors(hasGQLErrors(JSON.stringify({ errors: [{ noMessage: true }] }))))).toBe(false)
    })

    test('handles various status code boundaries', () => {
      expect(canCapturePayload('failures', genEvent().status(399).gqlErrors(false))).toBe(false)
      expect(canCapturePayload('failures', genEvent().status(400).gqlErrors(false))).toBe(true)
      expect(canCapturePayload('failures', genEvent().status(401).gqlErrors(false))).toBe(true)
      expect(canCapturePayload('failures', genEvent().status(599).gqlErrors(false))).toBe(true)
      expect(canCapturePayload('failures', genEvent().status(600).gqlErrors(false))).toBe(true)
    })
  })
})
