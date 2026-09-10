import fs from 'fs'
import { args } from './args.js'
import { HOSTS, preconnect, connect } from './connect-client.js'
import { waitFor } from './poll-until.js'
import {
  createClient,
  findApmApplicationGuid,
  enableApmBrowser,
  updateAgentApplicationSettings,
  deleteApplication,
  EnumLiteral
} from './nerdgraph-client.js'
import { generateMaximalBrowserSettings } from './settings-generator.js'
import { extractNreumConfig } from './snippet-sandbox.js'
import { computeBucket1, computeBucket2, computeBucket3, computeBucket4, hasRegressions, needsFieldMapUpdate, buildMarkdownReport } from './report.js'

// Base name for the throwaway APM app; a run-scoped suffix is always
// appended so concurrent runs never collide.
const APP_BASE_NAME = 'connect-service-check'

async function main () {
  const host = HOSTS[args.environment]
  if (!host) throw new Error(`No collector host configured for environment "${args.environment}"`)

  const appName = `${APP_BASE_NAME}-${process.env.GITHUB_RUN_ID || Date.now()}`
  const graphClient = createClient(args.environment, args.nerdgraphApiKey)

  console.log(`Connecting to ${host} to create/find app "${appName}"...`)
  const redirectHost = await preconnect(host, args.licenseKey)
  const beforeConnect = await connect(redirectHost, args.licenseKey, appName)
  console.log(`Connected. agent_run_id=${beforeConnect.agent_run_id}`)

  let guid = null

  try {
    const entityResult = await waitFor(
      () => findApmApplicationGuid(graphClient, { name: appName, accountId: args.accountId }),
      { description: 'entity synthesis', timeoutMs: 180000, intervalMs: 5000 }
    )

    if (entityResult.timedOut) {
      throw new Error(`Entity for app "${appName}" never became searchable via NerdGraph within the timeout. It may still exist in NR1 - check manually.`)
    }

    guid = entityResult.result
    console.log(`Found entity guid: ${guid}`)

    console.log('Enabling APM browser monitoring...')
    await enableApmBrowser(graphClient, {
      guid,
      settings: { loaderType: new EnumLiteral('SPA'), cookiesEnabled: true, distributedTracingEnabled: true }
    })

    console.log('Introspecting NerdGraph schema for browser settings and generating a maximal-deviation payload...')
    const { settings, fieldPaths } = await generateMaximalBrowserSettings(graphClient)
    console.log(`Generated values for ${fieldPaths.length} leaf field(s).`)

    console.log('Applying mutated settings...')
    const updateResult = await updateAgentApplicationSettings(graphClient, { guid, settings })
    const settingsErrors = updateResult?.agentApplicationSettingsUpdate?.errors || []
    if (settingsErrors.length > 0) {
      console.log(`NerdGraph rejected ${settingsErrors.length} field(s) of the mutation (mutation still applied for the rest):`)
      for (const e of settingsErrors) console.log(`  - ${e.field}: [${e.errorClass}] ${e.description}`)
    }

    const beforeExtracted = extractNreumConfig(beforeConnect.js_agent_loader)

    console.log('Polling connect until the snippet reflects the mutation (or timeout)...')
    let afterConnect = beforeConnect
    let afterExtracted = beforeExtracted

    const propagationResult = await waitFor(
      async () => {
        afterConnect = await connect(redirectHost, args.licenseKey, appName)
        afterExtracted = extractNreumConfig(afterConnect.js_agent_loader)
        return JSON.stringify(afterExtracted) !== JSON.stringify(beforeExtracted) ? afterExtracted : null
      },
      { description: 'settings propagation to collector', timeoutMs: 180000, intervalMs: 10000 }
    )

    if (propagationResult.timedOut) {
      console.log('WARNING: snippet never visibly changed within the timeout. Comparing against whatever the last connect call returned - expect regressions below.')
    }

    const bucket1 = computeBucket1(beforeExtracted, afterExtracted)
    const bucket2 = computeBucket2(afterExtracted)
    const bucket3 = computeBucket3(fieldPaths, beforeExtracted, afterExtracted)
    const bucket4 = computeBucket4()

    const report = buildMarkdownReport({
      meta: { environment: args.environment, accountId: args.accountId, appName },
      bucket1,
      bucket2,
      bucket3,
      bucket4
    })

    fs.writeFileSync(args.reportFile, report, 'utf8')
    console.log(report)

    if (needsFieldMapUpdate({ bucket3, bucket4 })) {
      // A GitHub Actions workflow command: renders as a yellow warning
      // annotation on the run's summary page, visible without opening the
      // full report - separate from job pass/fail, since "needs triage"
      // isn't the same thing as "broke."
      console.log(
        `::warning title=field-map.js needs updating::${bucket3.unreviewed.length} unreviewed NerdGraph field(s) and ` +
        `${bucket4.gaps.length} unmapped agent-model field(s) found - update .github/actions/connect-service-check/field-map.js (see the report for the full list).`
      )
    }

    if (hasRegressions({ bucket2, bucket3 })) {
      console.error('Regressions found - see report above.')
      process.exitCode = 1
    }
  } finally {
    if (guid) {
      console.log(`Deleting throwaway app (guid=${guid})...`)
      try {
        await deleteApplication(graphClient, { guid })
        console.log('Deleted.')
      } catch (err) {
        console.error(`Failed to delete app guid=${guid} - it may be orphaned, check NR1 manually. ${err.message}`)
        process.exitCode = 1
      }
    } else {
      console.error(`No entity guid was ever resolved for app "${appName}" - if it was created by the connect call above, it was NOT deleted and needs manual cleanup.`)
      process.exitCode = 1
    }
  }
}

main().catch(err => {
  console.error(err)
  process.exitCode = 1
})
