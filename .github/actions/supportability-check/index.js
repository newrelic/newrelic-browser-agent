import * as core from '@actions/core'
import { Octokit } from '@octokit/rest'

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = 'newrelic';
const REPO = 'newrelic-browser-agent';
const PULL_NUMBER = process.env.PR_NUMBER;

const SEARCH_STRINGS = ['SUPPORTABILITY_METRIC_CHANNEL', '.reportSupportabilityMetric', 'storeSupportabilityMetrics'];
const SEARCH_FILE = 'docs/supportability-metrics.md';
const SEARCH_DIR = 'src/'; // Change this to your target directory

const octokit = new Octokit({ auth: GITHUB_TOKEN });

async function main() {
  const { data: prDiff } = await octokit.pulls.get({
    owner: OWNER,
    repo: REPO,
    pull_number: PULL_NUMBER,
    mediaType: { format: 'diff' }
  });

  const diffLines = prDiff.split('\n');
  let currentFile = '';
  let foundString = [];

  for (const line of diffLines) {
    if (line.startsWith('+++ b/')) {
      currentFile = line.replace('+++ b/', '');
    } else if (
      currentFile.startsWith(SEARCH_DIR) &&
      line.startsWith('+') &&
      !line.startsWith('+++') &&
      SEARCH_STRINGS.some(searchString => line.includes(searchString))
    ) {
      foundString.push([currentFile, line.substring(1).trim()]); // Store the file and line content
    }
  }

  let foundStringTable = `| File | Content |
| --- | --- |
  `
  foundString.forEach(([file, content]) => {
    foundStringTable += `| ${file} | \`${content}\` |
    `;
  });

  // Find if the file was changed (look for diff headers)
  const foundFile = diffLines
    .filter(line => line.startsWith('+++ b/'))
    .map(line => line.replace('+++ b/', ''))
    .find(filename => filename === SEARCH_FILE);

  core.setOutput('found_string', foundString.length ? foundStringTable.trim() : 'No matching changes found');
  core.setOutput('found_file', String(!!foundFile))

  // Optional: log for debugging
  if (foundString.length) {
    console.log(`Found "${SEARCH_STRINGS}" in the following added lines:\n${foundString.join('\n')}`);
  } else {
    console.log(`No added lines contain "${SEARCH_STRINGS}" in ${SEARCH_DIR}.`);
  }
  if (foundFile) {
    console.log(`File changed: ${foundFile}`);
  } else {
    console.log(`File "${SEARCH_FILE}" not changed.`);
  }
}

main().catch(err => {
  core.setFailed(err.message);
});
