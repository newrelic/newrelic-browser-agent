/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

function FakeUncaughtException (message, url, line) {
  this.message = message
  this.sourceURL = url
  this.line = line
}

function FakeError (message, stack) {
  this.message = message
  this.stack = stack
}

export default [
  {
    stack: new FakeUncaughtException('Uncaught Error: uncaught error', 'http://localhost:9090/errors/uncaught1.js', 8),
    info: {
      mode: 'sourceline',
      name: 'FakeUncaughtException',
      message: 'Uncaught Error: uncaught error',
      stackString: 'FakeUncaughtException: Uncaught Error: uncaught error\n    at http://localhost:9090/errors/uncaught1.js:8',
      frames: [
        {
          url: 'http://localhost:9090/errors/uncaught1.js',
          line: 8
        }
      ]
    },
    message: 'Uncaught exception'
  },
  {
    stack: new FakeError('some error', 'global code@http://localhost:9090/error.html:38:22'),
    info: {
      mode: 'stack',
      name: 'FakeError',
      message: 'some error',
      stackString: 'global code@http://localhost:9090/error.html:38:22',
      frames: [
        {
          url: 'http://localhost:9090/error.html',
          func: null,
          line: 38,
          column: 22
        }
      ]
    },
    message: 'Safari global error'
  },
  {
    stack: new FakeError('original onerror', 'Error: original onerror\n    at http://localhost:9090/errors/uncaught?testcase=uncaught_error.chrome.Windows_7.:16:19\n    at nrWrapper (http://localhost:9090/errors/uncaught?testcase=uncaught_error.chrome.Windows_7.:227:17)'),
    info: {
      mode: 'stack',
      name: 'FakeError',
      message: 'original onerror',
      stackString: 'Error: original onerror\n    at http://localhost:9090/errors/uncaught?testcase=uncaught_error.chrome.Windows_7.:16:19',
      frames: [
        {
          url: 'http://localhost:9090/errors/uncaught?testcase=uncaught_error.chrome.Windows_7.',
          func: null,
          line: 16,
          column: 19
        }
      ]
    },
    message: 'Simple stack'
  },
  {
    stack: new FakeError('global addEventListener listener', 'Error: global addEventListener listener\n    at handleEvent (http://localhost:9090/errors/eventListeners.js:7:25)\n    at event_error_wrapper2 (http://localhost:9090/errors/eventListeners?testcase=eventListeners_errors.chrome.Windows_7.:154:37)\n    at eventListenerListener (http://localhost:9090/errors/eventListeners.js:15:8)\n    at nrWrapper http://localhost:9090/errors/eventListeners.js:18:1'),
    info: {
      mode: 'stack',
      name: 'FakeError',
      message: 'global addEventListener listener',
      stackString: 'Error: global addEventListener listener\n    at handleEvent (http://localhost:9090/errors/eventListeners.js:7:25)\n    at event_error_wrapper2 (http://localhost:9090/errors/eventListeners?testcase=eventListeners_errors.chrome.Windows_7.:154:37)\n    at eventListenerListener (http://localhost:9090/errors/eventListeners.js:15:8)',
      frames: [
        {
          url: 'http://localhost:9090/errors/eventListeners.js',
          func: 'handleEvent',
          line: 7,
          column: 25
        },
        {
          url: 'http://localhost:9090/errors/eventListeners?testcase=eventListeners_errors.chrome.Windows_7.',
          func: 'event_error_wrapper2',
          line: 154,
          column: 37
        },
        {
          url: 'http://localhost:9090/errors/eventListeners.js',
          func: 'eventListenerListener',
          line: 15,
          column: 8
        }
      ]
    },
    message: 'Multiline stack'
  },
  {
    stack: new FakeError('NPObject deleted', 'ReferenceError: NPObject deleted\n    at HTMLDocument.event_error_wrapper2 (http://www.academia.edu/2750047/Digital_divide_Civic_engagement_information_poverty_and_the_Internet_worldwide:23:1573)\n    at SkypeClick2Call.ChangeSink.SendNotification (chrome-extension://lifbcibllhkdhoafpjfnlhfpfgnpldfl/change_sink.js:236:11)\n    at on_timer (chrome-extension://lifbcibllhkdhoafpjfnlhfpfgnpldfl/change_sink.js:47:34)\n    at nrWrapper http://localhost:9090/errors/eventListeners.js:18:1'),
    info: {
      mode: 'stack',
      name: 'FakeError',
      message: 'NPObject deleted',
      stackString: 'ReferenceError: NPObject deleted\n    at HTMLDocument.event_error_wrapper2 (http://www.academia.edu/2750047/Digital_divide_Civic_engagement_information_poverty_and_the_Internet_worldwide:23:1573)\n    at SkypeClick2Call.ChangeSink.SendNotification (chrome-extension://lifbcibllhkdhoafpjfnlhfpfgnpldfl/change_sink.js:236:11)\n    at on_timer (chrome-extension://lifbcibllhkdhoafpjfnlhfpfgnpldfl/change_sink.js:47:34)',
      frames: [
        {
          url: 'http://www.academia.edu/2750047/Digital_divide_Civic_engagement_information_poverty_and_the_Internet_worldwide',
          func: 'HTMLDocument.event_error_wrapper2',
          line: 23,
          column: 1573
        },
        {
          url: 'chrome-extension://lifbcibllhkdhoafpjfnlhfpfgnpldfl/change_sink.js',
          func: 'SkypeClick2Call.ChangeSink.SendNotification',
          line: 236,
          column: 11
        },
        {
          url: 'chrome-extension://lifbcibllhkdhoafpjfnlhfpfgnpldfl/change_sink.js',
          func: 'on_timer',
          line: 47,
          column: 34
        }
      ]
    },
    message: 'Chrome extension'
  },
  {
    stack: new FakeError('', 'move@https://rpm.newrelic.com/assets/default.js?a1ac052:31648:16\nhttps://rpm.newrelic.com/assets/default.js?a1ac052:31661:18\nnrWrapper@https://rpm.newrelic.com/assets/default.js?a1ac052:31661:18'),
    info: {
      mode: 'stack',
      name: 'FakeError',
      message: '',
      stackString: 'move@https://rpm.newrelic.com/assets/default.js?a1ac052:31648:16\nhttps://rpm.newrelic.com/assets/default.js?a1ac052:31661:18',
      frames: [
        {
          url: 'https://rpm.newrelic.com/assets/default.js?a1ac052',
          func: 'move',
          line: 31648,
          column: 16
        },
        {
          url: 'https://rpm.newrelic.com/assets/default.js?a1ac052',
          func: null,
          line: 31661,
          column: 18
        }
      ]
    },
    message: 'Firefox missing function name'
  },
  {
    stack: new FakeError('', 'handleMouseoverEvent@chrome://iskydeluxe/content/analysismodule/website_other.js:31\nnrWrapper@https://rpm.newrelic.com/accounts/1234/applications/2468/traced_errors:10'),
    info: {
      mode: 'stack',
      name: 'FakeError',
      message: '',
      stackString: 'handleMouseoverEvent@chrome://iskydeluxe/content/analysismodule/website_other.js:31',
      frames: [
        {
          url: 'chrome://iskydeluxe/content/analysismodule/website_other.js',
          func: 'handleMouseoverEvent',
          line: 31,
          column: null
        }
      ]
    },
    message: 'Firefox Chrome URI'
  },
  {
    stack: new FakeError('custom event', 'Error: custom event\n    at HTMLDocument.custom (http://bam-test-1.nr-local.net:9080/build/unit.js:1523:9)\n    at HTMLDocument.nrWrapper (http://bam-test-1.nr-local.net:9080/build/unit.js:25424:26)\n    at Test._cb (http://bam-test-1.nr-local.net:9080/build/unit.js:1594:14)'),
    info: {
      mode: 'stack',
      name: 'FakeError',
      message: 'custom event',
      // Stacktrace string includes complete stack minus wrapper frames
      stackString: 'Error: custom event\n    at HTMLDocument.custom (http://bam-test-1.nr-local.net:9080/build/unit.js:1523:9)\n    at Test._cb (http://bam-test-1.nr-local.net:9080/build/unit.js:1594:14)',
      // Frames only includes the frames up to the first wrapper frame
      frames: [
        {
          url: 'http://bam-test-1.nr-local.net:9080/build/unit.js',
          func: 'HTMLDocument.custom',
          line: 1523,
          column: 9
        }
      ]
    },
    message: 'nrWrapper in middle of stack'
  },
  {
    stack: new FakeError('', 's@safari-extension://Addon-F9066E9F-3A68-426A-81E2-251401C75D51-D7Z2L4J544/8480d07f/files/foreground.js?0.8517979704774916:1462:243'),
    info: {
      mode: 'stack',
      name: 'FakeError',
      message: '',
      stackString: 's@safari-extension://Addon-F9066E9F-3A68-426A-81E2-251401C75D51-D7Z2L4J544/8480d07f/files/foreground.js?0.8517979704774916:1462:243',
      frames: [
        {
          url: 'safari-extension://Addon-F9066E9F-3A68-426A-81E2-251401C75D51-D7Z2L4J544/8480d07f/files/foreground.js?0.8517979704774916',
          func: 's',
          line: 1462,
          column: 243
        }
      ]
    },
    message: 'Safari extension'
  }
]
