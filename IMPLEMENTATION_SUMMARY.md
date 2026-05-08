# Implementation Summary: NR1 Agent-Integration Changes (CDD NR-355574)

## Overview

This document summarizes the implementation of changes defined in CDD NR-355574 to eliminate "double-shipping" of Browser Agent instances to NR1 environments and introduce manual, controlled deployments.

## Changes Implemented

### 1. New GitHub Actions Workflow: `internal-promotion.yml`

**Location**: `.github/workflows/internal-promotion.yml`

**Purpose**: Provides a manual workflow for deploying specific Browser Agent versions to NR1 environments.

**Key Features**:
- Manual trigger only (`workflow_dispatch`)
- Sequential deployment path: **staging → jp-prod → eu-prod → us-prod**
- Each environment is a separate job with GitHub Environment protection (required reviewers)
- Uses `needs:` keyword to enforce strict deployment ordering
- Flexible version specification via `cdn_path` parameter:
  - Default: `https://js-agent.newrelic.com/dev/nr-loader-spa.min.js` - current dev build
  - Version number (e.g., `"1.314.0"`) - deploys specific released version
  - Full URL - deploys from specified CDN path
- Automatic CDN cache purging
- Change tracking marker creation for observability

### 2. New Composite Action: `internal-promotion`

**Location**: `.github/actions/internal-promotion/`

**Files Created**:
- `action.yml` - Composite action definition
- `index.js` - Main build script
- `args.js` - Command-line argument parsing

**Purpose**: Builds and updates the "released" asset for a specific NR1 environment.

**Functionality**:
- Fetches the specified Browser Agent version from CDN
- Generates environment-specific configuration wrapper
- Uploads to S3 at `internal/<env>-released.js` path
- Purges and verifies CDN cache

### 3. Updated `build-ab` Action

**Location**: `.github/actions/build-ab/`

**Changes Made**:
- **Dev environment**: Now generates only `latest`, `experiments`, and `postamble` (removed `released`)
- **Staging environment**: Now generates only `released` and `postamble` (removed `latest` and `experiments`)
- **Prod environments**: No change - continue to generate only `released` and `postamble`

**Files Modified**:
- `index.js` - Updated logic to conditionally generate assets based on environment
- `args.js` - Updated validation to require A/B credentials only for dev environment

**Rationale**: Eliminates double-shipping by ensuring each environment loads only one agent instance.

### 4. Updated `publish-dev.yml` Workflow

**Location**: `.github/workflows/publish-dev.yml`

**Changes Made**:
- **Removed** `publish-dev-ab` job (previously auto-published to dev environment)
- **Removed** `publish-staging-ab` job (previously auto-published to staging environment)
- **Removed** `create-staging-change-tracking` job (no longer needed with manual deployments)
- **Updated** Slack notification to mention manual deployment via internal-promotion workflow

**Effect**: Publishing to dev CDN path (`dev/`) still happens automatically on merge to main, but NR1 environments are no longer updated automatically.

### 5. Updated `publish-release.yml` Workflow

**Location**: `.github/workflows/publish-release.yml`

**Changes Made**:
- **Removed** `publish-prod-ab` job (previously auto-published to US prod NR1)
- **Removed** `publish-eu-prod-ab` job (previously auto-published to EU prod NR1)
- **Removed** `publish-jp-prod-ab` job (previously auto-published to JP prod NR1)
- **Added** `environment: public-release` to `publish-prod-to-s3` job (requires approval for customer-facing releases)
- **Changed** change tracking jobs to use `environment: change-tracking` instead of `staging`
- **Added** comment noting that NR1 deployments are now manual per CDD NR-355574

**Retained**:
- Change tracking jobs for NR1 production environments (informational only)
- External customer asset publishing (versioned releases)
- "current" version updates

**Effect**: GitHub releases require manual approval before publishing customer-facing assets to CDN, and do not automatically update NR1 environments.

### 6. New Release Gate Workflow: `release-gate.yml`

**Location**: `.github/workflows/release-gate.yml`

**Purpose**: Provides a required status check that prevents Release-Please PRs from being merged until the Internal Promotion workflow has completed successfully.

