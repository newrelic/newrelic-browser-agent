/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

let originalSetTimeout = global.setTimeout

const jil = require('jil')
const {getInfo} = require('../../../packages/browser-agent-core/common/config/config')


let raf = global.reqiestAnimationFrame || function (fn) {
  return originalSetTimeout(fn, 16)
}

jil.browserTest('simple sync api test', function (t) {
  let helpers = require('./helpers')

  let validator = new helpers.InteractionValidator({
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

  t.plan(6 + validator.count)

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    newrelic.interaction().setAttribute('click-handler', true)
    var interaction = newrelic.interaction()

    var val1 = interaction.createTracer('function 1', (val) => {
      interaction.setAttribute('in-function-1', true)
      t.equal(val, 123)
      return val * 2
    })(123)

    var val2 = interaction.createTracer('function 2', (val) => {
      interaction.setAttribute('in-function-2', true)
      t.equal(val, 456)
      return val * 2
    })(456)

    t.equal(val1, 246)
    t.equal(val2, 912)
    cb()
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    validator.validate(t, interaction)
    t.end()
  }
})

jil.browserTest('simple async api test', function (t) {
  let helpers = require('./helpers')

  let validator = new helpers.InteractionValidator({
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

  t.plan(3 + validator.count)

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    var tracer = newrelic.interaction().createTracer('requestAnimationFrame', function () {
      newrelic.interaction().setAttribute('raf-cb', true)
      return 123
    })
    raf(() => {
      t.equal(tracer(), 123)
      cb()
    })
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    validator.validate(t, interaction)
    t.end()
  }
})

jil.browserTest('async api no callback', function (t) {
  let helpers = require('./helpers')

  let validator = new helpers.InteractionValidator({
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

  t.plan(2 + validator.count)

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    var asyncDone = newrelic.interaction().createTracer('custom-async')

    originalSetTimeout(asyncDone, 5)
    setTimeout(function () {
      newrelic.interaction().setAttribute('setTimeout-cb', true)
      cb()
    }, 5)
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    validator.validate(t, interaction)
    t.end()
  }
})

jil.browserTest('async api outside interaction', function (t) {
  t.plan(4)

  var tracer = newrelic.interaction().createTracer('requestAnimationFrame', function (a, b, c) {
    t.equal(a, 1)
    t.equal(b, 2)
    t.equal(c, 3)
    return 123
  })

  setTimeout(() => {
    t.equal(tracer(1, 2, 3), 123)
    t.end()
  }, 5)
})

jil.browserTest('sync api outside interaction', function (t) {
  t.plan(4)

  var returnVal = newrelic.interaction().createTracer('function 1', (a, b, c) => {
    t.equal(a, 1)
    t.equal(b, 2)
    t.equal(c, 3)
    return 456
  })(1, 2, 3)

  t.equal(returnVal, 456)
  t.end()
})

jil.browserTest('async api outside interaction with throw', function (t) {
  var expected = new Error()
  var tracer = newrelic.interaction().createTracer('requestAnimationFrame', function (a, b, c) {
    t.equal(a, 1)
    t.equal(b, 2)
    t.equal(c, 3)
    throw expected
  })

  try {
    tracer(1, 2, 3)
  } catch (err) {
    t.equal(err, expected)
    t.end()
  }
})

jil.browserTest('sync api outside interaction with throw', function (t) {
  var expected = new Error()

  try {
    newrelic.interaction().createTracer('function 1', (a, b, c) => {
      t.equal(a, 1)
      t.equal(b, 2)
      t.equal(c, 3)
      throw expected
    })(1, 2, 3)
  } catch (err) {
    t.equal(err, expected)
    t.end()
  }
})

jil.browserTest('simple sync api test with throw', function (t) {
  var expected = new Error()
  let helpers = require('./helpers')

  let validator = new helpers.InteractionValidator({
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

  t.plan(4 + validator.count)

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    try {
      newrelic.interaction().createTracer('function 1', (val) => {
        setTimeout(() => {
          newrelic.interaction().setAttribute('setTimeout-cb', true)
          t.equal(val, 123)
          cb()
        }, 5)
        throw expected
      })(123)
    } catch (err) {
      t.equal(err, expected)
    }
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    validator.validate(t, interaction)
    t.end()
  }
})

jil.browserTest('simple async api test with throw', function (t) {
  var expected = new Error()
  let helpers = require('./helpers')

  let validator = new helpers.InteractionValidator({
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

  t.plan(3 + validator.count)

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    var tracer = newrelic.interaction().createTracer('requestAnimationFrame', function () {
      setTimeout(function () {
        newrelic.interaction().setAttribute('setTimeout-cb', true)
        cb()
      }, 5)
      throw expected
    })

    raf(() => {
      try {
        tracer()
      } catch (err) {
        t.equal(err, expected)
      }
    })
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    validator.validate(t, interaction)
    t.end()
  }
})

jil.browserTest('async api test with throw does not leave context', function (t) {
  var expected = new Error()
  let helpers = require('./helpers')

  let validator = new helpers.InteractionValidator({
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

  t.plan(3 + validator.count)

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    var tracer = newrelic.interaction().createTracer('requestAnimationFrame', function () {
      throw expected
    })

    setTimeout(() => {
      try {
        tracer()
      } catch (err) {
        t.equal(err, expected)
      }

      setTimeout(function () {
        newrelic.interaction().setAttribute('setTimeout-cb', true)
        cb()
      })
    }, 5)
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    validator.validate(t, interaction)
    t.end()
  }
})

jil.browserTest('simple sync api test with throw and sibling', function (t) {
  var expected = new Error()
  let helpers = require('./helpers')

  let validator = new helpers.InteractionValidator({
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

  t.plan(4 + validator.count)

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    try {
      newrelic.interaction().createTracer('function 1', (val) => {
        setTimeout(() => {
          t.equal(val, 123, 'should get right value')
          newrelic.interaction().setAttribute('nested-setTimeout-cb', true)
          newrelic.interaction().createTracer('nested-child')()
        })
        throw expected
      })(123)
    } catch (err) {
      t.equal(err, expected, 'should get expected error')
    }

    setTimeout(function () {
      newrelic.interaction().setAttribute('sibling-setTimeout-cb', true)
      newrelic.interaction().createTracer('sibling-child')()
      cb()
    }, 5)
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    validator.validate(t, interaction)
    t.end()
  }
})

jil.browserTest('end interaction', function (t) {
  let helpers = require('./helpers')

  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    children: [{
      name: 'customEnd',
      children: []
    }]
  })

  t.plan(2 + validator.count)

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    setTimeout(() => {
      setTimeout(newrelic.interaction().createTracer('wont-be-added'))
      cb()
      newrelic.interaction().end()
    }, 5)
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    validator.validate(t, interaction)
    t.end()
  }
})

jil.browserTest('custom interaction name', function (t) {
  let helpers = require('./helpers')

  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {
      customName: 'salt water taffy'
    },
    children: []
  })

  t.plan(2 + validator.count)

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    setTimeout(() => {
      newrelic.interaction().setName('salt water taffy')
      cb()
    }, 5)
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    validator.validate(t, interaction)
    t.end()
  }
})

jil.browserTest('custom actionText', function (t) {
  let helpers = require('./helpers')

  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {
      custom: {
        actionText: 'Albertosaurus'
      }
    },
    children: []
  })

  t.plan(2 + validator.count)

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    setTimeout(() => {
      newrelic.interaction().actionText('Albertosaurus')
      cb()
    }, 5)
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    validator.validate(t, interaction)
    t.end()
  }
})

