# Dependencies

Dependency updates are almost entirely automated. Dependabot raises a pull request, the CI suite
runs against it, and if everything passes GitHub merges it and Cloudflare deploys the result. In
the normal case you do nothing.

The one exception is updates to the GitHub Actions used by CI, which you merge yourself. The
reason is explained below.

This document explains how that works, the one-off settings that make it safe, and how to
intervene when you want to.

## The chain

1. **Dependabot opens a pull request** every Monday for any dependency with a new release
   (`.github/dependabot.yml`).
2. **CI runs against the pull request** (`.github/workflows/ci.yml`): formatting, types, unit
   tests, end-to-end tests in the real Workers runtime, and a live check against the blog
   repository.
3. **Auto-merge is switched on** (`.github/workflows/dependabot-auto-merge.yml`). GitHub then
   waits, and merges the pull request only once the required checks pass.
4. **Cloudflare deploys `main`** automatically, as it does for any other merge.

If CI fails, nothing merges. The pull request sits there until a human looks at it, which is the
correct outcome — a stuck pull request is a safe failure.

## One-off repository settings

**The workflow alone is not enough.** Until the settings below are configured, auto-merge has
nothing to wait for and will merge dependency updates _without regard to whether the tests
passed_. Do these before relying on the automation.

### 1. Allow auto-merge

**Settings → General → Pull Requests → Allow auto-merge.** Tick it. Without this, the workflow
fails with an error saying auto-merge is not enabled.

Leave **Allow squash merging** ticked too; the workflow squashes so each update is a single
commit on `main`.

### 2. Require the CI checks on `main`

This is the part that actually protects the branch. Use a ruleset, which is GitHub's current
mechanism and can be toggled without deleting it.

**Settings → Rules → Rulesets → New branch ruleset:**

- Name it something like `main`, enforcement **Active**.
- Target branches: include the **default branch**.
- Tick **Require status checks to pass**, then add all three CI job names:
  - `Format, types and unit tests`
  - `End-to-end tests`
  - `Live GitHub integration`
- Tick **Require a pull request before merging**, and set **required approvals to `0`**.

That last point matters. If you require an approving review, Dependabot's pull requests will wait
for a human forever and the automation stops working. Requiring the status checks is what gives
you safety here; requiring a review would only give you a rubber stamp.

The status check names must match the `name:` of each job in `ci.yml` exactly. They only appear
in the ruleset picker after the workflow has run at least once, so push a commit first if the
list looks empty.

Do **not** add `Enable auto-merge` to the required checks. That job only runs for Dependabot's own
pull requests and is skipped on everyone else's, so requiring it risks blocking your own pull
requests on a check that will never report.

## What gets merged automatically

Every npm update, including major versions, provided CI passes.

That is a deliberate choice, and the safety net is the test suite rather than a human reading a
changelog. Three things make it defensible here:

- The tests exercise the actual product — pages served by the real Workers runtime — rather than
  implementation details, so a dependency that breaks the site should fail them.
- Dependabot waits before proposing anything (`cooldown` in `dependabot.yml`): 7 days for major
  versions, 3 for everything else. A release that gets yanked or patched in its first week never
  reaches this repository.
- Rolling back is quick and does not need a code change (see below).

Major versions arrive as individual pull requests, so if one does break something it is obvious
which dependency did it. Minor and patch updates are grouped into a single pull request to keep
the noise down.

## Why GitHub Actions updates are merged by hand

Dependabot also watches the actions used in `.github/workflows/`, and those pull requests are
deliberately left for you. They are the handful you will see a few times a year.

The reason is a deliberate GitHub restriction. The token a workflow is given has no permission to
write GitHub Actions workflow files — there is no `workflows:` key in a workflow's `permissions:`
block at all. This stops a workflow rewriting itself to grant itself more access. Because a
Dependabot actions update changes a file under `.github/workflows/`, asking GitHub to auto-merge
it fails with:

```
refusing to allow a GitHub App to create or update workflow ... without workflows permission
```

Working around it means creating a GitHub App with `Workflows: Write`, storing its private key in
the repository, and using it to merge. That is a powerful credential to leave lying around, and a
standing ability for automation to rewrite the CI pipeline, in exchange for saving a few clicks a
year. It is not a good trade for this project, so the workflow filters those pull requests out by
their branch prefix (`dependabot/github_actions/`).

Reviewing them yourself is also the right instinct: a compromised GitHub Action runs with access
to your CI, so an action bump deserves the glance that a lockfile bump does not.

To merge one: check CI is green, confirm the new version is a real release from the expected
publisher, and press Merge.

## Turning it off

To stop automatic merging without losing the update pull requests, set the workflow's enforcement
to nothing by deleting `.github/workflows/dependabot-auto-merge.yml`, or simply untick **Allow
auto-merge** in the repository settings. Dependabot will carry on raising pull requests and CI
will carry on checking them; they will just wait for you.

To hold back one troublesome dependency, add an `ignore` entry to `.github/dependabot.yml` — see
the [configuration reference](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference).

## When an update breaks production

CI passed but the site is wrong. In order of speed:

1. **Roll back the deployment.** In the Cloudflare dashboard, open the Worker, go to
   **Deployments**, find the previous good one and roll back to it. This is immediate and needs
   no code change.
2. **Revert the merge** on GitHub, which returns `main` to its previous state and triggers a
   fresh deployment.
3. **Pin the dependency** with an `ignore` entry in `dependabot.yml` so it is not proposed again,
   and add a test covering whatever broke, so the suite catches it next time.

Step 3 is the one that matters. If something reached production, the tests had a gap; closing it
is what stops the same class of breakage recurring.

## Keeping Node itself current

Dependabot does not manage the Node version. It is pinned in `.nvmrc`, which both CI and the
local toolchain read, so changing it there changes it everywhere. Check it against the
[Node release schedule](https://github.com/nodejs/release#release-schedule) occasionally and move
to the current LTS when the one in use approaches end of life.
