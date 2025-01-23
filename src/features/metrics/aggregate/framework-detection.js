/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { isBrowserScope } from '../../../common/constants/runtime'

const FRAMEWORKS = {
  REACT: 'React',
  NEXTJS: 'NextJS',

  VUE: 'Vue',
  NUXTJS: 'NuxtJS',

  ANGULAR: 'Angular',
  ANGULARUNIVERSAL: 'AngularUniversal',

  SVELTE: 'Svelte',
  SVELTEKIT: 'SvelteKit',

  PREACT: 'Preact',
  PREACTSSR: 'PreactSSR',

  ANGULARJS: 'AngularJS',
  BACKBONE: 'Backbone',
  EMBER: 'Ember',
  METEOR: 'Meteor',
  ZEPTO: 'Zepto',
  JQUERY: 'Jquery',
  MOOTOOLS: 'MooTools',
  QWIK: 'Qwik',

  ELECTRON: 'Electron'
}

export function getFrameworks () {
  if (!isBrowserScope) return [] // don't bother detecting frameworks if not in the main window context

  const frameworks = []
  try {
    if (detectReact()) {
      frameworks.push(FRAMEWORKS.REACT)

      if (detectNextJS()) frameworks.push(FRAMEWORKS.NEXTJS)
    }
    if (detectVue()) {
      frameworks.push(FRAMEWORKS.VUE)

      if (detectNuxtJS()) frameworks.push(FRAMEWORKS.NUXTJS)
    }
    if (detectAngular()) {
      frameworks.push(FRAMEWORKS.ANGULAR)

      if (detectAngularUniversal()) frameworks.push(FRAMEWORKS.ANGULARUNIVERSAL)
    }
    if (detectSvelte()) {
      frameworks.push(FRAMEWORKS.SVELTE)

      if (detectSvelteKit()) frameworks.push(FRAMEWORKS.SVELTEKIT)
    }
    if (detectPreact()) {
      frameworks.push(FRAMEWORKS.PREACT)

      if (detectPreactSSR()) frameworks.push(FRAMEWORKS.PREACTSSR)
    }

    if (detectAngularJs()) frameworks.push(FRAMEWORKS.ANGULARJS)
    if (Object.prototype.hasOwnProperty.call(window, 'Backbone')) frameworks.push(FRAMEWORKS.BACKBONE)
    if (Object.prototype.hasOwnProperty.call(window, 'Ember')) frameworks.push(FRAMEWORKS.EMBER)
    if (Object.prototype.hasOwnProperty.call(window, 'Meteor')) frameworks.push(FRAMEWORKS.METEOR)
    if (Object.prototype.hasOwnProperty.call(window, 'Zepto')) frameworks.push(FRAMEWORKS.ZEPTO)
    if (Object.prototype.hasOwnProperty.call(window, 'jQuery')) frameworks.push(FRAMEWORKS.JQUERY)
    if (Object.prototype.hasOwnProperty.call(window, 'MooTools')) frameworks.push(FRAMEWORKS.MOOTOOLS)
    if (Object.prototype.hasOwnProperty.call(window, 'qwikevents')) frameworks.push(FRAMEWORKS.QWIK)

    if (detectElectron()) frameworks.push(FRAMEWORKS.ELECTRON)
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
