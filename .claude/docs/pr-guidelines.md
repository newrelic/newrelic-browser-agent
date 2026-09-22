# Pull request guidelines

These are enforced by CI ([.github/workflows/validate-pr.yml](../../.github/workflows/validate-pr.yml))
— a PR that doesn't match this format fails the "Validate PR" check. Always
follow this structure when drafting a PR title/description; re-read
[.github/pull_request_template.md](../../.github/pull_request_template.md) as well, since it can change.

## Title

- Format: `type(scope): description`, scope optional — e.g. `feat: add X`,
  `fix(ajax): correct Y`.
- `type` must be one of `feat`, `fix`, `security`, `chore`.
- **70 characters or fewer.** The title is used verbatim as the squash-merge
  commit message (via release-please), so anything longer gets truncated.
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

## Before opening/updating a PR

- Re-read the current `.github/pull_request_template.md` and
  `.github/workflows/validate-pr.yml` rather than assuming this file is still
  byte-for-byte accurate — validation rules can change independently of this doc.
- Confirm the title's `type` matches the actual change (a doc-only or tooling
  change is `chore:`, not `feat:`).
- Confirm the summary paragraph reads sensibly as a release note on its own,
  without needing the rest of the PR body for context.
