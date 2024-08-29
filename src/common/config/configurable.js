import { warn } from '../util/console'

export function getModeledObject (obj, model) {
  try {
    if (!obj || typeof obj !== 'object') return warn(3)
    if (!model || typeof model !== 'object') return warn(4)
    // allow getters and setters to pass from model to target
    const output = Object.create(
      Object.getPrototypeOf(model),
      Object.getOwnPropertyDescriptors(model)
    )
    const target = Object.keys(output).length === 0 ? obj : output
    for (let key in target) {
      if (obj[key] === undefined) continue
      try {
        if (obj[key] === null) { output[key] = null; continue }

        if (Array.isArray(obj[key]) && Array.isArray(model[key])) output[key] = Array.from(new Set([...obj[key], ...model[key]]))
        else if (typeof obj[key] === 'object' && typeof model[key] === 'object') output[key] = getModeledObject(obj[key], model[key])
        else output[key] = obj[key]
      } catch (e) {
        warn(1, e)
      }
    }
    return output
  } catch (err) {
    warn(2, err)
  }
}
