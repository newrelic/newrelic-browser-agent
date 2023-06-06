import * as github from '@actions/github'
import { args } from './args.js'

const octokit = github.getOctokit(args.githubToken)

let comment
if (args.commentTag) {
  for await (const { data: comments} of octokit.paginate.iterator(
    octokit.rest.issues.listComments,
    {
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      issue_number: args.prNumber
    }
  )) {
    comment = comments.find(c => c?.body?.includes(args.commentTag))
    if (comment) {
      break
    }
  }
}

if (comment) {
  await octokit.rest.issues.updateComment({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: args.prNumber,
    comment_id: comment.id,
    body: args.comment.toString().trim() + '\n' + args.commentTag.toString().trim()
  })
} else {
  await octokit.rest.issues.createComment({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: args.prNumber,
    comment_id: comment.id,
    body: args.comment.toString().trim() + '\n' + args.commentTag.toString().trim()
  })
}
