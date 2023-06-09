import { isBrowserScope } from '../../../common/constants/runtime'

const FRAMEWORKS = {
  REACT: 'React',
  ANGULAR: 'Angular',
  ANGULARJS: 'AngularJS',
  BACKBONE: 'Backbone',
  EMBER: 'Ember',
  VUE: 'Vue',
  METEOR: 'Meteor',
  ZEPTO: 'Zepto',
  JQUERY: 'Jquery',
  MOOTOOLS: 'MooTools'
}

export function getFrameworks () {
  if (!isBrowserScope) return [] // don't bother detecting frameworks if not in the main window context

  const frameworks = []
  try {
    if (detectReact()) frameworks.push(FRAMEWORKS.REACT)
    if (detectAngularJs()) frameworks.push(FRAMEWORKS.ANGULARJS)
    if (detectAngular()) frameworks.push(FRAMEWORKS.ANGULAR)
    if (Object.prototype.hasOwnProperty.call(window, 'Backbone')) frameworks.push(FRAMEWORKS.BACKBONE)
    if (Object.prototype.hasOwnProperty.call(window, 'Ember')) frameworks.push(FRAMEWORKS.EMBER)
    if (Object.prototype.hasOwnProperty.call(window, 'Vue')) frameworks.push(FRAMEWORKS.VUE)
    if (Object.prototype.hasOwnProperty.call(window, 'Meteor')) frameworks.push(FRAMEWORKS.METEOR)
    if (Object.prototype.hasOwnProperty.call(window, 'Zepto')) frameworks.push(FRAMEWORKS.ZEPTO)
    if (Object.prototype.hasOwnProperty.call(window, 'jQuery')) frameworks.push(FRAMEWORKS.JQUERY)
    if (Object.prototype.hasOwnProperty.call(window, 'MooTools')) frameworks.push(FRAMEWORKS.MOOTOOLS)
  } catch (err) {
    // Possibly not supported
  }
  return frameworks
}

function detectReact () {
  try {
    return Object.prototype.hasOwnProperty.call(window, 'React') ||
      Object.prototype.hasOwnProperty.call(window, 'ReactDOM') ||
      Object.prototype.hasOwnProperty.call(window, 'ReactRedux') ||
      document.querySelector('[data-reactroot], [data-reactid]') ||
      (() => {
        const divs = document.querySelectorAll('body > div')
        for (let i = 0; i < divs.length; i++) {
          if (Object.prototype.hasOwnProperty.call(divs[i], '_reactRootContainer')) {
            return true
          }
        }
      })()
  } catch (err) {
    return false
  }
}

function detectAngularJs () {
  try {
    return Object.prototype.hasOwnProperty.call(window, 'angular') ||
      document.querySelector('.ng-binding, [ng-app], [data-ng-app], [ng-controller], [data-ng-controller], [ng-repeat], [data-ng-repeat]') ||
      document.querySelector('script[src*="angular.js"], script[src*="angular.min.js"]')
  } catch (err) {
    return false
  }
}

function detectAngular () {
  try {
    return Object.prototype.hasOwnProperty.call(window, 'ng') ||
      document.querySelector('[ng-version]')
  } catch (err) {
    return false
  }
}
