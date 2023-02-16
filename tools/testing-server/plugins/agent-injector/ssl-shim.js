/**
 * This script is injected into test HTML pages to disable SSL in the agent.
 */
module.exports = 'window.NREUM||(NREUM={});NREUM.init||(NREUM.init={});NREUM.init.ssl=false;'
