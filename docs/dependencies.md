# Dependencies

Dependency updates are raised automatically and merged by hand.

## The chain

1. **Dependabot opens a pull request** every Monday for any dependency with a new release
   (`.github/dependabot.yml`).
2. **CI runs against the pull request** (`.github/workflows/ci.yml`): formatting, types, unit
   tests, end-to-end tests in the real Workers runtime, and a live check against the blog
   repository.
3. **A human merges it** once CI is green (see "What to check before merging" below).
4. **Cloudflare deploys `main`** automatically, as it does for any other merge.

If CI fails, nothing should be merged. The pull request sits there until a human looks at it,
which is the correct outcome — a stuck pull request is a safe failure.

## Why merging isn't automatic

An earlier version of this repository had a `dependabot-auto-merge.yml` workflow that turned on
GitHub's auto-merge for Dependabot's npm pull requests. It was removed in commit
[`f289a87`](https://github.com/MyNameIsMikeGreen/parrot/commit/f289a8764c2e00d5bd91e971679acfdda33d2529),
"Revert problematic version bump and the workflow that merged it" — it had merged a dependency
update that turned out to be a problem, which is exactly the failure mode its own comments warned
about: **auto-merge only waits for required status checks, and if `main` has none configured, it
merges "tests or no tests."**

If you want to bring it back, configure the branch ruleset below **first**, verify it is actually
enforced (push a deliberately failing pull request and confirm GitHub refuses to merge it), and
only then recreate the workflow. Doing it in the other order is what went wrong last time.

## What to check before merging

`npm ci` passing is not the only signal worth reading, because two things can silently drift out
of date without failing the build:

- **`npm audit`.** An update can introduce a new transitive dependency with its own advisory,
  which nothing in `ci.yml` currently fails on. Run it locally, or read the log if it is ever
  added as a CI step.
- **The `allow-scripts` warning `npm ci` prints to the log.** `allowScripts` in `package.json`
  pins the exact versions of `esbuild`, `sharp`, `workerd` and `fsevents` permitted to run install
  scripts (see [`security.md`](security.md#supply-chain)). A dependency bump that touches one of
  these — which `workerd` does on almost every `wrangler` update — moves it out of the pinned
  list. `npm` does not fail the build over this, it only warns, so the pull request merges either
  way; the warning is easy to miss precisely because nothing red draws attention to it. After
  reading what changed, bring the pin back in step with `npm approve-scripts <package>`.

## One-off repository settings for reintroducing auto-merge

**The workflow alone is not enough.** Until the settings below are configured, auto-merge has
nothing to wait for and will merge dependency updates _without regard to whether the tests
passed_ — which is what happened before. Do these before relying on the automation.

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

## What is safe to merge

Every npm update, including major versions, once CI passes and the checks above are clean.

That is a deliberate choice, and the safety net is the test suite rather than solely a human
reading a changelog. Three things make it defensible here:

- The tests exercise the actual product — pages served by the real Workers runtime — rather than
  implementation details, so a dependency that breaks the site should fail them.
- Dependabot waits before proposing anything (`cooldown` in `dependabot.yml`): 7 days for major
  versions, 3 for everything else. A release that gets yanked or patched in its first week never
  reaches this repository.
- Rolling back is quick and does not need a code change (see below).

Major versions arrive as individual pull requests, so if one does break something it is obvious
which dependency did it. Minor and patch updates are grouped into a single pull request to keep
the noise down.

## Why GitHub Actions updates would need care even under auto-merge

Dependabot also watches the actions used in `.github/workflows/`. These are the ones most worth
reading by hand even if npm updates are ever automated again, because a compromised GitHub Action
runs with access to CI, so an action bump deserves the glance that a lockfile bump does not.

There is also a structural reason auto-merge could never cover them: the built-in workflow token
has no permission to write GitHub Actions workflow files — there is no `workflows:` key in a
workflow's `permissions:` block at all. This stops a workflow rewriting itself to grant itself more
access. Because a Dependabot actions update changes a file under `.github/workflows/`, asking
GitHub to auto-merge one fails with:

```
refusing to allow a GitHub App to create or update workflow ... without workflows permission
```

Working around it means creating a GitHub App with `Workflows: Write`, storing its private key in
the repository, and using it to merge. That is a powerful credential to leave lying around, and a
standing ability for automation to rewrite the CI pipeline, in exchange for saving a few clicks a
year — not a good trade for this project. Any future auto-merge workflow should filter these pull
requests out by their branch prefix (`dependabot/github_actions/`) rather than attempt this.

To merge one by hand: check CI is green, confirm the new version is a real release from the
expected publisher, and press Merge.

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
