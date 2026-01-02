/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { gosNREUMOriginals } from '../../../common/window/nreum'
import { isBrowserScope } from '../../../common/constants/runtime'

class StylesheetEvaluator {
  #evaluated = new WeakSet()
  #brokenSheets = []
  /**
  * Flipped to true if stylesheets that cannot be natively inlined are detected by the stylesheetEvaluator class
  * Used at harvest time to denote that all subsequent payloads are subject to this and customers should be advised to handle crossorigin decoration
  * */
  invalidStylesheetsDetected = false
  failedToFix = 0

  /**
   * this works by checking (only ever once) each cssRules obj in the style sheets array. The try/catch will catch an error if the cssRules obj blocks access, triggering the module to try to "fix" the asset`. Returns the count of incomplete assets discovered.
   * @returns {Number}
   */
  evaluate () {
    let incompletes = 0
    this.#brokenSheets = []
    if (isBrowserScope) {
      for (let i = 0; i < Object.keys(document.styleSheets).length; i++) {
        if (!this.#evaluated.has(document.styleSheets[i]) && document.styleSheets[i] instanceof CSSStyleSheet) {
          this.#evaluated.add(document.styleSheets[i])
          try {
            // eslint-disable-next-line
            const temp = document.styleSheets[i].cssRules
          } catch (err) {
            if (!document.styleSheets[i].href) return
            incompletes++
            this.#brokenSheets.push(document.styleSheets[i])
          }
        }
      }
    }
    if (incompletes) this.invalidStylesheetsDetected = true
    return incompletes
  }

  /**
   * Resolves promise once all stylesheets have been fetched and overridden
   * @returns {Promise}
   */
  async fix () {
    await Promise.all(this.#brokenSheets.map(sheet => this.#fetchAndOverride(sheet)))
    this.#brokenSheets = []
    const failedToFix = this.failedToFix
    this.failedToFix = 0
    return failedToFix
  }

  /**
 * Fetches stylesheet contents and overrides the target getters
 * @param {*} target - The stylesheet object target - ex. document.styleSheets[0]
 * @param {*} href - The asset href to fetch
 * @returns {Promise}
 */
  async #fetchAndOverride (target) {
    if (!target?.href) return
    try {
      const stylesheetContents = await gosNREUMOriginals().o.FETCH.bind(window)(target.href)
      if (!stylesheetContents.ok) {
        this.failedToFix++
        return
      }
      const stylesheetText = await stylesheetContents.text()
      try {
        const cssSheet = new CSSStyleSheet()
        await cssSheet.replace(stylesheetText)
        Object.defineProperty(target, 'cssRules', {
          get () { return cssSheet.cssRules }
        })
        Object.defineProperty(target, 'rules', {
          get () { return cssSheet.rules }
        })
      } catch (err) {
      // cant make new dynamic stylesheets, browser likely doesn't support `.replace()`...
      // this is appended in prep of forking rrweb
        Object.defineProperty(target, 'cssText', {
          get () { return stylesheetText }
        })
        this.failedToFix++
      }
    } catch (err) {
    // failed to fetch
      this.failedToFix++
    }
  }
}

export const stylesheetEvaluator = new StylesheetEvaluator()
