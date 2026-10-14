# Contributing

Contributions are always welcome. Before contributing please read the
[code of conduct](https://github.com/newrelic/.github/blob/main/CODE_OF_CONDUCT.md) and [search the issue tracker](issues); your issue may have already been discussed or fixed in `main`. To contribute,
[fork](https://help.github.com/articles/fork-a-repo/) this repository, commit your changes, and [send a Pull Request](https://help.github.com/articles/using-pull-requests/).

Note that our [code of conduct](https://github.com/newrelic/.github/blob/main/CODE_OF_CONDUCT.md) applies to all platforms and venues related to this project; please follow it in all your interactions with the project and its participants.

## Feature Requests

Feature requests should be submitted in the [Issue tracker](../../issues), with a description of the expected behavior & use case, where they’ll remain closed until sufficient interest, [e.g. :+1: reactions](https://help.github.com/articles/about-discussions-in-issues-and-pull-requests/), has been [shown by the community](../../issues?q=label%3A%22votes+needed%22+sort%3Areactions-%2B1-desc).
Before submitting an Issue, please search for similar ones in the
[closed issues](../../issues?q=is%3Aissue+is%3Aclosed+label%3Aenhancement).

## Pull Requests

If you’re planning on contributing a new feature or an otherwise complex contribution, we kindly ask you to start a conversation with the maintainer team by opening up a Github issue first.

### Pull Request Titles

PR titles must follow the format `type(scope): description` (scope optional; add `!` after the type/scope, e.g. `feat!: ...`, to flag a breaking change) and be 70 characters or fewer. The type determines which section of the release notes the change appears in:

| Type | Use when | Release notes section | Version bump |
| ---- | -------- | --------------------- | ------------ |
| `feat` | The change introduces a new capability that did not previously exist. | New features | Minor |
| `enhancement` | The change improves or extends an existing feature (e.g. a new option, better performance or accuracy) without introducing a new capability. | Improvements and enhancements | Patch |
| `fix` | The change corrects a bug. | Bug fixes | Patch |
| `security` | The change addresses a security vulnerability or hardens the agent. | Security updates | Patch |
| `chore` | The change has no user-facing impact (tests, tooling, CI, docs). | Not included | None (does not trigger a release) |

The version bump for a release is determined by the highest-impact change it contains, so a release containing any `feat` is a minor bump and a release with only `enhancement`, `fix`, and/or `security` changes is a patch bump. A breaking change (a `!` in the title, or a `BREAKING CHANGE:` footer in the commit message) of any type forces a major bump.

If you are unsure between `feat` and `enhancement`, ask: _would a customer describe this as something the agent can do now that it couldn't before?_ If yes, use `feat`; if it makes something the agent already does better, use `enhancement`.

### General Guidelines

This project is licensed under the Apache-2.0 license. Any third party libraries added as dependencies of the project must have a similarly permissive open source license, e.g. MIT.

### Coding Style Guidelines/Conventions

All code should follow [![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

We use eslint to enforce our style.  To lint your code, you can run `npm run lint` on the
command line.  There are plugins available for most editors (see
[eslint's documentation](https://eslint.org/docs/user-guide/integrations#editors)
for more details).

## Testing

All changes to the Agent should include test coverage, and each PR must pass
all tests against all browsers in LambdaTest locally before being merged.

We run tests on a variety of browsers and platforms to ensure that the agent runs safely for all users. We use LambdaTest.

When you first submit your PR, the tests will not be run automatically. After we review the PR, we will add a label that will trigger the full-matrix testing.

See [Running Tests](https://github.com/newrelic/newrelic-browser-agent#running-tests)
for more details on how to run tests locally.

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
* Commit message are concise.
* The [change log]('./CHANGELOG.md') has been updated (where applicable).
