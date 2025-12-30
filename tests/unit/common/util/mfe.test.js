/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { isValidMFETarget, hasValidValue, getVersion2Attributes } from '../../../../src/common/util/mfe'

describe('mfe utilities', () => {
  describe('isValidMFETarget', () => {
    test('returns true when target has id and name', () => {
      expect(isValidMFETarget({ id: 'test-id', name: 'test-name' })).toBe(true)
    })

    test('returns false when target has id but no name', () => {
      expect(isValidMFETarget({ id: 'test-id' })).toBe(false)
    })

    test('returns false when target has name but no id', () => {
      expect(isValidMFETarget({ name: 'test-name' })).toBe(false)
    })

    test('returns false when target is empty', () => {
      expect(isValidMFETarget({})).toBe(false)
    })

    test('returns false when target is undefined', () => {
      expect(isValidMFETarget()).toBe(false)
    })
  })

  describe('hasValidValue', () => {
    test('returns true for valid string under 501 characters', () => {
      expect(hasValidValue('test')).toBe(true)
      expect(hasValidValue('a'.repeat(500))).toBe(true)
    })

    test('returns false for string 501 characters or more', () => {
      expect(hasValidValue('a'.repeat(501))).toBe(false)
    })

    test('returns false for empty string', () => {
      expect(hasValidValue('')).toBe(false)
    })

    test('returns false for whitespace-only string', () => {
      expect(hasValidValue('   ')).toBe(false)
    })

    test('returns true for valid numbers', () => {
      expect(hasValidValue(0)).toBe(true)
      expect(hasValidValue(123)).toBe(true)
      expect(hasValidValue(-456)).toBe(true)
    })

    test('returns false for non-string, non-number values', () => {
      expect(hasValidValue(null)).toBe(false)
      expect(hasValidValue(undefined)).toBe(false)
      expect(hasValidValue(true)).toBe(false)
      expect(hasValidValue({})).toBe(false)
      expect(hasValidValue([])).toBe(false)
    })
  })

  describe('getVersion2Attributes', () => {
    const mockAggregateInstance = {
      harvestEndpointVersion: 2,
      agentRef: {
        runtime: {
          appMetadata: {
            agents: [{
              entityGuid: 'container-entity-guid'
            }]
          }
        },
        info: {
          applicationID: 'app-123'
        }
      }
    }

    describe('parent.type attribute validation', () => {
      test('uses target.parent.type when provided', () => {
        const target = {
          id: 'mfe-id',
          name: 'mfe-name',
          type: 'MFE',
          parent: {
            id: 'parent-id',
            type: 'MFE'
          }
        }

        const result = getVersion2Attributes(target, mockAggregateInstance)

        expect(result['parent.type']).toBe('MFE')
      })

      test('defaults to "BA" when target.parent.type is undefined', () => {
        const target = {
          id: 'mfe-id',
          name: 'mfe-name',
          type: 'MFE',
          parent: {
            id: 'parent-id'
            // type is not provided
          }
        }

        const result = getVersion2Attributes(target, mockAggregateInstance)

        expect(result['parent.type']).toBe('BA')
      })

      test('defaults to "BA" when target.parent is undefined', () => {
        const target = {
          id: 'mfe-id',
          name: 'mfe-name',
          type: 'MFE'
          // parent is not provided
        }

        const result = getVersion2Attributes(target, mockAggregateInstance)

        expect(result['parent.type']).toBe('BA')
      })

      test('defaults to "BA" when target.parent is null', () => {
        const target = {
          id: 'mfe-id',
          name: 'mfe-name',
          type: 'MFE',
          parent: null
        }

        const result = getVersion2Attributes(target, mockAggregateInstance)

        expect(result['parent.type']).toBe('BA')
      })

      test('defaults to "BA" when target.parent.type is null', () => {
        const target = {
          id: 'mfe-id',
          name: 'mfe-name',
          type: 'MFE',
          parent: {
            id: 'parent-id',
            type: null
          }
        }

        const result = getVersion2Attributes(target, mockAggregateInstance)

        expect(result['parent.type']).toBe('BA')
      })

      test('defaults to "BA" when target.parent.type is empty string', () => {
        const target = {
          id: 'mfe-id',
          name: 'mfe-name',
          type: 'MFE',
          parent: {
            id: 'parent-id',
            type: ''
          }
        }

        const result = getVersion2Attributes(target, mockAggregateInstance)

        expect(result['parent.type']).toBe('BA')
      })

      test('uses custom parent.type value when provided', () => {
        const target = {
          id: 'mfe-id',
          name: 'mfe-name',
          type: 'MFE',
          parent: {
            id: 'parent-id',
            type: 'CUSTOM_TYPE'
          }
        }

        const result = getVersion2Attributes(target, mockAggregateInstance)

        expect(result['parent.type']).toBe('CUSTOM_TYPE')
      })
    })

    describe('general functionality', () => {
      test('returns empty object when harvestEndpointVersion is not 2', () => {
        const invalidAggregateInstance = {
          ...mockAggregateInstance,
          harvestEndpointVersion: 1
        }

        const target = {
          id: 'mfe-id',
          name: 'mfe-name'
        }

        const result = getVersion2Attributes(target, invalidAggregateInstance)

        expect(result).toEqual({})
      })

      test('returns container attributes when target is not valid', () => {
        const invalidTarget = {
          id: 'mfe-id'
          // missing name
        }

        const result = getVersion2Attributes(invalidTarget, mockAggregateInstance)

        expect(result).toEqual({
          'entity.guid': 'container-entity-guid',
          appId: 'app-123'
        })
      })

      test('returns full attributes for valid target', () => {
        const target = {
          id: 'mfe-id',
          name: 'mfe-name',
          type: 'MFE',
          parent: {
            id: 'parent-id',
            type: 'MFE'
          }
        }

        const result = getVersion2Attributes(target, mockAggregateInstance)

        expect(result).toEqual({
          'source.id': 'mfe-id',
          'source.name': 'mfe-name',
          'source.type': 'MFE',
          'parent.id': 'parent-id',
          'parent.type': 'MFE'
        })
      })

      test('uses containerAgentEntityGuid for parent.id when target.parent.id is not provided', () => {
        const target = {
          id: 'mfe-id',
          name: 'mfe-name',
          type: 'MFE'
        }

        const result = getVersion2Attributes(target, mockAggregateInstance)

        expect(result['parent.id']).toBe('container-entity-guid')
      })
    })
  })
})
