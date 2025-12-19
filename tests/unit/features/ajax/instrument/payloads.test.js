/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { parseQueryString, isLikelyHumanReadable } from '../../../../../src/features/ajax/instrument/payloads'
import { hasGQLErrors } from '../../../../../src/features/ajax/instrument/gql'

describe('parseQueryString', () => {
  test('parses simple query strings', () => {
    expect(parseQueryString('?foo=bar&baz=qux')).toEqual({ foo: 'bar', baz: 'qux' })
    expect(parseQueryString('foo=bar&baz=qux')).toEqual({ foo: 'bar', baz: 'qux' })
  })

  test('handles empty query strings', () => {
    expect(parseQueryString('')).toBeUndefined()
    expect(parseQueryString('?')).toEqual({})
    expect(parseQueryString(null)).toBeUndefined()
    expect(parseQueryString(undefined)).toBeUndefined()
  })

  test('handles encoded values', () => {
    expect(parseQueryString('?name=John%20Doe&email=test%40example.com')).toEqual({
      name: 'John Doe',
      email: 'test@example.com'
    })
  })

  test('handles duplicate keys', () => {
    // URLSearchParams takes the last value for duplicate keys
    const result = parseQueryString('?foo=bar&foo=baz')
    expect(result.foo).toBe('baz')
  })

  test('handles special characters', () => {
    expect(parseQueryString('?key=value with spaces&other=123')).toEqual({
      key: 'value with spaces',
      other: '123'
    })
  })
})

describe('isLikelyHumanReadable', () => {
  test('returns true for text/* types', () => {
    expect(isLikelyHumanReadable({ 'content-type': 'text/plain' }, 'data')).toBe(true)
    expect(isLikelyHumanReadable({ 'content-type': 'text/html' }, 'data')).toBe(true)
    expect(isLikelyHumanReadable({ 'content-type': 'text/css' }, 'data')).toBe(true)
    expect(isLikelyHumanReadable({ 'content-type': 'text/javascript' }, 'data')).toBe(true)
    expect(isLikelyHumanReadable({ 'content-type': 'text/csv' }, 'data')).toBe(true)
  })

  test('returns true for readable application/* types', () => {
    expect(isLikelyHumanReadable({ 'content-type': 'application/json' }, 'data')).toBe(true)
    expect(isLikelyHumanReadable({ 'content-type': 'application/xml' }, 'data')).toBe(true)
    expect(isLikelyHumanReadable({ 'content-type': 'application/xhtml+xml' }, 'data')).toBe(true)
    expect(isLikelyHumanReadable({ 'content-type': 'application/ld+json' }, 'data')).toBe(true)
    expect(isLikelyHumanReadable({ 'content-type': 'application/yaml' }, 'data')).toBe(true)
    expect(isLikelyHumanReadable({ 'content-type': 'application/x-www-form-urlencoded' }, 'data')).toBe(true)
  })

  test('returns false for binary types', () => {
    expect(isLikelyHumanReadable({ 'content-type': 'application/octet-stream' }, 'data')).toBe(false)
    expect(isLikelyHumanReadable({ 'content-type': 'application/pdf' }, 'data')).toBe(false)
    expect(isLikelyHumanReadable({ 'content-type': 'image/png' }, 'data')).toBe(false)
    expect(isLikelyHumanReadable({ 'content-type': 'image/jpeg' }, 'data')).toBe(false)
    expect(isLikelyHumanReadable({ 'content-type': 'video/mp4' }, 'data')).toBe(false)
    expect(isLikelyHumanReadable({ 'content-type': 'audio/mpeg' }, 'data')).toBe(false)
  })

  test('handles content-type with charset', () => {
    expect(isLikelyHumanReadable({ 'content-type': 'text/html; charset=utf-8' }, 'data')).toBe(true)
    expect(isLikelyHumanReadable({ 'content-type': 'application/json; charset=UTF-8' }, 'data')).toBe(true)
    expect(isLikelyHumanReadable({ 'content-type': 'application/xml;charset=ISO-8859-1' }, 'data')).toBe(true)
  })

  test('handles case insensitivity', () => {
    expect(isLikelyHumanReadable({ 'content-type': 'TEXT/PLAIN' }, 'data')).toBe(true)
    expect(isLikelyHumanReadable({ 'content-type': 'Application/JSON' }, 'data')).toBe(true)
    expect(isLikelyHumanReadable({ 'content-type': 'TeXt/HtMl' }, 'data')).toBe(true)
  })

  test('handles content-type with extra whitespace', () => {
    expect(isLikelyHumanReadable({ 'content-type': 'text/plain ; charset=utf-8' }, 'data')).toBe(true)
    expect(isLikelyHumanReadable({ 'content-type': '  application/json  ' }, 'data')).toBe(true)
  })

  test('returns true for string data when contentType is null or undefined', () => {
    expect(isLikelyHumanReadable(null, 'string data')).toBe(true)
    expect(isLikelyHumanReadable(undefined, 'string data')).toBe(true)
    expect(isLikelyHumanReadable('', 'string data')).toBe(true)
  })

  test('returns false for non-string data when contentType is null or undefined', () => {
    expect(isLikelyHumanReadable(null, { obj: 'data' })).toBe(false)
    expect(isLikelyHumanReadable(undefined, 123)).toBe(false)
    expect(isLikelyHumanReadable('', null)).toBe(false)
    expect(isLikelyHumanReadable(null, undefined)).toBe(false)
  })
})

