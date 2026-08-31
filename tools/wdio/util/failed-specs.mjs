import path from 'path'
import url from 'url'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

export const FAILED_SPECS_DIR = path.resolve(__dirname, '../../../.wdio-results')
export const SUMMARY_FILE = path.join(FAILED_SPECS_DIR, 'failed-specs.json')
