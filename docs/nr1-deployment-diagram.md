# NR1 Browser Agent Deployment Flow

This diagram illustrates the complete deployment process for the New Relic Browser Agent into NR1 pages, including regular PRs, release-please PRs, experiments, and multi-environment promotions.

```mermaid
flowchart TD
    %% Triggers
    PR["PR Created/Updated<br/>Any branch → main"] -->|Triggers| ExpWorkflow["publish-experiment.yml"]
    RPPR["Release-Please PR<br/>Created/Updated"] -->|Triggers| DevWorkflow["internal-promotion.yml<br/>Auto Deploy to Dev"]
    Manual["Manual Trigger<br/>workflow_dispatch"] -->|Triggers| PromWorkflow["internal-promotion.yml<br/>Sequential Promotion"]
    
    %% Experiment Publishing Flow
    ExpWorkflow -->|Build| ExpBuild["npm run cdn:build:experiment<br/>env=dev, branch=BRANCH_NAME"]
    ExpBuild -->|Create| ConfigJS["config.js<br/>Complete window.NREUM setup"]
    ExpBuild -->|Build| LoaderJS["nr-loader-spa.min.js<br/>Experiment loader"]
    ConfigJS -->|Upload| S3Exp["S3: experiments/dev/BRANCH_NAME/"]
    LoaderJS -->|Upload| S3Exp
    S3Exp -->|Purge| CDNExp["Fastly CDN Cache<br/>staging + production"]
    CDNExp -.->|Available at| ExpURL["https://js-agent.newrelic.com/<br/>experiments/dev/BRANCH_NAME/"]
    
    %% Dev Auto-Deploy Flow (Release-Please PRs)
    DevWorkflow -->|Branch check| BranchFilter{Branch starts with<br/>release-please--?}
    BranchFilter -->|Yes| DevDeploy["deploy-dev Job"]
    BranchFilter -->|No| Skip["Skip - Not RP"]
    DevDeploy -->|Build| DevBuild["deploy-rc-assets<br/>branch_name=BRANCH_NAME (optional)"]
    DevBuild -->|Upload| S3Dev["S3: dev/"]
    S3Dev -->|Purge| CDNDev["CDN: staging-js-agent<br/>newrelic.com"]
    CDNDev -->|Deploy| NR1Dev["NR1 Dev Environment"]
    DevDeploy -->|Track| ChangeTrack["Change Tracking Event<br/>NR1_DEV entity"]
    
    %% Sequential Promotion Flow
    PromWorkflow -->|Check| PromFilter{"Event = dispatch AND<br/>branch = main or<br/>release-please--?"}
    PromFilter -->|Yes| Stage1["deploy-dev<br/>Optional - runs first"]
    PromFilter -->|No| SkipAll["Skip All Jobs"]
    Stage1 -->|Manual Approval| Stage2["deploy-staging"]
    Stage2 -->|Manual Approval| Stage3["deploy-jp-prod"]
    Stage3 -->|Manual Approval| Stage4["deploy-eu-prod"]
    Stage4 -->|Manual Approval| Stage5["deploy-us-prod"]
    
    Stage2 -->|Deploy| NR1Staging["NR1 Staging"]
    Stage3 -->|Deploy| NR1JP["NR1 JP Production"]
    Stage4 -->|Deploy| NR1EU["NR1 EU Production"]
    Stage5 -->|Deploy| NR1US["NR1 US Production"]
    
    %% NR1 Page Loading
    NR1Dev -.->|Contains| ReleasedJS["released.js<br/>Smart Router"]
    NR1Staging -.->|Contains| ReleasedJS
    NR1JP -.->|Contains| ReleasedJS
    NR1EU -.->|Contains| ReleasedJS
    NR1US -.->|Contains| ReleasedJS
    
    PageLoad["NR1 Page Load"] -->|Check| QueryParam{"Query param<br/>?nrbaExperiment<br/>present?"}
    QueryParam -->|No| DefaultLoad["Load Released Loader<br/>Production Config"]
    QueryParam -->|Yes| ExpLoad["Experiment Loading"]
    
    ExpLoad -->|Step 1| LoadConfig["Inject script tag<br/>config.js from S3"]
    LoadConfig -->|Step 2 onload| LoadExp["Inject script tag<br/>nr-loader-spa.min.js"]
    LoadExp -->|Reports to| ABAccount["Dev A/B Account<br/>INTERNAL_AB_DEV_APPLICATION_ID"]
    
    DefaultLoad -->|Reports to| ProdAccount["Production Account<br/>INTERNAL_DEV_APPLICATION_ID"]
    
    %% Styling
    classDef trigger fill:#e1f5ff,stroke:#0066cc,stroke-width:2px
    classDef workflow fill:#fff4e6,stroke:#ff9800,stroke-width:2px
    classDef build fill:#f3e5f5,stroke:#9c27b0,stroke-width:2px
    classDef storage fill:#e8f5e9,stroke:#4caf50,stroke-width:2px
    classDef deploy fill:#fce4ec,stroke:#e91e63,stroke-width:2px
    classDef load fill:#fff9c4,stroke:#fbc02d,stroke-width:2px
    
    class PR,RPPR,Manual,PageLoad trigger
    class ExpWorkflow,DevWorkflow,PromWorkflow workflow
    class ExpBuild,DevBuild,ConfigJS,LoaderJS build
    class S3Exp,S3Dev,CDNExp,CDNDev storage
    class NR1Dev,NR1Staging,NR1JP,NR1EU,NR1US deploy
    class QueryParam,ExpLoad,LoadConfig,LoadExp,DefaultLoad load
```

