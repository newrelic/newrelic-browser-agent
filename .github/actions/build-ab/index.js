import fs from 'fs'
import path from 'path'
import url from 'url'
import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts'
import { S3Client, ListObjectsCommand } from '@aws-sdk/client-s3'
import { v4 as uuidv4 } from 'uuid'
import { args } from './args.js'
import { fetchRetry } from '../shared-utils/fetch-retry.js'

const config = {
  init: {
    distributed_tracing: {
      enabled: true
    },
    ajax: {
      deny_list: [
        'nr-data.net',
        'bam.nr-data.net',
        'staging-bam.nr-data.net',
        'bam-cell.nr-data.net'
      ]
    },
    session_replay: {
      enabled: true,
      sampleRate: 0.5,
      errorSampleRate: 1
    }
  },

  loader_config: {
    accountID: '1',
    trustKey: '1',
    agentID: args.appId,
    licenseKey: args.licenseKey,
    applicationID: args.appId
  },

  info: {
    beacon: 'staging-bam.nr-data.net',
    errorBeacon: 'staging-bam.nr-data.net',
    licenseKey: args.licenseKey,
    applicationID: args.appId,
    sa: 1
  }
}

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
await fs.promises.writeFile(
  outputFile,
  `window.NREUM=${JSON.stringify(config)}\n\n`,
  { encoding: 'utf-8' }
)

// 2. Write the current loader script
console.log(`Writing current loader ${args.current} in A/B script.`)
const currentScript = await fetchRetry(`${args.current}?_nocache=${uuidv4()}`, { retry: 3 })
await fs.promises.appendFile(
  outputFile,
  await currentScript.text() + '\n\n',
  { encoding: 'utf-8' }
)

// 3. Write the next loader script
console.log(`Writing current loader ${args.next} in A/B script.`)
const nextScript = await fetchRetry(`${args.next}?_nocache=${uuidv4()}`, { retry: 3 })
await fs.promises.appendFile(
  outputFile,
  await nextScript.text() + '\n\n',
  { encoding: 'utf-8' }
)

// 4. Find and write any experiments if env is not prod or eu-prod
if (['dev', 'staging'].includes(args.environment)) {
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
    CommonPrefixes.forEach(prefix => experimentsList.add(prefix.Prefix))

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
      const experimentLoader = `https://js-agent.newrelic.com/${experiment}nr-loader-spa.min.js`
      console.log(`Writing experiment loader ${experimentLoader} in A/B script.`)
      const experimentScript = await fetchRetry(`${experimentLoader}?_nocache=${uuidv4()}`, { retry: 3 })
      await fs.promises.appendFile(
        outputFile,
        await experimentScript.text() + '\n\n',
        { encoding: 'utf-8' }
      )
    }
  }
}

// add entitlements NG script shim
(async () => {
  if (environment === 'dev') return
  const entitlementsEndpoints = {
    dev: '',
    staging: 'https://staging-one.newrelic.com',
    prod: 'https://one.newrelic.com',
    'eu-prod': 'https://one.eu.newrelic.com'
  }
  const entitlementsNG = `
  try {
    var xhr = new XMLHttpRequest()
    xhr.open('POST', '${entitlementsEndpoints[environment]}/graphql')
    xhr.setRequestHeader('authority', '${entitlementsEndpoints[environment]}')
    xhr.setRequestHeader('cache-control','no-cache')
    xhr.setRequestHeader('content-type', 'application/json; charset=utf-8')
    xhr.setRequestHeader('newrelic-requesting-services','platform|nr1-ui')
    xhr.setRequestHeader('pragma','no-cache')

    xhr.send(
        JSON.stringify({
            'query': 'query PlatformEntitlementsQuery($names: [String]!) { currentUser { id authorizedAccounts { id entitlements(filter: {names: $names}) { name __typename } __typename } __typename } }',
            'variables': {
                'names': [
                    'hipaa',
                    'fedramp'
                ]
            }
        })
    )

    xhr.addEventListener('load', function(evt){
      try{
        var entitlementsData = JSON.parse(evt.currentTarget.responseText)
        // call the newrelic api(s) after evaluating entitlements...
        var canRunSr = true
        if (entitlementsData.data && entitlementsData.data.currentUser && entitlementsData.data.currentUser.authorizedAccounts && entitlementsData.data.currentUser.authorizedAccounts.length) {
          for (var i = 0; i < entitlementsData.data.currentUser.authorizedAccounts.length; i++){
            var ent = entitlementsData.data.currentUser.authorizedAccounts[i]
            if (!ent.entitlements || !ent.entitlements.length) continue
            for (var j = 0; j < ent.entitlements.length; j++){
              if (ent.entitlements[j].name === 'fedramp' || ent.entitlements[j].name === 'hipaa') canRunSr = false
            }
          } 
        }
        if (canRunSr && newrelic && !!newrelic.start) newrelic.start('session_replay')
      } catch(e){
        // something went wrong...
        if (!!newrelic && !!newrelic.noticeError) newrelic.noticeError(e)
      }
    })
  } catch(err){
    // we failed our mission....
    if (!!newrelic && !!newrelic.noticeError) newrelic.noticeError(err)
  }
`

await fs.promises.appendFile(
  outputFile,
  entitlementsNG + '\n\n',
  { encoding: 'utf-8' }
)
})()

