const { decompress } = require('fflate');

fs = require('fs');

let payloadsSent = 0

let limit = 10
let concurrent = 30
let spawned = 0

async function sendRequest() {
  const account = '1067061'
  const appId = '241614193'
  const agentVersion = '0.0.1'
  const licenseKey = 'NRBR-2863e835bc2f644947b'
  const entityGuid = 'MTA2NzA2MXxCUk9XU0VSfEFQUExJQ0FUSU9OfDI0MTYxNDE5Mw'
  const session = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

  const ptid = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  let harvestCount = 0;
  const timeNow = Math.floor(Date.now());

  /** PAGEVIEW HARVEST */
  const offset = Math.floor(Math.random() * 10000) + 40000; // random offset between 40s and 50s
  const pageViewHarvest = new URL(`https://staging-bam.nr-data.net/1/${licenseKey}`); // parameterize this later
  pageViewHarvest.searchParams.set('a', appId);
  pageViewHarvest.searchParams.set('sa', '1');
  pageViewHarvest.searchParams.set('v', agentVersion);
  pageViewHarvest.searchParams.set('t', 'Unnamed%20Transaction');
  pageViewHarvest.searchParams.set('rst', '1891');
  pageViewHarvest.searchParams.set('ck', '0');
  pageViewHarvest.searchParams.set('s', session);
  pageViewHarvest.searchParams.set('ptid', ptid);
  pageViewHarvest.searchParams.set('ref', 'https://staging-one.newrelic.com/catalogs/software');
  pageViewHarvest.searchParams.set('ht', '1');
  pageViewHarvest.searchParams.set('hr', '1');
  pageViewHarvest.searchParams.set('af', 'err,spa,xhr,stn,ins');
  pageViewHarvest.searchParams.set('be', '104');
  pageViewHarvest.searchParams.set('fe', '1503');
  pageViewHarvest.searchParams.set('dc', '1467');
  pageViewHarvest.searchParams.set('fsh', '1');
  // pageViewHarvest.searchParams.set('perf', '%7B%22timing%22:%7B%22of%22:1751048335232,%22n%22:0,%22u%22:118,%22ue%22:118,%22f%22:3,%22dn%22:3,%22dne%22:3,%22c%22:3,%22s%22:3,%22ce%22:3,%22rq%22:6,%22rp%22:105,%22rpe%22:1309,%22di%22:1390,%22ds%22:1571,%22de%22:1571,%22dc%22:1606,%22l%22:1606,%22le%22:1607%7D,%22navigation%22:%7B%22ty%22:1%7D%7D');
  pageViewHarvest.searchParams.set('fp', '416');
  pageViewHarvest.searchParams.set('fcp', '416');
  pageViewHarvest.searchParams.set('timestamp', (timeNow - (offset * 2)).toString());

  const pageViewHeaders = {
    "content-type": "text/plain",
    "sec-ch-ua": "\"Google Chrome\";v=\"137\", \"Chromium\";v=\"137\", \"Not/A)Brand\";v=\"24\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"macOS\""
  };

  const pageViewBody = JSON.stringify({ ja: { 'enduser.id': 'faker@newrelic.com' } })

  const pageViewResponse = await fetch(pageViewHarvest.toString(), {
    method: 'POST',
    headers: pageViewHeaders,
    referrer: "https://staging-one.newrelic.com/",
    body: pageViewBody,
    method: "POST"
  });

  /** SNAPSHOT HARVEST */
  const snapshotBody = await fs.promises.readFile('./snapshot-body.txt', 'utf8');

  const snapshotHarvest = new URL('https://staging-bam.nr-data.net/browser/blobs'); // parameterize this later
  snapshotHarvest.searchParams.set('browser_monitoring_key', licenseKey);
  snapshotHarvest.searchParams.set('type', 'SessionReplay');
  snapshotHarvest.searchParams.set('app_id', appId);
  snapshotHarvest.searchParams.set('protocol_version', '0');
  snapshotHarvest.searchParams.set('timestamp', (timeNow - (offset * 2)).toString());
  snapshotHarvest.searchParams.set('attributes', obj({
    entityGuid,
    harvestId: `${session}_${ptid}_${harvestCount}`,
    'replay.firstTimestamp': (timeNow - (offset * 2)).toString(),
    'replay.lastTimestamp': (timeNow - offset).toString(),
    'replay.nodes': 2,
    'session.durationMs': offset,
    agentVersion,
    session,
    rst: 46330,
    decompressedBytes: snapshotBody.length,
    hasMeta: true,
    hasSnapshot: true,
    hasError: false,
    isFirstChunk: true,
    invalidStylesheetsDetected: false,
    inlinedAllStylesheets: false,
    'rrweb.version': '^2.0.0-alpha.18',
    'payload.type': 'standard',
    'enduser.id': 'faker@newrelic.com',
    currentUrl: 'https://staging-one.newrelic.com/catalogs/software'
  }))

  const snapshotHeaders = {
    "content-type": "text/plain",
    "sec-ch-ua": "\"Google Chrome\";v=\"137\", \"Chromium\";v=\"137\", \"Not/A)Brand\";v=\"24\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"macOS\""
  };


  const snapshotResponse = await fetch(snapshotHarvest.toString(), {
    method: 'POST',
    headers: snapshotHeaders,
    referrer: "https://staging-one.newrelic.com/",
    body: snapshotBody,
    method: "POST"
  });
  /** MUTATION HARVEST */

  const mutationBody = await fs.promises.readFile('./mutation-body.txt', 'utf8');

  const mutationHarvest = new URL('https://staging-bam.nr-data.net/browser/blobs'); // parameterize this later
  mutationHarvest.searchParams.set('browser_monitoring_key', licenseKey);
  mutationHarvest.searchParams.set('type', 'SessionReplay');
  mutationHarvest.searchParams.set('app_id', appId);
  mutationHarvest.searchParams.set('protocol_version', '0');
  mutationHarvest.searchParams.set('timestamp', (timeNow - offset + 100).toString());
  mutationHarvest.searchParams.set('attributes', obj({
    entityGuid,
    harvestId: `${session}_${ptid}_${harvestCount}`,
    'replay.firstTimestamp': (timeNow - offset + 100).toString(),
    'replay.lastTimestamp': (timeNow - 100).toString(),
    'replay.nodes': 8,
    'session.durationMs': offset * 2,
    agentVersion,
    session,
    decompressedBytes: mutationBody.length,
    // rst: 46330,
    hasMeta: false,
    hasSnapshot: false,
    hasError: false,
    isFirstChunk: false,
    invalidStylesheetsDetected: false,
    inlinedAllStylesheets: false,
    'rrweb.version': '^2.0.0-alpha.18',
    'payload.type': 'standard',
    'enduser.id': 'faker@newrelic.com',
    currentUrl: 'https://staging-one.newrelic.com/catalogs/software'
  }))


  const mutationHeaders = {
    "content-type": "text/plain",
    "sec-ch-ua": "\"Google Chrome\";v=\"137\", \"Chromium\";v=\"137\", \"Not/A)Brand\";v=\"24\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"macOS\""
  };


  const mutationResponse = await fetch(snapshotHarvest.toString(), {
    method: 'POST',
    headers: mutationHeaders,
    referrer: "https://staging-one.newrelic.com/",
    body: mutationBody,
    method: "POST"
  });

  console.log("payloads (1 PVE + 2 SR) sent: ", ++payloadsSent);
  if (payloadsSent < limit) {
    setTimeout(sendRequest,1)
  }
}

while(spawned++ < concurrent) sendRequest().catch(err => {
  console.error(err);
});






/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */


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

function fromArray(qs, maxBytes) {
  var bytes = 0
  for (var i = 0; i < qs.length; i++) {
    bytes += qs[i].length
    if (bytes > maxBytes) return qs.slice(0, i).join('')
  }
  return qs.join('')
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

// Constructs an HTTP parameter to add to the BAM router URL
function param(name, value, base = {}) {
  if (Object.keys(base).includes(name)) return '' // we assume if feature supplied a matching qp to the base, we should honor what the feature sent over the default
  if (value && typeof (value) === 'string') {
    return '&' + name + '=' + qs(value)
  }
  return ''
}
