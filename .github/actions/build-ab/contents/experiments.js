
import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts'
import { S3Client, ListObjectsCommand } from '@aws-sdk/client-s3'
import { args } from '../args.js'

export const experiments = []
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
        experiments.push({name: experiment, contents: await experimentScript.text()})
      }
    }
  }