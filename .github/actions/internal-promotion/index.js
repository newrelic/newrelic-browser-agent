import fs from 'fs'
import path from 'path'
import url from 'url'
import process from 'process'
import { v4 as uuidv4 } from 'uuid'
import { args } from './args.js'
import { fetchRetry } from '../shared-utils/fetch-retry.js'
import Handlebars from '../build-ab/handlebars.js'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const outputDir = path.resolve(__dirname, '../../../temp/internal-promotion')

// Ensure the output directory exists
await fs.promises.mkdir(outputDir, { recursive: true })

// Fetch the released script from the specified URL
const releasedScriptRequest = await fetchRetry(`${args.released}?_nocache=${uuidv4()}`, { retry: 3 })

if (!releasedScriptRequest.ok || typeof releasedScriptRequest.text !== 'function') {
  throw new Error(`Could not retrieve the loader script from ${args.released}`)
}

const releasedScript = (await releasedScriptRequest.text()).replace(/\/\/# sourceMappingURL=.*?\.map/, '')
const releasedScriptOutput = path.join(outputDir, `${args.environment}-released.js`)

// Use the released.js template from build-ab
const templatePath = path.resolve(__dirname, '../build-ab/templates/released.js')
const releasedScriptTemplate = Handlebars.compile(await fs.promises.readFile(templatePath, 'utf-8'))

await fs.promises.writeFile(
  releasedScriptOutput,
  releasedScriptTemplate({
    args, releasedScript
  }),
  { encoding: 'utf-8' }
)

console.log(`Successfully created released asset for ${args.environment} environment: ${releasedScriptOutput}`)
