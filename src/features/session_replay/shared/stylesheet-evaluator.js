import { originals } from '../../../common/config/config'
import { isBrowserScope } from '../../../common/constants/runtime'

class StylesheetEvaluator {
  #evaluated = new WeakSet()
  #fetchProms = []

  /**
   * this works by checking (only ever once) each cssRules obj in the style sheets array. This will throw an error if improperly configured and return `true`. Otherwise returns `false`
   * @returns {boolean}
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

  async fix (incompletes = []) {
    incompletes.forEach(({ ss, i }) => {
      this.#fetchProms.push(originals.FETCH.bind(window)(ss.href).then(r => r.text()).then(cssText => {
        const cssSheet = new CSSStyleSheet()
        cssSheet.replaceSync(cssText)
        Object.defineProperty(document.styleSheets[i], 'cssRules', {
          get () { return cssSheet.cssRules }
        })
        Object.defineProperty(document.styleSheets[i], 'rules', {
          get () { return cssSheet.rules }
        })
      }))
    })
    await Promise.all(this.#fetchProms)
  }
}

export const stylesheetEvaluator = new StylesheetEvaluator()
