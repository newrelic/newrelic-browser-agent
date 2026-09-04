import vm from 'vm'

/**
 * connect's `js_agent_loader` field is the literal <script> text the
 * collector renders for this app - it assigns window.NREUM.info / .init /
 * .loader_config inline, then (for the full loader) appends an async
 * <script> tag to fetch the rest of the agent. We only need the inline
 * assignments, but the snippet is live third-party-rendered text, so it
 * runs inside an isolated vm.Context with no fetch/require/filesystem
 * access - the sandbox is the safety boundary here, not a claim that the
 * text is safe.
 *
 * Returns whatever got assigned even if the script throws partway through
 * (e.g. while trying to touch the DOM after the assignments we care about
 * already ran), since the NREUM object is captured by reference.
 */
export function extractNreumConfig (jsAgentLoader) {
  if (!jsAgentLoader) {
    return { info: undefined, init: undefined, loaderConfig: undefined, error: 'js_agent_loader was empty/missing' }
  }

  const scriptBody = stripScriptTag(jsAgentLoader)
  const sandbox = buildSandbox()
  const context = vm.createContext(sandbox)

  let runtimeError = null
  try {
    vm.runInContext(scriptBody, context, { timeout: 5000, filename: 'js_agent_loader.js' })
  } catch (err) {
    runtimeError = err.message
  }

  const nreum = sandbox.window.NREUM || {}

  return {
    info: nreum.info,
    init: nreum.init,
    loaderConfig: nreum.loader_config,
    error: runtimeError
  }
}

function stripScriptTag (text) {
  const match = text.match(/<script[^>]*>([\s\S]*?)<\/script>/i)
  return match ? match[1] : text
}

function buildSandbox () {
  const window = {}
  window.window = window
  window.NREUM = {}

  const fakeElement = () => {
    const el = {
      style: {},
      attributes: {},
      setAttribute () {},
      getAttribute () { return null },
      appendChild () {},
      addEventListener () {},
      removeEventListener () {}
    }
    return el
  }

  const document = {
    createElement: fakeElement,
    getElementsByTagName () { return [fakeElement()] },
    documentElement: fakeElement(),
    currentScript: fakeElement(),
    addEventListener () {},
    querySelector () { return null }
  }

  window.document = document

  return {
    window,
    document,
    console,
    setTimeout,
    clearTimeout,
    Date,
    Math,
    JSON,
    Object,
    Array,
    String,
    Number,
    Boolean
  }
}
