import { getFrozenAttributes } from '../../../loaders/features/featureDependencies'
import { warn } from '../../util/console'

export class Configurable {
  constructor (obj, model) {
    Object.assign(this, setValues(obj, model))
  }
}

function setValues (obj, model) {
  const state = {}
  try {
    if (!obj || typeof obj !== 'object') return warn('New setting a Configurable requires an object as input')
    if (!model || typeof model !== 'object') return warn('Setting a Configurable requires a model to set its initial properties')
    Object.assign(state, model)
    Object.entries(obj).forEach(([key, value]) => {
      if (!Object.keys(model).includes(key)) return
      const frozenAttrs = getFrozenAttributes(key)
      if (frozenAttrs.length && value && typeof value === 'object') {
        frozenAttrs.forEach(attr => {
          if (attr in value) {
            warn(`"${attr}" is a protected attribute and can not be changed in feature ${key}.  It will have no effect.`)
            delete value[attr]
          }
        })
      }
      state[key] = value
    })
    return state
  } catch (err) {
    warn('An error occured while setting a Configurable', err)
  }
}
