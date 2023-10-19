import fetch from 'node-fetch'

/**
 * Wraps fetch with retry capabilities.
 * @param {string} url
 * @param {import('node-fetch').RequestInit & { retry?: number }} options
 * @returns {Promise<import('node-fetch').Response>}
 */
export async function fetchRetry (url, options) {
  let retryLimit
  let request

  if (typeof options.retry !== 'number' || options.retry <= 1) {
    retryLimit = 1
  } else {
    retryLimit = options.retry
  }

  while (retryLimit >= 1) {
    try {
      request = await fetch(url, {
        ...options,
        retry: undefined
      })

      if (request?.ok) {
        return request
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

  return request
}
