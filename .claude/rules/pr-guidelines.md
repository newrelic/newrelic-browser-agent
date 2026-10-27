# Pull request guidelines

These are enforced by CI ([.github/workflows/validate-pr.yml](../../.github/workflows/validate-pr.yml))
— a PR that doesn't match this format fails the "Validate PR" check. Always
follow this structure when drafting a PR title/description; re-read
[.github/pull_request_template.md](../../.github/pull_request_template.md) as well, since it can change.

## Title

- Format: `type(scope): description`, scope optional — e.g. `feat: add X`,
  `fix(ajax): correct Y`.
- `type` must be one of the following. The type also decides the release
  version bump, so choose deliberately:
  - `feat` (**minor** bump): a brand-new capability that did not previously exist.
  - `enhancement` (**patch** bump): an improvement or extension to an existing
    feature (new option, better accuracy/performance) — not a new capability.
  - `fix` (**patch** bump): corrects a bug.
  - `security` (**patch** bump): addresses a vulnerability or hardens the agent.
  - `chore` (no release): no user-facing impact (tests, tooling, CI, docs).
  - A release's bump is set by its highest-impact change: any `feat` makes it
    minor; `enhancement`/`fix`/`security` alone make it patch. Don't pick `feat`
    for something small just because it sounds bigger — it forces a minor release.
- **Breaking-change `!` — avoid by default.** Appending `!` after the type/scope
  (e.g. `feat!: ...`, `fix(ajax)!: ...`; not before the scope) makes
  release-please bump the **major** version for any type. Never add it on your
  own judgment. Draft the title **without** `!`. If you believe the change is
  genuinely breaking for consumers (removed/renamed public API, changed
  default behavior that customers rely on), stop and tell the user: say
  you think it warrants `!`, explain why, state that it is a critical last
  resort because it forces a major release, and get explicit confirmation
  before using the `!` form over the plain one. If they don't confirm, use
  the non-`!` title. The same rule applies to a `BREAKING CHANGE:` footer in
  a commit message, which also forces a major bump — don't write one unprompted.
- **Description after the `type(scope): ` prefix must be 70 characters or
  fewer.** The prefix itself (e.g. `enhancement(ajax): `) does not count toward
  the limit. The title is used verbatim as the squash-merge commit message
  (via release-please).
- Strip any `NR-1234`/`NEWRELIC-1234` ticket-style prefixes — they get
  stripped by CI when validating length anyway, so don't rely on them to pad
  or explain the title.

## Description

The description body has two parts, in this order:

1. **Summary paragraph** — release-notes-quality prose describing the change
   for an end user/consumer of the agent, not an internal narrative. No
   heading above it. Must be **70+ characters**, unless the title starts with
   `chore:` (chores are exempt from the length check but should still have a
   real summary).
2. A line containing only `---` to terminate the summary section. CI looks
   for this exact marker — without it, validation fails even if the rest of
   the description is fine.

After the `---`, follow the repo's PR template sections, in order:

```markdown
### Overview
<!-- Describe the changes and, if applicable, why they're needed. -->

### Related Issue(s)
<!-- Link related GitHub/Jira issues. "N/A" if none. -->

### Testing
<!-- Detailed steps to test the change in a local dev environment. -->
```

For **Testing**, call out both jest and wdio/e2e coverage when the change has
both (see [testing.md](testing.md) — they're equal citizens here, and a
reviewer will expect to see both mentioned, not just one).

## PR lifecycle (new PRs)

1. Open as a **draft** (`gh pr create --draft`).
2. Immediately check the checks triggered by opening the PR
   (`gh pr checks <number> --watch`).
3. Once they pass, mark it ready for review (`gh pr ready <number>`). If any
   fail, leave it as a draft and report to the user.
4. Unless the PR title type is `chore`, dispatch the wdio checks in boosted mode
   (`gh workflow run pull-request-checks.yml --ref <branch> -f boosted=true`)
   but do **not** wait for them (15-30 min) — the human author monitors those.
   `chore` PRs skip this step.

See [create-pr.md](../commands/create-pr.md) for the full steps.

## Before opening/updating a PR

- Re-read the current `.github/pull_request_template.md` and
  `.github/workflows/validate-pr.yml` rather than assuming this file is still
  byte-for-byte accurate — validation rules can change independently of this doc.
- Confirm the title's `type` matches the actual change (a doc-only or tooling
  change is `chore:`, not `feat:`).
- Confirm the summary paragraph reads sensibly as a release note on its own,
  without needing the rest of the PR body for context.

## Adding a new commit type

A new type must be wired through every one of these, or release notes silently
drop or miscategorize it (none of this is covered by a single CI check):

1. [validate-pr.yml](../../.github/workflows/validate-pr.yml) — title regex and its error message.
2. [release-please.yml](../../.github/workflows/release-please.yml) — `changelog-types`
   entry (listing a type here also makes it open a release PR, at patch level
   unless it is `feat` or breaking).
3. [.github/actions/docs-pr/index.js](../../.github/actions/docs-pr/index.js) — `categories`, `frontMatter`, `bodyContent` and the loop/`JSON.stringify` for it.
4. [.github/actions/docs-pr/utils.js](../../.github/actions/docs-pr/utils.js) — `cleanTitle()` prefix regex.
5. [release-notes.handlebars](../../.github/actions/docs-pr/templates/release-notes.handlebars) —
   the frontmatter key and body section. The docs team's template mandates its
   frontmatter keys (`features`, `enhancements`, `bugs`, `security`) in their CI,
   so confirm any new key with them first.
6. Contributor docs — the type table in [CONTRIBUTING.md](../../CONTRIBUTING.md),
   the [PR template](../../.github/pull_request_template.md) note, and this file.
