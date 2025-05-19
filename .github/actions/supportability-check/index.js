import * as core from '@actions/core'
import { Octokit } from '@octokit/rest'

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = 'newrelic';
const REPO = 'newrelic-browser-agent';
const PULL_NUMBER = process.env.PR_NUMBER;

const SEARCH_STRING = 'SUPPORTABILITY_METRIC_CHANNEL';
const SEARCH_FILE = 'supportability_metrics.md';
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
      line.includes(SEARCH_STRING)
    ) {
      foundString.push(`[${currentFile}] ${line.substring(1)}`); // Optionally include filename
    }
  }

  // Find if the file was changed (look for diff headers)
  const foundFile = diffLines
    .filter(line => line.startsWith('+++ b/'))
    .map(line => line.replace('+++ b/', ''))
    .find(filename => filename === SEARCH_FILE);

  core.setOutput('found_string', JSON.stringify(foundString.length))
  core.setOutput('found_file', JSON.stringify(!!foundFile ? 1 : 0))

  // Optional: log for debugging
  if (foundString.length) {
    console.log(`Found "${SEARCH_STRING}" in the following added lines:\n${foundString.join('\n')}`);
  } else {
    console.log(`No added lines contain "${SEARCH_STRING}" in ${SEARCH_DIR}.`);
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