**Key Features**:
- Runs on `pull_request` and `workflow_run` events
- Auto-passes for non-Release-Please PRs (regular feature branches)
- For Release-Please PRs (branches starting with `release-please--`):
  - Verifies that Internal Promotion workflow has run for this branch
  - Checks that the `deploy-prod` job completed successfully
  - Fails with helpful error messages if promotion is incomplete
- Acts as a verification gate ensuring NR1 environments are updated before release

**Branch Protection**: Add "Verify Internal Promotion" as a required status check to enforce this gate.

### 7. GitHub Environments

**Required Setup**: Create the following GitHub Environments with required reviewers:

| Environment Name | Required Reviewers | Purpose |
|-----------------|-------------------|----------|
| `nr1-staging` | 1-2 senior engineers | Gate staging deployments |
| `nr1-jp-prod` | 1-2 team leads | Gate JP production deployments |
| `nr1-eu-prod` | 1-2 team leads | Gate EU production deployments |
| `nr1-us-prod` | 2-3 engineering managers/tech leads | Gate US production deployments |
| `public-release` | 2-3 engineering managers/tech leads | Gate customer-facing CDN releases |
| `change-tracking` | (optional) | Change tracking marker creation |

### 8. Documentation

**Location**: `docs/`

**Files Created/Updated**:
- `docs/nr1-deployment-process.md` - Comprehensive deployment guide
- `docs/release-gate-setup.md` - Release Gate setup instructions  
- `docs/release-gate-quick-reference.md` - Quick reference card
- `IMPLEMENTATION_SUMMARY.md` - This file
- `RELEASE_GATE_IMPLEMENTATION_SUMMARY.md` - Release Gate technical details

**Created**: Comprehensive documentation covering:
- Overview of the new deployment process
- Step-by-step workflow instructions
- Deployment scenarios (staging promotion, production rollout, rollback)
- Change tracking and monitoring guidance
- Troubleshooting tips
- Migration notes for team members

## Architecture Changes

### Before (Auto-Shipping)

```
[PR Merge to main] → [publish-dev.yml] → [Auto-publish to dev & staging NR1]
                                                 ↓
                                     [Dev loads: latest + released]
                                     [Staging loads: latest + released]

[GitHub Release] → [publish-release.yml] → [Auto-publish to prod/eu/jp NR1]
                                                   ↓
                                     [Prod loads: latest + released]
```

### After (Manual Control with Release Gate)

```
[PR Merge to main] → [publish-dev.yml] → [Publish to dev/ CDN path]
                                                 ↓
                                         (No automatic NR1 update)

[Manual Action] → [internal-promotion.yml] → [Sequential deployment with approvals]
                                                       ↓
                                   [1. Staging] → Approve → Deploy
                                        ↓
                                   [2. JP Prod] → Approve → Deploy
                                        ↓
                                   [3. EU Prod] → Approve → Deploy
                                        ↓
                                   [4. US Prod] → Approve → Deploy
                                        ↓
                                   [All environments updated]

[Release-Please PR] → [release-gate.yml] → Verify promotion complete
                                                       ↓
                            ✅ Pass (if deploy-prod succeeded)
                            ❌ Fail (if promotion incomplete)

[GitHub Release] → [publish-release.yml] → [Manual approval] → [Publish versioned assets]
                                                   ↓
                                    (No automatic NR1 update)
```

## CDN Asset Structure

### Current Asset Paths

- **Development (auto-updated)**:
  - `dev/nr-loader-spa.min.js` - Latest build from main branch
  - `dev/nr-loader-*.min.js` - Other loader types

- **Versioned Releases (manual GitHub release)**:
  - `nr-loader-spa-1.314.0.min.js` - Specific version
  - `nr-loader-spa-1.x.x.min.js` - Dynamic latest 1.x version
  - `nr-loader-spa-current.min.js` - Latest stable release

