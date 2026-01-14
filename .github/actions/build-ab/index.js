import fs from 'fs'
import path from 'path'
import url from 'url'
import process from 'process'
import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts'
import { S3Client, ListObjectsCommand } from '@aws-sdk/client-s3'
import { v4 as uuidv4 } from 'uuid'
import { args } from './args.js'
import { fetchRetry } from '../shared-utils/fetch-retry.js'
import Handlebars from './handlebars.js'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const outputDir = path.resolve(__dirname, '../../../temp')
const fileList = []

// 0. Ensure the output directory is available and the target file does not exist
await fs.promises.mkdir(outputDir, { recursive: true })

// 1. Create the released environment script
const releasedScriptRequest = await fetchRetry(`${args.released}?_nocache=${uuidv4()}`, { retry: 3 })

if (!releasedScriptRequest.ok || typeof releasedScriptRequest.text !== 'function') {
  throw new Error('Could not retrieve the latest published loader script.')
}

const releasedScript = (await releasedScriptRequest.text()).replace(/\/\/# sourceMappingURL=.*?\.map/, '')
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

if (['dev', 'staging'].includes(args.environment)) {
  // 2. Create latest environment script
  const latestScriptRequest = await fetchRetry(`${args.latest}?_nocache=${uuidv4()}`, { retry: 3 })

  if (!latestScriptRequest.ok || typeof latestScriptRequest.text !== 'function') {
    throw new Error('Could not retrieve the latest unpublished loader script.')
  }

  const latestScript = (await latestScriptRequest.text()).replace(/\/\/# sourceMappingURL=.*?\.map/, '')
  const latestScriptOutput = path.join(outputDir, `${args.environment}-latest.js`)
  const releasedScriptTemplate = Handlebars.compile(await fs.promises.readFile(path.resolve(__dirname, './templates/latest.js'), 'utf-8'))
  await fs.promises.writeFile(
    latestScriptOutput,
    releasedScriptTemplate({
      args, latestScript
    }),
    { encoding: 'utf-8' }
  )
  fileList.push(latestScriptOutput)

  // 3. Creating experiments script
  if (!args.role || !args.bucket || !args.region) {
    console.warn('Skipping experiments; AWS role, bucket, and region must be defined.')
  } else if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.warn('Skipping experiments; AWS credentials missing in environment variables.')
  } else {
    const stsClient = new STSClient({ region: args.region })
    const s3Credentials = await stsClient.send(new AssumeRoleCommand({
      RoleArn: args.role,
      RoleSessionName: 'downloadFromS3Session',
      DurationSeconds: 900
    }))

    const s3Client = new S3Client({
      region: args.region,
      credentials: {
        accessKeyId: s3Credentials.Credentials.AccessKeyId,
        secretAccessKey: s3Credentials.Credentials.SecretAccessKey,
        sessionToken: s3Credentials.Credentials.SessionToken
      }
    })

    let isTruncated = true
    const listCommand = new ListObjectsCommand({
      Bucket: args.bucket,
      Prefix: `experiments/${args.environment}/`,
      Delimiter: '/'
    });
    let experimentsList = new Set()

    while (isTruncated) {
      const { IsTruncated, NextMarker, CommonPrefixes } = await s3Client.send(listCommand)
      if (CommonPrefixes) CommonPrefixes.forEach(prefix => experimentsList.add(prefix.Prefix))

      if (IsTruncated) {
        listCommand.input.Marker = NextMarker
      } else {
        isTruncated = false
      }
    }

    const experimentScripts = []
    for (const experiment of experimentsList) {
      // Fetch the config file
      const experimentConfigUrl = `https://js-agent.newrelic.com/${experiment}config.js`
      const configRequest = await fetchRetry(`${experimentConfigUrl}?_nocache=${uuidv4()}`, { retry: 3 })
      
      // Fetch the loader file
      const experimentLoader = `https://js-agent.newrelic.com/${experiment}nr-loader-experimental.min.js`
      const loaderRequest = await fetchRetry(`${experimentLoader}?_nocache=${uuidv4()}`, { retry: 3 })

      if (!configRequest.ok || typeof configRequest.text !== 'function') {
        console.warn(`Could not retrieve the ${experiment} config.js file.`)
      } else if (!loaderRequest.ok || typeof loaderRequest.text !== 'function') {
        console.warn(`Could not retrieve the ${experiment} experimental loader script.`)
      } else {
        // Stitch config and loader together
        const configContent = (await configRequest.text()).replace(/\/\/# sourceMappingURL=.*?\.map/, '')
        const loaderContent = (await loaderRequest.text()).replace(/\/\/# sourceMappingURL=.*?\.map/, '')
        experimentScripts.push(configContent)
        experimentsScripts.push(loaderContent)
      }
    }

    console.log(`Found ${experimentScripts.length} experiments for ${args.environment} environment.`)

    const experimentsScriptOutput = path.join(outputDir, `${args.environment}-experiments.js`)
    const experimentsScriptTemplate = Handlebars.compile(await fs.promises.readFile(path.resolve(__dirname, './templates/experiments.js'), 'utf-8'))
    await fs.promises.writeFile(
      experimentsScriptOutput,
      experimentsScriptTemplate({
        args, experimentScripts
      }),
      { encoding: 'utf-8' }
    )
    fileList.push(experimentsScriptOutput)
  }
}

// 4. Write the postamble script
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

console.log(`Successfully created ${fileList.length} A/B files for ${args.environment} environment.`)
