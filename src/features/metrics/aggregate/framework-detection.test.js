import { faker } from '@faker-js/faker'
import { getFrameworks } from './framework-detection'

jest.mock('../../../common/util/global-scope', () => ({
  isBrowserScope: true
}))

afterEach(() => {
  document.body.innerHTML = ''
})

test('framework detection should not happen in non-browser scope', async () => {
  global.React = {}

  jest.resetModules()
  jest.doMock('../../../common/util/global-scope', () => ({
    isBrowserScope: false
  }))
  const frameworkDetector = await import('./framework-detection')

  expect(frameworkDetector.getFrameworks()).toEqual([])

  delete global.React
})

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

test('should detect angular from global ng property', () => {
  global.ng = {}

  expect(getFrameworks()).toEqual(['Angular'])

  delete global.ng
})

test('should detect angular from html [ng-version] property', () => {
  document.body.innerHTML = '<div ng-version=""></div>'

  expect(getFrameworks()).toEqual(['Angular'])
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

test('should detect vue from global Vue property', () => {
  global.Vue = {}

  expect(getFrameworks()).toEqual(['Vue'])

  delete global.Vue
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
