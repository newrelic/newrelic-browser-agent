/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { getVersion2Attributes, getRegisteredTargetsFromFilename, getRegisteredTargetsFromResourceUrl, findTargetsFromStackTrace, getRegisteredTargetsFromId, dedupeRegisteredEntitiesByAsset, dedupeTargetsByInstance } from '../../../../src/common/v2/utils'
import { parseManifest } from '../../../../src/common/v2/manifest'

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
            register: {
              enabled: true,
              duplicate_data_to_container: false
            }
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
            register: {
              enabled: true,
              duplicate_data_to_container: false
            }
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
            register: {
              enabled: true,
              duplicate_data_to_container: false
            }
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
            register: {
              enabled: true,
              duplicate_data_to_container: false
            }
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
            register: {
              enabled: true,
              duplicate_data_to_container: false
            }
          }
        }
      }

      const result = getRegisteredTargetsFromFilename('app.js', agentRef)
      expect(result).toEqual([])
    })

    test('collapses multiple registrations of the same asset to a single target', () => {
      const registeredEntities = Array.from({ length: 30 }, (_, i) => ({
        metadata: {
          timings: {
            asset: 'https://example.com/mfe.js'
          },
          target: {
            id: 'viz-dev',
            name: 'Viz (dev)',
            type: 'MFE',
            instance: `instance-${i}`,
            blocked: false
          }
        }
      }))

      const agentRef = {
        runtime: { registeredEntities },
        init: {
          api: {
            register: {
              enabled: true,
              duplicate_data_to_container: false
            }
          }
        }
      }

      const result = getRegisteredTargetsFromFilename('mfe.js', agentRef)
      expect(result).toHaveLength(1)
    })

    test('does not collapse two distinct MFEs (different ids) registered from the same inline script', () => {
      // mirrors register-api.html: two different MFEs (agent1/agent2) both registered from the same
      // inline <script> block, so both resolve the same `timings.asset` (the page's own URL) -- these
      // must each keep receiving their own copy of matched auto-detected events, since they are
      // genuinely different registered entities, not duplicate registrations of the same one.
      const registeredEntities = [
        {
          metadata: {
            timings: { asset: 'https://example.com/page.html' },
            target: { id: '1', name: 'agent1', type: 'MFE', instance: 'instance-1', blocked: false }
          }
        },
        {
          metadata: {
            timings: { asset: 'https://example.com/page.html' },
            target: { id: '2', name: 'agent2', type: 'MFE', instance: 'instance-2', blocked: false }
          }
        }
      ]

      const agentRef = {
        runtime: { registeredEntities },
        init: {
          api: {
            register: {
              enabled: true,
              duplicate_data_to_container: false
            }
          }
        }
      }

      const result = getRegisteredTargetsFromFilename('page.html', agentRef)
      expect(result).toHaveLength(2)
      expect(result.map(t => t.id).sort()).toEqual(['1', '2'])
    })

    test('matches via a manifest script asset when timings.asset does not match', () => {
      const agentRef = {
        runtime: {
          registeredEntities: [
            {
              metadata: {
                timings: { asset: 'https://example.com/root.js' },
                target: {
                  id: 'mfe-1',
                  name: 'MFE 1',
                  type: 'MFE',
                  manifest: parseManifest({ assets: ['lazy-chunk.js'] })
                }
              }
            }
          ]
        },
        init: {
          api: {
            register: {
              enabled: true,
              duplicate_data_to_container: false
            }
          }
        }
      }

      const result = getRegisteredTargetsFromFilename('https://cdn.example.com/lazy-chunk.js?v=2', agentRef)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('mfe-1')
    })

    test('does not match a manifest asset that is not a script (e.g. an image), even for stack-based attribution', () => {
      const agentRef = {
        runtime: {
          registeredEntities: [
            {
              metadata: {
                timings: { asset: 'https://example.com/root.js' },
                target: {
                  id: 'mfe-1',
                  name: 'MFE 1',
                  type: 'MFE',
                  manifest: parseManifest({ assets: [{ path: 'logo.png', type: 'png' }] })
                }
              }
            }
          ]
        },
        init: {
          api: {
            register: {
              enabled: true,
              duplicate_data_to_container: false
            }
          }
        }
      }

      const result = getRegisteredTargetsFromFilename('https://cdn.example.com/logo.png', agentRef)
      expect(result).toEqual([])
    })
  })

  describe('getRegisteredTargetsFromResourceUrl', () => {
    test('returns empty array when url is falsy', () => {
      const agentRef = { runtime: { registeredEntities: [] } }
      expect(getRegisteredTargetsFromResourceUrl(null, agentRef)).toEqual([])
      expect(getRegisteredTargetsFromResourceUrl('', agentRef)).toEqual([])
      expect(getRegisteredTargetsFromResourceUrl(undefined, agentRef)).toEqual([])
    })

    test('returns empty array when no registered entities', () => {
      const agentRef = {
        runtime: { registeredEntities: [] },
        init: { api: { register: { enabled: true, duplicate_data_to_container: false } } }
      }

      const result = getRegisteredTargetsFromResourceUrl('https://cdn.example.com/app.js', agentRef)
      expect(result).toEqual([])
    })

    test('returns empty array when no matching entities', () => {
      const agentRef = {
        runtime: {
          registeredEntities: [
            {
              metadata: {
                timings: { asset: 'https://example.com/other.js' },
                target: { id: 'mfe-1', name: 'MFE 1' }
              }
            }
          ]
        },
        init: { api: { register: { enabled: true, duplicate_data_to_container: false } } }
      }

      const result = getRegisteredTargetsFromResourceUrl('https://cdn.example.com/app.js', agentRef)
      expect(result).toEqual([])
    })

    test('matches an exact (cleaned) URL against timings.asset when no manifest is present', () => {
      const agentRef = {
        runtime: {
          registeredEntities: [
            {
              metadata: {
                timings: { asset: 'https://cdn.example.com/app.js?v=1' },
                target: { id: 'mfe-1', name: 'MFE 1', type: 'MFE' }
              }
            }
          ]
        },
        init: { api: { register: { enabled: true, duplicate_data_to_container: false } } }
      }

      const result = getRegisteredTargetsFromResourceUrl('https://cdn.example.com/app.js?v=2', agentRef)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('mfe-1')
    })

    test('does not match on a mere URL suffix, unlike stack-trace attribution', () => {
      const agentRef = {
        runtime: {
          registeredEntities: [
            {
              metadata: {
                timings: { asset: 'https://cdn.example.com/vendor/app.js' },
                target: { id: 'mfe-1', name: 'MFE 1', type: 'MFE' }
              }
            }
          ]
        },
        init: { api: { register: { enabled: true, duplicate_data_to_container: false } } }
      }

      const result = getRegisteredTargetsFromResourceUrl('https://other.example.com/app.js', agentRef)
      expect(result).toEqual([])
    })

    test('matches a non-script manifest asset (e.g. an image), unlike stack-trace attribution', async () => {
      const manifestModule = await import('../../../../src/common/v2/manifest')
      const agentRef = {
        runtime: {
          registeredEntities: [
            {
              metadata: {
                timings: { asset: 'https://example.com/root.js' },
                target: {
                  id: 'mfe-1',
                  name: 'MFE 1',
                  type: 'MFE',
                  manifest: manifestModule.parseManifest({ assets: [{ path: 'logo.png', type: 'png' }] })
                }
              }
            }
          ]
        },
        init: { api: { register: { enabled: true, duplicate_data_to_container: false } } }
      }

      const result = getRegisteredTargetsFromResourceUrl('https://cdn.example.com/logo.png', agentRef)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('mfe-1')
    })

    test('returns multiple targets when multiple entities match, and collapses duplicate registrations of the same MFE', async () => {
      const manifestModule = await import('../../../../src/common/v2/manifest')
      const agentRef = {
        runtime: {
          registeredEntities: [
            {
              metadata: {
                timings: { asset: 'https://example.com/root.js' },
                target: {
                  id: 'mfe-1',
                  name: 'MFE 1',
                  type: 'MFE',
                  manifest: manifestModule.parseManifest({ assets: ['shared.css'] })
                }
              }
            },
            {
              metadata: {
                timings: { asset: 'https://example.com/root2.js' },
                target: {
                  id: 'mfe-2',
                  name: 'MFE 2',
                  type: 'MFE',
                  manifest: manifestModule.parseManifest({ assets: ['shared.css'] })
                }
              }
            },
            {
              // duplicate registration of mfe-1 -- same id, same resolved asset -- must collapse to one target
              metadata: {
                timings: { asset: 'https://example.com/root.js' },
                target: {
                  id: 'mfe-1',
                  name: 'MFE 1',
                  type: 'MFE',
                  manifest: manifestModule.parseManifest({ assets: ['shared.css'] })
                }
              }
            }
          ]
        },
        init: { api: { register: { enabled: true, duplicate_data_to_container: false } } }
      }

      const result = getRegisteredTargetsFromResourceUrl('https://cdn.example.com/shared.css', agentRef)
      expect(result).toHaveLength(2)
      expect(result.map(t => t.id).sort()).toEqual(['mfe-1', 'mfe-2'])
    })
  })

  describe('dedupeRegisteredEntitiesByAsset', () => {
    test('returns empty array for empty/undefined input', () => {
      expect(dedupeRegisteredEntitiesByAsset([])).toEqual([])
      expect(dedupeRegisteredEntitiesByAsset(undefined)).toEqual([])
    })

    test('returns single entity with defined asset unchanged', () => {
      const entity = { metadata: { timings: { asset: 'a.js' }, target: { blocked: false } } }
      expect(dedupeRegisteredEntitiesByAsset([entity])).toEqual([entity])
    })

    test('collapses multiple entities sharing the same defined asset', () => {
      const entities = Array.from({ length: 5 }, () => ({
        metadata: { timings: { asset: 'shared.js' }, target: { blocked: false } }
      }))
      const result = dedupeRegisteredEntitiesByAsset(entities)
      expect(result).toHaveLength(1)
      expect(entities).toContain(result[0])
    })

    test('prefers a non-blocked target as the canonical entity for a shared asset+id', () => {
      const blockedA = { metadata: { timings: { asset: 'shared.js' }, target: { id: 'viz-dev', blocked: true } } }
      const blockedB = { metadata: { timings: { asset: 'shared.js' }, target: { id: 'viz-dev', blocked: true } } }
      const active = { metadata: { timings: { asset: 'shared.js' }, target: { id: 'viz-dev', blocked: false } } }

      const result = dedupeRegisteredEntitiesByAsset([blockedA, blockedB, active])
      expect(result).toHaveLength(1)
      expect(result[0]).toBe(active)
    })

    test('falls back to first-match-wins when all sharing an asset+id are blocked', () => {
      const first = { metadata: { timings: { asset: 'shared.js' }, target: { id: 'viz-dev', blocked: true } } }
      const second = { metadata: { timings: { asset: 'shared.js' }, target: { id: 'viz-dev', blocked: true } } }

      const result = dedupeRegisteredEntitiesByAsset([first, second])
      expect(result).toHaveLength(1)
      expect(result[0]).toBe(first)
    })

    test('does not collapse entities that share an asset but have different ids (distinct MFEs registered from the same script)', () => {
      const mfe1 = { metadata: { timings: { asset: 'shared.js' }, target: { id: '1', blocked: false } } }
      const mfe2 = { metadata: { timings: { asset: 'shared.js' }, target: { id: '2', blocked: false } } }

      const result = dedupeRegisteredEntitiesByAsset([mfe1, mfe2])
      expect(result).toHaveLength(2)
      expect(result).toEqual([mfe1, mfe2])
    })

    test('never collapses entities with an undefined asset', () => {
      const entities = Array.from({ length: 5 }, () => ({
        metadata: { timings: { asset: undefined }, target: { blocked: false } }
      }))
      const result = dedupeRegisteredEntitiesByAsset(entities)
      expect(result).toHaveLength(5)
    })

    test('dedupes shared assets while leaving unresolved-asset entities untouched', () => {
      const assetA = Array.from({ length: 3 }, () => ({ metadata: { timings: { asset: 'a.js' }, target: { blocked: false } } }))
      const assetB = Array.from({ length: 2 }, () => ({ metadata: { timings: { asset: 'b.js' }, target: { blocked: false } } }))
      const unresolved = Array.from({ length: 2 }, () => ({ metadata: { timings: { asset: undefined }, target: { blocked: false } } }))

      const result = dedupeRegisteredEntitiesByAsset([...assetA, ...assetB, ...unresolved])
      expect(result).toHaveLength(4) // 1 for asset A, 1 for asset B, 2 untouched unresolved
    })

    test('handles entities missing metadata.timings entirely without crashing', () => {
      const entities = Array.from({ length: 5 }, () => ({ metadata: { target: { blocked: false } } }))
      const result = dedupeRegisteredEntitiesByAsset(entities)
      expect(result).toHaveLength(5)
    })
  })

  describe('getRegisteredTargetsFromId', () => {
    test('returns empty array when id is falsy', () => {
      const agentRef = {
        runtime: {
          registeredEntities: []
        }
      }

      expect(getRegisteredTargetsFromId(null, agentRef)).toEqual([])
      expect(getRegisteredTargetsFromId('', agentRef)).toEqual([])
      expect(getRegisteredTargetsFromId(undefined, agentRef)).toEqual([])
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
            register: {
              enabled: true,
              duplicate_data_to_container: false
            }
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
            register: {
              enabled: true,
              duplicate_data_to_container: false
            }
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
    test('returns empty array when register.enabled is false', () => {
      const agentRef = {
        init: {
          api: {
            register: {
              enabled: false
            }
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
            register: {
              enabled: true
            }
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
            register: {
              enabled: true
            }
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

  describe('dedupeTargetsByInstance', () => {
    test('returns empty array for empty input', () => {
      expect(dedupeTargetsByInstance([])).toEqual([])
    })

    test('collapses duplicate instances, preserving first occurrence', () => {
      const first = { instance: 'a', name: 'first' }
      const dup = { instance: 'a', name: 'duplicate' }
      const second = { instance: 'b', name: 'second' }

      const result = dedupeTargetsByInstance([first, dup, second])
      expect(result).toEqual([first, second])
    })

    test('collapses multiple undefined targets to a single entry', () => {
      const result = dedupeTargetsByInstance([undefined, undefined, undefined])
      expect(result).toEqual([undefined])
    })

    test('preserves distinct real targets alongside a single undefined entry', () => {
      const a = { instance: 'a' }
      const b = { instance: 'b' }

      const result = dedupeTargetsByInstance([a, undefined, b, undefined])
      expect(result).toEqual([a, undefined, b])
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
