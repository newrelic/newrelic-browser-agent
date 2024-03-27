import helpers from './helpers'
import { Aggregator } from '../../../common/aggregate/aggregator'
import { ee } from '../../../common/event-emitter/contextual-ee'
import { Spa } from '../index'
import { now } from '../../../common/timing/now'
import { getInfo, originals } from '../../../common/config/config'

jest.mock('../../../common/constants/runtime', () => ({
  __esModule: true,
  isBrowserScope: true,
  globalScope: global
}))
jest.mock('../../../common/config/config', () => ({
  __esModule: true,
  getConfigurationValue: jest.fn(),
  originals: {
    ST: setTimeout,
    CT: clearTimeout
  },
  getRuntime: jest.fn().mockReturnValue({ xhrWrappable: true }),
  isConfigured: jest.fn().mockReturnValue(true),
  getInfo: jest.fn()
}))

let spaInstrument, spaAggregate, newrelic, ixn_context, mockCurrentInfo
const INTERACTION_API = 'api-ixn-'
const agentIdentifier = 'abcdefg'
beforeAll(async () => {
  mockCurrentInfo = { jsAttributes: {} }
  getInfo.mockReturnValue(mockCurrentInfo)

  const aggregator = new Aggregator({ agentIdentifier, ee })
  spaInstrument = new Spa(agentIdentifier, aggregator)
  await expect(spaInstrument.onAggregateImported).resolves.toEqual(true)
  spaAggregate = spaInstrument.featAggregate
  spaAggregate.blocked = true
  spaAggregate.drain()
  const tracerEE = spaInstrument.ee.get('tracer')

  newrelic = {
    interaction: function (cmd, customTime = now(), ...args) { ixn_context = spaAggregate.ee.emit(INTERACTION_API + cmd, [customTime, ...args], ixn_context); return this },
    createTracer: function (name, cb) {
      const contextStore = {}; const hasCb = typeof cb === 'function'
      spaAggregate.ee.emit(INTERACTION_API + 'tracer', [now(), name, contextStore], ixn_context)
      return function () {
        tracerEE.emit((hasCb ? '' : 'no-') + 'fn-start', [now(), ixn_context, hasCb], contextStore)
        if (hasCb) {
          try {
            return cb.apply(this, arguments)
          } catch (err) {
            tracerEE.emit('fn-err', [arguments, this, err], contextStore)
            // the error came from outside the agent, so don't swallow
            throw err
          } finally {
            tracerEE.emit('fn-end', [now()], contextStore)
          }
        }
      }
    },
    setCustomAttribute: function (key, value) { mockCurrentInfo.jsAttributes[key] = value }
  }
})
beforeEach(() => {
  mockCurrentInfo.jsAttributes = {}
})

function afterInteractionDone1 (spaAggregate, validator, resolve, interaction) {
  expect(interaction.root.end).toBeTruthy() // interaction should be finished and have an end time
  expect(spaAggregate.state.currentNode?.id).toBeFalsy() // interaction should be null outside of async chain'
  validator.validate(interaction)
  resolve()
}
function afterInteractionDone2 (spaAggregate, validator, resolve, interaction) {
  expect(interaction.root.end).toBeTruthy()
  expect(spaAggregate.state.currentNode?.id).toBeFalsy()
  expect(interaction.ignored).toBeFalsy() // interaction should not be ignored
  validator.validate(interaction)
  resolve()
}

test('simple sync api test', async () => {
  const validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {
      custom: {
        'in-function-1': true,
        'in-function-2': true,
        'click-handler': true
      }
    },
    children: [
      {
        name: 'customTracer',
        attrs: {
          name: 'function 1'
        },
        children: []
      },
      {
        name: 'customTracer',
        attrs: {
          name: 'function 2'
        },
        children: []
      }
    ]
  })

  await new Promise(resolve => {
    helpers.startInteraction(onInteractionStart, afterInteractionDone1.bind(null, spaAggregate, validator, resolve), { baseEE: ee.get(agentIdentifier), newrelic })

    function onInteractionStart (cb) {
      const interaction = newrelic.interaction('get').interaction('setAttribute', undefined, 'click-handler', true)

      const val1 = interaction.createTracer('function 1', (val) => {
        interaction.interaction('setAttribute', undefined, 'in-function-1', true)
        expect(val).toEqual(123)
        return val * 2
      })(123)

      const val2 = interaction.createTracer('function 2', (val) => {
        interaction.interaction('setAttribute', undefined, 'in-function-2', true)
        expect(val).toEqual(456)
        return val * 2
      })(456)

      expect(val1).toEqual(246)
      expect(val2).toEqual(912)
      cb()
    }
  })
})