- **Internal NR1 (manual deployment)**:
  - `internal/dev-latest.js` - Dev environment canary build
  - `internal/dev-postamble.js` - Dev environment postamble
  - `internal/staging-released.js` - Staging environment stable build
  - `internal/staging-postamble.js` - Staging environment postamble
  - `internal/prod-released.js` - US production stable build
  - `internal/prod-postamble.js` - US production postamble
  - `internal/eu-prod-released.js` - EU production stable build
  - `internal/eu-prod-postamble.js` - EU production postamble
  - `internal/jp-prod-released.js` - JP production stable build
  - `internal/jp-prod-postamble.js` - JP production postamble

## Rollout Checklist

- [x] Create `internal-promotion.yml` workflow
- [x] Create `internal-promotion` composite action
- [x] Update `build-ab` action logic for dev/staging
- [x] Remove auto-shipping from `publish-dev.yml`
- [x] Remove auto-shipping from `publish-release.yml`
- [x] Add public-release environment gate to `publish-release.yml`
- [x] Update change tracking jobs to use `change-tracking` environment
- [x] Create deployment process documentation
- [x] Create Release Gate system for Release-Please PRs
- [ ] Create GitHub Environments with required reviewers
- [ ] Update team agreements on releasing agent versions (per CDD)
- [ ] Ensure A2Q is finalized and reporting/alerting telemetry changes (per CDD)
- [ ] Update browser-agent-foundation to support new environment constraints (external repo)

## Testing Recommendations

### Before Merging

1. **Validate Workflow Syntax**:
   ```bash
   # Use GitHub's workflow validator
   gh workflow view internal-promotion.yml
   ```

2. **Dry-Run Simulation**:
   - Test the workflow with a non-production environment first
   - Verify CDN paths resolve correctly
   - Confirm change tracking markers are created

3. **Rollback Test**:
   - Deploy a version, then immediately roll back to previous
   - Verify CDN cache purge works as expected

### After Merging

1. **Monitor First Deployment**:
   - Use internal-promotion workflow to update staging
   - Verify asset appears at expected CDN path
   - Check change tracking marker in New Relic
   - Confirm NR1 pages load the new version

2. **Validate Build-AB Changes**:
   - Trigger a merge to main (publish-dev workflow)
   - Verify dev environment gets `latest` (not `released`)
   - Manually deploy to staging
   - Verify staging gets `released` (not `latest`)

## Security Considerations

- **Access Control**: Workflow requires appropriate GitHub repository permissions
- **Environment Protection**: Consider adding required reviewers for production deployments
- **Audit Trail**: All deployments logged via GitHub Actions and NR change tracking
- **Secret Management**: Existing AWS and Fastly secrets reused; no new secrets required

## Migration Path for Team

1. **Communication**: Announce the change and share documentation
2. **Training**: Walk through the internal-promotion workflow
3. **Gradual Adoption**: 
   - Week 1: Use for staging deployments only
   - Week 2: Extend to production environments
   - Week 3: Full cutover, deprecate old practices
4. **Monitoring**: Watch for confusion or issues during transition

## Backward Compatibility

- **publish-internal workflow**: Remains available for backward compatibility
- **build-ab action**: Still supports all environments; internal logic updated
- **Experiment workflow**: Unchanged; continues to use internal-ab for experiments
- **External customers**: No impact; versioned releases work as before

## Future Enhancements

- **Automated Testing**: Add integration tests for deploy workflow
- **Approval Gates**: Implement required approvals for production deployments
- **Deployment Dashboard**: Create UI showing current versions in each environment
- **Scheduled Promotions**: Consider scheduled auto-promotions (e.g., staging → prod on Fridays)

## References

- **CDD**: [NR-355574](https://new-relic.atlassian.net/browse/NR-355574)
- **Repositories**:
  - Source: https://github.com/newrelic/newrelic-browser-agent
  - Foundation: https://source.datanerd.us/browser/browser-agent-foundation
- **Related Documentation**:
  - [NR1 Deployment Process](./docs/nr1-deployment-process.md)
  - [Integration Testing](./docs/integration-testing.md)

## Questions or Issues

For questions about this implementation, contact:
- **Driver**: (TBD per CDD)
- **Designer**: (TBD per CDD)
- **Team**: BR0WS3R team via #browser-agent-team Slack channel
