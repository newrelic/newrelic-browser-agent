import child_process from 'child_process'

/**
 * Wraps child_process.spawn in a promise allowing the use of async/await.
 * @param {string} command
 * @param {string[]} args
 * @param {child_process.SpawnOptionsWithoutStdio} options
 * @param {boolean} capture Flag to indicate if stdout and stderr should be captured and returned
 * @returns {Promise<{hasError: boolean; stdout?: string; stderr?: string; error?: Error}>}
 */
export function spawnAsync(command, args, options, capture = false) {
  return new Promise((resolve, reject) => {
    const proc = child_process.spawn(command, args, options)
    const result = {
      hasError: false
    }

    if (capture) {
      result.stdout = ''
      result.stderr = ''

      proc.stdout.addListener('data', (chunk) => {
        result.stdout += chunk.toString()
      })

      proc.stderr.addListener('data', (chunk) => {
        result.stderr += chunk.toString()
      })
    }

    proc.addListener('error', (error) => {
      result.hasError = true
      result.error = error
    })

    proc.addListener('exit', (code) => {
      if (code != 0) {
        if (!result.hasError) {
          result.error = new Error(`Process spawn exited with code ${code}`)
        }

        reject(result)
      } else {
        resolve(result)
      }
    })
  })
}
