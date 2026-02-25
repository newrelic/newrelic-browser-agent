# Change Tracking Action

This action creates a single New Relic change tracking event for one account/entity combination. Call this action multiple times to create events for multiple accounts or entities.

## Required Secrets

Before using this action, you need to create the following GitHub secrets:

### API Keys
- `NR_CHANGE_TRACKING_API_KEY_NR1` - New Relic User API key for account 1067061
- `NR_CHANGE_TRACKING_API_KEY_BROWSER` - New Relic User API key for account 550352

### Entity GUIDs
- `NR_ENTITY_GUID_NR1_STAGING` - Entity GUID for account 1067061 staging environment
- `NR_ENTITY_GUID_NR1_US_PROD` - Entity GUID for account 1067061 US production
- `NR_ENTITY_GUID_NR1_EU_PROD` - Entity GUID for account 1067061 EU production
- `NR_ENTITY_GUID_BROWSER_STAGING` - Entity GUID for account 550352 staging environment

**NOTE: The workflow action must have access to staging to publish successfully in staging region**

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `accountId` | Yes | - | New Relic account ID (e.g., 1067061, 550352) |
| `entityGuid` | Yes | - | Entity GUID for the application |
| `apiKey` | Yes | - | New Relic User API key for the account |
| `region` | Yes | - | New Relic region (US, EU, dev or Staging) |
| `version` | Yes | - | Version being deployed |
| `category` | No | Deployment | Category of event (Deployment or Feature Flag) |
| `type` | No | Basic | Type of deployment (Basic, Rollback, Blue Green, Canary, Rolling, Shadow) |
| `featureFlagId` | No | - | ID of the feature flag (required when category is Feature Flag) |
| `description` | No | - | Description of the event |
| `changelog` | No | - | Changelog for the deployment (URL or text) |
| `commit` | No | - | Commit hash for the deployment |
| `deepLink` | No | - | Deep link URL for the deployment |
| `user` | No | - | Username of the actor or bot |
| `groupId` | No | - | String to correlate two or more events |
| `shortDescription` | No | - | Short description for the event |

## Supported Environments and Regions

| Environment | Region | Account 1067061 Secret | Account 550352 Secret |
|-------------|--------|------------------------|----------------------|
| staging | Staging | `NR_ENTITY_GUID_NR1_STAGING` | `NR_ENTITY_GUID_BROWSER_STAGING` |
| us-prod | US | `NR_ENTITY_GUID_NR1_US_PROD` | N/A |
| eu-prod | EU | `NR_ENTITY_GUID_NR1_EU_PROD` | N/A |

**Note:** Dev environment is not supported by the New Relic Change Tracking API.

## Usage Examples

### Basic Deployment Event (Single Account)

```yaml
- name: Create change tracking event (Account 1067061)
  uses: ./.github/actions/change-tracking
  with:
    accountId: '1067061'
    entityGuid: ${{ secrets.NR_ENTITY_GUID_NR1_STAGING }}
    apiKey: ${{ secrets.NR_CHANGE_TRACKING_API_KEY_NR1 }}
    region: 'Staging'
    version: 'staging-latest'
```

### Multiple Accounts for Same Environment

```yaml
# Create event for account 1067061
- name: Create staging change tracking event (Account 1067061)
  uses: ./.github/actions/change-tracking
  with:
    accountId: '1067061'
    entityGuid: ${{ secrets.NR_ENTITY_GUID_NR1_STAGING }}
    apiKey: ${{ secrets.NR_CHANGE_TRACKING_API_KEY_NR1 }}
    region: 'Staging'
    version: 'staging-latest'
    shortDescription: 'Staging: main branch deployment'
    commit: ${{ github.sha }}
    user: ${{ github.actor }}
    groupId: '${{ github.run_id }}-${{ github.sha }}'

# Create event for account 550352
- name: Create staging change tracking event (Account 550352)
  uses: ./.github/actions/change-tracking
  with:
    accountId: '550352'
    entityGuid: ${{ secrets.NR_ENTITY_GUID_BROWSER_STAGING }}
    apiKey: ${{ secrets.NR_CHANGE_TRACKING_API_KEY_BROWSER }}
    region: 'Staging'
    version: 'staging-latest'
    shortDescription: 'Staging: main branch deployment'
    commit: ${{ github.sha }}
    user: ${{ github.actor }}
    groupId: '${{ github.run_id }}-${{ github.sha }}'
```

This allows you to see all related deployments grouped together in New Relic.

### Production Deployment with Rolling Type

```yaml
- name: Get version number
  id: agent-loader-version
  run: echo "results=$(cat package.json | jq -r '.version')" >> $GITHUB_OUTPUT

- name: Create US production change tracking event
  uses: ./.github/actions/change-tracking
  with:
    accountId: '1067061'
    entityGuid: ${{ secrets.NR_ENTITY_GUID_NR1_US_PROD }}
    apiKey: ${{ secrets.NR_CHANGE_TRACKING_API_KEY_NR1 }}
    region: 'US'
    version: ${{ steps.agent-loader-version.outputs.results }}
    type: 'Rolling'
    description: 'Production release v${{ steps.agent-loader-version.outputs.results }}'
    shortDescription: 'US Prod: v${{ steps.agent-loader-version.outputs.results }}'
    commit: ${{ github.sha }}
    user: ${{ github.actor }}
    groupId: '${{ github.run_id }}-${{ github.sha }}'
```

