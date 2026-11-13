# Verifying a browser agent release

Every release publishes two kinds of artifacts, each with a Sigstore build provenance attestation and a
published hash record. Use the steps below to confirm what you received was built by this repository's
release workflows from the tagged commit and has not been altered.

| Artifact | Built by | Hash record (release asset) |
| -------- | -------- | --------------------------- |
| CDN files | `publish-release.yml` | `integrity-manifest.json` |
| npm package `@newrelic/browser-agent` | `npm-operations.yml` | `npm-integrity-manifest.json` |

Prerequisites: the [GitHub CLI](https://cli.github.com/) (`gh`) for attestation checks, and npm 9.5 or later for
registry signature checks.

## npm package

### 1. Check registry signatures and provenance

In your project, after installing:

```bash
npm audit signatures
```

This verifies the registry signature of every installed package and the provenance attestation of those that
publish one. `@newrelic/browser-agent` should be listed under "verified attestations". The package page on
npmjs.com also shows a provenance badge linking to the source commit and the workflow run.

### 2. Verify the tarball against its GitHub attestation

```bash
npm pack @newrelic/browser-agent@<version>
gh attestation verify newrelic-browser-agent-<version>.tgz --repo newrelic/newrelic-browser-agent
```

A passing check confirms the tarball was produced by a workflow in this repository. Add
`--signer-workflow newrelic/newrelic-browser-agent/.github/workflows/npm-operations.yml` to require that it came
from the npm publish workflow specifically.

### 3. Compare against the published hash record

Download `npm-integrity-manifest.json` from the GitHub release for the version, then compare:

```bash
sha256sum newrelic-browser-agent-<version>.tgz   # compare with tarball.sha256 in the manifest
```

`tarball.integrity` is the same `sha512-...` value npm stores in `package-lock.json`, so you can also compare it
to the `integrity` field of the `@newrelic/browser-agent` entry in your lockfile.

## CDN files

### 1. Verify a file against its GitHub attestation

```bash
curl -fsSLO https://js-agent.newrelic.com/<path-to-file>
gh attestation verify <file> --repo newrelic/newrelic-browser-agent
```

### 2. Compare against the published manifest

`integrity-manifest.json` on the GitHub release maps each CDN path to its SHA-384 digest in SRI format. Those
values can be used directly as the `integrity` attribute on a `<script>` tag. To check a downloaded file:

```bash
echo "sha384-$(openssl dgst -sha384 -binary <file> | openssl base64 -A)"
```

The `CDN Integrity Monitor` workflow also compares the served files for recent releases against these manifests
every six hours.

## What this does and does not prove

- It proves the artifact was built in this repository's GitHub Actions from the recorded commit, and that it
  matches the hash published at release time.
- It does not prove the source at that commit is free of defects. Review of the source is covered by the
  repository's pull request process.
- Each release is independently rebuilt by the `Verify Release` workflow (`verify-release.yml`), which runs on
  a separate runner with no secrets. It compares the rebuilt CDN files to `integrity-manifest.json` and the
  rebuilt npm tarball to the registry's `dist.integrity`, and verifies the attestations over the rebuilt files.
  You can run the same comparison yourself: check out the release tag, use the Node version in
  `publish-release.yml`, run `npm ci && npm run cdn:build:prod`, then
  `node .github/scripts/verify-release-build.mjs cdn integrity-manifest.json build`. Build on Linux. Packages
  published before `dist/tsconfig.tsbuildinfo` was excluded contain that file, and building on a
  case-insensitive filesystem (macOS, Windows) changes its contents.
