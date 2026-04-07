# Agent2Query Build Action

This GitHub Action builds the Agent2Query test assets with templated license keys.

## Overview

The Agent2Query assets are used for testing the New Relic Browser Agent. This action injects licenseKeys  dynamically using Handlebars templates to allow the keys to remain hidden on a public repository.

## Files Generated

The action generates the following files in `temp/agent-2-query/`:

- `latest-staging.html` - HTML test page for the latest (dev) staging version
- `latest-staging-config.js` - Configuration for the latest staging version
- `latest-us-prod.html` - HTML test page for the latest US production version
- `latest-us-prod-config.js` - Configuration for the latest US production version
- `released-staging.html` - HTML test page for the released staging version
- `released-staging-config.js` - Configuration for the released staging version
- `released-us-prod.html` - HTML test page for the released US production version
- `released-us-prod-config.js` - Configuration for the released US production version
- `events.js` - Event generation script
- `square.png` - Static image asset (copied from source)

See [this diagram](https://whimsical.com/6VcSPKQ9PqAQmWgnwM37cN) for information on how agent-2-query works holistically for the browser agent

## Usage

```yaml
- name: Build Agent2Query assets
  uses: ./.github/actions/build-agent2query
  with:
    latest_staging_license_key: ${{ secrets.A2Q_LATEST_STAGING_LICENSE_KEY }}
    latest_us_prod_license_key: ${{ secrets.A2Q_LATEST_US_PROD_LICENSE_KEY }}
    released_staging_license_key: ${{ secrets.A2Q_RELEASED_STAGING_LICENSE_KEY }}
    released_us_prod_license_key: ${{ secrets.A2Q_RELEASED_US_PROD_LICENSE_KEY }}
```

## Inputs

- `latest_staging_license_key` (required): License key for the latest staging version
- `latest_us_prod_license_key` (required): License key for the latest US production version
- `released_staging_license_key` (required): License key for the released staging version
- `released_us_prod_license_key` (required): License key for the released US production version

## Required GitHub Secrets

The following secrets must be configured in the repository:

- `A2Q_LATEST_STAGING_LICENSE_KEY` - New Relic license key for latest staging agent tests
- `A2Q_LATEST_US_PROD_LICENSE_KEY` - New Relic license key for latest US production agent tests
- `A2Q_RELEASED_STAGING_LICENSE_KEY` - New Relic license key for released staging agent tests
- `A2Q_RELEASED_US_PROD_LICENSE_KEY` - New Relic license key for released US production agent tests

## Template Files

Templates are located in `templates/` directory and use Handlebars syntax. The templates receive:

- `latestStagingLicenseKey` - The latest staging version license key
- `latestUsProdLicenseKey` - The latest US production version license key
- `releasedStagingLicenseKey` - The released staging version license key
- `releasedUsProdLicenseKey` - The released US production version license key

## Output

Generated files are placed in `$GITHUB_WORKSPACE/temp/agent-2-query/` and are then processed for upload to S3 in a subsequent job.
