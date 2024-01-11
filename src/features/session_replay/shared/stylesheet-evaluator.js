import { isBrowserScope } from '../../../common/constants/runtime'

class StylesheetEvaluator {
  #evaluated = new WeakSet()

  /**
   * this works by checking (only ever once) each cssRules obj in the style sheets array. This will throw an error if improperly configured and return `true`. Otherwise returns `false`
   * @returns {boolean}
   */
  evaluate () {
    if (!isBrowserScope) return false
    for (let ss of document.styleSheets) {
      if (!this.#evaluated.has(ss)) {
        this.#evaluated.add(ss)
        try {
        // eslint-disable-next-line
        const temp = ss.cssRules
        } catch (err) {
          return true
        }
      }
    }
    return false
  }
}

export const stylesheetEvaluator = new StylesheetEvaluator()
