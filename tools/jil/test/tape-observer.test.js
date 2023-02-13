const test = require('tape')
const { Test } = require('tape')
const observe = require('../driver/TapeTestObserver')

test('simple pass', function (t) {
  t.plan(1)

  let tapeTest = new Test('parent', function (t) {
    t.ok(true)
    t.end()
  })

  observe(tapeTest, onFinished)

  tapeTest.run()

  function onFinished (passed) {
    t.ok(passed, 'test passed')
  }
})

test('simple fail', function (t) {
  t.plan(2)

  let tapeTest = new Test('parent', function (t) {
    t.ok(false)
    t.end()
  })

  observe(tapeTest, onFinished, onResult)

  tapeTest.run()

  function onFinished (passed) {
    t.ok(!passed, 'test failed')
  }

  function onResult (result) {
    t.ok(!result.ok, 'received failed result')
  }
})

test('failing with passing child', function (t) {
  t.plan(3)

  let tapeTest = new Test('parent test', function (t) {
    t.ok(false, 'assertion in parent')
    t.test('child test', function (t) {
      t.ok(true, 'assertion in child')
      t.end()
    })
    t.end()
  })

  observe(tapeTest, onFinished, onResult)

  tapeTest.run()

  function onFinished (passed, test) {
    t.equal(test.name, 'parent test')
    t.ok(!passed, 'test failed')
  }

  function onResult (result) {
    if (result.name === 'assertion in parent') {
      t.ok(!result.ok, 'received failed result')
    }
  }
})

test('failing child', function (t) {
  t.plan(3)

  let tapeTest = new Test('parent test', function (t) {
    t.ok(true, 'assertion in parent')
    t.test('child test', function (t) {
      t.ok(false, 'assertion in child')
      t.end()
    })
    t.end()
  })

  observe(tapeTest, onFinished, onResult)

  tapeTest.run()

  function onFinished (passed, test) {
    t.equal(test.name, 'parent test')
    t.ok(!passed, 'test failed')
  }

  function onResult (result) {
    if (result.name === 'assertion in child') {
      t.ok(!result.ok, 'received failed result')
    }
  }
})
