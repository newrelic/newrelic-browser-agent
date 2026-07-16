import process from 'process'
import path from 'path'
import url from 'url'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

export const args = yargs(hideBin(process.argv))
  .usage('$0 [options]')

  .choices('mode', ['capture', 'compare'])
  .describe('mode', 'Whether to capture local build stats for a single ref, or compare previously captured stats across refs.')
  .demandOption('mode')

  .string('label')
  .describe('label', '(capture mode) Label identifying the ref being captured, e.g. `current`, `main`, `release`.')

  .string('build-dir')
  .describe('build-dir', '(capture mode) Path to the build directory containing the webpack *.stats.json files to capture.')
  .default('build-dir', path.resolve(path.join(__dirname, '../../../build')))

  .string('npm-pack-file')
  .describe('npm-pack-file', '(capture mode) Path to the JSON output of `npm pack --json --dry-run`.')

  .string('output-file')
  .describe('output-file', '(capture mode) Path to write the normalized capture stats file to.')

  .array('stats-file')
  .describe('stats-file', '(compare mode) Repeatable `label=path` pair pointing at a captured stats file. First one supplied is treated as the base column.')

  .choices('format', ['terminal', 'markdown', 'json'])
  .array('format')
  .describe('format', 'One or more output formats.')
  .default('format', ['terminal'])

  .string('output-dir')
  .describe('output-dir', 'Directory to output file format reports.')
  .default('output-dir', path.resolve(path.join(__dirname, '../../../build')))

  .string('output-markdown-file-name')
  .describe('output-markdown-file-name', 'Name of the file to create with markdown report data.')
  .default('output-markdown-file-name', 'size_report.md')

  .string('output-json-file-name')
  .describe('output-json-file-name', 'Name of the file to create with json report data.')
  .default('output-json-file-name', 'size_report.json')

  .check((argv) => {
    if (argv.mode === 'capture') {
      if (!argv.label) throw new Error('Missing required argument: label')
      if (!argv.npmPackFile) throw new Error('Missing required argument: npm-pack-file')
      if (!argv.outputFile) throw new Error('Missing required argument: output-file')
    }

    if (argv.mode === 'compare') {
      if (!argv.statsFile || argv.statsFile.length < 2) throw new Error('At least two --stats-file label=path pairs are required in compare mode')
    }

    return true
  })

  .argv

export function parseStatsFileArgs (statsFileArgs) {
  return statsFileArgs.map((entry) => {
    const separatorIndex = entry.indexOf('=')

    if (separatorIndex === -1) {
      throw new Error(`Invalid --stats-file value "${entry}". Expected format label=path.`)
    }

    return {
      label: entry.slice(0, separatorIndex),
      path: entry.slice(separatorIndex + 1)
    }
  })
}
