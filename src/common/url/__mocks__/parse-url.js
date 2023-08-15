export function parseUrl (url) {
  try {
    const result = new URL(url)

    return {
      hostname: result.hostname,
      port: result.port || result.protocol.startsWith('https') ? '443' : '80',
      pathname: result.pathname,
      protocol: result.protocol.replace(':', ''),
      sameOrigin: false
    }
  } catch (err) {
    return {}
  }
}
