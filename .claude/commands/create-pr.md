---
description: Open (or update) a PR for the current branch against origin/main, drafted per pr-guidelines.md
---

Open (or update) a pull request for the branch the user is currently on,
targeting `origin/main`, using their own authenticated `gh` CLI identity.
Follow `.claude/docs/pr-guidelines.md` exactly for title/description format —
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

5. **Draft the title and description**, following
   `.claude/docs/pr-guidelines.md` precisely:
   - **Title:** `type(scope): description`, scope optional. `type` must be
     one of `feat`, `fix`, `security`, `chore` — pick based on what the
     change actually is (e.g. tooling/docs-only → `chore:`). Strip any
     `NR-1234`/`NEWRELIC-1234` prefixes. Keep it at or under 70 characters —
     it becomes the squash-merge commit message.
   - **Description:**
     1. A release-notes-quality summary paragraph (no heading above it),
        70+ characters, describing the change for an end user/consumer of
        the agent — unless the title starts with `chore:`, which is exempt
        from the length check but should still have real prose.
     2. A line containing only `---` to terminate the summary section (CI
        greps for this exact marker).
     3. Then the PR template sections, in order — re-read
        `.github/pull_request_template.md` first in case it's changed:
        - `### Overview` — what changed and why.
        - `### Related Issue(s)` — link any GitHub/Jira issues found in
          commit messages or branch name; `N/A` if none.
        - `### Testing` — how to verify locally. If the diff touches both
          jest and wdio coverage, call out both explicitly (they're equal
          citizens per `.claude/docs/testing.md`); if only one, say why the
          other wasn't applicable.

6. **Show the full draft (title + body) to the user and ask for
   confirmation or edits before submitting anything to GitHub.** Do not run
   `gh pr create`/`gh pr edit` until they explicitly approve — this creates
   or changes a shared-visibility artifact.

7. **Submit.**
   - New PR: `gh pr create --base main --title "<title>" --body "<body>"`
     (add `--head <branch>` only if not already on that branch's remote by
     default).
   - Existing PR: `gh pr edit <number> --title "<title>" --body "<body>"`.
   - Report back the PR URL.

## Notes

- Don't run `npm run lint`/tests as part of this command unless the user
  asks — this command's job is packaging up an already-finished change into
  a correctly-formatted PR, not re-validating it. If the diff obviously looks
  unfinished (e.g. no test files touched for a behavior change), mention it,
  but don't block on it.
- Never force-push, never target a branch other than `main`, never guess at
  a GitHub username or org — `gh` already acts as the locally authenticated
  user.
