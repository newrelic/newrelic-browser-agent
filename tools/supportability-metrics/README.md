# Supportability metric tooling

| File | Purpose |
| --- | --- |
| `registry.js` (types in `registry-types.js`) | The single source of truth for every supportability metric. `docs/supportability-metrics.md` is generated from it |
| `check-usage.js` | `npm run supportability-metrics:check`. Scans `src/`, fails if it and the registry disagree. `-- --fix` adds stubs. Run by the pre-commit hook and CI |
| `generate-docs.js` | `npm run supportability-metrics:generate-docs` |
| `angler.js`, `angler-comment.js`, `detect.js` | Write the pull request comment that tells the author what to do in Angler (below). `detect.js` finds the `init` settings and feature flags a change adds, and needs the `acorn` parser, which is optional there |
| `lib.js`, `colors.js` | Shared logic and terminal colors |

How to add a metric and test it: see `CLAUDE.md` and `tests/components/supportability-metrics/README.md`.

## Angler: the pull request comment

Angler is an internal service whose shared [`metric_names.txt`](https://source.datanerd.us/agents/angler/blob/master/src/main/resources/metric_names.txt)
must list a metric's exact name before it appears in dashboards. It lives on the internal GitHub (VPN only) and is curated by hand, so a pull
request to the browser agent cannot change it. Instead, the `sm-check` job in
[pull-request-checks.yml](../../.github/workflows/pull-request-checks.yml) comments on the pull request with what the author has to do.

When a pull request changes the registry, the comment (collapsed by default; its one-line summary shows how many names to add and remove and how many families need a decision):

- tells the author to open a pull request against [agents/angler](https://source.datanerd.us/agents/angler), with links to the repo and the file,
  and to link that pull request from this one;
- lists the names to add (new in this pull request), and the names removed. It says not to delete those from Angler yet, because older agent
  versions in the wild keep sending them;
- lists, as a checklist, only the decisions that apply to this pull request, because names for `init` settings and feature flags cannot be
  generated from the registry. It compares the changed source files with the base branch and lists the exact name for each `init` setting
  the PR adds (`Config/<path>/Enabled` for a boolean, `Config/<path>/Changed` for anything else), each setting it removes, and each new
  feature flag. An open-ended family such as retry or connect response status codes is listed only if the PR changed its registry entry.
  If nothing applies, it says so and drops that step. If the change could not be analyzed (the parser is not installed, or there is no git
  history), it falls back to listing the `Config/*` and `Feature_Flag/*` items with "check whether your changes affect this" wording;
- includes, collapsed, the full list of names Angler should contain for this version of the registry.

It is regenerated on every push, in place (found by its `<!-- supportability_metric_check -->` tag). If a later push removes all the registry
changes, the comment is updated to say nothing is needed. If the pull request never changed the registry, no comment is posted.

To see the comment for your branch before opening a pull request:

```sh
git show origin/main:tools/supportability-metrics/registry.js > /tmp/base-registry.js
node tools/supportability-metrics/angler-comment.js --base-registry /tmp/base-registry.js --base-ref origin/main --out /tmp/angler-comment.md
```

It prints "unchanged" and writes nothing when the registry matches the base.
