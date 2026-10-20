---
description: Open (or update) a PR for the current branch against origin/main, drafted per pr-guidelines.md
---

Open (or update) a pull request for the branch the user is currently on,
targeting `origin/main`, using their own authenticated `gh` CLI identity.
Follow `.claude/rules/pr-guidelines.md` exactly for title/description format —
it is CI-enforced by `.github/workflows/validate-pr.yml`.

## Steps

1. **Sanity-check the branch.**
   - `git branch --show-current` — if this is `main`, stop and tell the user
     they need to be on a feature branch first.
   - `git fetch origin main` to make sure the comparison is against the
     latest remote `main`.
   - `git log origin/main..HEAD --oneline` — if this is empty, stop and tell
     the user there's nothing to open a PR for (branch has no commits ahead
     of `origin/main`).

2. **Gather what changed.**
   - `git log origin/main..HEAD` for commit messages/history.
   - `git diff origin/main...HEAD --stat` and a full `git diff origin/main...HEAD`
     for the actual code changes.
   - Use both to understand the change well enough to describe it for an end
     user/consumer of the agent, not just restate commit subjects.
   - Prompt me whether there are any related JIRA tickets, Github issues, or documentation.

3. **Push the branch if needed.**
   - Check if the local branch has an upstream / is up to date with remote:
     `git status -sb` or `git rev-parse --abbrev-ref @{u}` (may fail if no
     upstream yet).
   - If there's no upstream, or local commits aren't on the remote yet, push
     with `git push -u origin <branch>`. This is a shared-visibility action —
     say explicitly that you're about to push before doing it.

4. **Check for an existing PR on this branch.**
   - `gh pr view --json number,url,title,body 2>/dev/null` (run from the
     branch). If one exists, you'll be **updating** it (`gh pr edit`), not
     creating a new one — say so.

5. **Draft the title and description**, following `.claude/rules/pr-guidelines.md`.

6. **Show the full draft (title + body) to the user and ask for
   confirmation or edits before submitting anything to GitHub.** Do not run
   `gh pr create`/`gh pr edit` until they explicitly approve — this creates
   or changes a shared-visibility artifact.

7. **Submit.**
   - New PR: **always open it as a draft** —
     `gh pr create --draft --base main --title "<title>" --body "<body>"`
     (add `--head <branch>` only if not already on that branch's remote by
     default). Never open a new PR as ready for review.
   - Existing PR: `gh pr edit <number> --title "<title>" --body "<body>"`
     (don't change its draft/ready state; skip steps 8-10 unless the user
     asks for them).
   - Report back the PR URL.

8. **Check the PR checks (new PRs only).** Immediately after creating the
   draft PR, check the status of the checks kicked off by `pull_request`
   (`Pull Request Checks`, `Validate PR`, jest, lint, etc.):
   - `gh pr checks <number> --watch --fail-fast` (or poll
     `gh pr checks <number>` / `gh run list --branch <branch>` if `--watch`
     isn't practical).
   - If a check fails, report which one and why
     (`gh run view <run-id> --log-failed`) and stop — leave the PR as a draft and let the user decide how to proceed.
   Don't push fixes unprompted.

9. **Mark ready for review.** Once all of those checks pass, run
   `gh pr ready <number>`. Do not mark it ready while any check is failing or
   still pending.

10. **Trigger the WDIO checks in boosted mode — and don't wait on them.**
    **Skip this step entirely if the PR title's type is `chore`** (e.g.
    `chore:` or `chore(scope):`) — say that you skipped it and why. Only
    `feat`, `fix`, and `security` PRs get the wdio dispatch. The
    wdio tests only run via the manually dispatched `Pull Request Checks`
    workflow (`workflow_dispatch`), not on `pull_request`:
    `gh workflow run pull-request-checks.yml --ref <branch> -f boosted=true`
    (`latest-only` defaults to `true`; leave it unless the user asks for the
    full browser matrix). Confirm the run started (`gh run list --workflow
    pull-request-checks.yml --branch <branch> --limit 1`), include its URL in
    your report, and **stop there**. These runs take 15-30 minutes; the human
    author checks on them. Do not poll or watch them to completion.

## Notes

- Don't run `npm run lint`/tests as part of this command unless the user
  asks — this command's job is packaging up an already-finished change into
  a correctly-formatted PR, not re-validating it. If the diff obviously looks
  unfinished (e.g. no test files touched for a behavior change), mention it,
  but don't block on it.
- Draft-first applies to **new** PRs only. Never open a new PR as ready for
  review, and never mark it ready while checks are failing or pending.
- Never force-push, never target a branch other than `main`, never guess at
  a GitHub username or org — `gh` already acts as the locally authenticated
  user.
