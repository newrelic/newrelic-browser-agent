/* eslint-disable no-eval */

onmessage = async function (e) {
  if (e.data.type === 'startAgent') {
    self.NREUM = e.data.payload

    const { WorkerAgent } = await import(/* webpackChunkName: "nr-worker-agent" */'@newrelic/browser-agent/loaders/worker-agent')

    const opts = {
      info: NREUM.info,
      init: NREUM.init
    }

    new WorkerAgent(opts)

    self.postMessage({ type: 'ready' })
  } else if (e.data.type === 'command') {
    // Let errors go unhandled so bad commands crashes the tests for troubleshooting.
    let retVal = eval(e.data.fn) // run the literal string cmd
    if (typeof retVal == 'function') retVal() // and if it's a function definition, invoke it
  }
}
