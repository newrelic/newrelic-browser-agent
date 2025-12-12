/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { parseQueryString, parseResponseHeaders, isHumanReadableContentType } from '../../../../../src/features/ajax/instrument/payloads'
import { hasGQLErrors } from '../../../../../src/features/ajax/instrument/gql'

describe('parseQueryString', () => {
  test('parses simple query strings', () => {
    expect(parseQueryString('?foo=bar&baz=qux')).toEqual({ foo: 'bar', baz: 'qux' })
    expect(parseQueryString('foo=bar&baz=qux')).toEqual({ foo: 'bar', baz: 'qux' })
  })

  test('handles empty query strings', () => {
    expect(parseQueryString('')).toEqual({})
    expect(parseQueryString('?')).toEqual({})
    expect(parseQueryString(null)).toEqual({})
    expect(parseQueryString(undefined)).toEqual({})
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

describe('parseResponseHeaders', () => {
  test('parses standard headers', () => {
    const headerStr = 'content-type: application/json\r\ncontent-length: 123\r\ndate: Mon, 10 Dec 2025 12:00:00 GMT'
    expect(parseResponseHeaders(headerStr)).toEqual({
      'content-type': 'application/json',
      'content-length': '123',
      date: 'Mon, 10 Dec 2025 12:00:00 GMT'
    })
  })

  test('handles empty header strings', () => {
    expect(parseResponseHeaders('')).toEqual({})
    expect(parseResponseHeaders(null)).toEqual({})
    expect(parseResponseHeaders(undefined)).toEqual({})
  })

  test('handles headers with colons in values', () => {
    const headerStr = 'date: Mon, 10 Dec 2025 12:00:00 GMT\r\ncustom-header: value:with:colons'
    expect(parseResponseHeaders(headerStr)).toEqual({
      date: 'Mon, 10 Dec 2025 12:00:00 GMT',
      'custom-header': 'value:with:colons'
    })
  })

  test('ignores malformed headers', () => {
    const headerStr = 'content-type: application/json\r\nmalformed\r\ncontent-length: 123'
    expect(parseResponseHeaders(headerStr)).toEqual({
      'content-type': 'application/json',
      'content-length': '123'
    })
  })

  test('handles single header', () => {
    expect(parseResponseHeaders('content-type: text/plain')).toEqual({
      'content-type': 'text/plain'
    })
  })
})

describe('isHumanReadableContentType', () => {
  test('returns true for text/* types', () => {
    expect(isHumanReadableContentType('text/plain')).toBe(true)
    expect(isHumanReadableContentType('text/html')).toBe(true)
    expect(isHumanReadableContentType('text/css')).toBe(true)
    expect(isHumanReadableContentType('text/javascript')).toBe(true)
    expect(isHumanReadableContentType('text/csv')).toBe(true)
  })

  test('returns true for readable application/* types', () => {
    expect(isHumanReadableContentType('application/json')).toBe(true)
    expect(isHumanReadableContentType('application/xml')).toBe(true)
    expect(isHumanReadableContentType('application/xhtml+xml')).toBe(true)
    expect(isHumanReadableContentType('application/ld+json')).toBe(true)
    expect(isHumanReadableContentType('application/yaml')).toBe(true)
    expect(isHumanReadableContentType('application/x-www-form-urlencoded')).toBe(true)
  })

  test('returns false for binary types', () => {
    expect(isHumanReadableContentType('application/octet-stream')).toBe(false)
    expect(isHumanReadableContentType('application/pdf')).toBe(false)
    expect(isHumanReadableContentType('image/png')).toBe(false)
    expect(isHumanReadableContentType('image/jpeg')).toBe(false)
    expect(isHumanReadableContentType('video/mp4')).toBe(false)
    expect(isHumanReadableContentType('audio/mpeg')).toBe(false)
  })

  test('handles content-type with charset', () => {
    expect(isHumanReadableContentType('text/html; charset=utf-8')).toBe(true)
    expect(isHumanReadableContentType('application/json; charset=UTF-8')).toBe(true)
    expect(isHumanReadableContentType('application/xml;charset=ISO-8859-1')).toBe(true)
  })

  test('handles case insensitivity', () => {
    expect(isHumanReadableContentType('TEXT/PLAIN')).toBe(true)
    expect(isHumanReadableContentType('Application/JSON')).toBe(true)
    expect(isHumanReadableContentType('TeXt/HtMl')).toBe(true)
  })

  test('returns false for null, undefined, or empty strings', () => {
    expect(isHumanReadableContentType(null)).toBe(false)
    expect(isHumanReadableContentType(undefined)).toBe(false)
    expect(isHumanReadableContentType('')).toBe(false)
  })

  test('handles content-type with extra whitespace', () => {
    expect(isHumanReadableContentType('text/plain ; charset=utf-8')).toBe(true)
    expect(isHumanReadableContentType('  application/json  ')).toBe(true)
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