jil.browserTest('ignore interaction', function (t) {
  let helpers = require('./helpers')

  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    children: []
  })

  t.plan(3 + validator.count)

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    setTimeout(() => {
      setTimeout(() => null)
      cb()
      newrelic.interaction().ignore()
    }, 5)
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    t.ok(interaction.ignored, 'interaction should be ignored')
    validator.validate(t, interaction)
    t.end()
  }
})

jil.browserTest('custom attributes', function (t) {
  let helpers = require('./helpers')

  let validator = new helpers.InteractionValidator({
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

  t.plan(3 + validator.count)

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    newrelic.interaction().setAttribute('interaction-float', 123.456)
    newrelic.interaction().setAttribute('interaction-string', '123')
    newrelic.interaction().setAttribute('interaction-true', true)
    newrelic.interaction().setAttribute('interaction-false', false)
    newrelic.interaction().setAttribute('interaction-null', null)
    setTimeout(cb, 5)
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    t.notok(interaction.ignored, 'interaction should not be ignored')
    validator.validate(t, interaction)
    t.end()
  }
})

jil.browserTest('custom attributes and interaction attributes', function (t) {
  let helpers = require('./helpers')

  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {
      custom: {
        inside: 0,
        customOutside: true,
        customInside: true,
        override: true
      }
    },
    children: []
  })

  t.plan(3 + validator.count)

  newrelic.interaction().setAttribute('outside', true)
  newrelic.setCustomAttribute('customOutside', true)
  newrelic.setCustomAttribute('override', false)
  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    newrelic.interaction().setAttribute('inside', 0)
    newrelic.setCustomAttribute('inside', 1)
    newrelic.setCustomAttribute('customInside', true)
    newrelic.setCustomAttribute('override', true)
    setTimeout(cb, 5)
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    t.notok(interaction.ignored, 'interaction should not be ignored')
    validator.validate(t, interaction)
    t.end()
  }
})

