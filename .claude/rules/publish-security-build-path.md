---
paths:
  - ".github/**"
  - "tools/webpack/**"
  - "tools/bundler-tools/**"
  - "package.json"
  - "package-lock.json"
  - ".npmrc"
  - "docs/verifying-releases.md"
---

# Publish security: build, release, and publish path

File-level controls for the build, release, and publish path. Loads when you
read or edit the files listed above. The guards that apply regardless of which
file is open (Claude's own actions, secrets, review settings, exceptions) are
in [publish-security.md](publish-security.md).

Default to keeping these controls. If a task would weaken one, even
incidentally (e.g. "fixing" a failing workflow), keep the secure pattern, or
stop, name the control, say what the change gives up, and let the human decide.

## Locked builds
- **Pin every action to a full commit SHA** with the version in a trailing
  comment (`uses: actions/checkout@<40-char-sha> # v7`). Never a tag or branch.
- **Release-path installs use `npm ci --ignore-scripts`** (`publish-release`,
  `npm-operations`, `publish-experiment`, `verify-release`); publish workflows
  keep `NPM_CONFIG_IGNORE_SCRIPTS: 'true'`, and `npm publish` takes
  `--ignore-scripts`. Test-only workflows still run plain `npm ci`: don't copy
  that into a build/publish job, and don't change it without checking they
  don't need install scripts.
- Keep lockfiles committed and honored; update `.github/actions/package-lock.json`
  with its `package.json`.
- No `curl | sh` or build-time code fetch without a pinned hash or signature.

## No standing publish credentials
- **S3 uses GitHub OIDC** (`id-token: write` plus an assumed role). Never add
  `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` or any long-lived key where OIDC
  works; if you find them referenced in a workflow or action input, treat it as
  a regression.
- **npm publishes via trusted publishing (OIDC)** from `npm-release`, never a
  stored `NPM_TOKEN`, and only for released versions (no RC publishing from
  `main`).
- **Publish and CDN jobs declare a deployment `environment:`** (`public-release`,
  `npm-release`, `nr-stage`, `nr1-experiments`, `nr1-*`, `cdn-maintenance`,
  `NR-CDN`, `NR-DB`, `change-tracking`). Publish secrets and roles belong to the
  environment, not the repo or workflow. A new job touching the bucket, Fastly,
  the NR1 loader DB, or npm needs one. Keep Fastly-style static keys
  environment-scoped and don't broaden which jobs read them.
- **Scope `permissions:` to the job**, least privilege; comment why on
  `id-token`, `contents: write`, or `attestations: write`. Remove unused ones.
- **Unreviewed code never gets publish credentials**: none in `pull_request`,
  `pull_request_target`, `schedule`, or fork runs. Release publishing triggers
  on `release: [published]` only; manual dispatch is limited to `main` or a
  release tag and takes no free-form input that reaches a publish step. The
  one exception is PR experiment/promotion builds, below.

## Injection and PR-triggered runs
- **Pass inputs through `env:`**, then use shell variables (`"$RELEASE_TAG"`).
  Never interpolate `${{ github.event.* }}`, `${{ inputs.* }}`, or any
  user-influenced value into a `run:` script.
- **Branch names, PR titles, commit messages, release tag names, and served
  URLs are attacker-controlled** (`github.head_ref`,
  `github.event.pull_request.*`, monitor failure details). Read via `env:`
  (and `jq` for JSON), quote them, never build a path, key, or command from
  them unquoted.
- **PR-triggered runs get no production credentials.** PR experiment and
  promotion builds publish only through a reviewer-gated environment
  (`nr1-experiments`, `nr1-dev`); release-please branches are restricted by a
  ruleset. Don't loosen those conditions or use `pull_request_target`.

## Provable artifacts
- **Keep the integrity manifest.** `generate-integrity-manifest.mjs` records an
  SRI sha384 per built file before upload, the checksums are attested
  (`actions/attest-build-provenance`), and the manifest is attached to the
  release, so rewriting an artifact can't rewrite its hash. New shipped output
  must be covered by it, never published beside it.
- **Anything that uploads or serves our code verifies it first.**
  `fastly-verify`, `nr-upload` (refuses bytes that don't match the manifest),
  and `nr-verify` (fails if an NR environment serves different bytes, blocking
  promotion) share `shared-utils/integrity.js`. Never skip them or make them
  non-blocking (`continue-on-error`, `|| true`). New upload/serve paths verify
  the same way; extend `nr-verify` to every environment that receives a push,
  and keep pushes traceable per release. Serving teams own stored-hash
  verification on their side.
- **npm tarball:** `npm-operations.yml` hashes and attests the packed tarball,
  publishes that exact file (never a fresh `npm pack`), and attaches
  `npm-integrity-manifest.json`, kept separate from `integrity-manifest.json`.
  Keep `dist/tsconfig.tsbuildinfo` out of the package (its content varies by
  filesystem).
- **Independent verification stays independent.** `verify-release.yml` rebuilds
  CDN files and the npm package on a runner with no secrets, no environment,
  and read-only permissions, compares to the manifest and registry
  `dist.integrity`, and runs `gh attestation verify --signer-workflow`. Never
  give it credentials or write access; keep its Node version in sync with
  `publish-release.yml`; notify from a separate job. Update
  `docs/verifying-releases.md` whenever manifests, attestations, or
  verification change.
- `*.stats.*` files and the `1.x.x`/`1.NNN.x` aliases are intentionally outside
  the manifest (aliases are range-checked). Old releases with `unverified`
  entries are drift-detected, not rebuild-verified; don't describe them as
  verified.

## Immutable versions and reproducible builds
- **A published version is never overwritten.** `s3-upload` fails if a key
  exists (`HeadObject`); don't add overwrite/`--force`, skip it, or make it
  warn-only.
- **A deleted version identifier is never reused.** Broken or vulnerable
  releases are deleted where possible and fixed with a new point release. npm
  can't remove versions: use `npm deprecate` (manual today), never
  unpublish-and-republish.
- **Mutable aliases are the only exception, by design:** `-current` and the
  floating `1.x.x`/`1.NNN.x` loaders, changed only through the release workflow
  (`update-current`, `nr-upload`). Don't add new mutable paths without saying so.
- **Keep builds reproducible.** Release builds rebuild byte-identically: no
  timestamps, absolute or case-dependent paths, or random values in shipped
  output; keep local-only caches out of the package. Build with CI's pinned
  Node (`.nvmrc`), not whatever is installed.
- **Plumbing changes must not change shipped bytes.** When touching installs,
  build scripts, `tools/webpack/**`, or bundler tooling without meaning to
  change output, build before and after (`npm run cdn:build:prod`, same Node,
  clean checkout) and compare file hashes. If they differ, explain or revert,
  and report the comparison in the PR.

## Controlled delivery path
- `current`/latest changes, Fastly purges, and loader pushes go through the
  release workflow (`update-current`, `fastly-purge`, `nr-upload`), not ad hoc
  scripts or new manual workflows. Don't add S3 writes outside the pipeline or
  work around the bucket policy.
- Fastly config, DNS, and certs live in `browser/fastly-agent-tf` (source.datanerd.us)
  and change only by reviewed PR there; never recommend console edits or add a
  second path. `newrelic/newrelic-browser-agent-release` (release metadata and
  status dashboard, written via a bot token) is on the same path and carries
  the same bar. If a task here needs a change there, say so.
- `.github/CODEOWNERS` covers build and publish files; add any new build/publish
  directory to it in the same change.

## Watch what's served
`cdn-integrity-monitor.yml` checks served assets (CDN edge and S3 origin)
against release manifests. Don't remove or relax it or the post-publish verify
steps in `publish-release.yml`. Invariants:
- Credential-free on public endpoints; notification in a separate job.
- Runs every 15 minutes; don't slow it or add changes that let runs skip.
- Older releases check only minified entry-point loaders (traffic cost);
  don't narrow further. Release discovery follows API pagination.
- Aliases are checked by range (a rollback in range passes); a release without
  a manifest fails the run; legitimate alias digests live in the manifest's
  `unverified.aliases`, not the monitor.
- Findings are `mismatch`/`missing` (page) or `unavailable` (page on repeats).
  Never relabel a real mismatch as `unavailable`.
- Keep the three `BrowserCDNIntegrity*` events; the heartbeat fires only on
  passing runs. Alert conditions live in New Relic.

## PRs and tests
- **PR type `chore`** for CI/release-path changes that don't alter shipped
  agent bytes; `security`/`enhancement` trigger a patch release, so use them
  only if customers receive different bytes. Never add `!`. Otherwise follow
  `pr-guidelines.md`.
- wdio can't exercise CI plumbing: add jest tests for scripts and shared logic
  (`.github/scripts`, `.github/actions/shared-utils`) under `tests/unit/github`
  and state in the PR that wdio doesn't apply and why.
- If a PR changes any control here, say so in the Overview so the reviewer
  knows to look.

## Not done in this repo (don't claim otherwise)
- Controls that live outside files here: S3 object immutability and its change
  alerting, CloudTrail paging for S3 writes outside the pipeline, the asset
  inventory/owner and owner paging, the emergency path, and the loader DB's
  stored-hash verification. Don't "implement" them in workflows or write docs
  implying they exist.
- No hourly npm check exists; only the per-release verification.
- Documented exceptions, not passes: Fastly and LambdaTest have no OIDC (keys
  stay environment-scoped); bot PATs that trigger cross-repo publish workflows
  were audited and kept. Don't add PATs or widen scopes. `.npmrc`
  `unsafe-perm = true` predates these controls; don't extend it.

## Before presenting a build/publish-path change as done
1. New/edited `uses:` are SHA-pinned; no user-influenced `${{ }}` in a `run:`.
2. No new long-lived credential; OIDC plus `environment:` for anything that
   publishes; `permissions:` job-scoped.
3. Release-path installs use `--ignore-scripts` and lockfiles.
4. New shipped output is in the manifest (npm in `npm-integrity-manifest.json`)
   and verified before serving; verification and monitoring remain present
   and blocking.
5. CODEOWNERS covers every build/publish path.
6. If installs or build changed, before/after build hashes match (or the
   difference is explained).
7. PR type is `chore` unless shipped bytes changed, and the PR says why wdio
   doesn't apply.
8. The always-loaded guards in `publish-security.md` still hold.
