import process from 'process'
import path from 'path'
import url from 'url'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

export const args = yargs(hideBin(process.argv))
  .usage('$0 [options]')

  .string('compare-from')
  .describe('compare-from', 'Version to compare sizes against. Valid values are `dev` or any version number for a release.')

  .string('compare-to')
  .describe('compare-to', 'Version to compare sizes for. Valid values are `local` or any version number for a release.')

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

  .demandOption(['compare-from', 'compare-to'])
  .argv
