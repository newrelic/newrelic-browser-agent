import { isBrowserScope } from '../../../common/constants/runtime'
import {
  FRAMEWORK_ANGULARJS_DETECTED, FRAMEWORK_ANGULAR_DETECTED, FRAMEWORK_ANGULAR_UNIVERSAL_DETECTED, FRAMEWORK_BACKBONE_DETECTED,
  FRAMEWORK_ELECTRON_DETECTED, FRAMEWORK_EMBER_DETECTED, FRAMEWORK_JQUERY_DETECTED, FRAMEWORK_METEOR_DETECTED,
  FRAMEWORK_MOOTOOLS_DETECTED, FRAMEWORK_NEXTJS_DETECTED, FRAMEWORK_NUXTJS_DETECTED, FRAMEWORK_PREACTSSR_DETECTED,
  FRAMEWORK_PREACT_DETECTED, FRAMEWORK_QWIK_DETECTED, FRAMEWORK_REACT_DETECTED, FRAMEWORK_SVELTEKIT_DETECTED,
  FRAMEWORK_SVELTE_DETECTED, FRAMEWORK_VUE_DETECTED, FRAMEWORK_ZEPTO_DETECTED
} from '../../utils/supportability-metrics'

export function getFrameworks () {
  if (!isBrowserScope) return [] // don't bother detecting frameworks if not in the main window context

  const frameworks = []
  try {
    if (detectReact()) {
      frameworks.push(FRAMEWORK_REACT_DETECTED)

      if (detectNextJS()) frameworks.push(FRAMEWORK_NEXTJS_DETECTED)
    }
    if (detectVue()) {
      frameworks.push(FRAMEWORK_VUE_DETECTED)

      if (detectNuxtJS()) frameworks.push(FRAMEWORK_NUXTJS_DETECTED)
    }
    if (detectAngular()) {
      frameworks.push(FRAMEWORK_ANGULAR_DETECTED)

      if (detectAngularUniversal()) frameworks.push(FRAMEWORK_ANGULAR_UNIVERSAL_DETECTED)
    }
    if (detectSvelte()) {
      frameworks.push(FRAMEWORK_SVELTE_DETECTED)

      if (detectSvelteKit()) frameworks.push(FRAMEWORK_SVELTEKIT_DETECTED)
    }
    if (detectPreact()) {
      frameworks.push(FRAMEWORK_PREACT_DETECTED)

      if (detectPreactSSR()) frameworks.push(FRAMEWORK_PREACTSSR_DETECTED)
    }

    if (detectAngularJs()) frameworks.push(FRAMEWORK_ANGULARJS_DETECTED)
    if (Object.prototype.hasOwnProperty.call(window, 'Backbone')) frameworks.push(FRAMEWORK_BACKBONE_DETECTED)
    if (Object.prototype.hasOwnProperty.call(window, 'Ember')) frameworks.push(FRAMEWORK_EMBER_DETECTED)
    if (Object.prototype.hasOwnProperty.call(window, 'Meteor')) frameworks.push(FRAMEWORK_METEOR_DETECTED)
    if (Object.prototype.hasOwnProperty.call(window, 'Zepto')) frameworks.push(FRAMEWORK_ZEPTO_DETECTED)
    if (Object.prototype.hasOwnProperty.call(window, 'jQuery')) frameworks.push(FRAMEWORK_JQUERY_DETECTED)
    if (Object.prototype.hasOwnProperty.call(window, 'MooTools')) frameworks.push(FRAMEWORK_MOOTOOLS_DETECTED)
    if (Object.prototype.hasOwnProperty.call(window, 'qwikevents')) frameworks.push(FRAMEWORK_QWIK_DETECTED)

    if (detectElectron()) frameworks.push(FRAMEWORK_ELECTRON_DETECTED)
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

function detectNextJS () {
  // React SSR
  try {
    return Object.prototype.hasOwnProperty.call(window, 'next') &&
    Object.prototype.hasOwnProperty.call(window.next, 'version')
  } catch (err) {
    return false
  }
}

function detectVue () {
  try {
    return Object.prototype.hasOwnProperty.call(window, 'Vue')
  } catch (err) {
    return false
  }
}

function detectNuxtJS () {
  // Vue SSR
  try {
    return Object.prototype.hasOwnProperty.call(window, '$nuxt') &&
      Object.prototype.hasOwnProperty.call(window.$nuxt, 'nuxt')
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

function detectAngularUniversal () {
  // Anguler SSR
  try {
    return document.querySelector('[ng-server-context]')
  } catch (err) {
    return false
  }
}

function detectSvelte () {
  try {
    return Object.prototype.hasOwnProperty.call(window, '__svelte')
  } catch (err) {
    return false
  }
}

function detectSvelteKit () {
  // Svelte SSR
  try {
    return !!Object.keys(window).find(prop => prop.startsWith('__sveltekit'))
  } catch (err) {
    return false
  }
}

function detectPreact () {
  try {
    return Object.prototype.hasOwnProperty.call(window, 'preact')
  } catch (err) {
    return false
  }
}

function detectPreactSSR () {
  // Svelte SSR
  try {
    return document.querySelector('script[type="__PREACT_CLI_DATA__"]')
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

function detectElectron () {
  try {
    return typeof navigator === 'object' && typeof navigator.userAgent === 'string' &&
      navigator.userAgent.indexOf('Electron') >= 0
  } catch (err) {
    return false
  }
}
