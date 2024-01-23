import { originals } from '../../../common/config/config'
import { isBrowserScope } from '../../../common/constants/runtime'

class StylesheetEvaluator {
  #evaluated = new WeakSet()
  #fetchProms = []

  /**
   * this works by checking (only ever once) each cssRules obj in the style sheets array. This will throw an error if improperly configured and return `true`. Otherwise returns `false`
   * @returns {Object[]}
   */
  evaluate () {
    const incompletes = []
    if (isBrowserScope) {
      for (let i = 0; i < Object.keys(document.styleSheets).length; i++) {
        const ss = document.styleSheets[i]
        if (!this.#evaluated.has(ss)) {
          this.#evaluated.add(ss)
          try {
            // eslint-disable-next-line
            const temp = ss.cssRules
          } catch (err) {
            incompletes.push({ ss, i })
          }
        }
      }
    }
    return incompletes
  }

  /**
   * Stages fixes for incomplete stylesheet objects supplied as input
   * Resolves promise once all stylesheets have been fetched and overridden
   * @param {*} incompletes
   * @returns {Promise}
   */
  async fix (incompletes = []) {
    incompletes.forEach(({ ss, i }) => {
      this.#fetchProms.push(fetchAndOverride(document.styleSheets[i], ss.href))
    })
    /** await-ing this outer scoped promise all allows other subsequent calls that are made while processing to also have to wait
     * We use this Promise.all() just to know that it is done, not to process the promise contents
    */
    await Promise.all(this.#fetchProms)
  }
}

/**
 * Fetches stylesheet contents and overrides the target getters
 * @param {*} target - The stylesheet object target - ex. document.styleSheets[0]
 * @param {*} href - The asset href to fetch
 * @returns {Promise}
 */
async function fetchAndOverride (target, href) {
  const stylesheetContents = await originals.FETCH.bind(window)(href)
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
    // cant make new dynamic stylesheets...
    // this is appended in prep of forking rrweb
    Object.defineProperty(target, 'cssText', {
      get () { return stylesheetText }
    })
  }
}

export const stylesheetEvaluator = new StylesheetEvaluator()
