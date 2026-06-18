# Query Parameter Experiment Loading Design

## Overview

Enable conditional loading of experimental browser agent loaders via query parameter on NR1 pages, replacing the current automatic inclusion model. Additionally, automate experiment publishing for all PRs so any branch can be instantly tested via query parameter.

## Current State

### Experiment Loading Today

- **Build Process**: `build-ab` action fetches experiments from S3 (`experiments/{env}/`) and concatenates them into `dev-experiments.js`
- **Script Structure**: Three files loaded sequentially on NR1 pages:
  1. `released.js` - Released production loader
  2. `experiments.js` - All available experiments (mutative config overwrites)
  3. `latest.js` - Latest unreleased loader for A/B testing
  4. `postamble.js` - Resets config back to released app, performs SR entitlements check
- **Publishing**: `publish-experiment.yml` workflow uploads experiment builds to S3 at `experiments/dev/{branch-name}/nr-loader-spa.min.js`
- **Environments**: Experiments only deployed to dev environment
- **Current Trigger**: Manual `workflow_dispatch` only - must manually run workflow to publish experiment
- **Problems**: 
  - All experiments automatically load on every page load, even when not needed
  - Must manually trigger workflow to publish experiment for testing
  - No automatic experiment builds for PRs

### S3 Storage Structure

```
experiments/
  dev/
    mfe-fcp-poc/
      nr-loader-spa.min.js
      config.js
    another-experiment/
      nr-loader-spa.min.js
      config.js
```

**Example URL**: `https://js-agent.newrelic.com/experiments/dev/mfe-fcp-poc/nr-loader-spa.min.js`

## Goals

1. **Default Behavior**: Load only released loader by default (no experiments or latest)
2. **Opt-In Experiments**: Enable experiment loading via query parameter on NR1 pages
3. **Auto-Publish on PR**: Every PR automatically builds and publishes experiment to CDN
4. **Instant Testing**: Any PR can be tested immediately with `?nrbaExperiment={branch-name}`
5. **Clean Separation**: Clear delineation between production and experimental code paths
6. **Idempotent Config**: Experiment loading sets complete config (not mutative overwrites)

## Requirements

### Functional Requirements

- **REQ-001**: Query parameter detection - Check for `?nrbaExperiment={branch-name}` on page load
- **REQ-002**: Smart routing - If param absent, execute released loader; if present, load experiment
- **REQ-003**: Experiment URL construction - `https://js-agent.newrelic.com/experiments/dev/{branch-name}/nr-loader-spa.min.js`
- **REQ-004**: Dev account configuration - Experiment loader reports to dev A/B account (not production)
- **REQ-005**: Async injection acceptable - No blocking requirement for experiment script tag injection
- **REQ-006**: Environment locked to dev - Always use `dev` environment for experiments

### Non-Functional Requirements

- **REQ-007**: No NR1 code changes - Solution must work with existing script tag structure
- **REQ-008**: Backward compatible - Released loader without query param works exactly as today
- **REQ-009**: Fail-safe - Invalid experiment names should fall back to released loader

## Proposed Solution

### Architecture: Smart Router Pattern

Modify the released loader template ([.github/actions/internal-promotion/templates/released.js](.github/actions/internal-promotion/templates/released.js)) to act as a "smart router" that detects query params and loads experiment config + loader.

**Key Principle: Two-file experiment approach**
- Each experiment build creates two files:
  1. **config.js** - Sets complete window.NREUM configuration (A/B account credentials)
  2. **nr-loader-spa.min.js** - The actual browser agent loader code
- The released.js router loads both files sequentially when experiment param present
- Clean separation: publish-experiment owns experiment config, internal-promotion just routes

**Flow:**
1. User visits NR1 page with `?nrbaExperiment={branch-name}`
2. released.js detects query param
3. released.js loads `experiments/dev/{branch}/config.js` (sets window.NREUM)
4. After config loads, released.js loads `experiments/dev/{branch}/nr-loader-spa.min.js`
5. Experiment runs with A/B account config

### Implementation Code Examples

