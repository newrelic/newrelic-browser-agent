import * as core from '@actions/core'
import * as github from '@actions/github'

const REQUIRED_ENVIRONMENTS = ['nr1-staging', 'nr1-jp-prod', 'nr1-eu-prod', 'nr1-us-prod']

async function run() {
  try {
    // Get inputs
    const prNumber = core.getInput('pr_number', { required: true })
    const branchName = core.getInput('branch_name', { required: true })
    const token = core.getInput('github_token', { required: true })

    // Initialize Octokit
    const octokit = github.getOctokit(token)
    const { owner, repo } = github.context.repo

    console.log('🔍 Verifying GitHub Environment deployments')
    console.log(`📋 PR Number: ${prNumber}`)
    console.log(`🌿 Branch: ${branchName}`)

    // Get PR details to find the head commit SHA
    const { data: pullRequest } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: parseInt(prNumber, 10)
    })

    const commitSha = pullRequest.head.sha
    console.log(`📌 Commit SHA: ${commitSha}`)

    // Get commit details to find the timestamp
    const { data: commit } = await octokit.rest.repos.getCommit({
      owner,
      repo,
      ref: commitSha
    })

    const commitTimestamp = commit.commit.committer.date
    console.log(`📅 Commit Time: ${commitTimestamp}`)
    console.log('')
    console.log(`Required environments: ${REQUIRED_ENVIRONMENTS.join(', ')}`)
    console.log('')

    // Check each environment
    let allPassed = true
    const results = []

    for (const env of REQUIRED_ENVIRONMENTS) {
      console.log(`🔍 Checking environment: ${env}`)

      try {
        // Get deployments for this environment
        const { data: deployments } = await octokit.rest.repos.listDeployments({
          owner,
          repo,
          environment: env,
          per_page: 50
        })

        // Filter deployments that:
        // 1. Are from the correct branch
        // 2. Were created after the commit timestamp
        const relevantDeployments = deployments
          .filter(d => d.ref === branchName)
          .filter(d => new Date(d.created_at) > new Date(commitTimestamp))
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

        if (relevantDeployments.length === 0) {
          console.log(`  ❌ No deployment found for ${env} from branch ${branchName} after ${commitTimestamp}`)
          allPassed = false
          results.push({ env, success: false, reason: 'No deployment found' })
          continue
        }

        const deployment = relevantDeployments[0]
        const deploymentId = deployment.id
        console.log(`  📦 Deployment ID: ${deploymentId}`)

        // Get deployment statuses
        const { data: statuses } = await octokit.rest.repos.listDeploymentStatuses({
          owner,
          repo,
          deployment_id: deploymentId
        })

        // Find a successful status
        const successStatus = statuses.find(s => s.state === 'success')

        if (!successStatus) {
          console.log(`  ❌ No successful deployment status found for ${env} (Deployment ID: ${deploymentId})`)
          allPassed = false
          results.push({ env, success: false, reason: 'No successful status', deploymentId })
        } else {
          console.log(`  ✅ Successfully deployed at ${successStatus.created_at}`)
          results.push({ env, success: true, deployedAt: successStatus.created_at, deploymentId })
        }
      } catch (error) {
        console.log(`  ⚠️  WARNING: Failed to check ${env}`)
        console.log(`  Error: ${error.message}`)
        allPassed = false
        results.push({ env, success: false, reason: `API error: ${error.message}` })
      }
    }

    console.log('')

    // Report results
    if (!allPassed) {
      console.log(`❌ ERROR: Not all environments have been successfully deployed after commit ${commitSha}`)
      console.log('')
      console.log('📝 Required Action:')
      console.log('   1. Trigger the Internal Promotion workflow manually')
      console.log('   2. Complete deployments to: staging → jp-prod → eu-prod → us-prod')
      console.log('   3. Ensure all environments are approved and deployed successfully')
      console.log('')
      console.log(`ℹ️  Note: All deployments must complete AFTER the commit timestamp (${commitTimestamp})`)
      console.log('   to ensure you\'re deploying the correct version.')
      console.log('')
      console.log(`🔗 Trigger workflow at:`)
      console.log(`   https://github.com/${owner}/${repo}/actions/workflows/internal-promotion.yml`)
      
      core.setFailed('Not all required environments have been successfully deployed')
    } else {
      console.log('✅ SUCCESS: All environments have been successfully deployed!')
      console.log('✅ Deployment chain completed: staging → jp-prod → eu-prod → us-prod')
      console.log('')
      console.log('🎉 This Release-Please PR is ready to merge!')
    }

    // Set outputs
    core.setOutput('all_passed', allPassed)
    core.setOutput('results', JSON.stringify(results))

  } catch (error) {
    core.setFailed(`Action failed with error: ${error.message}`)
    console.error(error)
  }
}

run()
