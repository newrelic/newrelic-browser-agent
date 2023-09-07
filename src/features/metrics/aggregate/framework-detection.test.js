import { faker } from '@faker-js/faker'
import { getFrameworks } from './framework-detection'

jest.mock('../../../common/constants/runtime', () => ({
  isBrowserScope: true
}))

afterEach(() => {
  document.body.innerHTML = ''
})

test('framework detection should not happen in non-browser scope', async () => {
  global.React = {}

  jest.resetModules()
  jest.doMock('../../../common/constants/runtime', () => ({
    isBrowserScope: false
  }))
  const frameworkDetector = await import('./framework-detection')

  expect(frameworkDetector.getFrameworks()).toEqual([])

  delete global.React
})

describe('react', () => {
  test('should detect react from global React property', () => {
    global.React = {}

    expect(getFrameworks()).toEqual(['React'])

    delete global.React
  })

  test('should detect react from global ReactDOM property', () => {
    global.ReactDOM = {}

    expect(getFrameworks()).toEqual(['React'])

    delete global.ReactDOM
  })

  test('should detect react from global ReactRedux property', () => {
    global.ReactRedux = {}

    expect(getFrameworks()).toEqual(['React'])

    delete global.ReactRedux
  })

  test('should detect react from html [data-reactroot] property', () => {
    document.body.innerHTML = '<div data-reactroot=""></div>'

    expect(getFrameworks()).toEqual(['React'])
  })

  test('should detect react from html [data-reactid] property', () => {
    document.body.innerHTML = '<div data-reactid=""></div>'

    expect(getFrameworks()).toEqual(['React'])
  })

  test('should detect react from element _reactRootContainer property', () => {
    const element = document.createElement('div')
    element._reactRootContainer = {}
    document.body.innerHTML = '<html><body></body></html>'
    document.body.appendChild(element)

    expect(getFrameworks()).toEqual(['React'])
  })

  describe('nextjs', () => {
    test('should not detect nextjs if react is not detected', () => {
      global.next = { version: 'test' }

      expect(getFrameworks()).toEqual([])

      delete global.next
    })

    test('should detect nextjs if global is set', () => {
      global.React = {}
      global.next = { version: 'test' }

      expect(getFrameworks()).toEqual(['React', 'NextJS'])

      delete global.React
      delete global.next
    })
  })
})

describe('vue', () => {
  test('should detect vue from global Vue property', () => {
    global.Vue = {}

    expect(getFrameworks()).toEqual(['Vue'])

    delete global.Vue
  })

  describe('nuxtjs', () => {
    test('should not detect nuxtjs if vue is not detected', () => {
      global.$nuxt = { nuxt: {} }

      expect(getFrameworks()).toEqual([])

      delete global.$nuxt
    })

    test('should detect nuxtjs if global is set', () => {
      global.Vue = {}
      global.$nuxt = { nuxt: {} }

      expect(getFrameworks()).toEqual(['Vue', 'NuxtJS'])

      delete global.Vue
      delete global.$nuxt
    })
  })
})

describe('angular', () => {
  test('should detect angular from global ng property', () => {
    global.ng = {}

    expect(getFrameworks()).toEqual(['Angular'])

    delete global.ng
  })

  test('should detect angular from html [ng-version] property', () => {
    document.body.innerHTML = '<div ng-version=""></div>'

    expect(getFrameworks()).toEqual(['Angular'])
  })

  describe('angular universal', () => {
    test('should not detect angular universal if angular is not detected', () => {
      document.body.innerHTML = '<div ng-server-context=""></div>'

      expect(getFrameworks()).toEqual([])
    })

    test('should detect nuxtjs if global is set', () => {
      document.body.innerHTML = '<div ng-version="" ng-server-context=""></div>'

      expect(getFrameworks()).toEqual(['Angular', 'AngularUniversal'])
    })
  })
})

describe('svelte', () => {
  test('should detect svelte from global __svelte property', () => {
    global.__svelte = {}

    expect(getFrameworks()).toEqual(['Svelte'])

    delete global.__svelte
  })

  describe('sveltekit', () => {
    test('should not detect sveltekit if svelte is not detected', () => {
      global.__sveltekit_1234 = { }

      expect(getFrameworks()).toEqual([])

      delete global.__sveltekit_1234
    })

    test('should detect sveltekit if global is set', () => {
      global.__svelte = {}
      global.__sveltekit_4567 = {}

      expect(getFrameworks()).toEqual(['Svelte', 'SvelteKit'])

      delete global.__svelte
      delete global.__sveltekit_4567
    })
  })
})

