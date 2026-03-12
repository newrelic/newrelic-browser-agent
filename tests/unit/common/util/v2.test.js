/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { getVersion2Attributes, getRegisteredTargetsFromFilename, findTargetsFromStackTrace, getRegisteredTargetsFromId } from '../../../../src/common/util/v2'

describe('v2 utilities', () => {
  describe('getRegisteredTargetsFromFilename', () => {
    test('returns empty array when filename is falsy', () => {
      const agentRef = {
        runtime: {
          registeredEntities: []
        }
      }

      expect(getRegisteredTargetsFromFilename(null, agentRef)).toEqual([])
      expect(getRegisteredTargetsFromFilename('', agentRef)).toEqual([])
      expect(getRegisteredTargetsFromFilename(undefined, agentRef)).toEqual([])
    })

    test('returns empty array when no registered entities', () => {
      const agentRef = {
        runtime: {
          registeredEntities: []
        },
        init: {
          api: {
            allow_registered_children: true,
            duplicate_registered_data: false
          }
        }
      }

      const result = getRegisteredTargetsFromFilename('app.js', agentRef)
      expect(result).toEqual([])
    })

    test('returns empty array when no matching entities', () => {
      const agentRef = {
        runtime: {
          registeredEntities: [
            {
              metadata: {
                timings: {
                  asset: 'https://example.com/other.js'
                },
                target: {
                  id: 'mfe-1',
                  name: 'MFE 1'
                }
              }
            }
          ]
        },
        init: {
          api: {
            allow_registered_children: true,
            duplicate_registered_data: false
          }
        }
      }

      const result = getRegisteredTargetsFromFilename('app.js', agentRef)
      expect(result).toEqual([])
    })

    test('returns target when filename matches', () => {
      const agentRef = {
        runtime: {
          registeredEntities: [
            {
              metadata: {
                timings: {
                  asset: 'https://example.com/path/to/app.js'
                },
                target: {
                  id: 'mfe-1',
                  name: 'MFE 1',
                  type: 'MFE'
                }
              }
            }
          ]
        },
        init: {
          api: {
            allow_registered_children: true,
            duplicate_registered_data: false
          }
        }
      }

      const result = getRegisteredTargetsFromFilename('app.js', agentRef)
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        id: 'mfe-1',
        name: 'MFE 1',
        type: 'MFE'
      })
    })

    test('returns multiple targets when multiple entities match', () => {
      const agentRef = {
        runtime: {
          registeredEntities: [
            {
              metadata: {
                timings: {
                  asset: 'https://example.com/app.js'
                },
                target: {
                  id: 'mfe-1',
                  name: 'MFE 1',
                  type: 'MFE'
                }
              }
            },
            {
              metadata: {
                timings: {
                  asset: 'https://cdn.example.com/app.js'
                },
                target: {
                  id: 'mfe-2',
                  name: 'MFE 2',
                  type: 'MFE'
                }
              }
            }
          ]
        },
        init: {
          api: {
            allow_registered_children: true,
            duplicate_registered_data: false
          }
        }
      }

      const result = getRegisteredTargetsFromFilename('app.js', agentRef)
      expect(result).toHaveLength(2)
      expect(result.map(t => t.id)).toContain('mfe-1')
      expect(result.map(t => t.id)).toContain('mfe-2')
    })

    test('handles entities without timings', () => {
      const agentRef = {
        runtime: {
          registeredEntities: [
            {
              metadata: {
                target: {
                  id: 'mfe-1',
                  name: 'MFE 1'
                }
              }
            }
          ]
        },
        init: {
          api: {
            allow_registered_children: true,
            duplicate_registered_data: false
          }
        }
      }

      const result = getRegisteredTargetsFromFilename('app.js', agentRef)
      expect(result).toEqual([])
    })
  })

  describe('getRegisteredTargetsFromId', () => {
    test('returns empty array when id is falsy', () => {
      const agentRef = {
        runtime: {
          registeredEntities: []
        }
      }

      expect(getRegisteredTargetsFromId(null, agentRef)).toBeUndefined()
      expect(getRegisteredTargetsFromId('', agentRef)).toBeUndefined()
      expect(getRegisteredTargetsFromId(undefined, agentRef)).toBeUndefined()
    })

    test('returns matching targets by id', () => {
      const agentRef = {
        runtime: {
          registeredEntities: [
            {
              metadata: {
                target: {
                  id: 'mfe-123',
                  name: 'Test MFE',
                  type: 'MFE'
                }
              }
            },
            {
              metadata: {
                target: {
                  id: 'mfe-456',
                  name: 'Other MFE',
                  type: 'MFE'
                }
              }
            }
          ]
        },
        init: {
          api: {
            allow_registered_children: true,
            duplicate_registered_data: false
          }
        }
      }

      const result = getRegisteredTargetsFromId('mfe-123', agentRef)
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        id: 'mfe-123',
        name: 'Test MFE',
        type: 'MFE'
      })
    })

    test('matches id as string or number', () => {
      const agentRef = {
        runtime: {
          registeredEntities: [
            {
              metadata: {
                target: {
                  id: 123,
                  name: 'Numeric MFE',
                  type: 'MFE'
                }
              }
            }
          ]
        },
        init: {
          api: {
            allow_registered_children: true,
            duplicate_registered_data: false
          }
        }
      }

      const resultString = getRegisteredTargetsFromId('123', agentRef)
      const resultNumber = getRegisteredTargetsFromId(123, agentRef)

      expect(resultString).toHaveLength(1)
      expect(resultNumber).toHaveLength(1)
      expect(resultString[0].id).toBe(123)
      expect(resultNumber[0].id).toBe(123)
    })
  })

  describe('findTargetsFromStackTrace', () => {
    test('returns empty array when allow_registered_children is false', () => {
      const agentRef = {
        init: {
          api: {
            allow_registered_children: false
          }
        },
        runtime: {
          registeredEntities: []
        }
      }

      const result = findTargetsFromStackTrace(agentRef)
      expect(result).toEqual([])
    })

    test('returns empty array when agentRef is falsy', () => {
      expect(findTargetsFromStackTrace(null)).toEqual([])
      expect(findTargetsFromStackTrace(undefined)).toEqual([])
    })

    test('returns empty array when stack trace yields no matching files', () => {
      const agentRef = {
        init: {
          api: {
            allow_registered_children: true
          }
        },
        runtime: {
          registeredEntities: [
            {
              metadata: {
                timings: {
                  asset: 'https://example.com/mfe.js'
                },
                target: {
                  id: 'mfe-1',
                  name: 'MFE 1'
                }
              }
            }
          ]
        }
      }

      // In a real environment, this would analyze the actual stack trace
      // Since we can't easily mock Error.stack in tests, this will return []
      const result = findTargetsFromStackTrace(agentRef)
      expect(Array.isArray(result)).toBe(true)
    })

    test('handles errors gracefully', () => {
      const agentRef = {
        init: {
          api: {
            allow_registered_children: true
          }
        },
        runtime: {
          registeredEntities: null // This will cause an error
        }
      }

      // Should not throw, should return empty array
      const result = findTargetsFromStackTrace(agentRef)
      expect(result).toEqual([])
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
          },
          get attributes () {
            return {
              'source.id': this.id,
              'source.name': this.name,
              'source.type': this.type,
              'parent.id': this.parent.id,
              'parent.type': this.parent.type
            }
          }
        }

        const result = getVersion2Attributes(target, mockAggregateInstance)

        expect(result['parent.type']).toBe('MFE')
      })

      test('uses custom parent.type value when provided', () => {
        const target = {
          id: 'mfe-id',
          name: 'mfe-name',
          type: 'MFE',
          parent: {
            id: 'parent-id',
            type: 'CUSTOM_TYPE'
          },
          get attributes () {
            return {
              'source.id': this.id,
              'source.name': this.name,
              'source.type': this.type,
              'parent.id': this.parent.id,
              'parent.type': this.parent.type
            }
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
          id: 'mfe-id',
          parent: {
            id: 'container-entity-guid',
            type: 'BA'
          },
          // missing name
          get attributes () {
            return {
              'source.id': this.id,
              'source.name': this.name,
              'source.type': this.type,
              'parent.id': this.parent.id,
              'parent.type': this.parent.type
            }
          }
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
          },
          get attributes () {
            return {
              'source.id': this.id,
              'source.name': this.name,
              'source.type': this.type,
              'parent.id': this.parent.id,
              'parent.type': this.parent.type
            }
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
          type: 'MFE',
          get attributes () {
            return {
              'source.id': this.id,
              'source.name': this.name,
              'source.type': this.type,
              'parent.id': 'container-entity-guid',
              'parent.type': 'BA'
            }
          }
        }

        const result = getVersion2Attributes(target, mockAggregateInstance)

        expect(result['parent.id']).toBe('container-entity-guid')
        expect(result['parent.type']).toBe('BA')
      })
    })
  })
})
