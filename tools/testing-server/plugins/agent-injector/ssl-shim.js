const yargs = require('yargs')
const { hideBin } = require('yargs/helpers')
const args = yargs(hideBin(process.argv)).argv

/**
 * This script is injected into test HTML pages to disable SSL in the agent.
 */
module.exports = (initString = '{}') => `window.NREUM||(NREUM={});NREUM.init||(NREUM.init=${initString});NREUM.init.ssl=${args.B ? 'true' : 'false'};`
