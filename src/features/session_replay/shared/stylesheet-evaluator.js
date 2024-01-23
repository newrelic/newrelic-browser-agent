import { originals } from '../../../common/config/config'
import { isBrowserScope } from '../../../common/constants/runtime'

class StylesheetEvaluator {
  #evaluated = new WeakSet()
  #fetchProms = []
  /**
  * Flipped to true if stylesheets that cannot be natively inlined are detected by the stylesheetEvaluator class
  * Used at harvest time to denote that all subsequent payloads are subject to this and customers should be advised to handle crossorigin decoration
  * */
  invalidStylesheetsDetected = false

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
    if (incompletes.length) this.invalidStylesheetsDetected = true
    return incompletes
  }

  /**
   * Stages fixes for incomplete stylesheet objects supplied as input
   * Resolves promise once all stylesheets have been fetched and overridden
   * @param {*} incompletes
   * @returns {Promise}
   */
  async fix (incompletes = []) {
    const currentBatch = []
    incompletes.forEach(({ ss, i }) => {
      currentBatch.push(fetchAndOverride(document.styleSheets[i], ss.href))
    })
    this.#fetchProms.push(...currentBatch)
    /** await-ing this outer scoped promise all allows other subsequent calls that are made while processing to also have to wait
     * We use this Promise.all() just to know that it is done, not to process the promise contents
    */
    await Promise.all(this.#fetchProms)
    /** This denotes if the current batch had any failures, used by the recorder to set a flag */
    return await Promise.all(currentBatch)
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
  let success = false
  try {
    const cssSheet = new CSSStyleSheet()
    await cssSheet.replace(stylesheetText)
    Object.defineProperty(target, 'cssRules', {
      get () { return cssSheet.cssRules }
    })
    Object.defineProperty(target, 'rules', {
      get () { return cssSheet.rules }
    })
    success = true
  } catch (err) {
    // cant make new dynamic stylesheets, browser likely doesn't support `.replace()`...
    // this is appended in prep of forking rrweb
    Object.defineProperty(target, 'cssText', {
      get () { return stylesheetText }
    })
  }
  return success
}

export const stylesheetEvaluator = new StylesheetEvaluator()
