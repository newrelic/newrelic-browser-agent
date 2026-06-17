# Query Parameter Experiment Loading Design

## Overview

Enable conditional loading of experimental browser agent loaders via query parameter on NR1 pages, replacing the current automatic inclusion model.

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
- **Problem**: All experiments automatically load on every page load, even when not needed

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
3. **No Build Changes**: Foundation-level implementation; existing GitHub Actions unchanged initially
4. **Clean Separation**: Clear delineation between production and experimental code paths
5. **Idempotent Config**: Experiment loading sets complete config (not mutative overwrites)

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

Modify the released loader template ([.github/actions/internal-promotion/templates/released.js](.github/actions/internal-promotion/templates/released.js)) to act as a "smart router":

```javascript
(function() {
  // ===== EXPERIMENT DETECTION & ROUTING =====
  try {
    var urlParams = new URLSearchParams(window.location.search);
    var experiment = urlParams.get('nrbaExperiment');
    
    if (experiment) {
      // Configure NREUM for dev A/B account (idempotent, not mutative)
      window.NREUM = window.NREUM || {};
      window.NREUM.init = {
        distributed_tracing: { enabled: true },
        privacy: { cookies_enabled: true },
        ajax: { deny_list: ['bam.nr-data.net'] }
      };
      window.NREUM.loader_config = {
        accountID: '{{{nrba_ab_account_id}}}',
        trustKey: '{{{nrba_ab_account_id}}}',
        agentID: '{{{nrba_ab_app_id}}}',
        licenseKey: '{{{nrba_ab_license_key}}}',
        applicationID: '{{{nrba_ab_app_id}}}'
      };
      
      // Inject experiment loader script asynchronously
      var script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = 'https://js-agent.newrelic.com/experiments/dev/' + 
                   encodeURIComponent(experiment) + '/nr-loader-spa.min.js';
      script.async = true;
      script.onerror = function() {
        console.warn('NRBA: Failed to load experiment "' + experiment + '", using released loader');
        // Fall back to released loader if experiment fails
        window.__nrbaExperimentFailed = true;
      };
      document.head.appendChild(script);
      
      // Short-circuit: Don't execute released loader below
      return;
    }
  } catch (e) {
    // Query param detection failed, fall through to released loader
    console.warn('NRBA: Experiment detection failed, using released loader', e);
  }
  
  // ===== NORMAL RELEASED LOADER (existing code continues here) =====
  window.NREUM = window.NREUM || {};
  window.NREUM.init = {
    // ... existing released.js template content ...
  };
  // ... rest of released loader ...
})();
```

### Configuration Flow

**Query Parameter Present** (`?nrbaExperiment=mfe-fcp-poc`):
1. Released loader detects param
2. Sets idempotent NREUM config for dev A/B account
3. Injects experiment script tag pointing to `experiments/dev/mfe-fcp-poc/nr-loader-spa.min.js`
4. Returns early (released loader code never executes)
5. Experiment loader runs in dev A/B account context

**Query Parameter Absent** (default):
1. Released loader detects no param
2. Executes normal released loader configuration
3. Reports to production account
4. No experiment code loaded

### Error Handling

- **Invalid experiment name**: Script onerror handler logs warning, could optionally fall back to released
- **Network failure**: Script onerror handler catches load failures
- **Query param parsing failure**: Try/catch wrapper falls through to released loader
- **Missing secrets**: Template variables fail at build time (loud failure during deployment)

## Technical Implementation

### Modified Files

#### 1. `.github/actions/internal-promotion/templates/released.js`

**Changes**:
- Add experiment detection wrapper at top of IIFE
- Add NREUM configuration for dev A/B account (using template variables)
- Add dynamic script injection logic
- Add error handling and fallback mechanism
- Preserve existing released loader code in else path

**Template Variables Needed** (must be passed to internal-promotion action):
- `{{{nrba_ab_account_id}}}` - Dev A/B account ID
- `{{{nrba_ab_app_id}}}` - Dev A/B application ID  
- `{{{nrba_ab_license_key}}}` - Dev A/B license key

#### 2. `.github/actions/internal-promotion/action.yml`

**Changes**:
- Add new optional inputs:
  - `nrba_ab_account_id`
  - `nrba_ab_app_id`
  - `nrba_ab_license_key`
- Pass these to index.js for template rendering

