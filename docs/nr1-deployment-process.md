# NR1 Agent Deployment Process

## Overview

As of May 2026 (per CDD NR-355574), Browser Agent deployments to NR1 environments are now **manually controlled** via the `internal-promotion` GitHub Action workflow. This replaces the previous auto-shipping behavior where agent updates were automatically deployed when code was merged to main or when GitHub releases were published.

## Key Changes

### What Changed

1. **Manual Deployments Only**: NR1 environments (dev, staging, jp-prod, eu-prod, prod) no longer automatically receive agent updates
2. **Single Agent Instance**: Each environment now loads only one agent instance instead of two (no more "latest" + "released" double-shipping)
3. **Explicit Version Control**: Team members must explicitly choose which agent version to deploy to each environment
4. **Change Tracking**: All deployments create change tracking markers in New Relic for observability

### Environment-Specific Behavior

- **Dev**: Loads only the "latest" (canary) build from main branch
- **Staging**: Loads only the "released" build (manually promoted RC)
- **JP/EU/US Prod**: Load only the "released" build (manually promoted RC or official version)

## Using the Deploy Workflow

### Important Note on Sequential Approvals

The Internal Promotion workflow enforces a **strict sequential deployment path**:
- **staging** → **jp-prod** → **eu-prod** → **us-prod**

Each environment requires manual approval via GitHub Environment protection rules. You cannot skip environments or deploy out of order.

### Accessing the Workflow

1. Navigate to: https://github.com/newrelic/newrelic-browser-agent/actions/workflows/internal-promotion.yml
2. Click the "Run workflow" button
3. Fill in the required inputs

### Workflow Inputs

#### `cdn_path` (optional, default: dev build URL)
The Browser Agent version to deploy. Accepts multiple formats:

**Using default (dev build)**
```
cdn_path: (leave empty or use default)
```
Deploys the current dev build from main branch (`https://js-agent.newrelic.com/dev/nr-loader-spa.min.js`)

**Using a specific released version**
```
cdn_path: 1.314.0
```
Deploys the official released version at `https://js-agent.newrelic.com/nr-loader-spa-1.314.0.min.js`

**Using a full CDN URL**
```
cdn_path: https://js-agent.newrelic.com/nr-loader-spa-1.314.0.min.js
```
Deploys the agent from the specified URL

## Deployment Workflow

### Typical Release Process

1. **Development & Testing**
   - Code is merged to `main` branch
   - `publish-dev` workflow builds and publishes to CDN at `dev/` path
   - Dev environment can be manually updated to test latest changes

2. **Staging Promotion**
   - When ready for broader testing, trigger the Internal Promotion workflow:
     - The workflow will deploy sequentially through all 4 environments
     - Each environment requires manual approval before proceeding
   - **Staging approval**: Approve the staging deployment
   - Validate in staging environment before approving next step

3. **Production Promotion**
   - After validation in staging, approve JP production deployment
   - After JP validation, approve EU production deployment  
   - After EU validation, approve US production deployment (final gate)
   - Each step requires explicit approval and validation

4. **GitHub Release**
   - Once fully validated in all NR1 environments, cut a GitHub release
   - This publishes the versioned assets for external customers
   - The `publish-release` workflow handles external CDN distribution

### Rollback Procedure

If an issue is discovered after deployment:

1. Run the `internal-promotion` workflow again with the previous stable version
2. Specify the rollback version in `cdn_path`:
   ```
   cdn_path: 1.313.0  (previous stable version)
   ```
3. The workflow will deploy sequentially through the environments
4. You can approve only the environments that need rollback, or cancel the workflow after rolling back specific environments
5. Each environment update purges CDN cache immediately
6. Rollback typically completes within 30 seconds per environment

## Change Tracking

Every deployment via `internal-promotion` creates a change tracking marker in New Relic:
- **Account**: Environment-specific (1067061 for NR1 environments, 550352 for Browser staging)
- **Entity GUID**: Specific to each NR1 environment
- **Version**: The deployed agent version
- **Category**: Deployment
- **User**: GitHub actor who triggered the deployment
- **Deep Link**: Links back to the GitHub Actions run

These markers enable:
- Correlation of agent changes with telemetry changes
- Audit trail of who deployed what and when
- Easy identification of deployment-related issues

## Monitoring & Validation

After deployment:

1. **Check Change Tracking**: Verify the marker appears in NR1
2. **Monitor Error Rates**: Watch for spikes in JavaScript errors
3. **Review Agent Telemetry**: Check that agent features are working as expected
4. **Validate A2Q Data**: Ensure Agent2Query telemetry is flowing correctly

## Troubleshooting

### Deployment Failed

- Check GitHub Actions logs for the failed workflow run
- Verify AWS credentials and permissions
- Ensure the specified `cdn_path` exists and is accessible

### CDN Not Updating

- CDN cache is automatically purged during deployment
- If issues persist, verify Fastly cache status
- Check that the asset path matches expected pattern

### Wrong Version Deployed

- Run the workflow again with correct `cdn_path`
- CDN cache purge ensures immediate update
- No need to wait for cache TTL to expire

## Migration Notes

### For Team Members

- **No more automatic deployments** - You must manually trigger deployments
- **Test in staging first** - Always validate in staging before production
- **Communicate deployments** - Let the team know when deploying to production
- **Document versions** - Track which versions are in each environment

### For Automation

- The `publish-internal` workflow still exists for backward compatibility
- It accepts the same parameters but is no longer called automatically
- Consider deprecating once all processes migrate to `internal-promotion`

## Related Documentation

- [CDD NR-355574](https://new-relic.atlassian.net/browse/NR-355574) - Original change design
- [Integration Testing](./integration-testing.md) - Testing procedures
- [Contributing Guide](../CONTRIBUTING.md) - Development workflow

## Questions or Issues?

Contact the Browser Agent team via:
- Slack: #browser-agent-team
- GitHub: Open an issue in this repository