**released.js Smart Router:**
```javascript
(function() {
  // ===== EXPERIMENT DETECTION & ROUTING =====
  try {
    var urlParams = new URLSearchParams(window.location.search);
    var experiment = urlParams.get('nrbaExperiment');
    
    if (experiment) {
      console.log('NRBA: Loading experiment "' + experiment + '"');
      
      var baseUrl = 'https://js-agent.newrelic.com/experiments/dev/' + 
                    encodeURIComponent(experiment) + '/';
      
      // Step 1: Load config.js (sets window.NREUM)
      var configScript = document.createElement('script');
      configScript.src = baseUrl + 'config.js';
      configScript.onload = function() {
        // Step 2: After config loads, load the agent
        var loaderScript = document.createElement('script');
        loaderScript.src = baseUrl + 'nr-loader-spa.min.js';
        loaderScript.onload = function() {
          console.log('NRBA: Experiment loaded successfully');
        };
        document.head.appendChild(loaderScript);
      };
      document.head.appendChild(configScript);
      return; // Short-circuit
    }
  } catch (e) {
    console.warn('NRBA: Experiment detection failed, using released loader', e);
  }
  
  // ===== NORMAL RELEASED LOADER =====
  window.NREUM = { /* ... released config ... */ };
  // ... released loader code ...
})();
```

**config.js (created by publish-experiment.yml):**
```javascript
// Comprehensive experiment configuration (not mutative)
window.NREUM = window.NREUM || {};
window.NREUM.init = {
  feature_flags: ['ajax_metrics_deny_list', 'register'],
  distributed_tracing: { enabled: true },
  ajax: {
    deny_list: ['nr-data.net', 'bam.nr-data.net', 'staging-bam.nr-data.net'],
    capture_payloads: 'failures'
  },
  session_replay: {
    enabled: true,
    mask_all_inputs: false,
    mask_text_selector: null
  },
  // ... full config ...
};
window.NREUM.loader_config = {
  accountID: '1',
  agentID: 'INTERNAL_AB_DEV_APPLICATION_ID',
  licenseKey: 'INTERNAL_AB_LICENSE_KEY',
  applicationID: 'INTERNAL_AB_DEV_APPLICATION_ID'
};
window.NREUM.info = {
  beacon: 'staging-bam.nr-data.net',
  errorBeacon: 'staging-bam.nr-data.net',
  licenseKey: 'INTERNAL_AB_LICENSE_KEY',
  applicationID: 'INTERNAL_AB_DEV_APPLICATION_ID',
  sa: 1
};
```

### Configuration Flow

**Query Parameter Present** (`?nrbaExperiment=my-feature-branch`):
1. Released.js detects param
2. Injects script tag for config.js
3. config.js loads and sets window.NREUM with A/B account credentials
4. In onload callback, injects script tag for nr-loader-spa.min.js
5. Agent loader executes and reads window.NREUM
6. Agent reports to dev A/B account

**Query Parameter Absent** (default):
1. Released.js detects no param
2. Executes normal released loader configuration
3. Reports to production account
4. No experiment code loaded

### Error Handling

- **Invalid experiment name**: Script onerror handler logs warning, falls back to released
- **Network failure loading config**: Script onerror handler catches, falls back to released
- **Network failure loading agent**: Script onerror handler logs warning
- **Query param parsing failure**: Try/catch wrapper falls through to released loader
- **Build-time errors**: Missing A/B secrets fail during publish-experiment workflow (loud failure)

### Clean Separation of Concerns

| Component | Responsibility | Files Created/Loaded |
|-----------|---------------|---------------------|
| **publish-experiment.yml** | Build experiment and create config | config.js + nr-loader-spa.min.js |
| **config.js** | Set window.NREUM with A/B credentials | Loaded first by released.js |
| **nr-loader-spa.min.js** | Browser agent loader code | Loaded second by released.js |
| **released.js** | Smart router - detect query param & load files | No config needed |
| **internal-promotion** | Deploy released.js to NR1 environments | No A/B config needed |

## Technical Implementation

### Modified Files

#### 1. `.github/workflows/publish-experiment.yml`

