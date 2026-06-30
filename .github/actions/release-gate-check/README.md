# Release Gate Check Action

This GitHub Action verifies that all required environments have been successfully deployed after a specific commit. It's used by the Release Gate workflow to ensure Release-Please PRs are only mergeable after the Internal Promotion workflow has completed.

## What It Does

1. **Fetches PR and Commit Details**: Gets the PR's head commit SHA and timestamp
2. **Checks Each Environment**: Verifies deployments to all required environments:
   - `nr1-staging`
   - `nr1-jp-prod`
   - `nr1-eu-prod`
   - `nr1-us-prod`
3. **Validates Deployment Status**: Ensures each environment has a successful deployment status
4. **Verifies Timing**: Confirms deployments occurred AFTER the commit timestamp

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `pr_number` | Pull request number | Yes | - |
| `branch_name` | Branch name to check deployments for | Yes | - |
| `github_token` | GitHub token for API access | Yes | `${{ github.token }}` |

## Outputs

| Output | Description |
|--------|-------------|
| `all_passed` | Boolean indicating if all environments passed |
| `results` | JSON string with detailed results for each environment |

## Usage

```yaml
- name: Verify Internal Promotion completion
  uses: ./.github/actions/release-gate-check
  with:
    pr_number: ${{ github.event.pull_request.number }}
    branch_name: ${{ github.event.pull_request.head.ref }}
    github_token: ${{ github.token }}
```

## Requirements

- Node.js 20
- GitHub token with `deployments:read` permission

## Dependencies

- `@actions/core`: GitHub Actions toolkit for logging and outputs
- `@actions/github`: GitHub API client (Octokit)

## Development

Install dependencies:
```bash
npm install
```

## Logic Flow

```
1. Get PR details → Extract head commit SHA
                ↓
2. Get commit details → Extract commit timestamp
                ↓
3. For each environment:
   ├─→ Fetch deployments
   ├─→ Filter by branch and timestamp
   ├─→ Get latest deployment
   ├─→ Check deployment status
   └─→ Verify success
                ↓
4. Report results → Pass/Fail
```

## Error Handling

The action provides detailed error messages for:
- Missing deployments for an environment
- Deployments without successful status
- API errors during checks

If any environment fails, the action exits with a failure status and provides instructions for the user.

## Converted from Bash

This action was converted from a bash script to improve:
- **Readability**: JavaScript is easier to read and maintain than complex bash
- **Error Handling**: Better structured error handling with try/catch
- **Type Safety**: Better data structure handling
- **Debugging**: Easier to debug and test
- **Maintainability**: Clearer code structure and logic flow