describe('preact', () => {
  test('should detect preact from global preact property', () => {
    global.preact = {}

    expect(getFrameworks()).toEqual(['Preact'])

    delete global.preact
  })

  describe('preact ssr', () => {
    test('should not detect preact ssr if preact is not detected', () => {
      document.body.innerHTML = '<script type="__PREACT_CLI_DATA__"></div>'

      expect(getFrameworks()).toEqual([])
    })

    test('should detect sveltekit if global is set', () => {
      global.preact = {}
      document.body.innerHTML = '<script type="__PREACT_CLI_DATA__"></div>'

      expect(getFrameworks()).toEqual(['Preact', 'PreactSSR'])

      delete global.preact
    })
  })
})

describe('angularjs', () => {
  test('should detect angularjs from global angular property', () => {
    global.angular = {}

    expect(getFrameworks()).toEqual(['AngularJS'])

    delete global.angular
  })

  test('should detect angularjs from html .ng-binding property', () => {
    document.body.innerHTML = '<div class="ng-binding"></div>'

    expect(getFrameworks()).toEqual(['AngularJS'])
  })

  test('should detect angularjs from html [ng-app] property', () => {
    document.body.innerHTML = '<div ng-app=""></div>'

    expect(getFrameworks()).toEqual(['AngularJS'])
  })

  test('should detect angularjs from html [data-ng-app] property', () => {
    document.body.innerHTML = '<div data-ng-app=""></div>'

    expect(getFrameworks()).toEqual(['AngularJS'])
  })

  test('should detect angularjs from html [ng-controller] property', () => {
    document.body.innerHTML = '<div ng-controller=""></div>'

    expect(getFrameworks()).toEqual(['AngularJS'])
  })

  test('should detect angularjs from html [data-ng-controller] property', () => {
    document.body.innerHTML = '<div data-ng-controller=""></div>'

    expect(getFrameworks()).toEqual(['AngularJS'])
  })

  test('should detect angularjs from html [ng-repeat] property', () => {
    document.body.innerHTML = '<div ng-repeat=""></div>'

    expect(getFrameworks()).toEqual(['AngularJS'])
  })

  test('should detect angularjs from html [data-ng-repeat] property', () => {
    document.body.innerHTML = '<div data-ng-repeat=""></div>'

    expect(getFrameworks()).toEqual(['AngularJS'])
  })

  test('should detect angularjs from angular.js script element', () => {
    document.body.innerHTML = `<script src="${faker.internet.url()}/angular.js"></script>`

    expect(getFrameworks()).toEqual(['AngularJS'])
  })

  test('should detect angularjs from angular.min.js script element', () => {
    document.body.innerHTML = `<script src="${faker.internet.url()}/angular.min.js"></script>`

    expect(getFrameworks()).toEqual(['AngularJS'])
  })
})

test('should detect backbone from global Backbone property', () => {
  global.Backbone = {}

  expect(getFrameworks()).toEqual(['Backbone'])

  delete global.Backbone
})

test('should detect ember from global Ember property', () => {
  global.Ember = {}

  expect(getFrameworks()).toEqual(['Ember'])

  delete global.Ember
})

test('should detect meteor from global Meteor property', () => {
  global.Meteor = {}

  expect(getFrameworks()).toEqual(['Meteor'])

  delete global.Meteor
})

test('should detect zepto from global Zepto property', () => {
  global.Zepto = {}

  expect(getFrameworks()).toEqual(['Zepto'])

  delete global.Zepto
})

test('should detect jquery from global jQuery property', () => {
  global.jQuery = {}

  expect(getFrameworks()).toEqual(['Jquery'])

  delete global.jQuery
})

test('should detect mootools from global MooTools property', () => {
  global.MooTools = {}

  expect(getFrameworks()).toEqual(['MooTools'])

  delete global.MooTools
})

test('should detect electron from user agent', () => {
  const currentNavigator = global.navigator
  Object.defineProperty(global, 'navigator', {
    value: { userAgent: 'This is a test; Electron some version; foobar' },
    writable: true
  })

  expect(getFrameworks()).toEqual(['Electron'])

  global.navigator = currentNavigator
})