jil.browserTest('custom attributes and interaction attributes', function (t) {
  let helpers = require('./helpers')

  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {
      custom: {
        inside: 0,
        customOutside: true,
        customInside: true,
        override: true
      }
    },
    children: []
  })

  t.plan(3 + validator.count)

  newrelic.interaction().setAttribute('outside', true)
  newrelic.setCustomAttribute('customOutside', true)
  newrelic.setCustomAttribute('override', false)
  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    newrelic.interaction().setAttribute('inside', 0)
    newrelic.setCustomAttribute('inside', 1)
    newrelic.setCustomAttribute('customInside', true)
    newrelic.setCustomAttribute('override', true)
    setTimeout(cb, 5)
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    t.notok(interaction.ignored, 'interaction should not be ignored')
    validator.validate(t, interaction)

    const info = getInfo(helpers.setupData.agentIdentifier)
    delete info.jsAttributes.customOutside
    delete info.jsAttributes.override
    delete info.jsAttributes.inside
    delete info.jsAttributes.customInside
    t.end()
  }
})

jil.browserTest('context store and onEnd', function (t) {
  let helpers = require('./helpers')

  let validator = new helpers.InteractionValidator({
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

  t.plan(5 + validator.count)

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    var contextStore = null
    newrelic.interaction().getContext(function (ctx) {
      contextStore = ctx
      contextStore.foo = 'bar'
    })
    setTimeout(newrelic.interaction().createTracer('setTimeout', function () {
      newrelic.interaction().getContext(function (ctx) {
        t.equal(contextStore, ctx, 'should get right context in timeout')
        newrelic.interaction().getContext(function (ctx) {
          newrelic.interaction().setAttribute('foo', ctx.foo)
          cb()
        })
      })
    }), 5)

    newrelic.interaction().onEnd((ctx) => {
      t.equal(contextStore, ctx, 'should get right context on end')
      newrelic.interaction().setAttribute('otherFoo', ctx.foo)
    })
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    t.notok(interaction.ignored, 'interaction should not be ignored')
    validator.validate(t, interaction)
    t.end()
  }
})

jil.browserTest('save', function (t) {
  let helpers = require('./helpers')

  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    children: []
  })

  t.plan(1 + validator.count)

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    newrelic.interaction().save()
    cb()
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.save, 'should be set to save')
    validator.validate(t, interaction)
    t.end()
  }
})

jil.browserTest('save with ignore', function (t) {
  let helpers = require('./helpers')

  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    children: []
  })

  t.plan(2 + validator.count)

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    newrelic.interaction().ignore()
    newrelic.interaction().save()
    cb()
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.save, 'should be set to save')
    t.ok(interaction.save, 'should be set to ignore')
    validator.validate(t, interaction)
    t.end()
  }
})

jil.browserTest('save with ignore after', function (t) {
  let helpers = require('./helpers')

  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    children: []
  })

  t.plan(2 + validator.count)

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    newrelic.interaction().save()
    newrelic.interaction().ignore()
    cb()
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.save, 'should be set to save')
    t.ok(interaction.save, 'should be set to ignore')
    validator.validate(t, interaction)
    t.end()
  }
})