test('simple async api test', async () => {
  const validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {
      custom: {
        'raf-cb': true
      }
    },
    children: [
      {
        name: 'customTracer',
        attrs: {
          name: 'requestAnimationFrame'
        },
        children: []
      }
    ]
  })

  await new Promise(resolve => {
    helpers.startInteraction(onInteractionStart, afterInteractionDone1.bind(null, spaAggregate, validator, resolve), { baseEE: ee.get(agentIdentifier), newrelic })

    function onInteractionStart (cb) {
      const tracer = newrelic.interaction('get').createTracer('requestAnimationFrame', function () {
        newrelic.interaction('get').interaction('setAttribute', undefined, 'raf-cb', true)
        return 123
      })
      requestAnimationFrame(() => {
        expect(tracer()).toEqual(123)
        cb()
      })
    }
  })
})

test('async api no callback', async () => {
  const validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {
      custom: {
        'setTimeout-cb': true
      }
    },
    children: [
      {
        name: 'customTracer',
        attrs: {
          name: 'custom-async'
        },
        children: []
      }
    ]
  })

  await new Promise(resolve => {
    helpers.startInteraction(onInteractionStart, afterInteractionDone1.bind(null, spaAggregate, validator, resolve), { baseEE: ee.get(agentIdentifier), newrelic })

    function onInteractionStart (cb) {
      const asyncDone = newrelic.interaction('get').createTracer('custom-async')

      originals.ST(asyncDone, 5)
      setTimeout(function () {
        newrelic.interaction('get').interaction('setAttribute', undefined, 'setTimeout-cb', true)
        cb()
      }, 5)
    }
  })
})

test('async api outside interaction', async () => {
  const tracer = newrelic.interaction('get').createTracer('requestAnimationFrame', function (a, b, c) {
    expect(a).toEqual(1)
    expect(b).toEqual(2)
    expect(c).toEqual(3)
    return 123
  })

  await new Promise(resolve => {
    setTimeout(() => {
      expect(tracer(1, 2, 3)).toEqual(123)
      resolve()
    }, 5)
  })
})

test('sync api outside interaction', async () => {
  const returnVal = newrelic.interaction('get').createTracer('function 1', (a, b, c) => {
    expect(a).toEqual(1)
    expect(b).toEqual(2)
    expect(c).toEqual(3)
    return 456
  })(1, 2, 3)

  expect(returnVal).toEqual(456)
})

test('async api outside interaction with throw', async () => {
  const expected = new Error()
  const tracer = newrelic.interaction('get').createTracer('requestAnimationFrame', function (a, b, c) {
    expect(a).toEqual(1)
    expect(b).toEqual(2)
    expect(c).toEqual(3)
    throw expected
  })

  try {
    tracer(1, 2, 3)
  } catch (err) {
    expect(err).toEqual(expected)
  }
})

test('sync api outside interaction with throw', async () => {
  const expected = new Error()

  try {
    newrelic.interaction('get').createTracer('function 1', (a, b, c) => {
      expect(a).toEqual(1)
      expect(b).toEqual(2)
      expect(c).toEqual(3)
      throw expected
    })(1, 2, 3)
  } catch (err) {
    expect(err).toEqual(expected)
  }
})

test('simple sync api test with throw', async () => {
  const expected = new Error()
  const validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {
      custom: {
        'setTimeout-cb': true
      }
    },
    children: [
      {
        name: 'customTracer',
        attrs: {
          name: 'function 1'
        },
        children: []
      }
    ]
  })

  await new Promise(resolve => {
    helpers.startInteraction(onInteractionStart, afterInteractionDone1.bind(null, spaAggregate, validator, resolve), { baseEE: ee.get(agentIdentifier), newrelic })

    function onInteractionStart (cb) {
      try {
        newrelic.interaction('get').createTracer('function 1', (val) => {
          setTimeout(() => {
            newrelic.interaction('get').interaction('setAttribute', undefined, 'setTimeout-cb', true)
            expect(val).toEqual(123)
            cb()
          }, 5)
          throw expected
        })(123)
      } catch (err) {
        expect(err).toEqual(expected)
      }
    }
  })
})

