/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { getVersion2Attributes } from '../../../../src/common/util/v2'

describe('v2 utilities', () => {
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
          'source.id': 'mfe-id',
          'source.name': undefined,
          'source.type': undefined,
          'parent.id': 'container-entity-guid',
          'parent.type': 'BA'
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
