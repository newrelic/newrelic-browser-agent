/**
 * Retries `check` on an interval until it returns a truthy value or the
 * timeout elapses. Used for platform-side latencies this action does not
 * control: entity synthesis after a first harvest, and settings propagation
 * to the collector after a NerdGraph mutation. Logs each attempt so a slow
 * run is legible in the job log instead of silent.
 *
 * @param {() => Promise<any>} check - resolves to a truthy "found it" value, or a falsy value to keep polling.
 * @param {object} opts
 * @param {string} opts.description - human label for log lines, e.g. "entity synthesis".
 * @param {number} [opts.timeoutMs=180000]
 * @param {number} [opts.intervalMs=5000]
 * @returns {Promise<{ result: any, attempts: number, elapsedMs: number, timedOut: boolean }>}
 */
export async function waitFor (check, { description, timeoutMs = 180000, intervalMs = 5000 }) {
  const startedAt = Date.now()
  let attempts = 0

  while (true) {
    attempts++
    const elapsedMs = Date.now() - startedAt
    const result = await check()

    if (result) {
      console.log(`[poll-until] ${description}: succeeded after ${attempts} attempt(s), ${elapsedMs}ms.`)
      return { result, attempts, elapsedMs, timedOut: false }
    }

    if (elapsedMs >= timeoutMs) {
      console.log(`[poll-until] ${description}: timed out after ${attempts} attempt(s), ${elapsedMs}ms.`)
      return { result: null, attempts, elapsedMs, timedOut: true }
    }

    console.log(`[poll-until] ${description}: attempt ${attempts} not ready yet (${elapsedMs}ms elapsed), retrying in ${intervalMs}ms...`)
    await sleep(intervalMs)
  }
}

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