test('simple async api test with throw', async () => {
  const expected = new Error()
  const validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {
      custom: {
        'setTimeout-cb': true
      }
    },
    children: [
      {
        name: 'customTracer',
        attrs: {
          name: 'requestAnimationFrame'
        },
        children: []
      }
    ]
  })

  await new Promise(resolve => {
    helpers.startInteraction(onInteractionStart, afterInteractionDone1.bind(null, spaAggregate, validator, resolve), { baseEE: ee.get(agentIdentifier), newrelic })

    function onInteractionStart (cb) {
      const tracer = newrelic.interaction('get').createTracer('requestAnimationFrame', function () {
        setTimeout(function () {
          newrelic.interaction('get').interaction('setAttribute', undefined, 'setTimeout-cb', true)
          cb()
        }, 5)
        throw expected
      })

      requestAnimationFrame(() => {
        try {
          tracer()
        } catch (err) {
          expect(err).toEqual(expected)
        }
      })
    }
  })
})

test('async api test with throw does not leave context', async () => {
  const expected = new Error()
  const validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {
      custom: {
        'setTimeout-cb': true
      }
    },
    children: [
      {
        name: 'customTracer',
        attrs: {
          name: 'requestAnimationFrame'
        },
        children: []
      }
    ]
  })

  await new Promise(resolve => {
    helpers.startInteraction(onInteractionStart, afterInteractionDone1.bind(null, spaAggregate, validator, resolve), { baseEE: ee.get(agentIdentifier), newrelic })

    function onInteractionStart (cb) {
      const tracer = newrelic.interaction('get').createTracer('requestAnimationFrame', function () {
        throw expected
      })

      setTimeout(() => {
        try {
          tracer()
        } catch (err) {
          expect(err).toEqual(expected)
        }
        setTimeout(function () {
          newrelic.interaction('get').interaction('setAttribute', undefined, 'setTimeout-cb', true)
          cb()
        })
      }, 5)
    }
  })
})

test('simple sync api test with throw and sibling', async () => {
  const expected = new Error()
  const validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {
      custom: {
        'sibling-setTimeout-cb': true,
        'nested-setTimeout-cb': true
      }
    },
    children: [
      {
        type: 'customTracer',
        attrs: {
          name: 'function 1'
        },
        children: [{
          type: 'customTracer',
          attrs: {
            name: 'nested-child'
          },
          children: []
        }]
      }, {
        type: 'customTracer',
        attrs: {
          name: 'sibling-child'
        },
        children: []
      }
    ]
  })

  await new Promise(resolve => {
    helpers.startInteraction(onInteractionStart, afterInteractionDone1.bind(null, spaAggregate, validator, resolve), { baseEE: ee.get(agentIdentifier), newrelic })

    function onInteractionStart (cb) {
      try {
        newrelic.interaction('get').createTracer('function 1', (val) => {
          setTimeout(() => {
            expect(val).toEqual(123)
            newrelic.interaction('get').interaction('setAttribute', undefined, 'nested-setTimeout-cb', true)
            newrelic.interaction('get').createTracer('nested-child')()
          })
          throw expected
        })(123)
      } catch (err) {
        expect(err).toEqual(expected)
      }

      setTimeout(function () {
        newrelic.interaction('get').interaction('setAttribute', undefined, 'sibling-setTimeout-cb', true)
        newrelic.interaction('get').createTracer('sibling-child')()
        cb()
      }, 5)
    }
  })
})

test('end interaction', async () => {
  const validator = new helpers.InteractionValidator({
    name: 'interaction',
    children: [{
      name: 'customEnd',
      children: []
    }]
  })

  await new Promise(resolve => {
    helpers.startInteraction(onInteractionStart, afterInteractionDone1.bind(null, spaAggregate, validator, resolve), { baseEE: ee.get(agentIdentifier), newrelic })

    function onInteractionStart (cb) {
      setTimeout(() => {
        setTimeout(newrelic.interaction('get').createTracer('wont-be-added'))
        cb()
        newrelic.interaction('get').interaction('end')
      }, 5)
    }
  })
})

test('custom interaction name', async () => {
  const validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {
      customName: 'salt water taffy'
    },
    children: []
  })

  await new Promise(resolve => {
    helpers.startInteraction(onInteractionStart, afterInteractionDone1.bind(null, spaAggregate, validator, resolve), { baseEE: ee.get(agentIdentifier), newrelic })

    function onInteractionStart (cb) {
      setTimeout(() => {
        newrelic.interaction('get').interaction('setName', undefined, 'salt water taffy')
        cb()
      }, 5)
    }
  })
})

