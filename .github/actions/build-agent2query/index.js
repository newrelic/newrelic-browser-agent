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

const releasedLicenseKey = args['released-license-key']
const latestLicenseKey = args['latest-license-key']

if (!releasedLicenseKey || !latestLicenseKey) {
  throw new Error('Both --released-license-key and --latest-license-key are required')
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
    releasedLicenseKey,
    latestLicenseKey
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
