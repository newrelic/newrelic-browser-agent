import { args } from './args.js'
import { fetchRetry } from '../shared-utils/fetch-retry.js'
import { constructLoaderFileNames, constructFuzzyVersions } from '../shared-utils/loaders.js'
import { loadManifest, matchesManifest } from '../shared-utils/integrity.js'

const manifest = args.manifest ? await loadManifest(args.manifest) : undefined

const loaderFileNames = constructLoaderFileNames(args.loaderVersion)
const fuzzyVersions = constructFuzzyVersions(args.loaderVersion)
const envOptions = {
  stage: {
    url: 'https://staging-api.newrelic.com/v2/js_agent_loaders/version.json'
  },
  prod: {
    url: 'https://api.newrelic.com/v2/js_agent_loaders/version.json'
  }
}

const verifyJobs = args.environment.map(env => {
  return loaderFileNames.map(loaderFileName => {
    return [
      {
        env,
        loaderFileName,
        manifestKey: loaderFileName
      },
      {
        env,
        loaderFileName: loaderFileName.replace(args.loaderVersion, fuzzyVersions.PATCH),
        manifestKey: loaderFileName
      },
      {
        env,
        loaderFileName: loaderFileName.replace(args.loaderVersion, fuzzyVersions.MINOR),
        manifestKey: loaderFileName
      }
    ]
  }).flat()
}).flat()

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
      }

      if (manifest) {
        // The fuzzy aliases (e.g. 1.324.x) hold the same content as the versioned file, so they are checked against it
        const loaderContent = (await verifyRequest.json())?.js_agent_loader?.loader
        if (typeof loaderContent !== 'string' || !matchesManifest(manifest, jobDetails.manifestKey, Buffer.from(loaderContent, 'utf-8'))) {
          console.error(`Loader ${jobDetails.loaderFileName} in ${jobDetails.env} NR environment does not match the integrity manifest for ${jobDetails.manifestKey}.`)
          return false
        }
        console.log(`Verified content of ${jobDetails.loaderFileName} in ${jobDetails.env} NR environment against the integrity manifest.`)
      } else {
        console.log(`Verified existence of ${jobDetails.loaderFileName} in ${jobDetails.env} NR environment.`)
      }
      return true
    } catch(err){
      console.log(`FAILURE: ${jobDetails.loaderFileName}\n\n`)
      throw new Error(err)
    }
  })
)

if (
  results.find(result => result.status === 'rejected') ||
  results.find(result => result.value === false)
) {
  throw new Error(`Not all loaders could be verified in NR.`)
} else {
  console.log(`Verified ${results.length} loaders in NR`)
  process.exit(0)
}