**Changes**:
- Added `pull_request` trigger for automatic experiment builds on PR open/sync
- Added concurrency control to cancel previous builds when PR is updated
- Creates comprehensive config.js with A/B account configuration (not mutative overwrites)
- Environment detection: PRs always use `dev`, manual dispatch uses input
- Removed `publish_ab_script` input and `publish-ab` job (obsolete with query-param approach)

**Files uploaded to S3**:
- `experiments/dev/{branch}/config.js` - Complete window.NREUM configuration
- `experiments/dev/{branch}/nr-loader-spa.min.js` - Browser agent loader

**Result**: Every PR automatically gets testable experiment files (no A/B script rebuild)

#### 2. `.github/actions/internal-promotion/templates/released.js`

**Changes**:
- Add experiment detection wrapper at top of IIFE
- Add URLSearchParams query param parsing
- Add sequential script injection for config.js then nr-loader-spa.min.js
- Add error handling and console logging
- Preserve existing released loader code in fallback path

**No A/B credentials needed** - config.js is created by publish-experiment workflow

#### 3. `.github/workflows/internal-promotion.yml`

**Changes**: None needed - A/B credentials removed, config.js created by publish-experiment

### Workflow Structure

**Automatic PR Workflow** (no manual steps!):
1. Create PR or push to existing PR branch
2. `publish-experiment.yml` runs automatically
3. Wait ~30 seconds for build to complete
4. Test immediately: `https://one.newrelic.com/some-page?nrbaExperiment={your-branch-name}`

**Example - Testing PR #1234 for branch `fix-memory-leak`**:
```
https://one.newrelic.com/launcher/nr1-core.home?nrbaExperiment=fix-memory-leak
```

**Auto-Publish on PR** (publish-experiment.yml):
```yaml
on:
  pull_request:
    types: [opened, synchronize]
    branches: [main]
  workflow_dispatch:
    # Manual trigger still available

concurrency:
  group: experiment-{PR_number} # Cancel previous builds
  cancel-in-progress: true

jobs:
  publish-experiment-to-s3:
    steps:
      - Build experiment: npm run cdn:build:experiment
      - Create config.js with comprehensive window.NREUM setup
      - Upload to S3: experiments/dev/{branch}/
      - Purge CDN cache
```

**Files Created**:
- `config.js` - Complete window.NREUM configuration (not mutative)
- `nr-loader-spa.min.js` - Standard experiment build

**Benefits**:
- Every PR → two experiment files automatically published
- Available at `experiments/dev/{branch}/config.js` and `.../nr-loader-spa.min.js`
- Previous builds cancelled on PR update
- Config separate from loader (clean separation)
- No A/B script rebuild needed (query-param approach replaces random selection)

## Usage

### For Developers

**Test your PR on NR1 dev**:
```
https://one.newrelic.com/some-page?nrbaExperiment=my-feature-branch
```

**Use released loader (default)**:
```
https://one.newrelic.com/some-page
```

**Switch between experiments**:
```
# Test your PR
https://one.newrelic.com/some-page?nrbaExperiment=my-feature-branch

# Test someone else's PR
https://one.newrelic.com/some-page?nrbaExperiment=their-feature-branch

# Back to production
https://one.newrelic.com/some-page
```

### For Manual Experiment Publishing

Manual workflow still available for standalone experiments:
1. Go to Actions → Publish Experiment
2. Click "Run workflow"
3. Select environment (dev/standalone)
4. Experiment files available at:
   - `experiments/{env}/{branch-name}/config.js`
   - `experiments/{env}/{branch-name}/nr-loader-spa.min.js`

**Note**: Manual builds no longer rebuild A/B script - query-param approach replaces random selection system.

## Testing & Validation

### Test Plan

**Phase 1: Auto-Publish**
1. Create new PR → verify experiment publishes to S3
2. Update PR → verify previous build cancelled
3. Check CDN cache cleared
4. Verify both config.js and nr-loader-spa.min.js created

**Phase 2: Query-Param Loading**
1. Load NR1 page with `?nrbaExperiment={branch}`
2. Verify config.js loads first (check Network tab)
3. Verify nr-loader-spa.min.js loads second (check Network tab)
4. Check telemetry goes to dev A/B account
5. Confirm released loader doesn't execute when param present
6. Load without param → verify released loader works

