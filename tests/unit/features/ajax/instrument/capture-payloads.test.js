/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { hasGQLErrors } from '../../../../../src/features/ajax/aggregate/gql'

describe('canCapturePayload logic', () => {
  // Helper to simulate the canCapturePayload function from aggregate/index.js
  const createCanCapturePayload = (captureMode) => {
    return (statusCode, responseBody) => {
      if (!captureMode || captureMode === 'off') return false
      if (captureMode === 'all') return true

      // Default "failures" mode
      const isHttpError = statusCode === 0 || statusCode > 400
      const isGQLWithErrors = hasGQLErrors(responseBody)

      return isHttpError || isGQLWithErrors
    }
  }

  describe('off mode', () => {
    test('never captures payloads', () => {
      const canCapture = createCanCapturePayload('off')

      expect(canCapture(200, '{}')).toBe(false)
      expect(canCapture(404, '{}')).toBe(false)
      expect(canCapture(500, '{}')).toBe(false)
      expect(canCapture(0, '{}')).toBe(false)
      expect(canCapture(200, JSON.stringify({ errors: [{ message: 'Error' }] }))).toBe(false)
    })

    test('treats null/undefined as off', () => {
      expect(createCanCapturePayload(null)(200, '{}')).toBe(false)
      expect(createCanCapturePayload(undefined)(200, '{}')).toBe(false)
    })
  })

  describe('all mode', () => {
    test('captures all payloads regardless of status', () => {
      const canCapture = createCanCapturePayload('all')

      expect(canCapture(200, '{}')).toBe(true)
      expect(canCapture(201, '{}')).toBe(true)
      expect(canCapture(204, '{}')).toBe(true)
      expect(canCapture(301, '{}')).toBe(true)
      expect(canCapture(400, '{}')).toBe(true)
      expect(canCapture(404, '{}')).toBe(true)
      expect(canCapture(500, '{}')).toBe(true)
      expect(canCapture(0, '{}')).toBe(true)
    })

    test('captures all payloads regardless of GraphQL errors', () => {
      const canCapture = createCanCapturePayload('all')

      expect(canCapture(200, JSON.stringify({ data: { user: 'John' } }))).toBe(true)
      expect(canCapture(200, JSON.stringify({ errors: [{ message: 'Error' }] }))).toBe(true)
    })
  })

  describe('failures mode (default)', () => {
    test('captures status code 0 (network errors)', () => {
      const canCapture = createCanCapturePayload('failures')

      expect(canCapture(0, '{}')).toBe(true)
      expect(canCapture(0, null)).toBe(true)
      expect(canCapture(0, undefined)).toBe(true)
    })

    test('does not capture 1xx status codes', () => {
      const canCapture = createCanCapturePayload('failures')

      expect(canCapture(100, '{}')).toBe(false)
      expect(canCapture(101, '{}')).toBe(false)
    })

    test('does not capture 2xx success status codes', () => {
      const canCapture = createCanCapturePayload('failures')

      expect(canCapture(200, '{}')).toBe(false)
      expect(canCapture(201, '{}')).toBe(false)
      expect(canCapture(204, '{}')).toBe(false)
    })

    test('does not capture 3xx redirect status codes', () => {
      const canCapture = createCanCapturePayload('failures')

      expect(canCapture(301, '{}')).toBe(false)
      expect(canCapture(302, '{}')).toBe(false)
      expect(canCapture(304, '{}')).toBe(false)
    })

    test('does not capture 400 status code', () => {
      const canCapture = createCanCapturePayload('failures')

      expect(canCapture(400, '{}')).toBe(false)
    })

    test('captures 4xx client errors > 400', () => {
      const canCapture = createCanCapturePayload('failures')

      expect(canCapture(401, '{}')).toBe(true)
      expect(canCapture(403, '{}')).toBe(true)
      expect(canCapture(404, '{}')).toBe(true)
      expect(canCapture(429, '{}')).toBe(true)
    })

    test('captures 5xx server errors', () => {
      const canCapture = createCanCapturePayload('failures')

      expect(canCapture(500, '{}')).toBe(true)
      expect(canCapture(502, '{}')).toBe(true)
      expect(canCapture(503, '{}')).toBe(true)
      expect(canCapture(504, '{}')).toBe(true)
    })

    test('captures GraphQL errors with 2xx status codes', () => {
      const canCapture = createCanCapturePayload('failures')

      const gqlError = JSON.stringify({
        errors: [{ message: 'Field not found' }],
        data: null
      })

      expect(canCapture(200, gqlError)).toBe(true)
      expect(canCapture(201, gqlError)).toBe(true)
    })

    test('captures GraphQL errors with partial data', () => {
      const canCapture = createCanCapturePayload('failures')

      const gqlPartialError = JSON.stringify({
        errors: [{ message: 'Partial failure' }],
        data: { user: { name: 'John', email: null } }
      })

      expect(canCapture(200, gqlPartialError)).toBe(true)
    })

    test('does not capture successful GraphQL responses', () => {
      const canCapture = createCanCapturePayload('failures')

      const gqlSuccess = JSON.stringify({
        data: { user: { name: 'John', email: 'john@example.com' } }
      })

      expect(canCapture(200, gqlSuccess)).toBe(false)
    })

    test('captures GraphQL errors even with error status codes', () => {
      const canCapture = createCanCapturePayload('failures')

      const gqlError = JSON.stringify({
        errors: [{ message: 'Server error' }],
        data: null
      })

      // Should capture due to status code (isHttpError is true)
      expect(canCapture(500, gqlError)).toBe(true)
    })

    test('handles non-JSON response bodies', () => {
      const canCapture = createCanCapturePayload('failures')

      expect(canCapture(200, 'plain text response')).toBe(false)
      expect(canCapture(200, '<html>content</html>')).toBe(false)
      expect(canCapture(200, null)).toBe(false)
      expect(canCapture(200, undefined)).toBe(false)
    })
  })

  describe('edge cases', () => {
    test('handles empty response bodies', () => {
      const canCapture = createCanCapturePayload('failures')

      expect(canCapture(200, '')).toBe(false)
      expect(canCapture(404, '')).toBe(true)
      expect(canCapture(0, '')).toBe(true)
    })

    test('handles malformed GraphQL responses', () => {
      const canCapture = createCanCapturePayload('failures')

      expect(canCapture(200, '{ invalid json')).toBe(false)
      expect(canCapture(200, JSON.stringify({ errors: [] }))).toBe(false)
      expect(canCapture(200, JSON.stringify({ errors: [{ noMessage: true }] }))).toBe(false)
    })

    test('handles various status code boundaries', () => {
      const canCapture = createCanCapturePayload('failures')

      expect(canCapture(399, '{}')).toBe(false)
      expect(canCapture(400, '{}')).toBe(false)
      expect(canCapture(401, '{}')).toBe(true)
      expect(canCapture(599, '{}')).toBe(true)
      expect(canCapture(600, '{}')).toBe(true)
    })
  })
})
