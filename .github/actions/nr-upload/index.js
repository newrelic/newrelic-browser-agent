import { v4 as uuidv4 } from 'uuid'
import { args } from './args.js'
import { fetchRetry } from '@newrelic/browser-agent.actions.shared-utils/fetch-retry.js'
import { constructLoaderFileNames, constructFuzzyVersions } from '../shared-utils/loaders.js'

const loaderFileNames = constructLoaderFileNames(args.loaderVersion)
const fuzzyVersions = constructFuzzyVersions(args.loaderVersion)
const envOptions = {
  stage: {
    url: 'https://staging-api.newrelic.com/v2/js_agent_loaders/create.json',
    headers: {
      'X-Api-Key': args.stageApiKey
    }
  },
  prod: {
    url: 'https://api.newrelic.com/v2/js_agent_loaders/create.json',
    headers: {
      'X-Api-Key': args.prodApiKey
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

await Promise.allSettled(
  uploadJobs.map(async jobDetails => {
    try {
      const uploadRequest = await fetchRetry(envOptions[jobDetails.env], {
        retry: 3,
        method: 'PUT',
        redirect: 'follow',
        headers: envOptions[env].headers,
        body: JSON.stringify({
          js_agent_loader: {
            version: jobDetails.loaderFileName,
            loader: jobDetails.loaderFileContent
          },
          set_current: false
        })
      })

      if (!uploadRequest.ok) {
        throw new Error(`Upload failed with status code ${uploadRequest.status}.`)
      } else {
        console.log(`Completed upload of ${jobDetails.loaderFileName} to ${jobDetails.env} environment.`)
      }
    } catch (error) {
      console.error(`Upload for ${jobDetails.loaderFileName} to ${jobDetails.env} environment failed. ${error.message}`)
    }
  })
)
