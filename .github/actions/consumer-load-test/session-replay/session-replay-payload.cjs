const fs = require('fs');
const path = require('path');

const headers = {
    "content-type": "text/plain",
    "sec-ch-ua": "\"Google Chrome\";v=\"137\", \"Chromium\";v=\"137\", \"Not/A)Brand\";v=\"24\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"macOS\""
};

module.exports = async function ({
    licenseKey,
    appId,
    timeNow,
    offset,
    harvestCount,
    isSnapshot,
    enduserId,
    entityGuid,
    session,
    ptid,
    agentVersion
}) {
    const payloadBodyPath = path.resolve(__dirname, (isSnapshot ? './snapshot-body.txt' : './mutation-body.txt'));
    const body = await fs.promises.readFile(payloadBodyPath, 'utf8')

    const payloadJSON = JSON.parse(body)

    const request = new URL('https://staging-bam.nr-data.net/browser/blobs'); // parameterize this later
    request.searchParams.set('browser_monitoring_key', licenseKey);
    request.searchParams.set('type', 'SessionReplay');
    request.searchParams.set('app_id', appId);
    request.searchParams.set('protocol_version', '0');
    request.searchParams.set('timestamp', (isSnapshot ? timeNow - (offset * 2) : timeNow - offset + 100).toString());
    request.searchParams.set('attributes', obj({
        entityGuid,
        harvestId: `${session}_${ptid}_${harvestCount}`,
        'replay.firstTimestamp': (isSnapshot ? timeNow - (offset * 2) : timeNow - offset + 100).toString(),
        'replay.lastTimestamp': (isSnapshot ? timeNow - offset : timeNow - 100).toString(),
        'replay.nodes': payloadJSON.length,
        'session.durationMs': offset,
        agentVersion,
        session,
        rst: 46330,
        decompressedBytes: body.length,
        hasMeta: isSnapshot,
        hasSnapshot: isSnapshot,
        hasError: false,
        isFirstChunk: isSnapshot,
        invalidStylesheetsDetected: false,
        inlinedAllStylesheets: false,
        'rrweb.version': '^2.0.0-alpha.18',
        'payload.type': 'standard',
        'enduser.id': enduserId,
        currentUrl: 'https://staging-one.newrelic.com/catalogs/software'
    }))


    const response = await fetch(request.toString(), {
        method: 'POST',
        headers,
        referrer: "https://staging-one.newrelic.com/",
        body
    });
    if (!response.ok) console.log('harvest failed', response.status, response.statusText);

    return response
}

// Characters that are safe in a qs, but get encoded.
var charMap = {
    '%2C': ',',
    '%3A': ':',
    '%2F': '/',
    '%40': '@',
    '%24': '$',
    '%3B': ';'
}

var charList = Object.keys(charMap)
var safeEncoded = new RegExp(charList.join('|'), 'g')

function real(c) {
    return charMap[c]
}

// Encode as URI Component, then unescape anything that is ok in the
// query string position.
function qs(value) {
    if (value === null || value === undefined) return 'null'
    return encodeURIComponent(value).replace(safeEncoded, real)
}

function obj(payload, maxBytes) {
    var total = 0
    var result = ''

    Object.entries(payload || {}).forEach(([feature, dataArray]) => {
        var intermediate = []
        var next
        var i

        if (typeof dataArray === 'string' || (!Array.isArray(dataArray) && dataArray !== null && dataArray !== undefined && dataArray.toString().length)) {
            next = '&' + feature + '=' + qs(dataArray)
            total += next.length
            result += next
        } else if (Array.isArray(dataArray) && dataArray.length) {
            total += 9
            for (i = 0; i < dataArray.length; i++) {
                next = qs(JSON.stringify(dataArray[i]))
                total += next.length
                if (typeof maxBytes !== 'undefined' && total >= maxBytes) break
                intermediate.push(next)
            }
            result += '&' + feature + '=%5B' + intermediate.join(',') + '%5D'
        }
    })
    return result
}