const { gzip } = require('node-gzip')

module.exports = async function forward (request, body) {
  if (!request.url.startsWith('/debug') && !request.url.startsWith('/health')) {
    // forward to NR1
    const beacon = 'staging-bam-cell.nr-data.net'
    const licenseKey = 'NRBR-c7d7aa44f6c74d8ed93'
    const appId = 148790031
    let isBlob = false

    const newHeaders = { ...request.headers }
    delete newHeaders.host
    delete newHeaders['content-length']
    const url = new URL(request.url, 'resolve://')
    let newBody = body
    let newUrl = url.pathname
    let params = new URLSearchParams({ ...request.query, app_id: appId, browser_monitoring_key: licenseKey })
    if (!newUrl.includes('blobs')) {
      const urlPieces = newUrl.split('/')
      newUrl = urlPieces.slice(0, urlPieces.length - 1).concat(licenseKey).join('/')
      params = new URLSearchParams({ ...request.query, a: appId })
    } else {
      isBlob = true
      // newBody = await gzip(JSON.stringify(newBody))
      newBody = await gzip(newBody)
      newHeaders['content-length'] = newBody.length
    }
    const fwdUrl = `https://${beacon}${newUrl}?${params.toString()}`

    fetch(fwdUrl, {
      method: 'POST',
      body: typeof newBody === 'object' && !isBlob ? JSON.stringify(newBody) : newBody,
      headers: newHeaders
    })
  }
}
