import { gosCDN } from './nreum'

export function setTopLevelCallers () {
  const nr = gosCDN()
  const funcs = [
    'setErrorHandler', 'finished', 'addToTrace', 'inlineHit', 'addRelease',
    'addPageAction', 'setCurrentRouteName', 'setPageViewName', 'setCustomAttribute',
    'interaction', 'noticeError'
  ]
  funcs.forEach(f => {
    nr[f] = (...args) => caller(f, ...args)
  })

  function caller (fnName, ...args) {
    let returnVals = []
    Object.values(nr.initializedAgents).forEach(val => {
      if (val.exposed && val.api[fnName]) {
        returnVals.push(val.api[fnName](...args))
      }
    })
    return returnVals.length > 1 ? returnsVals : returnVals[0]
  }
}
