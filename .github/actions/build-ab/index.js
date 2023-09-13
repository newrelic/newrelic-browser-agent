import fs from 'fs'
import path from 'path'
import url from 'url'
import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts'
import { S3Client, ListObjectsCommand } from '@aws-sdk/client-s3'
import { v4 as uuidv4 } from 'uuid'
import { args } from './args.js'
import { fetchRetry } from '../shared-utils/fetch-retry.js'
import Handlebars from 'handlebars'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const template = Handlebars.compile(await fs.promises.readFile(path.resolve(__dirname, './template.js'), 'utf-8'))

let nextScript
const abScripts = []

// 0. Ensure the output directory is available and the target file does not exist

const outputFile = path.join(
  path.resolve(__dirname, '../../../temp'),
  `${args.environment}.js`
)
await fs.promises.mkdir(path.dirname(outputFile), { recursive: true })
if (fs.existsSync(outputFile)) {
  await fs.promises.rm(outputFile)
}

const nextScriptRequest = await fetchRetry(`${args.next}?_nocache=${uuidv4()}`, { retry: 3 })
nextScript = await nextScriptRequest.text()

if (['dev', 'staging'].includes(args.environment)) {
  if (!args.abAppId || !args.abLicenseKey) {
    throw new Error('Cannot deploy current loader or experiments without A/B app id and license key.')
  }

  const currentScript = await fetchRetry(`${args.current}?_nocache=${uuidv4()}`, { retry: 3 })
  abScripts.push({ name: 'current', contents: await currentScript.text() })

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
    Prefix: 'experiments/',
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

  if (experimentsList.size === 0) {
    console.log('No experiments to include in A/B script.')
  } else {
    for (const experiment of experimentsList) {
      const experimentLoader = `https://js-agent.newrelic.com/${experiment}nr-loader-experimental.min.js`
      const experimentScript = await fetchRetry(`${experimentLoader}?_nocache=${uuidv4()}`, { retry: 3 })
      abScripts.push({ name: experiment, contents: await experimentScript.text() })
    }
  }
}
console.log('writing', abScripts.length + 1,'scripts:', [{ name: 'next' }, ...abScripts].map(x => x.name).join(', '))

await fs.promises.writeFile(
  outputFile,
  template({
    args, nextScript, abScripts
  }),
  { encoding: 'utf-8' }
)
