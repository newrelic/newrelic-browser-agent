# Agent2Query Build Action

This GitHub Action builds the Agent2Query test assets with templated license keys.

## Overview

The Agent2Query assets are used for testing the New Relic Browser Agent. This action injects licenseKeys  dynamically using Handlebars templates to allow the keys to remain hidden on a public repository.

## Files Generated

The action generates the following files in `temp/agent-2-query/`:

- `released-config.js` - Configuration for the released version
- `latest-config.js` - Configuration for the latest (dev) version
- `released.html` - HTML test page for released version
- `latest.html` - HTML test page for latest version
- `events.js` - Event generation script
- `square.png` - Static image asset (copied from source)

See [this diagram](https://whimsical.com/6VcSPKQ9PqAQmWgnwM37cN) for information on how agent-2-query works holistically for the browser agent

## Usage

```yaml
- name: Build Agent2Query assets
  uses: ./.github/actions/build-agent2query
  with:
    released_license_key: ${{ secrets.A2Q_RELEASED_LICENSE_KEY }}
    latest_license_key: ${{ secrets.A2Q_LATEST_LICENSE_KEY }}
```

## Inputs

- `released_license_key` (required): License key for the released version
- `latest_license_key` (required): License key for the latest version

## Required GitHub Secrets

The following secrets must be configured in the repository:

- `A2Q_RELEASED_LICENSE_KEY` - New Relic license key for released agent tests
- `A2Q_LATEST_LICENSE_KEY` - New Relic license key for latest agent tests

## Template Files

Templates are located in `templates/` directory and use Handlebars syntax. The templates receive:

- `releasedLicenseKey` - The released version license key
- `latestLicenseKey` - The latest version license key

## Output

Generated files are placed in `$GITHUB_WORKSPACE/temp/agent-2-query/` and are then processed for upload to S3 in a subsequent job.
