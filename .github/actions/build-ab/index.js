import fs from 'fs'
import path from 'path'
import url from 'url'
import { v4 as uuidv4 } from 'uuid'
import { args } from './args.js'
import { fetchRetry } from '@newrelic/browser-agent.actions.shared-utils/fetch-retry.js'
import Handlebars from 'handlebars'
import { config } from './contents/config.js'
import { experiments } from './contents/experiments.js'

Handlebars.registerHelper('json', function(context) {
  return JSON.stringify(context);
});
const template = Handlebars.compile(await fs.promises.readFile('./templates/index.handlebars', 'utf-8'))

let current, next
const postScripts = []

// 0. Ensure the output directory is available and the target file does not exist
const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const outputFile = path.join(
  path.resolve(__dirname, '../../../temp'),
  `${args.environment}.js`
)
await fs.promises.mkdir(path.dirname(outputFile), { recursive: true })
if (fs.existsSync(outputFile)) {
  await fs.promises.rm(outputFile)
}

// 1. Write the NRBA configuration
console.log('Writing configuration in A/B script.')

console.log(`Writing current loader ${args.current} in A/B script.`)
const currentScript = await fetchRetry(`${args.current}?_nocache=${uuidv4()}`, { retry: 3 })
current = await currentScript.text()

// 3. Write the next loader script
console.log(`Writing current loader ${args.next} in A/B script.`)
const nextScript = await fetchRetry(`${args.next}?_nocache=${uuidv4()}`, { retry: 3 })
next = await nextScript.text()

console.log('writing', experiments.length, 'experiments')

postScripts.push({name: 'entitlement-check', contents: await fs.promises.readFile('./contents/entitlement-check.js', 'utf-8')})
console.log("writing", postScripts.length, "post scripts")

await fs.promises.writeFile(
  outputFile,
  template({
    config,
    current,
    next,
    experiments,
    postScripts
  }),
  { encoding: 'utf-8' }
)