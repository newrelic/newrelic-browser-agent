import { faker } from '@faker-js/faker'
import { Obfuscator } from '../../../../src/common/util/obfuscate'

jest.mock('../../../../src/common/url/protocol')
jest.mock('../../../../src/common/util/console')

const rules = [{
  regex: /pii/g,
  replacement: 'OBFUSCATED'
}]

describe('obfuscateString', () => {
  test('obfuscateString returns the input when there are no rules', () => {
    const input = faker.lorem.sentence()
    const obfuscator = new Obfuscator({ init: { obfuscate: [] } })

    expect(obfuscator.obfuscateString(input)).toEqual(input)
  })

  test('obfuscateString applies obfuscation rules to input', () => {
    const input = 'pii'
    const obfuscator = new Obfuscator({ init: { obfuscate: rules } })

    expect(obfuscator.obfuscateString(input)).toEqual(rules[0].replacement)
  })

  test('obfuscateString replaces input with * when replacement is not set', () => {
    const newRules = [{
      regex: rules[0].regex
    }]

    const input = 'pii'
    const obfuscator = new Obfuscator({ init: { obfuscate: newRules } })

    expect(obfuscator.obfuscateString(input)).toEqual('*')
  })

  test.each([
    null,
    undefined,
    '',
    123
  ])('obfuscateString returns the input as-is if %s', (input) => {
    const obfuscator = new Obfuscator({ init: { obfuscate: rules } })

    expect(obfuscator.obfuscateString(input)).toEqual(input)
  })
})

describe('validateObfuscationRule', () => {
  test('should return invalid for rule missing regex', () => {
    const rule = {
      replacement: faker.lorem.text()
    }

    const obfuscator = new Obfuscator({ init: { obfuscate: [] } })
    expect(obfuscator.validateObfuscationRule(rule)).toEqual({
      rule,
      isValid: false,
      errors: {
        regexMissingDetected: true,
        invalidRegexDetected: false,
        invalidReplacementDetected: false
      }
    })
  })

  test.each([
    null,
    123,
    {},
    []
  ])('should return invalid for rule containing regex type %s', (input) => {
    const rule = {
      regex: input,
      replacement: faker.lorem.text()
    }

    const obfuscator = new Obfuscator({ init: { obfuscate: [] } })

    expect(obfuscator.validateObfuscationRule(rule)).toEqual({
      rule,
      isValid: false,
      errors: {
        regexMissingDetected: false,
        invalidRegexDetected: true,
        invalidReplacementDetected: false
      }
    })
  })

  test.each([
    123,
    {},
    []
  ])('should return invalid for rule containing replacement type %s', (input) => {
    const rule = {
      regex: rules[0].regex,
      replacement: input
    }

    const obfuscator = new Obfuscator({ init: { obfuscate: [] } })
    expect(obfuscator.validateObfuscationRule(rule)).toEqual({
      rule,
      isValid: false,
      errors: {
        regexMissingDetected: false,
        invalidRegexDetected: false,
        invalidReplacementDetected: true
      }
    })
  })

  test('should return valid for a valid rule', () => {
    const rule = rules[0]

    const obfuscator = new Obfuscator({ init: { obfuscate: [] } })
    expect(obfuscator.validateObfuscationRule(rule)).toEqual({
      rule,
      isValid: true,
      errors: {
        regexMissingDetected: false,
        invalidRegexDetected: false,
        invalidReplacementDetected: false
      }
    })
  })
})

