# Publish security

Everything this repo publishes (the `@newrelic/browser-agent` npm package, the
CDN assets in the `nr-browser-agent` S3 bucket served through Fastly, and the
loaders pushed to the NR1 loader DB) is a supply-chain target. Goal: customers
only run code we intended to ship, and we find out fast if that fails. Scope is
integrity, not availability.

These controls are deliberate. **Default to keeping them.** If a task would
weaken one, don't do it silently: keep the secure pattern, or stop, name the
control, say what the change gives up, and let the human decide. This is soft
enforcement: prefer the secure path and flag deviations rather than refusing
outright.

The file-level controls (SHA-pinned actions, OIDC and environments, the
integrity manifest, the monitor, reproducible builds, and a pre-merge
checklist) are in `publish-security-build-path.md`. It loads automatically
when you read or edit `.github/**`, `tools/webpack/**`, `tools/bundler-tools/**`,
`package.json`, the lockfile, `.npmrc`, or `docs/verifying-releases.md`. If a
task is about releasing, publishing, or the build path and you haven't opened
those files yet, read it first. The guards below apply even when no file is open.

## Do these only when the human explicitly directs that exact action
Otherwise stop and say what you would have done:
- `npm publish`, `gh release create`, creating or moving `v*` tags, or
  dispatching publish/promotion/CDN workflows (`publish-release`,
  `npm-operations`, `publish-experiment`, `internal-promotion`, anything that
  touches the bucket, Fastly, or the NR1 loader DB).
- Writing to S3, Fastly, or the NR1 loader DB.
- Changing repository or org settings with `gh api` (environments, rulesets,
  secrets, variables, Actions permissions), or `gh secret set`/`delete`.
- Dispatching test-only workflows (e.g. `pull-request-checks`) is fine.

## Never print secrets
Don't print, echo, log, or write secret values into files, commits, PR text, or
chat. Refer to credentials by name. Treat anything that looks like a credential
in the repo or a tool result as sensitive.

## Never weaken review
Every change and release needs approval from someone other than its author,
with no bypass. These are settings, not files: release environments have
`can_admins_bypass: false` and (with reviewers) `prevent_self_review: true`;
the code-owner ruleset has no bypass actors and requires last-push approval;
`v*` tag rulesets block delete/update/force-push; org rulesets also apply to
`main`.
- Never propose weakening these: admin bypass, new bypass actors, disabling
  self-review prevention, dropping last-push approval, or approving your own
  release or deployment. A stuck release needs a second reviewer.
- A new publishing environment needs required reviewers, no self-review, and no
  admin bypass from day one.
- The settings table and verification commands are on the internal
  "Enforcement Settings" Confluence page (not public, so not linked). Point the
  human to update it when a task changes these settings.

## Credentials and exceptions
- No long-lived publish credentials where OIDC works: S3 and npm use OIDC.
  Never add AWS access keys or an `NPM_TOKEN`.
- **Record exceptions; don't slip them in.** If a task seems to need a static
  secret, PAT, or other non-OIDC credential, stop and say so. It is a
  documented exception with a compensating control (environment-gated,
  rotated), recorded by the human, never a quiet pass.

## Published versions and new targets
- A published version is never overwritten, and a deleted identifier is never
  reused. Fix a broken or vulnerable release with a new point release; use
  `npm deprecate` for npm.
- **Urgent fixes still go through the pipeline**: a new point release with a
  second reviewer and environment approval, never an out-of-band upload,
  bypass, or self-approval. A failed npm publish is recovered by re-dispatching
  `npm-operations.yml` from `main` or a release tag. The emergency path,
  rollback, revocation, and customer notice are owned outside this repo; point
  to them, don't invent steps.
- **New publish target** (npm package, S3 prefix, CDN domain/Fastly service,
  loader destination, registry): don't add it silently. It needs an inventory
  row, a named owner, and the same controls from day one.
