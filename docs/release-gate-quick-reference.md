# Release Gate Quick Reference

## TL;DR

**For Release-Please PRs to be mergeable**: The Internal Promotion workflow must complete successfully deploying to all 4 environments.

## Required Status Check Name

Add this to your branch protection rules for `main`:

```
Verify Internal Promotion
```

## GitHub Environments to Create

Create these 4 environments with required reviewers:

1. `nr1-staging` - 1-2 reviewers (any senior engineer)
2. `nr1-jp-prod` - 1-2 reviewers (team leads)
3. `nr1-eu-prod` - 1-2 reviewers (team leads)
4. `nr1-us-prod` - 2-3 reviewers (engineering managers/tech leads)

## Deployment Flow

### For Regular PRs (feature branches)

```
✅ Release Gate auto-passes → Merge immediately
```

### For Release-Please PRs

```
1. PR created → ❌ Release Gate fails (no promotion yet)
2. Manually trigger "Internal Promotion" workflow
3. Approve staging → ✅ Deploys
4. Approve jp-prod → ✅ Deploys
5. Approve eu-prod → ✅ Deploys
6. Approve prod → ✅ Deploys
7. All complete → ✅ Release Gate passes
8. Merge PR → 🎉 Release complete
```

## Trigger Internal Promotion

1. Go to: https://github.com/newrelic/newrelic-browser-agent/actions/workflows/internal-promotion.yml
2. Click "Run workflow"
3. Select the release-please branch (e.g., `release-please--main--v1.2.3`)
4. Enter `cdn_path` (default: `latest`)
5. Click "Run workflow"

## Approve Deployments

When the workflow runs, you'll be asked to approve each environment:

1. Go to the workflow run
2. Click "Review deployments"
3. Select environment to approve
4. Click "Approve and deploy"
5. Repeat for each environment in sequence

## Environment Approval Sequence

```
staging → jp-prod → eu-prod → prod
   ↓        ↓         ↓         ↓
Must complete before next starts
```

## Common Issues

### "No Internal Promotion workflow found"
→ Trigger the workflow manually for the PR branch

### "Workflow is still in progress"
→ Wait for approvals/deployments to complete

### "deploy-prod job not found"
→ Earlier environment failed; check workflow logs

### Check doesn't update after promotion
→ Close/reopen PR or push new commit

## Setup Steps Summary

1. ✅ Create 4 GitHub Environments with reviewers
2. ✅ Add "Verify Internal Promotion" to branch protection
3. ✅ Test with a regular PR (should auto-pass)
4. ✅ Test with a release-please--* branch (should require promotion)

## More Info

- Full setup guide: [docs/release-gate-setup.md](./release-gate-setup.md)
- Deployment process: [docs/nr1-deployment-process.md](./nr1-deployment-process.md)