jil.browserTest('interaction outside interaction', function (t) {
  let helpers = require('./helpers')

  let validator = new helpers.InteractionValidator({
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

  t.plan(3 + validator.count)

  setTimeout(function () {
    var interaction = newrelic.interaction()

    helpers.startInteraction(onInteractionStart, afterInteractionDone, {
      eventType: 'api',
      handle: interaction
    })
  }, 0)

  setTimeout(function () {
    newrelic.interaction().setAttribute('excluded', true)
  })

  function onInteractionStart (cb) {
    newrelic.interaction().setAttribute('included', true)
    setTimeout(function () {
      newrelic.interaction().setAttribute('delayed', true)
      setTimeout(newrelic.interaction().createTracer('timeout', cb))
    }, 50)
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    t.notok(interaction.ignored, 'interaction should not be ignored')
    validator.validate(t, interaction)
    t.end()
  }
})

jil.browserTest('interaction outside wrapped function', function (t) {
  let helpers = require('./helpers')

  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {
      trigger: 'api',
      custom: {
        delayed: true,
        included: true
      }
    },
    children: [{
      type: 'customTracer',
      attrs: {
        name: 'outer'
      },
      children: [{
        type: 'customTracer',
        attrs: {
          name: 'timeout'
        },
        children: []
      }]
    }]
  })

  t.plan(3 + validator.count)

  setTimeout['nr@original'].call(window, function () {
    var interaction = newrelic.interaction()

    helpers.startInteraction(onInteractionStart, afterInteractionDone, {
      eventType: 'api',
      handle: interaction
    })

    function onInteractionStart (cb) {
      newrelic.interaction().setAttribute('alsoExcluded', true)
      interaction.setAttribute('included', true)
      setTimeout(interaction.createTracer('outer', function () {
        newrelic.interaction().setAttribute('delayed', true)
        setTimeout(newrelic.interaction().createTracer('timeout', cb))
      }), 50)
    }
  }, 0)

  setTimeout(function () {
    newrelic.interaction().setAttribute('excluded', true)
  })

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    t.notok(interaction.ignored, 'interaction should not be ignored')
    validator.validate(t, interaction)
    t.end()
  }
})

jil.browserTest('set trigger', function (t) {
  let helpers = require('./helpers')

  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {
      trigger: 'bar',
      customName: 'foo'
    },
    children: [{
      type: 'customTracer',
      attrs: {
        name: 'timeout'
      },
      children: []
    }]
  })

  t.plan(3 + validator.count)

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    newrelic.interaction().setName('foo', 'foo')
    setTimeout(newrelic.interaction().createTracer('timeout', function () {
      newrelic.interaction().setName(null, 'bar')
      cb()
    }), 50)
  }

  setTimeout(function () {
    newrelic.interaction().setAttribute('excluded', true)
  })

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    t.notok(interaction.ignored, 'interaction should not be ignored')
    validator.validate(t, interaction)
    t.end()
  }
})

jil.browserTest('createTracer no name', function (t) {
  let helpers = require('./helpers')

  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {
      custom: {
        foo: 'bar'
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

  t.plan(3 + validator.count)

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    setTimeout(newrelic.interaction().createTracer(null, function () {
      setTimeout(newrelic.interaction().createTracer('timeout', function () {
        newrelic.interaction().setAttribute('foo', 'bar')
        cb()
      }))
    }), 50)
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    t.notok(interaction.ignored, 'interaction should not be ignored')
    validator.validate(t, interaction)
    t.end()
  }
})

jil.browserTest('createTracer no name, no callback', function (t) {
  let helpers = require('./helpers')

  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    children: []
  })

  t.plan(5 + validator.count)

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    var start = helpers.now()
    cb()
    setTimeout['nr@original'].call(window, newrelic.interaction().createTracer(), 50)
    newrelic.interaction().onEnd(function () {
      t.ok(helpers.now() - start >= 50)
    })
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.end - interaction.root.start < 50, 'should not include duration of no name, no callback tracer')
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    t.notok(interaction.ignored, 'interaction should not be ignored')
    validator.validate(t, interaction)
    t.end()
  }
})

jil.browserTest('reuse handle from outside interaction', function (t) {
  let helpers = require('./helpers')

  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {
      custom: {
        foo: 'baz'
      }
    },
    children: []
  })

  t.plan(3 + validator.count)

  var interactionHandle = null

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    interactionHandle = newrelic.interaction()
    cb()

    interactionHandle.setAttribute('foo', 'bar')
    newrelic.interaction().setAttribute('foo', 'baz')
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    t.notok(interaction.ignored, 'interaction should not be ignored')
    validator.validate(t, interaction)
    t.end()
  }
})
