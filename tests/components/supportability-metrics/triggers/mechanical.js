/**
 * Triggers for metrics that follow from a value: API names, loader and distribution types, frameworks, feature flags, config paths,
 * internal error reasons, and the simple checks the metrics feature runs at load.
 */
import { Instrument as Metrics } from '../../../../src/features/metrics/instrument'
import { Instrument as JSErrors } from '../../../../src/features/jserrors/instrument'
import { warn } from '../../../../src/common/util/console'
import { reportWarnings } from '../../../../src/common/dispatch/report-warnings'
import * as iframeModule from '../../../../src/common/dom/iframe'
import * as protocolModule from '../../../../src/common/url/protocol'

const fs = require('fs')
const path = require('path')

/** Runs the metrics feature's load-time checks against the shared agent. */
const singleChecks = async (ctx) => (await ctx.feature(Metrics)).singleChecks()

/**
 * Sets a value on an object by path, runs a callback, then restores the original value.
 * @param {Object} root
 * @param {string} objectPath Slash separated path, e.g. `session_replay/collect_fonts`.
 * @param {*} value
 * @param {function(): Promise<void>} fn
 */
async function withSetting (root, objectPath, value, fn) {
  const keys = objectPath.split('/')
  const last = keys.pop()
  const parent = keys.reduce((obj, key) => obj[key], root)
  const original = parent[last]
  parent[last] = value
  try { await fn() } finally { parent[last] = original }
}

/** Calls every `setup*API` function in src/loaders/api so each API is defined on the agent, as the feature instruments would. */
function setupAllApis (agent) {
  const apiDir = path.join(__dirname, '../../../../src/loaders/api')
  fs.readdirSync(apiDir).filter(file => file.endsWith('.js')).forEach(file => {
    const mod = require(path.join(apiDir, file))
    Object.keys(mod).filter(key => /^setup.+API$/.test(key) && key !== 'setupAPI').forEach(key => mod[key](agent))
  })
}

const INTERACTION_METHODS = ['actionText', 'setName', 'setAttribute', 'save', 'ignore', 'onEnd', 'getContext', 'end', 'get', 'createTracer']

/** Makes each framework detectable, including the parent a child framework requires. Returns a function that undoes it. */
const FRAMEWORK_FIXTURES = {
  React: () => setGlobals({ React: {} }),
  NextJS: () => setGlobals({ React: {}, next: { version: '1' } }),
  Vue: () => setGlobals({ Vue: {} }),
  NuxtJS: () => setGlobals({ Vue: {}, $nuxt: { nuxt: {} } }),
  Angular: () => setGlobals({ ng: {} }),
  AngularUniversal: () => combine(setGlobals({ ng: {} }), addElement('div', { 'ng-server-context': 'ssr' })),
  Svelte: () => setGlobals({ __svelte: {} }),
  SvelteKit: () => setGlobals({ __svelte: {}, __sveltekit_1: {} }),
  Preact: () => setGlobals({ preact: {} }),
  PreactSSR: () => combine(setGlobals({ preact: {} }), addElement('script', { type: '__PREACT_CLI_DATA__' })),
  AngularJS: () => setGlobals({ angular: {} }),
  Backbone: () => setGlobals({ Backbone: {} }),
  Ember: () => setGlobals({ Ember: {} }),
  Meteor: () => setGlobals({ Meteor: {} }),
  Zepto: () => setGlobals({ Zepto: {} }),
  Jquery: () => setGlobals({ jQuery: {} }),
  MooTools: () => setGlobals({ MooTools: {} }),
  Qwik: () => setGlobals({ qwikevents: {} }),
  Flutter: () => setGlobals({ _flutter: {} }),
  Electron: () => {
    const spy = jest.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 Electron/30.0.0')
    return () => spy.mockRestore()
  }
}

function setGlobals (globals) {
  Object.assign(window, globals)
  return () => Object.keys(globals).forEach(key => delete window[key])
}

function addElement (tag, attributes) {
  const element = document.createElement(tag)
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value))
  document.body.appendChild(element)
  return () => element.remove()
}

const combine = (...undo) => () => undo.forEach(fn => fn())

/** Builds an error whose stack and message route it through evaluateInternalError the way a real recorder error would. */
function internalErrorFor (reason) {
  const error = new Error('internal failure')
  if (reason === 'Rrweb') error.stack = 'Error: internal failure\n    at run (https://example.com/nr-1234-recorder.min.js:1:1)'
  if (reason === 'Rrweb-Security-Policy') {
    error.message = 'An attempt was made to break through the security policy of the user agent'
    error.stack = 'Error: ' + error.message + '\n    at run (https://example.com/nr-1234-recorder.min.js:1:1)'
  }
  return error
}

