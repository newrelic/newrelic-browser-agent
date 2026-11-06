# Release process

Every change and every release needs approval from someone other than its author. The controls below are repository-level and have no bypass actors.

## Flow

| # | Step | Run by | Second-person control |
| - | ---- | ------ | --------------------- |
| 1 | A change merges to `main` | Author | The `Code Owner Review` ruleset requires 1 approving review that includes a code owner. [CODEOWNERS](../.github/CODEOWNERS) assigns `.github/`, build tooling, and package files to `@newrelic/br0ws3r`. |
| 2 | release-please opens or updates the `chore(main): release X` PR | `release-please.yml`, using the release bot's token | The bot authors the PR, so any human approval is from a second person. |
| 3 | The release PR merges | Maintainer | Same ruleset as step 1. |
| 4 | release-please creates the GitHub release and `v*` tag | `release-please.yml` | Runs only after step 3; has no reviewer of its own. |
| 5 | The release publishes to S3 and the CDN | `publish-release.yml` | `public-release` environment: a `br0ws3r` reviewer approves, and the author cannot. |
| 6 | The release publishes to npm | `npm-operations.yml` | `npm-release` environment: same as step 5. |

NR1 promotions require approval in the `nr1-*` environments under the same rules as step 5.

## Enforcing settings

| Setting | Applies to | Value |
| ------- | ---------- | ----- |
| `can_admins_bypass` | `public-release`, `npm-release`, `cdn-maintenance`, `nr1-*` | `false` |
| `prevent_self_review` | `public-release`, `npm-release`, `nr1-staging`, `nr1-experiments`, `nr1-us-prod`, `nr1-eu-prod`, `nr1-jp-prod` | `true` |
| Bypass actors | `Code Owner Review` ruleset | none |
| `require_last_push_approval` | `Code Owner Review` ruleset | `true`: the person who pushed the latest commits cannot supply the approving review |
| `v*` tags cannot be deleted, updated, or force-pushed | `Protect Release Tags` ruleset | no bypass actors |

The `Branch Protection` and `FOSSA - Default` rulesets also apply to `main`. They are managed at the organization level, and org owners control their bypass lists.

## Verifying

Run these against `newrelic/newrelic-browser-agent`:

```sh
# Environments: expect can_admins_bypass=false and prevent_self_review=true on the environments above
gh api repos/newrelic/newrelic-browser-agent/environments --paginate \
  --jq '.environments[] | {name, can_admins_bypass, rules: [.protection_rules[]? | {type, prevent_self_review}]}'

# Repository rulesets: expect bypass_actors=[]
gh api repos/newrelic/newrelic-browser-agent/rulesets/26185177 --jq '{name, bypass_actors}'
gh api repos/newrelic/newrelic-browser-agent/rulesets/26185294 --jq '{name, bypass_actors}'
gh api repos/newrelic/newrelic-browser-agent/rulesets/26185177 \
  --jq '.rules[] | select(.type=="pull_request") | .parameters.require_last_push_approval'
```
