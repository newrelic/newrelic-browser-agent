/* eslint-disable prefer-promise-reject-errors */
import helpers from './helpers'
import { ee } from '../../../src/common/event-emitter/contextual-ee'
import { Spa } from '../../../src/features/spa'

const agentIdentifier = 'abcdefg'

jest.mock('../../../src/common/constants/runtime')
jest.mock('../../../src/common/config/info', () => ({
  __esModule: true,
  getInfo: jest.fn().mockReturnValue({ jsAttributes: {} }),
  isValid: jest.fn().mockReturnValue(true)
}))
jest.mock('../../../src/common/config/init', () => ({
  __esModule: true,
  getConfigurationValue: jest.fn()
}))
jest.mock('../../../src/common/util/feature-flags', () => ({
  activatedFeatures: { [agentIdentifier]: { spa: 1 } }
}))
jest.mock('../../../src/common/harvest/harvester')

let spaInstrument, spaAggregate, newrelic
beforeAll(async () => {
  spaInstrument = new Spa({ agentIdentifier, info: {}, init: { spa: { enabled: true } }, runtime: {} })
  await expect(spaInstrument.onAggregateImported).resolves.toEqual(true)
  spaAggregate = spaInstrument.featAggregate
  newrelic = helpers.getNewrelicGlobal(spaAggregate.ee)
})

function afterInteractionDone (validator, done, interaction) {
  expect(interaction.root.end).toBeGreaterThan(0) // interaction should be finished and have an end time
  expect(spaAggregate.state.currentNode?.id).toBeFalsy() // interaction should be null outside of async chain
  validator.validate(interaction)
  done()
}

describe('Promise base', () => {
  test('chains', done => {
    const validator = new helpers.InteractionValidator({
      attrs: {
        trigger: 'click',
        custom: {
          'in-catch': true
        }
      },
      name: 'interaction',
      children: [{
        type: 'customTracer',
        attrs: {
          name: 'timer-in-first-promise'
        },
        children: [{
          type: 'customTracer',
          attrs: {
            name: 'timer-in-second-promise'
          },
          children: [{
            type: 'customTracer',
            attrs: {
              name: 'timer'
            },
            children: []
          }]
        }]
      }]
    })

    helpers.startInteraction(onInteractionStart, afterInteractionDone.bind(null, validator, done), { baseEE: ee.get(agentIdentifier) })

    function onInteractionStart (cb) {
      new Promise(function (resolve, reject) {
        setTimeout(newrelic.interaction().createTracer('timer-in-first-promise', function () {
          resolve(1)
        }), 1)
      }).then(() => {
        return new Promise(function (resolve, reject) {
          setTimeout(newrelic.interaction().createTracer('timer-in-second-promise', function () {
            reject(2)
          }), 2)
        })
      }).catch(function () {}).catch(function () {}).then(() => {
        newrelic.interaction().command('setAttribute', undefined, 'in-catch', true)
        setTimeout(newrelic.interaction().createTracer('timer', cb), 3)
      })
    }
  })
  test('throws in executor', done => {
    const validator = new helpers.InteractionValidator({
      attrs: {
        trigger: 'click'
      },
      name: 'interaction',
      children: [{
        type: 'customTracer',
        attrs: {
          name: 'timer'
        },
        children: []
      }]
    })

    helpers.startInteraction(onInteractionStart, afterInteractionDone.bind(null, validator, done), { baseEE: ee.get(agentIdentifier) })

    function onInteractionStart (cb) {
      const thrownError = new Error('123')
      new Promise(function (resolve, reject) {
        throw thrownError
      }).catch(val => {
        setTimeout(newrelic.interaction().createTracer('timer', function () {
          expect(val).toBe(thrownError)
          cb()
        }))
      })
    }
  })
})