**Phase 3: Validation**
1. Test multiple PRs concurrently
2. Switch between experiments via query param
3. Validate comprehensive config.js works correctly
4. Check error handling (invalid branch names)

### Manual Testing Checklist

**Released Loader (no param)**:
- ✅ Load NR1 page without query param
- ✅ Verify released loader executes
- ✅ Check telemetry goes to production account
- ✅ Confirm no experiment script loaded

**Experiment Loader (with param)**:
- ✅ Load NR1 page with `?nrbaExperiment={pr-branch-name}`
- ✅ Verify config.js loads first from experiments/dev/{branch}/config.js
- ✅ Verify nr-loader-spa.min.js loads second from experiments/dev/{branch}/nr-loader-spa.min.js
- ✅ Check telemetry goes to dev A/B account
- ✅ Confirm released loader does NOT execute
- ✅ Check browser console for version/logs

**Error Cases**:
- ✅ Invalid experiment name → graceful failure, falls back to released
- ✅ Network failure loading config → onerror handler fires, falls back to released
- ✅ Network failure loading agent → onerror handler fires
- ✅ CDN cache miss → 404, falls back to released

## Future Enhancements

1. **PR Comment Bot**: Auto-comment on PRs with testing URL
   - `🔬 Experiment published! Test at: https://one.newrelic.com/?nrbaExperiment={branch-name}`
2. **Multi-environment**: Support `?nrbaExperiment=staging/branch-name` for staging
3. **Experiment catalog**: UI to browse available experiments
4. **Cleanup automation**: Delete S3 experiments when PR closed/merged
5. **PR Status Integration**: Show experiment build status in GitHub PR
- URL encoding of experiment names
- Template variable substitution

## Security Considerations

1. **URL Encoding**: Experiment name is `encodeURIComponent`-encoded to prevent injection
2. **HTTPS Only**: All CDN URLs use HTTPS
3. **CSP Compatibility**: Dynamic script injection requires CSP allow-list for js-agent.newrelic.com (already required)
4. **Secret Management**: A/B credentials stored in GitHub Secrets (existing pattern)
5. **Fail-Safe**: Invalid experiments fail gracefully (don't break page)

## Performance Impact

- **No Query Param**: Zero overhead (same as today's released loader)
- **With Query Param**: 
  - URLSearchParams parsing: <1ms
  - Script tag injection: Async, non-blocking
  - No additional network requests if released loader already cached

## Open Questions

1. **Account ID Secret**: Need to verify if `INTERNAL_AB_ACCOUNT_ID` secret exists or needs creation
2. **Staging/Prod**: Should experiments work in staging/prod environments? (Current design assumes dev-only)
3. **Postamble**: Keep postamble.js for session replay entitlements check? (Currently only used in A/B flow)
4. **Telemetry**: Should we add a supportability metric for experiment usage?

## Future Enhancements

1. **Multi-environment**: Support `?nrbaExperiment=staging/branch-name` for staging experiments
2. **Version pinning**: Support `?nrbaExperiment=branch-name@v1.2.3` for specific versions
3. **Experiment catalog**: UI to browse available experiments
4. **Automatic testing**: E2E tests that cycle through all published experiments
5. **Telemetry dashboard**: Track experiment adoption and usage patterns

## References

- Experiment example: `https://js-agent.newrelic.com/experiments/dev/my-branch/config.js`
- Experiment loader: `https://js-agent.newrelic.com/experiments/dev/my-branch/nr-loader-spa.min.js`
- Related workflows: `publish-experiment.yml`, `internal-promotion.yml`
- Related actions: `deploy-rc-assets`, `internal-promotion`, `s3-upload`, `fastly-purge`
- Legacy (obsolete): `build-ab`, `internal-ab`, `publish-dev.yml` (replaced by query-param approach)

---

**Document Status**: Draft for implementation  
**Created**: 2026-06-17  
**Author**: Design discussion with user  
**Next Steps**: User to complete other improvement, then implement this design
