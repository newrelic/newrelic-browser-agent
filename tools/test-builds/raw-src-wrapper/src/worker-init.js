/* eslint-disable no-global-assign */
/* global workerCommands */

const worker = new Worker('worker-wrapper.js')

const opts = NREUM

worker.postMessage({ type: 'startAgent', payload: opts })

worker.onmessage = function ({ data: { type } }) {
  if (type === 'ready') {
    workerCommands = window.workerCommands || []
    workerCommands.forEach(command => worker.postMessage({ type: 'command', fn: command }))
  }
}

// main page
worker.onerror = function (e) {
  console.log('error from worker', e)
}
