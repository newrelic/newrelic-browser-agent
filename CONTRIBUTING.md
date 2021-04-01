# Contributing

## Workflow
Each change/feature should be developed on a new branch forked from master.
We currently do not have a strict naming convention for branches, but branch
names should be unlikely to collide, and ideally should provide some insight
into what changes they were intended to contain (this helps when cleaning old
branches).  Currently our branch names will often contain the authors name,
and/or a JIRA ticket number.

During development we don't enforce any particular commit workflow, but once
a change is ready to be merged we prefer commits be squashed down to 1 or 2
commits with complete changes and clear messages that include the JIRA ticket
associated with the change (if applicable).

When a PR is submitted, it will be reviewed by a member of the team. Once it
has been submitted, and there are no outstanding changes or unaddressed
feedback, a member of the team will add the `sidekick-approved` label to the PR,
indicating that it can be merged.

## Code style

All code should follow [![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

We use eslint to enforce our style.  To lint your code, you can run `npm run lint` on the
command line.  There are plugins available for most editors (see
[eslint's documentation](http://eslint.org/docs/user-guide/integrations#editors)
for more details).

## Testing

All changes to the Agent should include test coverage, and each PR must pass
all tests against all browsers in SauceLabs locally before being merged.

To run all tests against all browsers in saucelabs:
```
jil -s -b *@*
```

See [Running Tests](https://github.com/newrelic/newrelic-browser-agent#running-tests)
for more details on how to run tests.

We often will include a screenshot of the passing output of the test run
against sauce labs, to indicate that the tests are passing.

## Review

PR Review should look at both code changes, and architectural decisions. A
reviewer should ensure that all of the following are true before approving a
change:

* Both the code and the architectural decisions have been thoroughly reviewed
and understood by another member of the team.
* The changes have passed all tests against all browsers in SauceLabs.
* All code changes in the agent have been covered by new tests.
* Appropriate documentation changes have been made (where applicable).
* Extraneous commits have been squashed.
* Commit message are concise, and contain relevant jira references.
* the [change log]('./CHANGELOG.md') has been updated (where applicable).
