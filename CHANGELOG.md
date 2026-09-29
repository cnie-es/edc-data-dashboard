# Changelog

All notable changes to this project will be documented in this file - formatted and maintained according to the rules
documented on <http://keepachangelog.com>.

This file will not cover changes about documentation, code clean-up, samples, or the CI pipeline. With each version
(respectively milestone), the core features are highlighted. Relevant changes to existing implementations can be found
in the detailed section referring to by linking pull requests or issues.

## v1.0.5-edval (2026-09-16)

> Derivative work by the **EDNEL-RIOJA** project team for **CNIE-ES**, based on the Eclipse EDC
> Data Dashboard at commit `4921ba3`. Modified between **2026-02-20 and 2026-09-16**, licensed
> under the Apache License 2.0 like the original work. See [NOTICE.EDNEL.md](NOTICE.EDNEL.md) for
> the record of which files were changed, added and removed.

### Federated catalog: own offers (2026-09-16)

#### Fixed

- A rejected contract negotiation was announced as a success. On the self-description detail page,
  a negotiation that the connector ends as `TERMINATED` is neither finalized nor in progress, so it
  fell through to the green "pending approval" banner, while the only hint of the rejection was the
  status line above it. Worse, the reason was never shown: `currentNegotiationError` only covered
  HTTP failures, so the `errorDetail` the connector reports — which does reach the client in the
  negotiation status response — was dropped. A terminated negotiation now renders as an error with
  that detail, and the pending-approval banner is limited to negotiations that really are awaiting
  approval. This affects every failed negotiation, not only the case below.

#### Added

- Offers published by this connector are now recognised in the federated catalog search and cannot
  be contracted. A hybrid connector acts as provider and consumer at once, so its own
  self-descriptions come back among the search results and contracting them fails. Each result's
  self-description id is matched against the offer ids of the connector's own assets (`sdId` /
  `offer.offerID`, the same identifier the catalog publishes as `claimsGraphUri`). A matching card
  is badged as "Your offer", drops its details button and says in its place where to open the offer
  instead: the same self-description is available under My offers, fetched from the same endpoint.
  "Get data" stays disabled on the detail page, which is still reachable by direct URL. Detection
  reads the shared `assets/request` cache without writing to it, and a failure to resolve it leaves
  the offer contractable rather than blocking the catalog.

### Self-description registration (2026-09-15)

#### Fixed

- Service policies step: the access policy and the usage policy were shown as mandatory, but the
  wizard let the user move on — and submit — without filling either in, and the empty policy was
  then dropped from the payload. A `policy-card-array` control starts with one empty card, so
  `Validators.required` never failed: the array was not empty. The cards are now validated against
  the same rules the submission payload applies — access policy: action and attribute; usage
  policy: assignee, plus the number of usages or the date range, depending on the usage type. A
  required policy field with no card filled in is invalid, and any card the user has started must
  be completed rather than being discarded on submit. See `EDVAL-62`.

#### Added

- Validation messages for the policy cards (`dynamicForm.policyCardIncomplete`,
  `sdtooling.policyFieldRequired`) in the six languages the dashboard ships: `ca`, `en`, `es`, `eu`,
  `gl` and `va`. The subfields that are missing are flagged inside the card itself.

### Licence compliance (2026-09-11)

Notices required by Section 4 of the Apache License for a derivative work:

- `NOTICE.EDNEL.md`: the record Section 4(b) asks for — every file of the original work that this
  fork changed, removed or renamed, listed with its dates and generated from the commit history,
  plus a summary of what was added and where. It also states the upstream, the baseline commit and
  the repository holding the source of this fork.
- `README.md`: prominent notice at the top of the file identifying this repository as a modified
  version of the Eclipse EDC Data Dashboard, plus a Licence section. It states that neither the
  Eclipse Foundation nor the original contributors endorse this fork, and that "Eclipse" and "EDC"
  are used only to describe the origin of the work, as Section 6 allows.
- `Dockerfile`: OCI image labels (`licenses`, `source`, `vendor`, `description`) and `LICENSE` and
  `NOTICE.EDNEL.md` copied into `/licenses/`, so that Section 4(a) — a copy of the Licence with
  every distribution — and 4(b) are satisfied by the published image too. The upstream project
  ships no `NOTICE` file, so none is copied, and the Fraunhofer copyright header of the
  `Dockerfile` is left untouched.
- `.github/workflows/docker-publish.yaml`: the container image namespace is derived from the
  repository owner instead of being hard-coded, so that the published image and the source it is
  built from always live in the same organisation.
- Automatic tagging switched off on the `edval` line of that workflow. It bumped the patch and
  pushed a new `v1.0.x-edval` git tag on every merge to `ednel`, so the released version moved
  without anyone deciding it and drifted from what this changelog, the README and the modification
  notice declare. The release version is now whatever tag was created on purpose, and the image is
  published under that same tag; the build fails if no release tag exists.

`LICENSE` is untouched: the original work already ships the full text of the Apache License 2.0.


## [Unreleased]

### Overview

### Detailed Changes

#### Added

#### Changed

#### Removed

#### Fixed
