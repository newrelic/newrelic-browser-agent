import fs from 'fs-extra'
import path from 'path'
import url from 'url'
import crypto from 'crypto'
import WDIOReporter from '@wdio/reporter'
import { FAILED_SPECS_DIR } from '../util/failed-specs.mjs'

const repoRoot = path.resolve(FAILED_SPECS_DIR, '..')

/**
 * Persists the final pass/fail outcome of each spec file to disk so CI can determine, after
 * the full run completes, exactly which spec files still failed (after all in-job retries) and
 * scope a follow-up retry job to just those files.
 *
 * `onRunnerEnd` fires once per spec-file execution attempt, including deferred `specFileRetries`
 * re-runs (which happen as a separate runner instance queued at the end of the run). Marker files
 * are keyed by a hash of the spec path, so a later attempt for the same file simply overwrites or
 * clears the earlier marker, giving last-attempt-wins semantics.
 *
 * `runnerStats.specs` also includes the mocha-globals shim file that `mocha-globals/index.mjs`
 * unshifts onto every runner's spec list -- that entry is filtered out before recording anything.
 */
export default class FailedSpecsReporter extends WDIOReporter {
  onRunnerEnd (runnerStats) {
    const specPaths = (runnerStats.specs || [])
      .filter(spec => !spec.endsWith('mocha-globals/globals.mjs'))
      .map(spec => spec.startsWith('file://') ? url.fileURLToPath(spec) : spec)

    for (const specPath of specPaths) {
      const relativeSpecPath = path.relative(repoRoot, specPath)
      const markerFile = path.join(FAILED_SPECS_DIR, `${crypto.createHash('md5').update(specPath).digest('hex')}.json`)

      if (runnerStats.failures) {
        fs.outputJsonSync(markerFile, { spec: relativeSpecPath })
      } else if (fs.pathExistsSync(markerFile)) {
        fs.removeSync(markerFile)
      }
    }
  }
}
