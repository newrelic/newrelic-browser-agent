import { recordSupportability } from './metrics'

var FRAMEWORKS = {
  REACT: 'React',
  ANGULAR: 'Angular',
  ANGULARJS: 'AngularJS',
  BACKBONE: 'Backbone',
  EMBER: 'Ember',
  VUE: 'Vue',
  METEOR: 'Meteor',
  ZEPTO: 'Zepto',
  JQUERY: 'Jquery'
}

export function getFrameworks() {
  var frameworks = []
  try {
    if (detectReact()) frameworks.push(FRAMEWORKS.REACT)
    if (detectAngularJs()) frameworks.push(FRAMEWORKS.ANGULARJS)
    if (detectAngular()) frameworks.push(FRAMEWORKS.ANGULAR)
    if (window.Backbone) frameworks.push(FRAMEWORKS.BACKBONE)
    if (window.Ember) frameworks.push(FRAMEWORKS.EMBER)
    if (window.Vue) frameworks.push(FRAMEWORKS.VUE)
    if (window.Meteor) frameworks.push(FRAMEWORKS.METEOR)
    if (window.Zepto) frameworks.push(FRAMEWORKS.ZEPTO)
    if (window.jQuery) frameworks.push(FRAMEWORKS.JQUERY)
  } catch (err) {
    // not supported?
  }
  return frameworks
}

function detectReact() {
  try {
    if (!!window.React || !!window.ReactDOM || !!window.ReactRedux) return true
    if (document.querySelector('[data-reactroot], [data-reactid]')) return true
    var divs = document.querySelectorAll('body > div')
    for (var i = 0; i < divs.length; i++) {
      if (Object.keys(divs[i]).indexOf('_reactRootContainer') >= 0) return true
    }
    return false
  } catch (err) {
    // not supported?
    return false
  }
}

function detectAngularJs() {
  try {
    if (window.angular) return true
    if (document.querySelector('.ng-binding, [ng-app], [data-ng-app], [ng-controller], [data-ng-controller], [ng-repeat], [data-ng-repeat]')) return true
    if (document.querySelector('script[src*="angular.js"], script[src*="angular.min.js"]')) return true
    return false
  } catch (err) {
    // not supported?
    return false
  }
}

function detectAngular() {
  try {
    // eslint-disable-next-line
    if (window.hasOwnProperty('ng') && window.ng.hasOwnProperty('coreTokens') && window.ng.coreTokens.hasOwnProperty('NgZone')) return true
    return !!document.querySelectorAll('[ng-version]').length
  } catch (err) {
    // not supported?
    return false
  }
}

export function recordFrameworks() {
  var frameworks = getFrameworks()
  for (var i = 0; i < frameworks.length; i++) {
    recordSupportability('Framework/' + frameworks[i] + '/Detected')
  }
}
