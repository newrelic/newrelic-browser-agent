import newrelic from 'newrelic'
import logger from '@wdio/logger'

const log = logger('newrelic-instrumentation')

export default class NewrelicInstrumentation {
  /**
   * Runs in the scope of the main WDIO process after all testing has completed.
   */
  async onComplete (exitCode) {
    const shutdownStart = performance.now()

    if (exitCode > 0) {
      newrelic.noticeError(
        new Error(`WDIO shutdown with exit code: ${exitCode}`)
      )
    }

    await new Promise((resolve) =>
      newrelic.shutdown({ collectPendingData: true, timeout: 3000 }, resolve)
    )

    log.info(`Shutdown in ${Math.round(performance.now() - shutdownStart)}ms`)
  }

  /**
   * Runs in the scope of a WDIO worker process after all tests in that worker have completed
   * and before the worker is shutdown.
   */
  async after () {
    const shutdownStart = performance.now()

    await new Promise((resolve) =>
      newrelic.shutdown({ collectPendingData: true, timeout: 3000 }, resolve)
    )

    log.info(`Shutdown in ${Math.round(performance.now() - shutdownStart)}ms`)
  }
}
export const launcher = NewrelicInstrumentation