test('custom actionText', async () => {
  const validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {
      custom: {
        actionText: 'Albertosaurus'
      }
    },
    children: []
  })

  await new Promise(resolve => helpers.startInteraction(onInteractionStart, afterInteractionDone1.bind(null, spaAggregate, validator, resolve), { baseEE: ee.get(agentIdentifier), newrelic }))

  function onInteractionStart (cb) {
    setTimeout(() => {
      newrelic.interaction('get').interaction('actionText', undefined, 'Albertosaurus')
      cb()
    }, 5)
  }
})

test('ignore interaction', async () => {
  const validator = new helpers.InteractionValidator({
    name: 'interaction',
    children: []
  })

  await new Promise(resolve => {
    helpers.startInteraction(onInteractionStart, afterInteractionDone, { baseEE: ee.get(agentIdentifier), newrelic })

    function onInteractionStart (cb) {
      setTimeout(() => {
        setTimeout(() => null)
        cb()
        newrelic.interaction('get').interaction('ignore')
      }, 5)
    }
    function afterInteractionDone (interaction) {
      expect(interaction.root.end).toBeTruthy()
      expect(spaAggregate.state.currentNode?.id).toBeFalsy()
      expect(interaction.ignored).toBeTruthy() // interaction should be ignored
      validator.validate(interaction)
      resolve()
    }
  })
})

test('custom attributes', async () => {
  const validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {
      custom: {
        'interaction-float': 123.456,
        'interaction-string': '123',
        'interaction-true': true,
        'interaction-false': false,
        'interaction-null': null
      }
    },
    children: []
  })

  await new Promise(resolve => helpers.startInteraction(onInteractionStart, afterInteractionDone2.bind(null, spaAggregate, validator, resolve), { baseEE: ee.get(agentIdentifier), newrelic }))

  function onInteractionStart (cb) {
    newrelic.interaction('get').interaction('setAttribute', undefined, 'interaction-float', 123.456)
    newrelic.interaction('get').interaction('setAttribute', undefined, 'interaction-string', '123')
    newrelic.interaction('get').interaction('setAttribute', undefined, 'interaction-true', true)
    newrelic.interaction('get').interaction('setAttribute', undefined, 'interaction-false', false)
    newrelic.interaction('get').interaction('setAttribute', undefined, 'interaction-null', null)
    setTimeout(cb, 5)
  }
})

test('custom attributes and interaction attributes', async () => {
  const validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {
      custom: {
        inside: 0,
        customOutside: 'true',
        customInside: 'true',
        override: 'true'
      }
    },
    children: []
  })

  newrelic.interaction('get').interaction('setAttribute', undefined, 'outside', 'true')
  newrelic.setCustomAttribute('customOutside', 'true')
  newrelic.setCustomAttribute('override', 'false')
  await new Promise(resolve => helpers.startInteraction(onInteractionStart, afterInteractionDone2.bind(null, spaAggregate, validator, resolve), { baseEE: ee.get(agentIdentifier), newrelic }))

  function onInteractionStart (cb) {
    newrelic.interaction('get').interaction('setAttribute', undefined, 'inside', 0)
    newrelic.setCustomAttribute('inside', 1)
    newrelic.setCustomAttribute('customInside', 'true')
    newrelic.setCustomAttribute('override', 'true')
    setTimeout(cb, 5)
  }
})

test('context store and onEnd', async () => {
  const validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {
      custom: {
        foo: 'bar',
        otherFoo: 'bar'
      }
    },
    children: [{
      type: 'customTracer',
      attrs: {
        name: 'setTimeout'
      }
    }]
  })

  await new Promise(resolve => helpers.startInteraction(onInteractionStart, afterInteractionDone2.bind(null, spaAggregate, validator, resolve), { baseEE: ee.get(agentIdentifier), newrelic }))

  function onInteractionStart (cb) {
    let contextStore = null
    newrelic.interaction('get').interaction('getContext', undefined, function (ctx) {
      contextStore = ctx
      contextStore.foo = 'bar'
    })
    setTimeout(newrelic.interaction('get').createTracer('setTimeout', function () {
      newrelic.interaction('get').interaction('getContext', undefined, function (ctx) {
        expect(contextStore).toEqual(ctx) // should get right context in timeout
        newrelic.interaction('get').interaction('getContext', undefined, function (ctx) {
          newrelic.interaction('get').interaction('setAttribute', undefined, 'foo', ctx.foo)
          cb()
        })
      })
    }), 5)

    newrelic.interaction('get').interaction('onEnd', undefined, (ctx) => {
      expect(contextStore).toEqual(ctx) // should get right context on end
      newrelic.interaction('get').interaction('setAttribute', undefined, 'otherFoo', ctx.foo)
    })
  }
})

