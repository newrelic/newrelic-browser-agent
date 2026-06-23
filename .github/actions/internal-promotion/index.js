import fs from 'fs'
import path from 'path'
import url from 'url'
import process from 'process'
import { v4 as uuidv4 } from 'uuid'
import { args } from './args.js'
import { fetchRetry } from '../shared-utils/fetch-retry.js'
import Handlebars from './handlebars.js'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const outputDir = path.resolve(__dirname, '../../../temp/internal-promotion')
const fileList = []

// Ensure the output directory exists
await fs.promises.mkdir(outputDir, { recursive: true })

// 1. Get the loader script content (from local build or CDN)
let releasedScript

// Try to use local build first (faster, more reliable, exact version we just built)
const localBuildPath = path.resolve(__dirname, '../../../build/nr-loader-spa.min.js')
if (fs.existsSync(localBuildPath)) {
  console.log(`Using local build from ${localBuildPath}`)
  releasedScript = (await fs.promises.readFile(localBuildPath, 'utf-8')).replace(/\/\/# sourceMappingURL=.*?\.map/, '')
} else {
  // Fall back to fetching from CDN (for specific version deployments)
  console.log(`Fetching loader from CDN: ${args.released}`)
  const releasedScriptRequest = await fetchRetry(`${args.released}?_nocache=${uuidv4()}`, { retry: 3 })

  if (!releasedScriptRequest.ok || typeof releasedScriptRequest.text !== 'function') {
    throw new Error(`Could not retrieve the loader script from ${args.released}`)
  }

  releasedScript = (await releasedScriptRequest.text()).replace(/\/\/# sourceMappingURL=.*?\.map/, '')
}

// 2. Create the released script
const releasedScriptOutput = path.join(outputDir, `${args.environment}-released.js`)
const releasedScriptTemplate = Handlebars.compile(await fs.promises.readFile(path.resolve(__dirname, './templates/released.js'), 'utf-8'))

await fs.promises.writeFile(
  releasedScriptOutput,
  releasedScriptTemplate({
    args, releasedScript
  }),
  { encoding: 'utf-8' }
)
fileList.push(releasedScriptOutput)

// 2. Create the postamble script
const postambleScriptOutput = path.join(outputDir, `${args.environment}-postamble.js`)
const postambleScriptTemplate = Handlebars.compile(await fs.promises.readFile(path.resolve(__dirname, './templates/postamble.js'), 'utf-8'))

await fs.promises.writeFile(
  postambleScriptOutput,
  postambleScriptTemplate({
    args
  }),
  { encoding: 'utf-8' }
)
fileList.push(postambleScriptOutput)

console.log(`Successfully created ${fileList.length} internal promotion assets for ${args.environment} environment`)
console.log(`  - Released script: ${releasedScriptOutput}`)
console.log(`  - Postamble script: ${postambleScriptOutput}`)

