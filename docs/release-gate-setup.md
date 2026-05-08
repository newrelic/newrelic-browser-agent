# Release Gate Setup Guide

This guide walks through setting up the verification gate system for Release-Please PRs.

## Overview

The release gate system ensures that Release-Please PRs can only be merged after successfully completing the Internal Promotion workflow, which deploys to all NR1 environments in sequence: **staging → jp-prod → eu-prod → prod**.

## Components

1. **Internal Promotion Workflow** (`.github/workflows/internal-promotion.yml`)
   - Manual workflow that deploys to 4 environments sequentially
   - Each environment requires approval via GitHub Environment protection

2. **Release Gate Workflow** (`.github/workflows/release-gate.yml`)
   - Automatic status check for all PRs
   - Auto-passes for regular developer PRs
   - Verifies promotion completion for Release-Please PRs

## Setup Instructions

### Step 1: Create GitHub Environments

You need to create 4 GitHub Environments with required reviewers.

#### 1.1 Navigate to Environment Settings

1. Go to your repository on GitHub
2. Click **Settings** tab
3. In the left sidebar, click **Environments**
4. Click **New environment** button

#### 1.2 Create Each Environment

Create the following environments one by one:

##### Environment 1: `nr1-staging`

1. **Name**: `nr1-staging`
2. **Protection rules**:
   - ✅ **Required reviewers**
     - Add 1-2 team members who can approve staging deployments
     - Recommendation: Any senior engineer on the team
   - ⚠️ **Wait timer**: 0 minutes (optional)
   - ℹ️ **Deployment branches**: All branches (default)
3. Click **Save protection rules**

##### Environment 2: `nr1-jp-prod`

1. **Name**: `nr1-jp-prod`
2. **Protection rules**:
   - ✅ **Required reviewers**
     - Add 1-2 team members who can approve JP production deployments
     - Recommendation: Team leads or senior engineers
   - ⚠️ **Wait timer**: 0 minutes (optional)
   - ℹ️ **Deployment branches**: All branches (default)
3. Click **Save protection rules**

##### Environment 3: `nr1-eu-prod`

1. **Name**: `nr1-eu-prod`
2. **Protection rules**:
   - ✅ **Required reviewers**
     - Add 1-2 team members who can approve EU production deployments
     - Recommendation: Team leads or senior engineers
   - ⚠️ **Wait timer**: 0 minutes (optional)
   - ℹ️ **Deployment branches**: All branches (default)
3. Click **Save protection rules**

##### Environment 4: `nr1-us-prod`

1. **Name**: `nr1-us-prod`
2. **Protection rules**:
   - ✅ **Required reviewers**
     - Add 2-3 team members who can approve US production deployments
     - Recommendation: Team leads, tech leads, or engineering managers
     - Consider requiring multiple reviewers for production
   - ⚠️ **Wait timer**: 0 minutes (optional)
   - ℹ️ **Deployment branches**: All branches (default)
3. Click **Save protection rules**

#### 1.3 Verify Environment Configuration

After creating all environments, you should see:
- ✅ `nr1-staging` - with required reviewers
- ✅ `nr1-jp-prod` - with required reviewers
- ✅ `nr1-eu-prod` - with required reviewers
- ✅ `nr1-us-prod` - with required reviewers

### Step 2: Configure Branch Protection Rules

#### 2.1 Navigate to Branch Protection

1. Go to **Settings** → **Branches**
2. Find **Branch protection rules**
3. Click **Add rule** (or edit existing rule for `main`)

#### 2.2 Configure Protection for `main` Branch

**Branch name pattern**: `main`

**Protection settings**:

1. ✅ **Require a pull request before merging**
   - ✅ Require approvals (e.g., 1 approval)
   - ✅ Dismiss stale pull request approvals when new commits are pushed

2. ✅ **Require status checks to pass before merging**
   - ✅ Require branches to be up to date before merging
   - **Status checks that are required**:
     - Search for: `Verify Internal Promotion`
     - Select: **Verify Internal Promotion** (from Release Gate workflow)
     - Add any other existing required checks (e.g., tests, linting)

3. ✅ **Require conversation resolution before merging** (optional)

4. ✅ **Do not allow bypassing the above settings** (recommended for production)

5. Click **Save changes**

### Step 3: Verify the Setup

#### 3.1 Test with a Regular PR

1. Create a branch: `git checkout -b test-branch`
2. Make a small change and push
3. Open a PR to `main`
4. **Expected**: The "Verify Internal Promotion" check should **auto-pass** immediately
5. You should see: ✅ `Verify Internal Promotion` with message "Not a Release-Please PR"

#### 3.2 Test with a Release-Please PR (Simulation)

1. Create a branch with release-please prefix: `git checkout -b release-please--test`
2. Make a change and push
3. Open a PR to `main`
4. **Expected**: The "Verify Internal Promotion" check should **fail** with message:
   ```
   ❌ ERROR: No Internal Promotion workflow found for branch release-please--test
   ```
5. Manually trigger the Internal Promotion workflow:
   - Go to Actions → Internal Promotion → Run workflow
   - Select branch: `release-please--test`
   - Click **Run workflow**
6. Approve each environment deployment in sequence:
   - Approve staging deployment
   - Approve jp-prod deployment
   - Approve eu-prod deployment
   - Approve prod deployment