test('save', async () => {
  const validator = new helpers.InteractionValidator({
    name: 'interaction',
    children: []
  })

  await new Promise(resolve => {
    helpers.startInteraction(onInteractionStart, afterInteractionDone, { baseEE: ee.get(agentIdentifier), newrelic })

    function onInteractionStart (cb) {
      newrelic.interaction('get').interaction('save')
      cb()
    }
    function afterInteractionDone (interaction) {
      expect(interaction.save).toBeTruthy()
      validator.validate(interaction)
      resolve()
    }
  })
})

test('save with ignore', async () => {
  const validator = new helpers.InteractionValidator({
    name: 'interaction',
    children: []
  })

  await new Promise(resolve => {
    helpers.startInteraction(onInteractionStart, afterInteractionDone, { baseEE: ee.get(agentIdentifier), newrelic })

    function onInteractionStart (cb) {
      newrelic.interaction('get').interaction('ignore')
      newrelic.interaction('get').interaction('save')
      cb()
    }
    function afterInteractionDone (interaction) {
      expect(interaction.save).toBeTruthy()
      expect(interaction.ignored).toBeTruthy()
      validator.validate(interaction)
      resolve()
    }
  })
})

test('save with ignore after', async () => {
  const validator = new helpers.InteractionValidator({
    name: 'interaction',
    children: []
  })

  await new Promise(resolve => {
    helpers.startInteraction(onInteractionStart, afterInteractionDone, { baseEE: ee.get(agentIdentifier), newrelic })

    function onInteractionStart (cb) {
      newrelic.interaction('get').interaction('save')
      newrelic.interaction('get').interaction('ignore')
      cb()
    }
    function afterInteractionDone (interaction) {
      expect(interaction.save).toBeTruthy()
      expect(interaction.ignored).toBeTruthy()
      validator.validate(interaction)
      resolve()
    }
  })
})

test('interaction outside interaction', async () => {
  const validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {
      trigger: 'api',
      custom: {
        included: true,
        delayed: true
      }
    },
    children: [{
      type: 'customTracer',
      attrs: {
        name: 'timeout'
      },
      children: []
    }]
  })

  await new Promise(resolve => {
    setTimeout(function () {
      const interaction = newrelic.interaction('get')

      helpers.startInteraction(onInteractionStart, afterInteractionDone2.bind(null, spaAggregate, validator, resolve), {
        baseEE: ee.get(agentIdentifier),
        newrelic,
        eventType: 'api',
        handle: interaction
      })
    }, 0)

    setTimeout(function () {
      newrelic.interaction('get').interaction('setAttribute', undefined, 'excluded', true)
    })
  })

  function onInteractionStart (cb) {
    newrelic.interaction('get').interaction('setAttribute', undefined, 'included', true)
    setTimeout(function () {
      newrelic.interaction('get').interaction('setAttribute', undefined, 'delayed', true)
      setTimeout(newrelic.interaction('get').createTracer('timeout', cb))
    }, 50)
  }
})

// test('interaction outside wrapped function', async () => {

//   const validator = new helpers.InteractionValidator({
//     name: 'interaction',
//     attrs: {
//       trigger: 'api',
//       custom: {
//         delayed: true,
//         included: true
//       }
//     },
//     children: [{
//       type: 'customTracer',
//       attrs: {
//         name: 'outer'
//       },
//       children: [{
//         type: 'customTracer',
//         attrs: {
//           name: 'timeout'
//         },
//         children: []
//       }]
//     }]
//   })

//   setTimeout[`nr@original:${bundleId}`].call(window, function () {
//     var interaction = newrelic.interaction('get')

//     await new Promise(resolve => helpers.startInteraction(onInteractionStart, afterInteractionDone2.bind(null, spaAggregate, validator, resolve), { baseEE: ee.get(agentIdentifier), newrelic,
//       eventType: 'api',
//       handle: interaction
//     }) )

