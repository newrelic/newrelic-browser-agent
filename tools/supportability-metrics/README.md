# Supportability metric tooling

| File | Purpose |
| --- | --- |
| `registry.js` (types in `registry-types.js`) | The single source of truth for every supportability metric. `docs/supportability-metrics.md` is generated from it |
| `check-usage.js` | `npm run supportability-metrics:check`. Scans `src/`, fails if it and the registry disagree. `-- --fix` adds stubs. Run by the pre-commit hook and CI |
| `generate-docs.js` | `npm run supportability-metrics:generate-docs` |
| `angler.js`, `angler-comment.js`, `detect.js` | Write the pull request comment that tells the author what to do in Angler (below). `detect.js` finds the `init` settings and feature flags a change adds, and needs the `acorn` parser, which is optional there |
| `dashboard/` | Generates the supportability dashboard from the registry and applies it to New Relic (below) |
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

## The generated dashboard

A dashboard in New Relic is generated from the registry, so charts follow the metrics without anyone building them by hand. It sits beside
the [hand-built dashboard](https://onenr.io/07jbyP2q3Ry), which is never touched. The generated one is **replaced whole on every update**, so change
the registry or the generator, never the dashboard. (It is editable by anyone with access, see "Who owns the dashboards" below, so an edit made for
experimenting lasts only until the next update.)

### What is in it
- **Metric Explorer** (the first tab, so the dashboard opens on it): the only page that uses the **Supportability Metric** dropdown. The dropdown has no
  default, so until a metric is picked every chart on this page is empty. Pick one and every chart shows just that metric: its calls, accounts and apps
  reporting, the count, the count for the top 10 accounts and the top 10 apps, and the average, maximum and minimum value. The dropdown is filled from the
  data (every name in the last 7 days), so a metric appears in it as soon as Angler holds it, with no regeneration. It lists the full names
  (`Browser/Supportability/API/log/called`), because charts cannot build a name from a prefix and the variable, so every explorer query uses the variable
  as the whole name: `WHERE name = {{metric}}`.
- **One page per registry section**, in alphabetical order after the explorer. Their queries are fixed and ignore the dropdown: the count over time, a pie of each metric's share, and the total and accounts per metric
  (bars, and a table with apps too) when the section has more than one metric, then the count for the top 10 accounts and the top 10 apps, and, for the section's metrics that report a value, the average, maximum and minimum
  (labelled with the unit). Every chart is titled with what it shows: the metric itself when a page is one metric, the metrics that report a value in the
  value charts (`Ajax/Events/Payload/Bytes-Added: average value (bytes)`), and the section's name otherwise.

It is built from the `Supportability` event Angler writes once an hour per account, app and metric name: the count is `sum(call_count)`, the
average is `sum(total_call_time) / sum(call_count)`, and the extremes are `max(max_call_time)` and `min(min_call_time)`. A metric only has
average, minimum and maximum charts if its registry entry declares a `value` (its unit is `ms`, `bytes` or `count`); the check fails if a call
passes a value and the entry does not say so, and `--fix` writes `unit: 'TODO'` for a new one.

### Where it is applied
| When | Where | How |
| --- | --- | --- |
| A pull request changes the registry or the generator | A **preview** in staging (lives in account 550352), named `[PR #N] ... (preview)` | `sm-dashboard-preview` in `pull-request-checks.yml`. Updated on every push, linked from the Angler comment, deleted when the PR closes (`supportability-dashboard-cleanup.yml`) |
| The registry or the generator changes on `main` | The **staging** dashboard | `supportability-dashboard.yml` |
| A release is approved and promoted to US production | The **US prod** dashboard (lives in account 1672072) | The `update-supportability-dashboard-us-prod` job in `internal-promotion.yml`, after `deploy-us-prod` |

Each dashboard lives in a different account from the data it reads, which is allowed because every widget names the account it queries
(`dashboard/environments.js`):

| Environment | Dashboard lives in | Queries read |
| --- | --- | --- |
| staging | 550352 | 432507 |
| us-prod | 1672072 | 33 |

The API key therefore needs **write access to the dashboard's account** and **read access to the data account** (validation runs every query there), and anyone
viewing a dashboard needs read access to the data account or its widgets show "no access". Staging and production are separate New Relic stacks, so a
dashboard cannot read both.

The jobs use the `NR_API_KEY_STAGING` and `NR_API_KEY_PRODUCTION` secrets, which must be New Relic **user** API keys with dashboard write access in
those accounts, and run on the `Browser-Agent-Assigned-IP-Linux` runner. The staging jobs never block a pull request if they fail. EU and JP are not supported yet.

A metric's charts stay empty until the metric ships in an agent version and its name is in Angler, and metrics removed from the registry keep
showing in the pages that match by name pattern and in the explorer for as long as older agent versions keep sending them.

### Trying it without touching New Relic
```sh
npm run supportability-metrics:dashboard -- --env staging --dry-run --write-json /tmp/dashboard.json
```
builds the dashboard and saves it as JSON that can be imported through the New Relic UI (Dashboards, Import dashboard). Add `--validate` (needs the
key in the environment) to also run every generated query against New Relic, which is also the quickest way to confirm the key works.
`--delete --name "..."` deletes a dashboard by name.

### Who owns the dashboards
A dashboard is created with the user API key in the secret, and New Relic records that user as its creator. Two consequences to keep in mind:
- **Permissions.** The dashboards are created `PUBLIC_READ_WRITE`. With `PUBLIC_READ_ONLY`, only the creating user can edit a dashboard, so when the key is
  rotated to a different user the automation could no longer update the dashboards it created (and the creator would be the only person able to edit them).
  Read-write means anyone with access can also edit or delete one, which is harmless: an edit is overwritten by the next update, and a deleted dashboard is
  created again (it is found by name).
- **The key's owner.** If the user who owns the key leaves or is deactivated, the key stops working and the updates fail (the staging ones never block a PR,
  and the production one never fails a promotion, so it would go unnoticed). The lasting fix is a **service user** in each New Relic organization whose key is
  used for these secrets. Until then, whoever rotates the keys should know that these jobs depend on them.