7. After prod completes, the Release Gate check should update to ✅ **passed**
8. PR is now mergeable

## Required Status Check Name

The exact job name to add to your branch protection rules is:

```
Verify Internal Promotion
```

This is the `name:` field from the `verify-promotion` job in `.github/workflows/release-gate.yml`.

## Environment Protection Best Practices

### Reviewer Recommendations

- **Staging** (`nr1-staging`):
  - 1 reviewer minimum
  - Any senior team member
  - Purpose: Validate that deployment works before production

- **JP/EU Production** (`nr1-jp-prod`, `nr1-eu-prod`):
  - 1-2 reviewers
  - Team leads or senior engineers
  - Purpose: Gate international production deployments

- **US Production** (`nr1-us-prod`):
  - 2 reviewers recommended (for highest protection)
  - Team leads, tech leads, or engineering managers
  - Purpose: Final gate before deploying to largest user base

### Advanced Protection Options

#### Wait Timer

Consider adding a wait timer between environments:
- Staging: 0 minutes
- JP/EU Prod: 5-10 minutes (time to validate staging)
- US Prod: 15-30 minutes (time to validate international deployments)

To configure:
1. Edit environment
2. Enable "Wait timer"
3. Set minutes to wait before deployment can be approved

#### Deployment Branches

For maximum security, restrict which branches can deploy:
1. Edit environment
2. Under "Deployment branches", select "Protected branches only"
3. This ensures only PRs targeting `main` can trigger deployments

## Workflow Behavior

### For Regular Developer PRs

```
Developer creates PR (feature-xyz branch)
  ↓
Release Gate check runs
  ↓
Checks: Does branch start with "release-please--"? → NO
  ↓
✅ Auto-pass (PR can be merged immediately after code review)
```

### For Release-Please PRs

```
Release-Please creates PR (release-please--main--v1.2.3)
  ↓
Release Gate check runs
  ↓
Checks: Does branch start with "release-please--"? → YES
  ↓
Checks: Has Internal Promotion completed for prod? → NO
  ↓
❌ FAIL - Merge blocked
  ↓
Team manually triggers Internal Promotion workflow
  ↓
Approval 1: Staging deployment → Reviewer approves → Deploys
  ↓
Approval 2: JP Prod deployment → Reviewer approves → Deploys
  ↓
Approval 3: EU Prod deployment → Reviewer approves → Deploys
  ↓
Approval 4: US Prod deployment → Reviewer approves → Deploys
  ↓
All jobs complete successfully
  ↓
Release Gate check re-runs (triggered by workflow_run)
  ↓
Checks: Has Internal Promotion completed for prod? → YES
  ↓
✅ PASS - PR can now be merged
```

## Troubleshooting

### Check Fails: "No Internal Promotion workflow found"

**Solution**: Trigger the Internal Promotion workflow manually for the PR branch.

### Check Fails: "Workflow is still in progress"

**Solution**: Wait for environment approvals and deployments to complete.

### Check Fails: "Workflow did not complete successfully"

**Solution**: Review the failed workflow run, fix issues, and re-run the workflow.

### Check Fails: "deploy-prod job not found"

**Solution**: The workflow didn't reach the production stage. Check for failures in earlier environments.

### Check doesn't auto-update after promotion completes

**Solution**: 
1. The `workflow_run` trigger should auto-update
2. If not, close and reopen the PR to manually trigger a re-check
3. Or push a new commit to the PR branch

### Approvers not receiving notifications

**Solution**:
1. Check that reviewers are added to the environment
2. Verify reviewers have repository access
3. Check GitHub notification settings

## Security Considerations

### Access Control

- **Who can approve deployments**: Configured per-environment via Required Reviewers
- **Who can trigger workflows**: Anyone with write access to the repository
- **Who can merge Release PRs**: Must pass the release gate (= prod deployment complete)

### Audit Trail

All deployment approvals and workflow runs are logged:
- Environment deployment history
- Workflow run logs
- GitHub audit log

### Emergency Override

If you need to bypass the gate in an emergency:
1. Temporarily disable the "Verify Internal Promotion" required check
2. Merge the PR
3. Manually run Internal Promotion workflow after merge
4. Re-enable the required check

**Note**: This should only be used in true emergencies.

## Maintenance

### Updating Reviewer Lists

1. Go to Settings → Environments
2. Select environment to update
3. Edit "Required reviewers"
4. Add/remove team members as needed
5. Save changes

### Modifying Deployment Sequence

To change the deployment order:
1. Edit `.github/workflows/internal-promotion.yml`
2. Update the `needs:` dependencies between jobs
3. Update documentation to reflect new sequence

### Adding New Environments

1. Create new GitHub Environment
2. Add required reviewers
3. Add new job to `internal-promotion.yml` workflow
4. Update `needs:` dependencies to maintain sequence
5. Update documentation

## Related Documentation

- [Internal Promotion Workflow](../docs/nr1-deployment-process.md)
- [Release-Please Documentation](https://github.com/googleapis/release-please)
- [GitHub Environments Documentation](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)

## Questions or Issues?

Contact the Browser Agent team:
- Slack: #browser-agent-team
- GitHub: Open an issue in this repository