module.exports = {
  'API/<name>/called': (name, { agent }) => {
    setupAllApis(agent)
    const target = INTERACTION_METHODS.includes(name) ? agent.interaction() : agent
    const onerror = agent.runtime.onerror // some APIs change shared agent state, which later tests must not inherit
    try {
      if (name === 'setErrorHandler') target[name](() => false)
      else target[name]('name', {})
    } catch (e) { /* only the metric matters here, not what the API does with these arguments */ }
    agent.runtime.onerror = onerror
  },

  'API/register/<method>/called': async (method, { agent }) => {
    setupAllApis(agent)
    await withSetting(agent.init, 'api/register/enabled', true, () => {
      const registered = agent.register({ id: '1', name: 'test' })
      try { registered[method]('name', {}) } catch (e) { /* only the metric matters here */ }
    })
  },

  'Generic/LoaderType/<type>/Detected': (type, ctx) => withSetting(ctx.agent, 'runtime/loaderType', type, () => singleChecks(ctx)),

  // distMethod is a read-only property of the runtime, so shadow it on a derived object instead of assigning it
  'Generic/DistMethod/<method>/Detected': (method, ctx) => withSetting(ctx.agent, 'runtime', Object.create(ctx.agent.runtime, { distMethod: { value: method } }), () => singleChecks(ctx)),

  'Framework/<name>/Detected': async (name, ctx) => {
    const undo = FRAMEWORK_FIXTURES[name]()
    try { await singleChecks(ctx) } finally { undo() }
  },

  'Feature_Flag/<flag>/Seen': {
    samples: ['rum_v2', 'register', 'experimental.resources', 'websockets', 'no_spv', 'ajax_metrics_deny_list'],
    run: (flag, ctx) => withSetting(ctx.agent, 'init/feature_flags', [flag], () => singleChecks(ctx))
  },

  'Config/<init path>/Enabled': {
    samples: ['ajax/enabled', 'session_replay/collect_fonts', 'generic_events/autoStart'],
    run: (settingPath, ctx) => withSetting(ctx.agent.init, settingPath, true, () => singleChecks(ctx))
  },

  'Config/<init path>/Changed': {
    tags: ['Config/harvest/interval/Changed', 'Config/proxy/assets/Changed', 'Config/session/expiresMs/Changed'],
    run: (tag, ctx) => withSetting(ctx.agent.init, tag.replace(/^Config\//, '').replace(/\/Changed$/, ''), 12345, () => singleChecks(ctx))
  },

  'Internal/Error/<reason>': async (reason, ctx) => {
    const jserrors = await ctx.feature(JSErrors)
    const args = reason === 'Other' ? [internalErrorFor(reason)] : [internalErrorFor(reason), reason]
    ctx.agent.ee.emit('internal-error', args)
    ctx.forceDrain(jserrors) // the error waits in the emitter buffer until the feature is drained, which normally follows the RUM response
    await ctx.settle()
  },

  'Warn/<code>/Seen': async (code, ctx) => {
    const metrics = await ctx.feature(Metrics) // starts the feature that stores the metric
    const stop = reportWarnings(ctx.agent.ee) // the Agent constructor starts this for a real agent, which the shared test agent is not
    jest.spyOn(console, 'debug').mockImplementation(() => {})
    try {
      warn(Number(code))
    } finally {
      stop()
    }
    ctx.forceDrain(metrics) // the metric waits in the emitter until the metrics feature is drained
    await ctx.settle()
  },

  'API/setUserId/resetSession/called': async (_, ctx) => {
    await ctx.feature(Metrics) // the first feature to run also bootstraps the session that handles the reset
    setupAllApis(ctx.agent)
    ctx.agent.setUserId('first-user')
    ctx.agent.setUserId('second-user', true)
  },

  'Generic/FileProtocol/Detected': async (_, ctx) => {
    jest.spyOn(protocolModule, 'isFileProtocol').mockReturnValue(true)
    await singleChecks(ctx)
  },

  'Generic/Runtime/IFrame/Detected': async (_, ctx) => {
    jest.spyOn(iframeModule, 'isIFrameWindow').mockReturnValue(true)
    await singleChecks(ctx)
  },

  'Generic/Runtime/Nonce/Detected': async (_, ctx) => {
    const metrics = await ctx.feature(Metrics)
    await withSetting(metrics, 'agentNonce', 'abc123', () => singleChecks(ctx))
  },

  'Generic/Obfuscate/Detected': async (_, ctx) => {
    const metrics = await ctx.feature(Metrics)
    await withSetting(metrics, 'obfuscator', { obfuscateConfigRules: [{ regex: 'x', replacement: 'y' }] }, () => singleChecks(ctx))
  },

  'Generic/WebDriver/Detected': async (_, ctx) => {
    Object.defineProperty(window.navigator, 'webdriver', { value: true, configurable: true })
    try { await singleChecks(ctx) } finally { delete window.navigator.webdriver }
  },

  'Generic/BFCache/PageRestored': async (_, ctx) => {
    (await ctx.feature(Metrics)).eachSessionChecks()
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
  }
}