describe('Promise prototype .then', () => {
  test('chains with sync', done => {
    const validator = new helpers.InteractionValidator({
      attrs: {
        trigger: 'click'
      },
      name: 'interaction',
      children: [{
        type: 'customTracer',
        attrs: {
          name: 'timer'
        },
        children: []
      }]
    })

    helpers.startInteraction(onInteractionStart, afterInteractionDone.bind(null, validator, done), { baseEE: ee.get(agentIdentifier) })

    function onInteractionStart (cb) {
      new Promise(function (resolve, reject) {
        resolve(10)
      }).then(val => {
        setTimeout(newrelic.interaction().createTracer('timer', function () {
          expect(val).toEqual(10)
          cb()
        }))
      })
    }
  })
  test('chains with async', done => {
    const validator = new helpers.InteractionValidator({
      attrs: {
        trigger: 'click'
      },
      name: 'interaction',
      children: [{
        type: 'customTracer',
        attrs: {
          name: 'timer'
        },
        children: [{
          type: 'customTracer',
          attrs: {
            name: 'timer'
          },
          children: []
        }]
      }]
    })

    helpers.startInteraction(onInteractionStart, afterInteractionDone.bind(null, validator, done), { baseEE: ee.get(agentIdentifier) })

    function onInteractionStart (cb) {
      Promise.resolve(10).then(function (val) {
        return new Promise(function wait (resolve) {
          setTimeout(newrelic.interaction().createTracer('timer', function () {
            expect(val).toEqual(10)
            resolve(123)
          }), 5)
        })
      }).then(function validate (val) {
        expect(val).toEqual(123)
        setTimeout(newrelic.interaction().createTracer('timer', function () {
          window.location.hash = '#' + Math.random()
          cb()
        }))
      })
    }
  })
  test('chains with async + rejection', done => {
    const validator = new helpers.InteractionValidator({
      attrs: {
        trigger: 'click'
      },
      name: 'interaction',
      children: [{
        type: 'customTracer',
        attrs: {
          name: 'timer'
        },
        children: [{
          type: 'customTracer',
          attrs: {
            name: 'timer'
          },
          children: []
        }]
      }]
    })

    helpers.startInteraction(onInteractionStart, afterInteractionDone.bind(null, validator, done), { baseEE: ee.get(agentIdentifier) })

    function onInteractionStart (cb) {
      Promise.reject(10).then(null, function (val) {
        return new Promise(function wait (resolve, reject) {
          setTimeout(newrelic.interaction().createTracer('timer', function () {
            expect(val).toEqual(10)
            reject(123)
          }), 5)
        })
      }).then(null, function validate (val) {
        expect(val).toEqual(123)
        setTimeout(newrelic.interaction().createTracer('timer', function () {
          cb()
        }))
      })
    }
  })
  test('throws handled', done => {
    const validator = new helpers.InteractionValidator({
      attrs: {
        trigger: 'click'
      },
      name: 'interaction',
      children: [{
        type: 'customTracer',
        attrs: {
          name: 'timer'
        },
        children: []
      }]
    })

    helpers.startInteraction(onInteractionStart, afterInteractionDone.bind(null, validator, done), { baseEE: ee.get(agentIdentifier) })

    function onInteractionStart (cb) {
      const thrownError = new Error(123)
      new Promise(function (resolve, reject) {
        resolve(10)
      }).then(function (val) {
        throw thrownError
      }).catch(function (val) {
        newrelic.interaction().command('setAttribute', undefined, 'foo', 1)
        expect(val).toBe(thrownError)
        setTimeout(newrelic.interaction().createTracer('timer', function () {
          cb()
        }))
      })
    }
  })
  test('multiple sync chains', done => {
    const validator = new helpers.InteractionValidator({
      attrs: {
        trigger: 'click'
      },
      name: 'interaction',
      children: [{
        type: 'customTracer',
        attrs: {
          name: 'timer'
        },
        children: []
      }]
    })

    helpers.startInteraction(onInteractionStart, afterInteractionDone.bind(null, validator, done), { baseEE: ee.get(agentIdentifier) })

    function onInteractionStart (cb) {
      const promise = Promise.resolve(1)
      const rootId = spaAggregate.state.currentNode.id

      promise.then(function (val) {
        expect(val).toEqual(1)
        expect(spaAggregate.state.currentNode?.id).toEqual(rootId)
        return 2
      }).then(function (val) {
        expect(val).toEqual(2)
        expect(spaAggregate.state.currentNode?.id).toEqual(rootId)
        return 3
      }).then(function (val) {
        expect(val).toEqual(3)
        expect(spaAggregate.state.currentNode?.id).toEqual(rootId)
      })

      promise.then(function (val) {
        expect(val).toEqual(1)
        expect(spaAggregate.state.currentNode?.id).toEqual(rootId)
        return 4
      }).then(function (val) {
        expect(val).toEqual(4)
        expect(spaAggregate.state.currentNode?.id).toEqual(rootId)
        return 5
      }).then(function (val) {
        expect(val).toEqual(5)
        expect(spaAggregate.state.currentNode?.id).toEqual(rootId)
        setTimeout(newrelic.interaction().createTracer('timer', function () {
          cb()
        }))
      })
    }
  })
})

