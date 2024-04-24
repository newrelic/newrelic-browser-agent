import { warn } from '../../util/console'

export function getModeledObject (obj, model) {
  try {
    if (!obj || typeof obj !== 'object') return warn('Setting a Configurable requires an object as input')
    if (!model || typeof model !== 'object') return warn('Setting a Configurable requires a model to set its initial properties')
    // allow getters and setters to pass from model to target
    const output = Object.create(
      Object.getPrototypeOf(model),
      Object.getOwnPropertyDescriptors(model)
    )
    const target = Object.keys(output).length === 0 ? obj : output
    for (let key in target) {
      if (obj[key] === undefined) continue
      if (obj[key] === null) { output[key] = null; continue }
      try {
        if (Array.isArray(obj[key]) && Array.isArray(model[key])) output[key] = Array.from(new Set([...obj[key], ...model[key]]))
        else if (typeof obj[key] === 'object' && typeof model[key] === 'object') output[key] = getModeledObject(obj[key], model[key])
        else output[key] = obj[key]
      } catch (e) {
        warn('An error occurred while setting a property of a Configurable', e)
      }
    }
    return output
  } catch (err) {
    warn('An error occured while setting a Configurable', err)
  }
}
