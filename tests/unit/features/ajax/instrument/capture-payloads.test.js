/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { canCapturePayload } from '../../../../../src/common/payloads/payloads'
import { hasGQLErrors } from '../../../../../src/features/ajax/aggregate/gql'

describe('canCapturePayload logic', () => {
  describe('off mode', () => {
    test('never captures payloads', () => {
      expect(canCapturePayload('off', 200, false)).toBe(false)
      expect(canCapturePayload('off', 404, false)).toBe(false)
      expect(canCapturePayload('off', 500, false)).toBe(false)
      expect(canCapturePayload('off', 0, false)).toBe(false)
      expect(canCapturePayload('off', 200, true)).toBe(false)
    })

    test('treats null/undefined as off', () => {
      expect(canCapturePayload(null, 200, false)).toBe(false)
      expect(canCapturePayload(undefined, 200, false)).toBe(false)
    })
  })

  describe('all mode', () => {
    test('captures all payloads regardless of status', () => {
      expect(canCapturePayload('all', 200, false)).toBe(true)
      expect(canCapturePayload('all', 201, false)).toBe(true)
      expect(canCapturePayload('all', 204, false)).toBe(true)
      expect(canCapturePayload('all', 301, false)).toBe(true)
      expect(canCapturePayload('all', 400, false)).toBe(true)
      expect(canCapturePayload('all', 404, false)).toBe(true)
      expect(canCapturePayload('all', 500, false)).toBe(true)
      expect(canCapturePayload('all', 0, false)).toBe(true)
    })

    test('captures all payloads regardless of GraphQL errors', () => {
      expect(canCapturePayload('all', 200, false)).toBe(true)
      expect(canCapturePayload('all', 200, true)).toBe(true)
    })
  })

  describe('failures mode (default)', () => {
    test('captures status code 0 (network errors)', () => {
      expect(canCapturePayload('failures', 0, false)).toBe(true)
      expect(canCapturePayload('failures', 0, null)).toBe(true)
      expect(canCapturePayload('failures', 0, undefined)).toBe(true)
    })

    test('does not capture 1xx status codes', () => {
      expect(canCapturePayload('failures', 100, false)).toBe(false)
      expect(canCapturePayload('failures', 101, false)).toBe(false)
    })

    test('does not capture 2xx success status codes', () => {
      expect(canCapturePayload('failures', 200, false)).toBe(false)
      expect(canCapturePayload('failures', 201, false)).toBe(false)
      expect(canCapturePayload('failures', 204, false)).toBe(false)
    })

    test('does not capture 3xx redirect status codes', () => {
      expect(canCapturePayload('failures', 301, false)).toBe(false)
      expect(canCapturePayload('failures', 302, false)).toBe(false)
      expect(canCapturePayload('failures', 304, false)).toBe(false)
    })

    test('captures 400 status code', () => {
      expect(canCapturePayload('failures', 400, false)).toBe(true)
    })

    test('captures 4xx client errors > 400', () => {
      expect(canCapturePayload('failures', 401, false)).toBe(true)
      expect(canCapturePayload('failures', 403, false)).toBe(true)
      expect(canCapturePayload('failures', 404, false)).toBe(true)
      expect(canCapturePayload('failures', 429, false)).toBe(true)
    })

    test('captures 5xx server errors', () => {
      expect(canCapturePayload('failures', 500, false)).toBe(true)
      expect(canCapturePayload('failures', 502, false)).toBe(true)
      expect(canCapturePayload('failures', 503, false)).toBe(true)
      expect(canCapturePayload('failures', 504, false)).toBe(true)
    })

    test('captures GraphQL errors with 2xx status codes', () => {
      const gqlError = JSON.stringify({
        errors: [{ message: 'Field not found' }],
        data: null
      })

      expect(canCapturePayload('failures', 200, hasGQLErrors(gqlError))).toBe(true)
      expect(canCapturePayload('failures', 201, hasGQLErrors(gqlError))).toBe(true)
    })

    test('captures GraphQL errors with partial data', () => {
      const gqlPartialError = JSON.stringify({
        errors: [{ message: 'Partial failure' }],
        data: { user: { name: 'John', email: null } }
      })

      expect(canCapturePayload('failures', 200, hasGQLErrors(gqlPartialError))).toBe(true)
    })

    test('does not capture successful GraphQL responses', () => {
      const gqlSuccess = JSON.stringify({
        data: { user: { name: 'John', email: 'john@example.com' } }
      })

      expect(canCapturePayload('failures', 200, hasGQLErrors(gqlSuccess))).toBe(false)
    })

    test('captures GraphQL errors even with error status codes', () => {
      const gqlError = JSON.stringify({
        errors: [{ message: 'Server error' }],
        data: null
      })

      // Should capture due to status code (isHttpError is true)
      expect(canCapturePayload('failures', 500, hasGQLErrors(gqlError))).toBe(true)
    })

    test('handles non-JSON response bodies', () => {
      expect(canCapturePayload('failures', 200, hasGQLErrors('plain text response'))).toBe(false)
      expect(canCapturePayload('failures', 200, hasGQLErrors('<html>content</html>'))).toBe(false)
      expect(canCapturePayload('failures', 200, hasGQLErrors(null))).toBe(false)
      expect(canCapturePayload('failures', 200, hasGQLErrors(undefined))).toBe(false)
    })
  })

  describe('edge cases', () => {
    test('handles empty response bodies', () => {
      expect(canCapturePayload('failures', 200, hasGQLErrors(''))).toBe(false)
      expect(canCapturePayload('failures', 404, hasGQLErrors(''))).toBe(true)
      expect(canCapturePayload('failures', 0, hasGQLErrors(''))).toBe(true)
    })

    test('handles malformed GraphQL responses', () => {
      expect(canCapturePayload('failures', 200, hasGQLErrors('{ invalid json'))).toBe(false)
      expect(canCapturePayload('failures', 200, hasGQLErrors(JSON.stringify({ errors: [] })))).toBe(false)
      expect(canCapturePayload('failures', 200, hasGQLErrors(JSON.stringify({ errors: [{ noMessage: true }] })))).toBe(false)
    })

    test('handles various status code boundaries', () => {
      expect(canCapturePayload('failures', 399, false)).toBe(false)
      expect(canCapturePayload('failures', 400, false)).toBe(true)
      expect(canCapturePayload('failures', 401, false)).toBe(true)
      expect(canCapturePayload('failures', 599, false)).toBe(true)
      expect(canCapturePayload('failures', 600, false)).toBe(true)
    })
  })
})
