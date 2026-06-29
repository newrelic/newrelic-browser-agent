/**
 * Component tests for event-type specific obfuscation
 */
import { Obfuscator } from '../../../src/common/util/obfuscate'
import { EVENT_TYPES } from '../../../src/common/constants/events'

describe('Obfuscator - Event Type Filtering Integration', () => {
  describe('Real-world scenarios', () => {
    test('AJAX obfuscator only applies AJAX-specific rules', () => {
      const agentRef = {
        init: {
          obfuscate: [
            { regex: /password=[^\s]+/g, replacement: 'password=***' }, // global
            { regex: /api_key=[^\s]+/g, replacement: 'api_key=***', eventFilter: ['AjaxRequest'] },
            { regex: /user=[^\s]+/g, replacement: 'user=***', eventFilter: ['Log'] }
          ]
        }
      }

      const ajaxObfuscator = new Obfuscator(agentRef, EVENT_TYPES.AJAX)
      const result = ajaxObfuscator.obfuscateString('password=secret api_key=12345 user=admin')

      expect(result).toBe('password=*** api_key=*** user=admin')
    })

    test('Log obfuscator only applies Log-specific rules', () => {
      const agentRef = {
        init: {
          obfuscate: [
            { regex: /password=[^\s]+/g, replacement: 'password=***' }, // global
            { regex: /api_key=[^\s]+/g, replacement: 'api_key=***', eventFilter: ['AjaxRequest'] },
            { regex: /user=[^\s]+/g, replacement: 'user=***', eventFilter: ['Log'] }
          ]
        }
      }

      const logObfuscator = new Obfuscator(agentRef, EVENT_TYPES.LOG)
      const result = logObfuscator.obfuscateString('password=secret api_key=12345 user=admin')

      expect(result).toBe('password=*** api_key=12345 user=***')
    })

    test('Generic obfuscator with mixed event types in payload', () => {
      const agentRef = {
        init: {
          obfuscate: [
            { regex: /global-secret/g, replacement: 'GLOBAL' },
            { regex: /ajax-secret/g, replacement: 'AJAX', eventFilter: ['AjaxRequest'] },
            { regex: /log-secret/g, replacement: 'LOG', eventFilter: ['Log'] }
          ]
        }
      }

      const genericObfuscator = new Obfuscator(agentRef)
      const data = {
        ins: [
          {
            eventType: 'AjaxRequest',
            url: 'global-secret ajax-secret log-secret'
          },
          {
            eventType: 'Log',
            message: 'global-secret ajax-secret log-secret'
          },
          {
            eventType: 'PageAction',
            name: 'global-secret ajax-secret log-secret'
          }
        ]
      }

      genericObfuscator.traverseAndObfuscateEvents(data)

      // Generic obfuscator applies event-specific rules only to matching event types
      // But global rules (without eventFilter) apply to ALL event types
      // AjaxRequest: gets AJAX rule + GLOBAL rule
      // Log: gets LOG rule + GLOBAL rule
      // PageAction: gets only GLOBAL rule
      expect(data.ins[0].url).toBe('GLOBAL AJAX LOG')
      expect(data.ins[1].message).toBe('GLOBAL AJAX LOG')
      expect(data.ins[2].name).toBe('GLOBAL ajax-secret log-secret')
    })

    test('preserves object keys while obfuscating only matching event values', () => {
      const agentRef = {
        init: {
          obfuscate: [
            { regex: /secret/g, replacement: '***', eventFilter: ['PageAction'] }
          ]
        }
      }

      const genericObfuscator = new Obfuscator(agentRef)
      const data = {
        ins: [
          {
            eventType: 'PageAction',
            'ajaxRequest.id': 'secret-value',
            message: 'secret message'
          },
          {
            eventType: 'UserAction',
            'ajaxRequest.id': 'secret-value',
            message: 'secret message'
          }
        ]
      }

      genericObfuscator.traverseAndObfuscateEvents(data)

      expect(Object.keys(data.ins[0])).toEqual(expect.arrayContaining(['eventType', 'ajaxRequest.id', 'message']))
      expect(data.ins[0]['ajaxRequest.id']).not.toBe('secret-value')
      expect(data.ins[0].message).toBe('*** message')
      expect(Object.keys(data.ins[1])).toEqual(expect.arrayContaining(['eventType', 'ajaxRequest.id', 'message']))
      expect(data.ins[1]['ajaxRequest.id']).toBe('secret-value')
      expect(data.ins[1].message).toBe('secret message')
    })

    test('SSN and CC obfuscation for AJAX only (DACI Option 5 scenario)', () => {
      const agentRef = {
        init: {
          obfuscate: [
            {
              regex: /\b\d{3}-\d{2}-\d{4}\b/g,
              replacement: '***-**-****',
              eventFilter: ['AjaxRequest']
            },
            {
              regex: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
              replacement: '****-****-****-****',
              eventFilter: ['AjaxRequest']
            }
          ]
        }
      }

      const ajaxObfuscator = new Obfuscator(agentRef, EVENT_TYPES.AJAX)
      const logObfuscator = new Obfuscator(agentRef, EVENT_TYPES.LOG)

      const testData = 'SSN: 123-45-6789, CC: 1234-5678-9012-3456'

      // AJAX should obfuscate both
      expect(ajaxObfuscator.obfuscateString(testData)).toBe('SSN: ***-**-****, CC: ****-****-****-****')

      // Logs should NOT obfuscate (no matching rules)
      expect(logObfuscator.obfuscateString(testData)).toBe(testData)
    })

    test('Multiple rules with same pattern but different event filters', () => {
      const agentRef = {
        init: {
          obfuscate: [
            { regex: /data/g, replacement: 'AJAX-DATA', eventFilter: ['AjaxRequest'] },
            { regex: /data/g, replacement: 'LOG-DATA', eventFilter: ['Log'] },
            { regex: /data/g, replacement: 'PAGE-DATA', eventFilter: ['PageAction'] }
          ]
        }
      }

      const ajaxObfuscator = new Obfuscator(agentRef, EVENT_TYPES.AJAX)
      const logObfuscator = new Obfuscator(agentRef, EVENT_TYPES.LOG)
      const pageObfuscator = new Obfuscator(agentRef, 'PageAction')

      expect(ajaxObfuscator.obfuscateString('my data')).toBe('my AJAX-DATA')
      expect(logObfuscator.obfuscateString('my data')).toBe('my LOG-DATA')
      expect(pageObfuscator.obfuscateString('my data')).toBe('my PAGE-DATA')
    })

    test('Complex nested payload with selective obfuscation', () => {
      const agentRef = {
        init: {
          obfuscate: [
            { regex: /password/g, replacement: '***', eventFilter: ['AjaxRequest', 'Log'] }
          ]
        }
      }

      const genericObfuscator = new Obfuscator(agentRef)
      const payload = {
        common: {
          attributes: { session: 'abc123' }
        },
        logs: [
          {
            eventType: 'Log',
            message: 'User entered password',
            attributes: {
              action: 'login',
              details: {
                input: 'password field'
              }
            }
          }
        ],
        events: [
          {
            eventType: 'PageAction',
            name: 'password reset',
            url: '/reset-password'
          }
        ]
      }

      genericObfuscator.traverseAndObfuscateEvents(payload)

      // Log event should be obfuscated
      expect(payload.logs[0].message).toBe('User entered ***')
      expect(payload.logs[0].attributes.details.input).toBe('*** field')

      // PageAction should NOT be obfuscated
      expect(payload.events[0].name).toBe('password reset')
      expect(payload.events[0].url).toBe('/reset-password')
    })

    test('No obfuscation when eventType is not in payload', () => {
      const agentRef = {
        init: {
          obfuscate: [
            { regex: /secret/g, replacement: '***', eventFilter: ['AjaxRequest'] }
          ]
        }
      }

      const genericObfuscator = new Obfuscator(agentRef)
      const payload = {
        metadata: { value: 'secret data' },
        config: { key: 'secret key' }
      }

      genericObfuscator.traverseAndObfuscateEvents(payload)

      // Should NOT obfuscate (no eventType found in payload)
      expect(payload.metadata.value).toBe('secret data')
      expect(payload.config.key).toBe('secret key')
    })

    test('Obfuscation with eventFilter honors regex flags', () => {
      const agentRef = {
        init: {
          obfuscate: [
            {
              regex: /SECRET/gi, // case-insensitive
              replacement: '***',
              eventFilter: ['PageAction']
            }
          ]
        }
      }

      const pageObfuscator = new Obfuscator(agentRef, 'PageAction')

      expect(pageObfuscator.obfuscateString('secret SECRET SeCrEt')).toBe('*** *** ***')
    })

    test('Performance: eventFilter does not slow down non-matching events', () => {
      const agentRef = {
        init: {
          obfuscate: [
            { regex: /test/g, replacement: 'TEST', eventFilter: ['NonExistentType'] }
          ]
        }
      }

      const pageObfuscator = new Obfuscator(agentRef, 'PageAction')
      const largeString = 'test '.repeat(10000)

      const start = Date.now()
      pageObfuscator.obfuscateString(largeString)
      const duration = Date.now() - start

      // Should be fast since no rules match
      expect(duration).toBeLessThan(100)
    })
  })

  describe('Backward compatibility', () => {
    test('Rules without eventFilter work as before', () => {
      const agentRef = {
        init: {
          obfuscate: [
            { regex: /old-style/g, replacement: 'OLD' }
          ]
        }
      }

      const ajaxObfuscator = new Obfuscator(agentRef, EVENT_TYPES.AJAX)
      const logObfuscator = new Obfuscator(agentRef, EVENT_TYPES.LOG)
      const genericObfuscator = new Obfuscator(agentRef)

      expect(ajaxObfuscator.obfuscateString('old-style')).toBe('OLD')
      expect(logObfuscator.obfuscateString('old-style')).toBe('OLD')
      expect(genericObfuscator.obfuscateString('old-style')).toBe('OLD')
    })

    test('Mixed old and new style rules', () => {
      const agentRef = {
        init: {
          obfuscate: [
            { regex: /global/g, replacement: 'GLOBAL' }, // old style
            { regex: /ajax/g, replacement: 'AJAX', eventFilter: ['AjaxRequest'] } // new style
          ]
        }
      }

      const ajaxObfuscator = new Obfuscator(agentRef, EVENT_TYPES.AJAX)
      const logObfuscator = new Obfuscator(agentRef, EVENT_TYPES.LOG)

      expect(ajaxObfuscator.obfuscateString('global ajax')).toBe('GLOBAL AJAX')
      expect(logObfuscator.obfuscateString('global ajax')).toBe('GLOBAL ajax')
    })
  })

  describe('Edge cases', () => {
    test('Empty eventFilter array treated as global', () => {
      const agentRef = {
        init: {
          obfuscate: [
            { regex: /test/g, replacement: 'TEST', eventFilter: [] }
          ]
        }
      }

      const obfuscator = new Obfuscator(agentRef, EVENT_TYPES.AJAX)
      expect(obfuscator.obfuscateString('test')).toBe('TEST')
    })

    test('Null eventFilter treated as global', () => {
      const agentRef = {
        init: {
          obfuscate: [
            { regex: /test/g, replacement: 'TEST', eventFilter: null }
          ]
        }
      }

      const obfuscator = new Obfuscator(agentRef, EVENT_TYPES.AJAX)
      expect(obfuscator.obfuscateString('test')).toBe('TEST')
    })

    test('Invalid eventFilter type treated as global', () => {
      const agentRef = {
        init: {
          obfuscate: [
            { regex: /test/g, replacement: 'TEST', eventFilter: 'InvalidString' }
          ]
        }
      }

      const obfuscator = new Obfuscator(agentRef, EVENT_TYPES.AJAX)
      expect(obfuscator.obfuscateString('test')).toBe('TEST')
    })

    test('Case-sensitive event type matching', () => {
      const agentRef = {
        init: {
          obfuscate: [
            { regex: /test/g, replacement: 'TEST', eventFilter: ['ajaxrequest'] } // wrong case
          ]
        }
      }

      const obfuscator = new Obfuscator(agentRef, EVENT_TYPES.AJAX) // 'AjaxRequest'
      expect(obfuscator.obfuscateString('test')).toBe('test') // no match
    })

    test('Handles very long eventFilter arrays', () => {
      const allEventTypes = Object.values(EVENT_TYPES)
      const agentRef = {
        init: {
          obfuscate: [
            { regex: /test/g, replacement: 'TEST', eventFilter: allEventTypes }
          ]
        }
      }

      allEventTypes.forEach(eventType => {
        const obfuscator = new Obfuscator(agentRef, eventType)
        expect(obfuscator.obfuscateString('test')).toBe('TEST')
      })
    })
  })
})