#### 3. `.github/actions/internal-promotion/index.js`

**Changes**:
- Accept new A/B account parameters from action inputs
- Pass A/B credentials to Handlebars template context when rendering `released.js`
- Maintain backward compatibility (if params missing, template variables render as empty strings)

#### 4. `.github/workflows/internal-promotion.yml`

**Changes**:
- Add secrets to `deploy-dev` job's internal-promotion step:
  - `nrba_ab_account_id: ${{ secrets.INTERNAL_AB_ACCOUNT_ID }}`
  - `nrba_ab_app_id: ${{ secrets.INTERNAL_AB_DEV_APPLICATION_ID }}`
  - `nrba_ab_license_key: ${{ secrets.INTERNAL_AB_LICENSE_KEY }}`
- Repeat for other environment jobs if experiments should work in staging/prod

**Note**: `INTERNAL_AB_ACCOUNT_ID` secret may need to be created (currently only have `INTERNAL_AB_DEV_APPLICATION_ID` and `INTERNAL_AB_LICENSE_KEY`)

### No Changes Required

- ✅ `.github/actions/build-ab/` - Continues building experiments as today
- ✅ `.github/workflows/publish-experiment.yml` - Continues publishing to S3
- ✅ NR1 application code - No script tag changes needed
- ✅ Fastly CDN configuration - No new purge paths

## Usage

### For Developers

**Test an experiment on NR1 dev**:
```
https://one.newrelic.com/some-page?nrbaExperiment=mfe-fcp-poc
```

**Use released loader (default)**:
```
https://one.newrelic.com/some-page
```

**Switch between experiments**:
```
https://one.newrelic.com/some-page?nrbaExperiment=another-branch
```

### For Publishing Experiments

Existing workflow unchanged:
1. Merge code to experiment branch
2. `publish-experiment.yml` runs automatically
3. Experiment available at `experiments/dev/{branch-name}/nr-loader-spa.min.js`
4. Add query param to NR1 page to test

## Migration Path

### Phase 1: Foundation (This Design)
- Implement smart router in released.js template
- Add A/B account credentials to internal-promotion action
- Update internal-promotion workflow to pass secrets
- Deploy to dev environment
- Verify with manual testing

### Phase 2: Validation
- Test with existing experiments (e.g., mfe-fcp-poc)
- Validate A/B account telemetry
- Confirm released loader unaffected (no query param)
- Document usage for developers

### Phase 3: Cleanup (Future)
- Remove experiments/latest from build-ab (optional)
- Remove postamble reset logic (optional)
- Update internal-ab workflow to skip experiments (optional)
- Archive old A/B testing scripts (optional)

## Testing Strategy

### Manual Testing

1. **Released loader (no param)**:
   - Load NR1 page without query param
   - Verify released loader executes
   - Check telemetry goes to production account
   - Confirm no experiment script loaded

2. **Experiment loader (with param)**:
   - Load NR1 page with `?nrbaExperiment=mfe-fcp-poc`
   - Verify experiment script injected
   - Check telemetry goes to dev A/B account
   - Confirm released loader does NOT execute

3. **Invalid experiment**:
   - Load with `?nrbaExperiment=nonexistent-branch`
   - Verify error logged to console
   - Check fallback behavior (released loader or graceful failure)

4. **Network failure**:
   - Block CDN in browser DevTools
   - Load with valid experiment param
   - Verify onerror handler fires

### Automated Testing

**E2E Tests** (add to existing test suite):
- Browser test: Parse query param correctly
- Browser test: Inject script tag with correct URL
- Browser test: Released loader executes when param absent
- Browser test: Released loader does NOT execute when param present

**Unit Tests** (JavaScript):
- URLSearchParams parsing
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

- Current A/B script: `https://js-agent.newrelic.com/internal/dev-experiments.js`
- Example experiment: `https://js-agent.newrelic.com/experiments/dev/mfe-fcp-poc/nr-loader-spa.min.js`
- Related workflows: `publish-experiment.yml`, `internal-promotion.yml`, `publish-dev.yml`
- Related actions: `build-ab`, `internal-ab`, `internal-promotion`

---

**Document Status**: Draft for implementation  
**Created**: 2026-06-17  
**Author**: Design discussion with user  
**Next Steps**: User to complete other improvement, then implement this design
