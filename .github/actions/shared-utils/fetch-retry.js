import fetch from 'node-fetch'

export async function fetchRetry (url, options) {
  let retryLimit

  if (typeof options.retry !== 'number' || options.retry <= 1) {
    retryLimit = 1
  } else {
    retryLimit = options.retry
  }

  while (retryLimit >= 1) {
    try {
      const result = await fetch(url, {
        ...options,
        retry: undefined
      })

      if (result.ok) {
        return result
      } else {
        retryLimit--
      }
    } catch (error) {
      if (retryLimit <= 1) {
        throw error
      }

      retryLimit--
    }
  }
}