//     function onInteractionStart (cb) {
//       newrelic.interaction('get').interaction('setAttribute', undefined, 'alsoExcluded', true)
//       interaction.interaction('setAttribute', undefined, 'included', true)
//       setTimeout(interaction.createTracer('outer', function () {
//         newrelic.interaction('get').interaction('setAttribute', undefined, 'delayed', true)
//         setTimeout(newrelic.interaction('get').createTracer('timeout', cb))
//       }), 50)
//     }
//   }, 0)

//   setTimeout(function () {
//     newrelic.interaction('get').interaction('setAttribute', undefined, 'excluded', true)
//   })

// })

// test('set trigger', async () => {

//   const validator = new helpers.InteractionValidator({
//     name: 'interaction',
//     attrs: {
//       trigger: 'bar',
//       customName: 'foo'
//     },
//     children: [{
//       type: 'customTracer',
//       attrs: {
//         name: 'timeout'
//       },
//       children: []
//     }]
//   })

//   await new Promise(resolve => helpers.startInteraction(onInteractionStart, afterInteractionDone2.bind(null, spaAggregate, validator, resolve), { baseEE: ee.get(agentIdentifier), newrelic }) )

//   function onInteractionStart (cb) {
//     newrelic.interaction('get').interaction('setName', undefined, 'foo', 'foo')
//     setTimeout(newrelic.interaction('get').createTracer('timeout', function () {
//       newrelic.interaction('get').interaction('setName', undefined, null, 'bar')
//       cb()
//     }), 50)
//   }

//   setTimeout(function () {
//     newrelic.interaction('get').interaction('setAttribute', undefined, 'excluded', true)
//   })

// })

// test('createTracer no name', async () => {

//   const validator = new helpers.InteractionValidator({
//     name: 'interaction',
//     attrs: {
//       custom: {
//         foo: 'bar'
//       }
//     },
//     children: [{
//       type: 'customTracer',
//       attrs: {
//         name: 'timeout'
//       },
//       children: []
//     }]
//   })

//   await new Promise(resolve => helpers.startInteraction(onInteractionStart, afterInteractionDone2.bind(null, spaAggregate, validator, resolve), { baseEE: ee.get(agentIdentifier), newrelic }) )

//   function onInteractionStart (cb) {
//     setTimeout(newrelic.interaction('get').createTracer(null, function () {
//       setTimeout(newrelic.interaction('get').createTracer('timeout', function () {
//         newrelic.interaction('get').interaction('setAttribute', undefined, 'foo', 'bar')
//         cb()
//       }))
//     }), 50)
//   }

// })

// test('createTracer no name, no callback', async () => {

//   const validator = new helpers.InteractionValidator({
//     name: 'interaction',
//     children: []
//   })

//   helpers.startInteraction(onInteractionStart, afterInteractionDone, { baseEE: ee.get(agentIdentifier), newrelic })

//   function onInteractionStart (cb) {
//     var start = helpers.now()
//     cb()
//     setTimeout[`nr@original:${bundleId}`].call(window, newrelic.interaction('get').createTracer(), 50)
//     newrelic.interaction('get').interaction('onEnd', undefined, function () {
//       t.ok(helpers.now() - start >= 50)
//     })
//   }

//   function afterInteractionDone (interaction) {
//     t.ok(interaction.root.end - interaction.root.start < 50, 'should not include duration of no name, no callback tracer')
//     t.ok(interaction.root.end, 'interaction should be finished and have an end time')
//     t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
//     t.notok(interaction.ignored, 'interaction should not be ignored')
//     validator.validate(t, interaction)
//     t.end()
//   }
// })

// test('reuse handle from outside interaction', async () => {

//   const validator = new helpers.InteractionValidator({
//     name: 'interaction',
//     attrs: {
//       custom: {
//         foo: 'baz'
//       }
//     },
//     children: []
//   })

//   var interactionHandle = null

//   await new Promise(resolve => helpers.startInteraction(onInteractionStart, afterInteractionDone2.bind(null, spaAggregate, validator, resolve), { baseEE: ee.get(agentIdentifier), newrelic }) )

//   function onInteractionStart (cb) {
//     interactionHandle = newrelic.interaction('get')
//     cb()

//     interactionHandle.interaction('setAttribute', undefined, 'foo', 'bar')
//     newrelic.interaction('get').interaction('setAttribute', undefined, 'foo', 'baz')
//   }

// })
