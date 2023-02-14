import process from 'process'
import newrelic from 'newrelic'

export default class NewrelicInstrumentation {
  /**
   * Runs in the scope of the main WDIO process at the start of the launcher and before any
   * worker threads are spawned.
   */
  async onPrepare (_, capabilities) {
    const buildIdentifier = this.#generateBuildIdentifier()

    capabilities.forEach((capability) => {
      capability['jil:buildIdentifier'] = buildIdentifier
    })
  }

  /**
   * Runs in the scope of the main WDIO process after all testing has completed.
   */
  async onComplete (exitCode) {
    if (exitCode > 0) {
      newrelic.noticeError(
        new Error(`WDIO shutdown with exit code: ${exitCode}`)
      )
    }

    await new Promise((resolve) =>
      newrelic.shutdown({ collectPendingData: true, timeout: 3000 }, resolve)
    )
  }

  /**
   * Runs in the scope of a WDIO worker process after all tests in that worker have completed
   * and before the worker is shutdown.
   */
  async after () {
    await new Promise((resolve) =>
      newrelic.shutdown({ collectPendingData: true, timeout: 3000 }, resolve)
    )
  }

  #generateBuildIdentifier () {
    let buildIdentifier = process.env.BUILD_NUMBER
    if (!buildIdentifier) {
      let identifier = Math.random().toString(16).slice(2)
      buildIdentifier = `${process.env.USER}-${identifier}`
    }
    return buildIdentifier
  }
}
export const launcher = NewrelicInstrumentation
