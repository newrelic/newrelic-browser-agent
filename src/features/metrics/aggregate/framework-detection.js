/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { isBrowserScope } from '../../../common/constants/runtime'

const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key)
const query = (selector) => document.querySelector(selector)

/**
 * Each entry is [name, test, parent?]. The name is reported as `Framework/<name>/Detected`, so adding a framework here is all that is needed.
 * - `test` is either a string, meaning "window has that own property", or a function that returns truthy when the framework is detected.
 * - `parent` is the name of a framework that must also be detected first (e.g. NextJS is only checked when React is detected).
 * Entries must be ordered so that a parent comes before its children.
 * @type {Array<[string, (string|function(): *), string=]>}
 */
const FRAMEWORKS = [
  ['React', () => ['React', 'ReactDOM', 'ReactRedux'].some(key => has(window, key)) || query('[data-reactroot], [data-reactid]') ||
    [...document.querySelectorAll('body > div')].some(div => has(div, '_reactRootContainer'))],
  ['NextJS', () => has(window, 'next') && has(window.next, 'version'), 'React'],
  ['Vue', 'Vue'],
  ['NuxtJS', () => has(window, '$nuxt') && has(window.$nuxt, 'nuxt'), 'Vue'],
  ['Angular', () => has(window, 'ng') || query('[ng-version]')],
  ['AngularUniversal', () => query('[ng-server-context]'), 'Angular'],
  ['Svelte', '__svelte'],
  ['SvelteKit', () => Object.keys(window).some(key => key.startsWith('__sveltekit')), 'Svelte'],
  ['Preact', 'preact'],
  ['PreactSSR', () => query('script[type="__PREACT_CLI_DATA__"]'), 'Preact'],
  ['AngularJS', () => has(window, 'angular') || query('.ng-binding, [ng-app], [data-ng-app], [ng-controller], [data-ng-controller], [ng-repeat], [data-ng-repeat], script[src*="angular.js"], script[src*="angular.min.js"]')],
  ['Backbone', 'Backbone'],
  ['Ember', 'Ember'],
  ['Meteor', 'Meteor'],
  ['Zepto', 'Zepto'],
  ['Jquery', 'jQuery'],
  ['MooTools', 'MooTools'],
  ['Qwik', 'qwikevents'],
  ['Flutter', '_flutter'],
  ['Electron', () => navigator.userAgent.includes('Electron')]
]

/**
 * Detects which supported frameworks are present on the page.
 * @returns {string[]} The names of the detected frameworks. Always empty outside of the main window context.
 */
export function getFrameworks () {
  if (!isBrowserScope) return [] // don't bother detecting frameworks if not in the main window context

  const frameworks = []
  FRAMEWORKS.forEach(([name, test, parent]) => {
    try {
      if ((!parent || frameworks.includes(parent)) && (typeof test === 'string' ? has(window, test) : test())) frameworks.push(name)
    } catch (err) {
      // Possibly not supported
    }
  })
  return frameworks
}