describe('Promise prototype .catch', () => {
  test('chains with sync', done => {
    const validator = new helpers.InteractionValidator({
      attrs: {
        trigger: 'click'
      },
      name: 'interaction',
      children: [{
        type: 'customTracer',
        attrs: {
          name: 'timer'
        },
        children: []
      }]
    })

    helpers.startInteraction(onInteractionStart, afterInteractionDone.bind(null, validator, done), { baseEE: ee.get(agentIdentifier) })

    function onInteractionStart (cb) {
      new Promise(function (resolve, reject) {
        reject(10)
      }).catch(function (val) {
        setTimeout(newrelic.interaction().createTracer('timer', function () {
          expect(val).toEqual(10)
          cb()
        }))
      })
    }
  })
  test('chains with async', done => {
    const validator = new helpers.InteractionValidator({
      attrs: {
        trigger: 'click'
      },
      name: 'interaction',
      children: [{
        type: 'customTracer',
        attrs: {
          name: 'timer'
        },
        children: [{
          type: 'customTracer',
          attrs: {
            name: 'timer'
          },
          children: []
        }]
      }]
    })

    helpers.startInteraction(onInteractionStart, afterInteractionDone.bind(null, validator, done), { baseEE: ee.get(agentIdentifier) })

    function onInteractionStart (cb) {
      Promise.reject(10).catch(function (val) {
        return new Promise(function wait (resolve, reject) {
          setTimeout(newrelic.interaction().createTracer('timer', function () {
            expect(val).toEqual(10)
            reject(123)
          }), 5)
        })
      }).catch(function validate (val) {
        expect(val).toEqual(123)
        setTimeout(newrelic.interaction().createTracer('timer', function () {
          cb()
        }))
      })
    }
  })
  test('throws handled', done => {
    const validator = new helpers.InteractionValidator({
      attrs: {
        trigger: 'click'
      },
      name: 'interaction',
      children: [{
        type: 'customTracer',
        attrs: {
          name: 'timer'
        },
        children: []
      }]
    })

    helpers.startInteraction(onInteractionStart, afterInteractionDone.bind(null, validator, done), { baseEE: ee.get(agentIdentifier) })

    function onInteractionStart (cb) {
      const thrownError = new Error(123)
      new Promise(function (resolve, reject) {
        reject(10)
      }).catch(function (val) {
        throw thrownError
      }).catch(function (val) {
        expect(val).toBe(thrownError)
        setTimeout(newrelic.interaction().createTracer('timer', function () {
          cb()
        }))
      })
    }
  })
})

describe('Promise.resolve', () => {
  test('yields correct value', done => {
    const validator = new helpers.InteractionValidator({
      attrs: {
        trigger: 'click'
      },
      name: 'interaction',
      children: [{
        type: 'customTracer',
        attrs: {
          name: 'timer'
        },
        children: []
      }]
    })

    helpers.startInteraction(onInteractionStart, afterInteractionDone.bind(null, validator, done), { baseEE: ee.get(agentIdentifier) })

    function onInteractionStart (cb) {
      Promise.resolve(10).then(function (val) {
        setTimeout(newrelic.interaction().createTracer('timer', function () {
          expect(val).toEqual(10)
          cb()
        }))
      })
    }
  })
  test('works with Promise argument', done => {
    const validator = new helpers.InteractionValidator({
      attrs: {
        trigger: 'click'
      },
      name: 'interaction',
      children: [{
        type: 'customTracer',
        attrs: {
          name: 'timer'
        },
        children: [{
          type: 'customTracer',
          attrs: {
            name: 'timer'
          },
          children: []
        }]
      }]
    })

    helpers.startInteraction(onInteractionStart, afterInteractionDone.bind(null, validator, done), { baseEE: ee.get(agentIdentifier) })

    function onInteractionStart (cb) {
      const p0 = new Promise(function (resolve, reject) {
        setTimeout(newrelic.interaction().createTracer('timer', function () {
          resolve(123)
        }))
      })

      Promise.resolve(p0).then(function (val) {
        setTimeout(newrelic.interaction().createTracer('timer', function () {
          expect(val).toEqual(123)
          cb()
        }))
      })
    }
  })
})

test('Promise.reject yields correct value', done => {
  const validator = new helpers.InteractionValidator({
    attrs: {
      trigger: 'click'
    },
    name: 'interaction',
    children: [{
      type: 'customTracer',
      attrs: {
        name: 'timer'
      },
      children: []
    }]
  })

  helpers.startInteraction(onInteractionStart, afterInteractionDone.bind(null, validator, done), { baseEE: ee.get(agentIdentifier) })

  function onInteractionStart (cb) {
    Promise.reject(10).catch(function (val) {
      setTimeout(newrelic.interaction().createTracer('timer', function () {
        expect(val).toEqual(10)
        cb()
      }))
    })
  }
})

