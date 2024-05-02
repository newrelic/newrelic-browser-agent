const { gzip } = require('node-gzip')

module.exports = async function forward (request, body) {
  if (!request.url.startsWith('/debug') && !request.url.startsWith('/health')) {
    const beacon = 'staging-bam-cell.nr-data.net'
    const lk = 'NRBR-c7d7aa44f6c74d8ed93'
    const a = 148790031
    let isBlob = false

    /** Remove headers that could cause mismatch issues */
    const newHeaders = { ...request.headers }
    delete newHeaders.host
    delete newHeaders['content-length'] // recalculated later if re-gzipping, otherwise we dont need this

    const url = new URL(request.url, 'resolve://')
    let newBody = body
    let newUrl = url.pathname
    let params = new URLSearchParams({ ...request.query, app_id: a, browser_monitoring_key: lk })

    /** Blob payloads have a different URL structure than the rest, which allows us to pass it straight thru with only param changes.
     * The other calls need some path replacements + param changes to work correctly */
    if (!newUrl.includes('blobs')) {
      const urlPieces = newUrl.split('/')
      newUrl = urlPieces.slice(0, urlPieces.length - 1).concat(lk).join('/')
      params = new URLSearchParams({ ...request.query, a })
    } else {
      isBlob = true
      newBody = await gzip(newBody)
      newHeaders['content-length'] = newBody.length
    }

    /** Forward it to NR1 Staging E2E App */
    fetch(`https://${beacon}${newUrl}?${params.toString()}`, {
      method: 'POST',
      body: typeof newBody === 'object' && !isBlob ? JSON.stringify(newBody) : newBody,
      headers: newHeaders
    })
  }
}