describe('hasGQLErrors', () => {
  test('returns true for valid GraphQL error responses', () => {
    const errorResponse = {
      errors: [
        { message: 'Field not found', locations: [{ line: 1, column: 5 }] }
      ],
      data: null
    }
    expect(hasGQLErrors(errorResponse)).toBe(true)
    expect(hasGQLErrors(JSON.stringify(errorResponse))).toBe(true)
  })

  test('returns true for multiple errors', () => {
    const errorResponse = {
      errors: [
        { message: 'Error 1' },
        { message: 'Error 2', path: ['user', 'name'] }
      ],
      data: null
    }
    expect(hasGQLErrors(errorResponse)).toBe(true)
    expect(hasGQLErrors(JSON.stringify(errorResponse))).toBe(true)
  })

  test('returns false for successful GraphQL responses', () => {
    const successResponse = {
      data: { user: { name: 'John', email: 'john@example.com' } }
    }
    expect(hasGQLErrors(successResponse)).toBe(false)
    expect(hasGQLErrors(JSON.stringify(successResponse))).toBe(false)
  })

  test('returns false for partial data with no errors', () => {
    const partialResponse = {
      data: { user: { name: 'John', email: null } }
    }
    expect(hasGQLErrors(partialResponse)).toBe(false)
  })

  test('returns false for empty errors array', () => {
    const emptyErrors = {
      errors: [],
      data: null
    }
    expect(hasGQLErrors(emptyErrors)).toBe(false)
  })

  test('returns false for errors without message property', () => {
    const invalidError = {
      errors: [{ code: 'INVALID' }],
      data: null
    }
    expect(hasGQLErrors(invalidError)).toBe(false)
  })

  test('returns false for non-GraphQL responses', () => {
    expect(hasGQLErrors({ status: 'success', result: 'data' })).toBe(false)
    expect(hasGQLErrors('plain text response')).toBe(false)
    expect(hasGQLErrors(null)).toBe(false)
    expect(hasGQLErrors(undefined)).toBe(false)
    expect(hasGQLErrors(123)).toBe(false)
    expect(hasGQLErrors([])).toBe(false)
  })

  test('returns true when at least one error has a message', () => {
    const mixedErrors = {
      errors: [
        { code: 'ERR1' },
        { message: 'Valid error message' }
      ],
      data: null
    }
    expect(hasGQLErrors(mixedErrors)).toBe(true)
  })

  test('handles malformed JSON strings gracefully', () => {
    expect(hasGQLErrors('{ invalid json')).toBe(false)
    expect(hasGQLErrors('not json at all')).toBe(false)
  })

  test('returns true for errors with partial data', () => {
    const partialErrorResponse = {
      errors: [{ message: 'Partial failure' }],
      data: { user: { name: 'John', email: null } }
    }
    expect(hasGQLErrors(partialErrorResponse)).toBe(true)
  })
})