### Feature Flag Events

When feature flags are updated (e.g., changes to `released.js`), create a Feature Flag event:

```yaml
- name: Check if released.js changed
  id: check-released
  run: |
    if git diff HEAD^ HEAD --name-only | grep -q ".github/actions/build-ab/templates/released.js"; then
      echo "changed=true" >> $GITHUB_OUTPUT
    else
      echo "changed=false" >> $GITHUB_OUTPUT
    fi

- name: Create dev change tracking event (Account 1067061)
  uses: ./.github/actions/change-tracking
  with:
    accountId: '1067061'
    entityGuid: ${{ secrets.NR_ENTITY_GUID_NR1_STAGING }}
    apiKey: ${{ secrets.NR_CHANGE_TRACKING_API_KEY_NR1 }}
    region: 'Staging'
    version: dev-latest
    category: ${{ steps.check-released.outputs.changed == 'true' && 'Feature Flag' || 'Deployment' }}
    type: 'Basic'
    featureFlagId: ${{ steps.check-released.outputs.changed == 'true' && 'hardcoded feature flag' || '' }}
    description: ${{ steps.check-released.outputs.changed == 'true' && 'Feature flag configuration updated' || 'Standard deployment' }}
    shortDescription: ${{ steps.check-released.outputs.changed == 'true' && 'Dev: Feature flags updated' || 'Dev: Deployment' }}
    commit: ${{ github.sha }}
    user: ${{ github.actor }}
    groupId: '${{ github.run_id }}-${{ github.sha }}'
```

### Shadow Deployment (Experiment)

```yaml
- name: Create experiment change tracking event
  uses: ./.github/actions/change-tracking
  with:
    accountId: '1067061'
    entityGuid: ${{ secrets.NR_ENTITY_GUID_NR1_STAGING }}
    apiKey: ${{ secrets.NR_CHANGE_TRACKING_API_KEY_NR1 }}
    region: 'Staging'
    version: 'dev-experiment-branch-name'
    type: 'Shadow'
    description: 'Experiment deployment for branch experiment-branch-name'
    shortDescription: 'Experiment: experiment-branch-name'
    commit: ${{ github.sha }}
    user: ${{ github.actor }}
    groupId: '${{ github.run_id }}-${{ github.sha }}'
```

### Correlating Multiple Events

Use the same `groupId` across multiple action calls to correlate events:

```yaml
# All these events are correlated via the same groupId
- name: Create US prod event
  uses: ./.github/actions/change-tracking
  with:
    accountId: '1067061'
    entityGuid: ${{ secrets.NR_ENTITY_GUID_NR1_US_PROD }}
    apiKey: ${{ secrets.NR_CHANGE_TRACKING_API_KEY_NR1 }}
    region: 'US'
    version: '1.2.3'
    shortDescription: 'US Prod: v1.2.3'
    groupId: '${{ github.run_id }}-${{ github.sha }}'

- name: Create EU prod event
  uses: ./.github/actions/change-tracking
  with:
    accountId: '1067061'
    entityGuid: ${{ secrets.NR_ENTITY_GUID_NR1_EU_PROD }}
    apiKey: ${{ secrets.NR_CHANGE_TRACKING_API_KEY_NR1 }}
    region: 'EU'
    version: '1.2.3'
    shortDescription: 'EU Prod: v1.2.3'
    groupId: '${{ github.run_id }}-${{ github.sha }}'

- name: Create dev event
  uses: ./.github/actions/change-tracking
  with:
    accountId: '1067061'
    entityGuid: ${{ secrets.NR_ENTITY_GUID_NR1_STAGING }}
    apiKey: ${{ secrets.NR_CHANGE_TRACKING_API_KEY_NR1 }}
    region: 'Staging'
    version: '1.2.3'
    shortDescription: 'Dev: Prod release v1.2.3'
    groupId: '${{ github.run_id }}-${{ github.sha }}'
```

## Notes

- The action creates a **single** change tracking event for one account/entity combination
- Call the action multiple times to create events for multiple accounts or entities
- The action uses `sudo snap install newrelic-cli` to install the New Relic CLI on Linux runners
- The action runs on the `Browser-Agent-Assigned-IP-Linux` runner when specified in the workflow
- **Categories supported**: 
  - `Deployment` - For code deployments (default). Required field: `version`. Optional fields: `changelog`, `commit`, `deepLink`
  - `Feature Flag` - For feature flag changes. Required field: `featureFlagId`
- Event types follow New Relic CLI conventions: Basic, Rollback, Blue Green, Canary, Rolling, Shadow
- Use `groupId` to correlate related events across different accounts/environments (recommended: `${{ github.run_id }}-${{ github.sha }}`)
- For more information, see the [New Relic Change Tracking documentation](https://docs.newrelic.com/docs/change-tracking/change-tracking-events/)

