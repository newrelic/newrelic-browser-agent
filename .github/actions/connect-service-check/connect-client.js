import { fetchRetry } from '../shared-utils/fetch-retry.js'

const RAW_METHOD_PATH = '/agent_listener/invoke_raw_method'
const PROTOCOL_VERSION = 17
const USER_AGENT = 'NewRelic-BrowserAgent-ConnectServiceCheck/1.0'

export const HOSTS = {
  staging: 'staging-collector.newrelic.com',
  'us-prod': 'collector.newrelic.com'
}

/**
 * Posts one raw collector method, mirroring the shape the Node APM agent
 * itself sends (see node_modules/newrelic/lib/collector/remote-method.js in
 * newrelic-node-examples/simple-express-app: same path, same query params,
 * same `{ return_value }` response envelope).
 */
async function invokeRawMethod (host, { method, licenseKey, runId, body }) {
  const query = new URLSearchParams({
    marshal_format: 'json',
    protocol_version: String(PROTOCOL_VERSION),
    license_key: licenseKey,
    method
  })
  if (runId) query.set('run_id', String(runId))

  const url = `https://${host}${RAW_METHOD_PATH}?${query.toString()}`
  const serializedBody = JSON.stringify(body)

  const response = await fetchRetry(url, {
    method: 'POST',
    retry: 3,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT,
      'CONTENT-ENCODING': 'identity'
    },
    body: serializedBody
  })

  const text = await response.text()
  let parsed = null
  try {
    parsed = JSON.parse(text)
  } catch {
    // fall through, surfaced below via the raw text
  }

  if (!response.ok || !parsed || parsed.exception) {
    const err = new Error(`Collector method "${method}" failed (HTTP ${response.status}): ${text.slice(0, 2000)}`)
    err.status = response.status
    err.rawBody = text
    err.exception = parsed && parsed.exception
    throw err
  }

  return parsed.return_value
}

/**
 * @returns {Promise<string>} the redirect_host connect must be sent to.
 */
export async function preconnect (host, licenseKey) {
  const returnValue = await invokeRawMethod(host, {
    method: 'preconnect',
    licenseKey,
    body: [{ high_security: false }]
  })

  if (!returnValue || !returnValue.redirect_host) {
    throw new Error(`preconnect against ${host} did not return a redirect_host: ${JSON.stringify(returnValue)}`)
  }

  return returnValue.redirect_host
}

/**
 * Minimal "facts" payload — deliberately not the full superset facts.js
 * builds for a real running agent. See Open risk 1 in the plan: widen this
 * only if the collector's own error response says a field is required.
 *
 * @returns {Promise<object>} connect's return_value.
 */
export async function connect (host, licenseKey, appName) {
  const facts = {
    pid: process.pid,
    host: 'connect-service-check',
    language: 'nodejs',
    app_name: [appName],
    agent_version: '1.0.0-connect-service-check',
    high_security: false,
    identifier: `nodejs:${appName}`,
    settings: {},
    environment: [],
    utilization: {
      metadata_version: 5,
      logical_processors: 1,
      total_ram_mib: 1024,
      hostname: 'connect-service-check'
    }
  }

  const returnValue = await invokeRawMethod(host, {
    method: 'connect',
    licenseKey,
    body: [facts]
  })

  if (!returnValue || !returnValue.agent_run_id) {
    throw new Error(`connect against ${host} did not return an agent_run_id: ${JSON.stringify(returnValue)}`)
  }

  return returnValue
}