describe('Promise.all', () => {
  test('yields correct value', done => {
    const validator = new helpers.InteractionValidator({
      attrs: {
        trigger: 'click'
      },
      name: 'interaction',
      children: [{
        type: 'customTracer',
        attrs: {
          name: 'timer'
        },
        children: []
      }]
    })

    helpers.startInteraction(onInteractionStart, afterInteractionDone.bind(null, validator, done), { baseEE: ee.get(agentIdentifier) })

    function onInteractionStart (cb) {
      const a = Promise.resolve(123)
      const b = Promise.resolve(456)
      Promise.all([a, b]).then(function (val) {
        setTimeout(newrelic.interaction().createTracer('timer', function () {
          expect(val).toEqual([123, 456])
          cb()
        }))
      })
    }
  })
  test('async resolves after rejected', done => {
    const validator = new helpers.InteractionValidator({
      attrs: {
        trigger: 'click'
      },
      name: 'interaction',
      children: [
        {
          type: 'customTracer',
          attrs: {
            name: 'timer'
          },
          children: [{
            type: 'customTracer',
            attrs: {
              name: 'timer'
            },
            children: []
          }]
        },
        {
          type: 'customTracer',
          attrs: {
            name: 'timer'
          },
          children: []
        }
      ]
    })

    helpers.startInteraction(onInteractionStart, afterInteractionDone.bind(null, validator, done), { baseEE: ee.get(agentIdentifier) })

    function onInteractionStart (cb) {
      const a = Promise.reject(123)
      let idOnReject
      const b = new Promise(function (resolve) {
        setTimeout(newrelic.interaction().createTracer('timer', function () {
          resolve(456)
          setTimeout(newrelic.interaction().createTracer('timer', function () {
            promise.catch(function (val) {
              expect(val).toEqual(123) // should get reject value in delayed catch
              expect(spaAggregate.state.currentNode?.id).toEqual(idOnReject) // should have same node id as other catch
              cb()
            })
          }), 20)
        }), 10)
      })
      const promise = Promise.all([a, b])

      promise.catch(function (val) {
        idOnReject = spaAggregate.state.currentNode.id
        setTimeout(newrelic.interaction().createTracer('timer', function () {
          expect(val).toEqual(123)
        }))
      })
    }
  })
})

describe('Promise.race', () => {
  test('yields correct value', done => {
    const validator = new helpers.InteractionValidator({
      attrs: {
        trigger: 'click'
      },
      name: 'interaction',
      children: [{
        type: 'customTracer',
        attrs: {
          name: 'timer'
        },
        children: []
      }]
    })

    helpers.startInteraction(onInteractionStart, afterInteractionDone.bind(null, validator, done), { baseEE: ee.get(agentIdentifier) })

    function onInteractionStart (cb) {
      const a = Promise.resolve(123)
      const b = Promise.resolve(456)
      Promise.race([a, b]).then(function (val) {
        setTimeout(newrelic.interaction().createTracer('timer', function () {
          expect(val).toEqual(123)
          cb()
        }))
      })
    }
  })
  test('async accept', done => {
    const validator = new helpers.InteractionValidator({
      attrs: {
        trigger: 'click'
      },
      name: 'interaction',
      children: [{
        type: 'customTracer',
        attrs: {
          name: 'timer'
        },
        children: []
      }, {
        type: 'customTracer',
        attrs: {
          name: 'timer'
        },
        children: [{
          type: 'customTracer',
          attrs: {
            name: 'timer'
          },
          children: []
        }]
      }]
    })

    helpers.startInteraction(onInteractionStart, afterInteractionDone.bind(null, validator, done), { baseEE: ee.get(agentIdentifier) })

    function onInteractionStart (cb) {
      let idOnAccept
      const a = new Promise(function (resolve) {
        setTimeout(newrelic.interaction().createTracer('timer', function () {
          idOnAccept = spaAggregate.state.currentNode.id
          resolve(123)
        }), 5)
      })
      const b = new Promise(function (resolve, reject) {
        setTimeout(newrelic.interaction().createTracer('timer', function () {
          reject(456)
          setTimeout(newrelic.interaction().createTracer('timer', function () {
            promise.then(function (val) {
              expect(val).toEqual(123) // should get accept value in delayed then
              expect(spaAggregate.state.currentNode?.id).toEqual(idOnAccept) // should have same node id as accept
              cb()
            })
          }), 20)
        }), 10)
      })

      const promise = Promise.race([a, b])
    }
  })
})
