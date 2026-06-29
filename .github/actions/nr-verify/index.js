import { args } from './args.js'
import { fetchRetry } from '../shared-utils/fetch-retry.js'
import {
  expandLoaderFileNames,
  resolveLoaderFileNames
} from '../shared-utils/loaders.js'

const {
  loaderFileNames,
  loaderVersion
} = await resolveLoaderFileNames({
  loaderVersion: args.loaderVersion
})
const verifyFileNames = expandLoaderFileNames(loaderFileNames, loaderVersion)
const envOptions = {
  stage: {
    url: 'https://staging-api.newrelic.com/v2/js_agent_loaders/version.json'
  },
  prod: {
    url: 'https://api.newrelic.com/v2/js_agent_loaders/version.json'
  }
}

const verifyJobs = args.environment.flatMap(env => {
  return verifyFileNames.map(loaderFileName => ({
    env,
    loaderFileName
  }))
})

const results = await Promise.allSettled(
  verifyJobs.map(async jobDetails => {
    try {
      const verifyRequest = await fetchRetry(`${envOptions[jobDetails.env].url}?loader_version=${jobDetails.loaderFileName}`, {
        retry: 3,
        method: 'GET',
        redirect: 'follow',
        headers: {
          'Accept-Encoding': 'gzip, deflate, br'
        }
      })

      if (!verifyRequest.ok) {
        console.error(`Loader ${jobDetails.loaderFileName} appears to be missing in ${jobDetails.env} NR environment.`)
        return false
      } else {
        console.log(`Verified existence of ${jobDetails.loaderFileName} in ${jobDetails.env} NR environment.`)
        return true
      }
    } catch (err) {
      console.log(`FAILURE: ${jobDetails.loaderFileName}\n\n`)
      throw new Error(err)
    }
  })
)

if (
  results.find(result => result.status === 'rejected') ||
  results.find(result => result.value === false)
) {
  throw new Error('Not all loaders could be verified in NR.')
} else {
  console.log(`Verified ${results.length} loaders in NR`)
  process.exit(0)
}
