/* eslint-disable no-eval */

onmessage = async function (e) {
  if (e.data.type === 'startAgent') {
    self.NREUM = e.data.payload

    const { workerAgentFactory } = await import('./worker-agent')
    self.agent = workerAgentFactory(NREUM)

    self.postMessage({ type: 'ready' })
  } else if (e.data.type === 'command') {
    // Let errors go unhandled so bad commands crashes the tests for troubleshooting.
    eval(e.data.fn) // run the literal string cmd
  }
}