## Key Workflows

### 1. PR Experiment Publishing (Automatic)
- **Trigger**: Any PR created or updated against main branch
- **Workflow**: `publish-experiment.yml`
- **Output**: Experiment files at `experiments/dev/<branch-name>/`
  - `config.js` - Complete window.NREUM configuration
  - `nr-loader-spa.min.js` - Browser agent loader
- **Testing**: `https://one.newrelic.com/?nrbaExperiment=<branch-name>`
- **Concurrency**: Cancels previous builds on PR update

### 2. Release-Please Dev Auto-Deploy
- **Trigger**: Release-please PR created or updated
- **Workflow**: `internal-promotion.yml` (auto-triggered on PR)
- **Filter**: Branch name starts with `release-please--`
- **Output**: 
  - Deployed to NR1 dev environment
  - Version suffix: `1.316.0-<branch-name>` (or `1.316.0-dev` if no branch name provided)
  - Change tracking event created
- **Concurrency**: Cancels previous dev deploys for same PR

### 3. Manual Environment Promotion
- **Trigger**: Manual workflow dispatch
- **Workflow**: `internal-promotion.yml`
- **Filter**: Must be on `main` or `release-please--` branch
- **Sequence**: dev → staging → jp-prod → eu-prod → us-prod
- **Approvals**: Manual approval required for staging and beyond
- **Output**: Released loader deployed to each NR1 environment

### 4. Experiment Loading on NR1 Pages
- **Default**: Loads released production loader
- **With Query Param**: `?nrbaExperiment=<branch-name>`
  1. Smart router in `released.js` detects param
  2. Loads `config.js` from `experiments/dev/<branch-name>/`
  3. On config load, loads `nr-loader-spa.min.js`
  4. Agent reports to dev A/B account
- **Fallback**: Any error returns to released loader

## Environments

| Environment | CDN | S3 Bucket Path | Manual Approval | Change Tracking |
|-------------|-----|----------------|-----------------|-----------------|
| Dev | staging-js-agent.newrelic.com | dev/ | No | Yes (auto) |
| Staging | js-agent.newrelic.com | staging/ | Yes | Yes |
| JP Prod | js-agent.newrelic.com | jp-prod/ | Yes | Yes |
| EU Prod | js-agent.newrelic.com | eu-prod/ | Yes | Yes |
| US Prod | js-agent.newrelic.com | prod/ | Yes | Yes |

## Experiment Files

| File | Purpose | Created By | Location |
|------|---------|------------|----------|
| config.js | Complete window.NREUM setup (non-mutative) | publish-experiment.yml | experiments/&lt;env&gt;/&lt;branch&gt;/ |
| nr-loader-spa.min.js | Browser agent loader | publish-experiment.yml | experiments/&lt;env&gt;/&lt;branch&gt;/ |
| released.js | Smart router with experiment detection | internal-promotion action | Injected into NR1 pages |

## Obsolete Workflows

The following workflows/jobs are **no longer used** with the query-param approach:

- ✗ `publish-ab` job (was in publish-experiment.yml) - Random A/B selection replaced by query params
- ✗ `publish-dev.yml` workflow - Replaced by auto-deploy on release-please PRs
- ✗ `build-ab` action - No longer needed with query-param approach
- ✗ `internal-ab` action - No longer needed with query-param approach
