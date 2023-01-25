import { getFrozenAttributes } from "../../../loaders/features/featureDependencies"

export class Configurable {
  constructor(obj, model) {
    if (!obj || typeof obj !== 'object') return console.error('setting a Configurable requires an object as input')
    if (!model || typeof model !== 'object') return console.error('setting a Configurable requires a model to set its initial properties')
    Object.assign(this, model)
    Object.entries(obj).forEach(([key, value]) => {
      const frozenAttrs = getFrozenAttributes(key)
      if (frozenAttrs.length && value && typeof value === 'object'){
        frozenAttrs.forEach(attr => {
          if (attr in value) {
            console.warn(`New Relic: "${attr}" is a protected attribute and can not be changed in feature ${key}.  It will have no effect.`)
            delete value[attr]
          }
        })
      }
      if (!!value && typeof this[key] === 'object' && typeof value === 'object') this[key] = {...this[key], ...value}
      else this[key] = value
    })
  }
}