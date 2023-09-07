import { v4 as uuidv4 } from 'uuid'
import { args } from './args.js'
import { fetchRetry } from '../shared-utils/fetch-retry.js'
import { constructLoaderFileNames, constructFuzzyVersions } from '../shared-utils/loaders.js'

const loaderFileNames = constructLoaderFileNames(args.loaderVersion)
const fuzzyVersions = constructFuzzyVersions(args.loaderVersion)
const envOptions = {
  stage: {
    url: 'https://staging-api.newrelic.com/v2/js_agent_loaders/create.json',
    headers: {
      'X-Api-Key': args.stageApiKey,
      'Content-Type': 'application/json'
    }
  },
  prod: {
    url: 'https://api.newrelic.com/v2/js_agent_loaders/create.json',
    headers: {
      'X-Api-Key': args.prodApiKey,
      'Content-Type': 'application/json'
    }
  }
}

const loaderFileContents = (await Promise.all(
  loaderFileNames.map(async loaderFileName => {
    const fileContentsRequest = await fetchRetry(`https://js-agent.newrelic.com/${loaderFileName}?_nocache=${uuidv4()}`, { retry: 3 })

    if (!fileContentsRequest.ok) {
      throw new Error(`Download for loader ${loaderFileName} failed.`)
    }

    const fileContents = await fileContentsRequest.text()

    return [loaderFileName, fileContents]
  })
)).reduce((aggregator, [loaderFileName, fileContents]) => {
  aggregator[loaderFileName] = fileContents
  return aggregator
}, {})

const uploadJobs = args.environment.map(env => {
  return Object.entries(loaderFileContents).map(([loaderFileName, loaderFileContent]) => {
    return [
      {
        env,
        loaderFileName,
        loaderFileContent
      },
      {
        env,
        loaderFileName: loaderFileName.replace(args.loaderVersion, fuzzyVersions.PATCH),
        loaderFileContent
      },
      {
        env,
        loaderFileName: loaderFileName.replace(args.loaderVersion, fuzzyVersions.MINOR),
        loaderFileContent
      }
    ]
  }).flat()
}).flat()

let jobs = 0, success = true
await Promise.allSettled(
  uploadJobs.map(async (jobDetails, i, arr) => {
    try {
      const uploadRequest = await fetchRetry(envOptions[jobDetails.env].url, {
        retry: 3,
        method: 'PUT',
        redirect: 'follow',
        headers: envOptions[jobDetails.env].headers,
        body: JSON.stringify({
          js_agent_loader: {
            version: jobDetails.loaderFileName,
            loader: jobDetails.loaderFileContent
          },
          set_current: false
        })
      })

      if (!uploadRequest?.ok) {
        success = false
        throw new Error(`Upload failed with status code ${uploadRequest?.status}. ${uploadRequest?.statusText}`)
      } else {
        console.log(`Completed upload of ${jobDetails.loaderFileName} to ${jobDetails.env} environment.`)
      }
    } catch (error) {
      success = false
      console.error(`Upload for ${jobDetails.loaderFileName} to ${jobDetails.env} environment failed. ${error.message}`)
      throw new Error(`Upload for ${jobDetails.loaderFileName} to ${jobDetails.env} environment failed. ${error.message}`)
    } finally {
      console.log(`ran ${++jobs} of ${arr.length} jobs`)
    }
  })
).finally(() => {
  process.exit(Number(!success))
})
