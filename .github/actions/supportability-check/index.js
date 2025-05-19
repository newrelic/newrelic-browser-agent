import * as core from'@actions/core'
import { Octokit } from '@octokit/rest'

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = 'newrelic';
const REPO = 'newrelic-browser-agent';
const PULL_NUMBER = process.env.PR_NUMBER;

const SEARCH_STRING = 'SUPPORTABILITY_METRIC_CHANNEL';
const SEARCH_FILE = 'supportability_metrics.md';

const octokit = new Octokit({ auth: GITHUB_TOKEN });

async function main() {
  // Get the diff as a patch
  const { data: prDiff } = await octokit.pulls.get({
    owner: OWNER,
    repo: REPO,
    pull_number: PULL_NUMBER,
    mediaType: { format: 'diff' }
  });

  // Find added lines with the search string
  const diffLines = prDiff.split('\n');
  const changedLines = diffLines.filter(line => line.startsWith('+') && !line.startsWith('+++'));
  const foundString = changedLines.filter(line => line.includes(SEARCH_STRING));

  // Find if the file was changed (look for diff headers)
  const foundFile = diffLines
    .filter(line => line.startsWith('+++ b/'))
    .map(line => line.replace('+++ b/', ''))
    .find(filename => filename === SEARCH_FILE);

  console.log('Setting found_string to: ', foundString.length)
  console.log('Setting found_file to: ', !!foundFile ? 1: 0)

  // Set outputs for GitHub Actions
  core.setOutput('found_string', JSON.stringify(foundString.length))
  core.setOutput('found_file', JSON.stringify(!!foundFile ? 1: 0))

  // Optional: log for debugging
  if (foundString) {
    console.log(`Found "${SEARCH_STRING}" in the following added lines:\n${foundString}`);
  } else {
    console.log(`No added lines contain "${SEARCH_STRING}".`);
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