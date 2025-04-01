function extractJavaScriptFilenames (stack) {
  // Regex to match JavaScript filenames in the stack trace
  const regex = /(\/[\w-./]+\.js)/g
  const matches = new Set()
  let match

  // Iterate through all matches in the stack
  while ((match = regex.exec(stack)) !== null) {
    matches.push(match[1])
  }

  return matches
}

const xhr = new XMLHttpRequest()
xhr.open('GET', '/json')
xhr.addEventListener('load', () => {
  const stack = new Error().stack
  const fileNamesOfThisModule = extractJavaScriptFilenames(stack)

  console.log(fileNamesOfThisModule)

  console.log(stack)

  console.log(fileNamesOfThisModule)

  const resources = performance.getEntriesByType('resource')
  resources.forEach((resource) => {
    console.log('resource:', resource)
    // fileNamesOfThisModule
    if (resource.initiatorType === 'script' && resource.name.includes('nested1.js')) {
      console.log('matching resource:', resource)
    }
  })
})
xhr.send()