describe('eventFilter (event-type specific obfuscation)', () => {
  describe('obfuscateConfigRules getter', () => {
    test('returns all rules when no eventType is specified on obfuscator', () => {
      const allRules = [
        { regex: /foo/g, replacement: 'bar' },
        { regex: /test/g, replacement: 'TEST', eventFilter: ['AjaxRequest'] }
      ]
      const obfuscator = new Obfuscator({ init: { obfuscate: allRules } })

      expect(obfuscator.obfuscateConfigRules).toEqual(allRules)
    })

    test('returns only matching rules when eventType is specified', () => {
      const allRules = [
        { regex: /foo/g, replacement: 'bar' }, // no filter = applies to all
        { regex: /ajax/g, replacement: 'AJAX', eventFilter: ['AjaxRequest'] },
        { regex: /log/g, replacement: 'LOG', eventFilter: ['Log'] }
      ]
      const obfuscator = new Obfuscator({ init: { obfuscate: allRules } }, 'AjaxRequest')

      expect(obfuscator.obfuscateConfigRules).toEqual([
        { regex: /foo/g, replacement: 'bar' },
        { regex: /ajax/g, replacement: 'AJAX', eventFilter: ['AjaxRequest'] }
      ])
    })

    test('returns only global rules when eventType does not match any filters', () => {
      const allRules = [
        { regex: /foo/g, replacement: 'bar' },
        { regex: /ajax/g, replacement: 'AJAX', eventFilter: ['AjaxRequest'] }
      ]
      const obfuscator = new Obfuscator({ init: { obfuscate: allRules } }, 'PageAction')

      expect(obfuscator.obfuscateConfigRules).toEqual([
        { regex: /foo/g, replacement: 'bar' }
      ])
    })

    test('treats empty eventFilter array as global rule', () => {
      const allRules = [
        { regex: /foo/g, replacement: 'bar', eventFilter: [] }
      ]
      const obfuscator = new Obfuscator({ init: { obfuscate: allRules } }, 'AjaxRequest')

      expect(obfuscator.obfuscateConfigRules).toEqual(allRules)
    })

    test('treats null eventFilter as global rule', () => {
      const allRules = [
        { regex: /foo/g, replacement: 'bar', eventFilter: null }
      ]
      const obfuscator = new Obfuscator({ init: { obfuscate: allRules } }, 'AjaxRequest')

      expect(obfuscator.obfuscateConfigRules).toEqual(allRules)
    })

    test('handles multiple event types in eventFilter', () => {
      const allRules = [
        { regex: /sensitive/g, replacement: '***', eventFilter: ['AjaxRequest', 'Log', 'PageAction'] }
      ]
      const ajaxObfuscator = new Obfuscator({ init: { obfuscate: allRules } }, 'AjaxRequest')
      const logObfuscator = new Obfuscator({ init: { obfuscate: allRules } }, 'Log')
      const userActionObfuscator = new Obfuscator({ init: { obfuscate: allRules } }, 'UserAction')

      expect(ajaxObfuscator.obfuscateConfigRules).toEqual(allRules)
      expect(logObfuscator.obfuscateConfigRules).toEqual(allRules)
      expect(userActionObfuscator.obfuscateConfigRules).toEqual([])
    })
  })

  describe('obfuscateString with eventFilter', () => {
    test('applies only rules matching the eventType', () => {
      const allRules = [
        { regex: /global/g, replacement: 'GLOBAL' },
        { regex: /ajax/g, replacement: 'AJAX', eventFilter: ['AjaxRequest'] },
        { regex: /log/g, replacement: 'LOG', eventFilter: ['Log'] }
      ]
      const ajaxObfuscator = new Obfuscator({ init: { obfuscate: allRules } }, 'AjaxRequest')

      expect(ajaxObfuscator.obfuscateString('global ajax log')).toEqual('GLOBAL AJAX log')
    })

    test('applies global rules to all event types', () => {
      const allRules = [
        { regex: /secret/g, replacement: '***' }
      ]
      const ajaxObfuscator = new Obfuscator({ init: { obfuscate: allRules } }, 'AjaxRequest')
      const logObfuscator = new Obfuscator({ init: { obfuscate: allRules } }, 'Log')

      expect(ajaxObfuscator.obfuscateString('my secret data')).toEqual('my *** data')
      expect(logObfuscator.obfuscateString('my secret data')).toEqual('my *** data')
    })
  })

  describe('traverseAndObfuscateEvents', () => {
    test('obfuscates all strings when obfuscator has specific eventType', () => {
      const rules = [
        { regex: /secret/g, replacement: '***' }
      ]
      const obfuscator = new Obfuscator({ init: { obfuscate: rules } }, 'AjaxRequest')
      const data = {
        method: 'POST',
        path: '/api/secret/endpoint',
        body: 'my secret data'
      }

      obfuscator.traverseAndObfuscateEvents(data)

      expect(data).toEqual({
        method: 'POST',
        path: '/api/***/endpoint',
        body: 'my *** data'
      })
    })

    test('obfuscates all strings when no rules have eventFilter', () => {
      const rules = [
        { regex: /secret/g, replacement: '***' }
      ]
      const obfuscator = new Obfuscator({ init: { obfuscate: rules } })
      const data = {
        ins: [
          { eventType: 'PageAction', name: 'secret action' },
          { eventType: 'UserAction', target: 'secret button' }
        ]
      }

      obfuscator.traverseAndObfuscateEvents(data)

      expect(data.ins[0].name).toEqual('*** action')
      expect(data.ins[1].target).toEqual('*** button')
    })

    test('selectively obfuscates based on eventType when rules have eventFilter', () => {
      const rules = [
        { regex: /secret/g, replacement: '***', eventFilter: ['PageAction'] }
      ]
      const obfuscator = new Obfuscator({ init: { obfuscate: rules } })
      const data = {
        ins: [
          { eventType: 'PageAction', name: 'secret action', url: 'secret url' },
          { eventType: 'UserAction', target: 'secret button' }
        ]
      }

      obfuscator.traverseAndObfuscateEvents(data)

      expect(data.ins[0].name).toEqual('*** action')
      expect(data.ins[0].url).toEqual('*** url')
      expect(data.ins[1].target).toEqual('secret button') // not obfuscated
    })

    test('handles nested objects with eventType', () => {
      const rules = [
        { regex: /password/g, replacement: '***', eventFilter: ['Log'] }
      ]
      const obfuscator = new Obfuscator({ init: { obfuscate: rules } })
      const data = {
        logs: [
          {
            eventType: 'Log',
            message: 'User entered password=12345',
            attributes: {
              user: 'admin',
              action: 'login with password'
            }
          },
          {
            eventType: 'PageAction',
            message: 'User entered password=67890'
          }
        ]
      }

      obfuscator.traverseAndObfuscateEvents(data)

      expect(data.logs[0].message).toEqual('User entered ***=12345')
      expect(data.logs[0].attributes.action).toEqual('login with ***')
      expect(data.logs[1].message).toEqual('User entered password=67890') // not obfuscated
    })

    test('handles arrays and deep nesting', () => {
      const rules = [
        { regex: /ssn/g, replacement: 'SSN', eventFilter: ['AjaxRequest'] }
      ]
      const obfuscator = new Obfuscator({ init: { obfuscate: rules } })
      const data = {
        events: [
          {
            eventType: 'AjaxRequest',
            details: {
              request: {
                body: 'ssn data',
                headers: ['ssn header']
              }
            }
          }
        ]
      }

      obfuscator.traverseAndObfuscateEvents(data)

      expect(data.events[0].details.request.body).toEqual('SSN data')
      expect(data.events[0].details.request.headers[0]).toEqual('SSN header')
    })

    test('does not obfuscate when eventType does not match any filter', () => {
      const rules = [
        { regex: /secret/g, replacement: '***', eventFilter: ['AjaxRequest'] }
      ]
      const obfuscator = new Obfuscator({ init: { obfuscate: rules } })
      const data = {
        ins: [
          { eventType: 'PageAction', name: 'secret action' }
        ]
      }

      obfuscator.traverseAndObfuscateEvents(data)

      expect(data.ins[0].name).toEqual('secret action') // not obfuscated
    })

    test('handles multiple rules with different eventFilters', () => {
      const rules = [
        { regex: /ajax-secret/g, replacement: 'AJAX', eventFilter: ['AjaxRequest'] },
        { regex: /log-secret/g, replacement: 'LOG', eventFilter: ['Log'] },
        { regex: /global-secret/g, replacement: 'GLOBAL' }
      ]
      const obfuscator = new Obfuscator({ init: { obfuscate: rules } })
      const data = {
        ins: [
          { eventType: 'AjaxRequest', url: 'ajax-secret log-secret global-secret' },
          { eventType: 'Log', message: 'ajax-secret log-secret global-secret' },
          { eventType: 'PageAction', name: 'ajax-secret log-secret global-secret' }
        ]
      }

      obfuscator.traverseAndObfuscateEvents(data)

      // Generic obfuscator applies event-specific rules only to matching event types
      // But global rules (without eventFilter) apply to ALL event types
      // AjaxRequest: gets AJAX rule + GLOBAL rule
      // Log: gets LOG rule + GLOBAL rule
      // PageAction: gets only GLOBAL rule (no event-specific rules match)
      expect(data.ins[0].url).toEqual('AJAX LOG GLOBAL')
      expect(data.ins[1].message).toEqual('AJAX LOG GLOBAL')
      expect(data.ins[2].name).toEqual('ajax-secret log-secret GLOBAL')
    })

    test('handles objects without eventType property', () => {
      const rules = [
        { regex: /secret/g, replacement: '***', eventFilter: ['AjaxRequest'] }
      ]
      const obfuscator = new Obfuscator({ init: { obfuscate: rules } })
      const data = {
        metadata: {
          value: 'secret metadata'
        }
      }

      obfuscator.traverseAndObfuscateEvents(data)

      expect(data.metadata.value).toEqual('secret metadata') // not obfuscated (no eventType found)
    })
  })
})
