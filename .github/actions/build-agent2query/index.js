import fs from 'fs'
import path from 'path'
import url from 'url'
import Handlebars from './handlebars.js'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const outputDir = path.resolve(__dirname, '../../../temp/agent-2-query')
const templatesDir = path.resolve(__dirname, './templates')
const staticDir = path.resolve(__dirname, './static')

// Parse command line arguments
const args = {}
process.argv.slice(2).forEach((arg, index, array) => {
  if (arg.startsWith('--')) {
    const key = arg.slice(2)
    const value = array[index + 1]
    args[key] = value
  }
})

const latestStagingLicenseKey = args['latest-staging-license-key']
const latestUsProdLicenseKey = args['latest-us-prod-license-key']
const releasedStagingLicenseKey = args['released-staging-license-key']
const releasedUsProdLicenseKey = args['released-us-prod-license-key']

if (!latestStagingLicenseKey || !latestUsProdLicenseKey || !releasedStagingLicenseKey || !releasedUsProdLicenseKey) {
  throw new Error('All license keys are required: --latest-staging-license-key, --latest-us-prod-license-key, --released-staging-license-key, --released-us-prod-license-key')
}

// Ensure the output directory exists
await fs.promises.mkdir(outputDir, { recursive: true })

// Process template files from templates directory
const templateFiles = await fs.promises.readdir(templatesDir)
for (const file of templateFiles) {
  const templatePath = path.join(templatesDir, file)
  const outputPath = path.join(outputDir, file)
  
  // Only process files, not directories
  const stat = await fs.promises.stat(templatePath)
  if (!stat.isFile()) continue
  
  const templateContent = await fs.promises.readFile(templatePath, 'utf-8')
  const template = Handlebars.compile(templateContent)
  
  const result = template({
    latestStagingLicenseKey,
    latestUsProdLicenseKey,
    releasedStagingLicenseKey,
    releasedUsProdLicenseKey
  })
  
  await fs.promises.writeFile(outputPath, result, { encoding: 'utf-8' })
  console.log(`Generated: ${file}`)
}

// Copy static files from static directory
const staticFiles = await fs.promises.readdir(staticDir)
for (const file of staticFiles) {
  const sourcePath = path.join(staticDir, file)
  const outputPath = path.join(outputDir, file)
  
  // Only copy files, not directories
  const stat = await fs.promises.stat(sourcePath)
  if (stat.isFile()) {
    await fs.promises.copyFile(sourcePath, outputPath)
    console.log(`Copied: ${file}`)
  }
}

console.log('Agent2Query assets generated successfully!')
