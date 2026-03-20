// console.log('MFE 4! -- THIS FILE IS PRELOADED IN TESTS WITH THE MOCK-API plugin!')
//
// This file acts as an async module loader (like webpack's one-vbp runtime)
// It uses generators to load mfe-preload-late.js, keeping itself in the stack
// when register() is called from the loaded module

(function () {
  const api4 = newrelic.register({
    id: '4',
    name: 'test 4'
  })

  let iterations4 = 0
  while (iterations4++ < 5000) {
    const div = document.createElement('div')
    div.textContent = 'MFE4 DIV ' + Math.random().toString(36).substring(7)
    div.id = 'mfe4-div-' + iterations4
    document.body.appendChild(div)
  }

  while (iterations4-- > 0) {
    const divToRemove = document.getElementById('mfe4-div-' + iterations4)
    if (divToRemove) {
      divToRemove.remove()
    }
  }

  // Store on window so test can access if needed
  window.api4 = api4

  // Generator-based async module loader (similar to webpack runtime)
  // This keeps mfe-preload.js in the stack when modules it loads call register()
  function * asyncModuleLoader () {
    // Fetch the module code (with cache-busting to get fresh content)
    const response = yield fetch('./js/mfe/mfe-preload-late.js?t=' + Date.now())
    const code = yield response.text()

    // Debug: log the code to verify what we're executing
    console.log('Code to execute:', code.substring(0, 200))

    // Execute the code directly within the generator context
    // This keeps the generator on the stack when register() is called
    // (similar to how webpack executes bundled modules)
    try {
      // Add sourceURL so the eval'd code shows proper filename in stack traces
      // Use response.url but strip query params for cross-browser compatibility with stack parsers
      const urlWithoutQuery = response.url.split('?')[0]
      const codeWithSourceURL = code + '\n//# sourceURL=' + urlWithoutQuery
      // Use eval to execute - this keeps the generator on the stack
      // eslint-disable-next-line
      eval(codeWithSourceURL)
    } catch (err) {
      console.error('Error executing module:', err)
      console.error('Failed code:', code)
    }
  }

  // Start the async loading sequence after delay
  setTimeout(() => {
    const loader = asyncModuleLoader()

    // Recursive next() pattern that keeps the generator active
    const next = (value) => {
      const result = loader.next(value)
      if (!result.done && result.value && result.value.then) {
        result.value.then(next).catch(err => console.error('Module load failed:', err))
      }
    }
    next()
  }, 3000)
})()
