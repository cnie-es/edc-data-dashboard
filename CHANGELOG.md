# Changelog

All notable changes to this project will be documented in this file - formatted and maintained according to the rules
documented on <http://keepachangelog.com>.

This file will not cover changes about documentation, code clean-up, samples, or the CI pipeline. With each version
(respectively milestone), the core features are highlighted. Relevant changes to existing implementations can be found
in the detailed section referring to by linking pull requests or issues.

## v1.1.0-edval (2026-10-19)

> Derivative work by the **EDNEL-RIOJA** project team for **CNIE-ES**, based on the Eclipse EDC
> Data Dashboard at commit `4921ba3`. Modified between **2026-02-20 and 2026-10-19**, licensed
> under the Apache License 2.0 like the original work. See [NOTICE.EDNEL.md](NOTICE.EDNEL.md) for
> the record of which files were changed, added and removed.

### Offer prices (2026-10-19)

#### Fixed

- Offer cards (Mis ofertas and catalogue search) always showed the price as `€ + IVA`, whatever
  the currency of the offer (`simpl:currency`); the offer detail already used it. Cards now read
  the currency from the self-description or, for connector assets, from `offer.currency`
  ([EDNEL-RIOJA/DataDashboard#59](https://github.com/EDNEL-RIOJA/DataDashboard/pull/59)).

#### Changed

- Prices show the symbol of the offer currency in cards and detail views (`€`, `zł`, `Kč`, `Ft`,
  `lei`…), taken from the browser `Intl` data so every currency of the offer template gets one.
  Danish and Swedish krone are shown by code (`DKK`, `SEK`), since both symbols are `kr`. Cards of
  offers without a currency assume euro.
- No price carries a VAT suffix any more (`+ IVA` on cards, `(+IVA)` and its translations on the
  detail views), and the euro icon next to prices is gone.

### Offer policies (2026-10-19)

#### Changed

- The policies section of the offer detail views (Mis ofertas, asset detail, negotiation modal and
  advanced search) shows every permission of the access and usage policies embedded in the
  self-description (`simpl:access-policy`, `simpl:usage-policy`), laid out like the policy cards of
  the offer form, instead of only the first one with raw action IRIs. Each policy has a
  "View ODRL" button that shows its ODRL.

#### Removed

- The "View policy" button of the offer detail and the policy modal it opened, which duplicated
  the policies section. In the advanced search detail the button was already hidden.

### Policy detail (2026-10-19)

#### Changed

- The "Legal license text" tab of the policy detail (Mis políticas) downloaded the license from
  the browser and almost always failed with "the license could not be loaded". It is replaced by a
  "Summary" tab, shown first, with the policy laid out like the offer form cards: assigner, action,
  attribute or usage assignee, usage type, number of usages and validity dates. The "ODRL format"
  tab is kept, and the link to the original license stays in the page header.
- ODRL policies are read in full: every permission, the number of usages (`odrl:count`), deletion
  after use (`odrl:deletion` constraint or a `delete` duty or obligation) and logical constraints
  (`odrl:and`, `odrl:or`…).
- New labels in the six languages the dashboard ships: `ca`, `en`, `es`, `eu`, `gl` and `va`.

## v1.0.14-edval-v3 (2026-10-15)

### Identity attribute label (2026-10-15)

#### Fixed

- The identity attribute of the data space was translated as `EDNEL_PARTICIPANT` in the six
  languages (`ca`, `en`, `es`, `eu`, `gl`, `va`); it is `EDVAL_PARTICIPANT`, the code the backend
  sends. The policy attribute and usage assignee labels now match it
  ([EDNEL-RIOJA/DataDashboard#57](https://github.com/EDNEL-RIOJA/DataDashboard/pull/57)).

> `v1.0.14-edval-v2` contains the same code; it was published before this entry was added.

## v1.0.5-edval (2026-10-13)

> Derivative work by the **EDNEL-RIOJA** project team for **CNIE-ES**, based on the Eclipse EDC
> Data Dashboard at commit `4921ba3`. Modified between **2026-02-20 and 2026-10-13**, licensed
> under the Apache License 2.0 like the original work. See [NOTICE.EDNEL.md](NOTICE.EDNEL.md) for
> the record of which files were changed, added and removed.

### Self-description registration (2026-10-13)

#### Fixed

- Keywords made only of digits or symbols (e.g. `333`) could be added and only failed when the
  self-description was validated after submission. On publish, sdtooling-api-be copies the asset's
  `dcat:keyword` values into `simpl:keywords`, which is hidden in the form and is the only one of
  the two whose SHACL shape declares the pattern (at least one letter) and the 50-character limit.
  When parsing a schema for creation, those per-value constraints are now added to `dcat:keyword`,
  read from the `simpl:keywords` shape of the same TTL so the TTL remains their only source.
- Token fields (keywords and other repeatable text values) were validated against all their values
  joined with commas, so one valid keyword let any other one through. Pattern and length are now
  checked per value, and a keyword that breaks them is rejected before it is added to the list,
  with a message that says why.
- Changing the dashboard language halfway through the wizard reloaded the schema in the new
  language and discarded everything entered. The form values, unsent keyword drafts, current
  step, sharing method, template and template values are now restored once the schema in the new
  language has loaded. Values are matched by control name, which does not depend on the language;
  select values no longer offered by the new schema are skipped.
- Labels that were resolved once and did not follow a language change: the usage type options of
  the usage policy, the asset properties title in the summary step and the keyword error message.
- In the two-column layout of repeatable blocks, a field whose description wrapped onto more lines
  pushed its input below the one beside it. Label, description and input now sit on shared rows.

#### Added

- Readable, translated labels instead of codes or IRI fragments for the options of: media type,
  linguality type, technical and organisational measures, data protection principles, price type
  and metadata language (`simpl:inLanguage`). Media type and linguality type are also translated in
  the self-description detail views. Options without a translation keep their previous label.
- Translated names and descriptions for the fields of the 13 source templates of the sharing
  methods, which the backend serves in English only. Descriptions are translated only where the
  template provides one.
- Translated access policy actions (`SEARCH`, `CONSUME`, `RESTRICTED_CONSUME`) and identity
  attributes, the latter used both as policy attribute and as usage assignee, including
  `EDVAL_PARTICIPANT`. Attributes without a translation keep the label the backend sends.
- All of the above in the six languages the dashboard ships: `ca`, `en`, `es`, `eu`, `gl` and `va`.

#### Changed

- The sharing methods offered depend on the offer type: corpus, lexical-conceptual resource and
  model offers can use every method except `REST_API`; API offers can only use `REST_API`. The
  backend does not enforce this restriction.
- The summary step shows the labels of the selected options instead of their raw values.
- `ca` and `gl`: the `language` and `region` translations were nested under `xfsc`, so language
  and region names were never translated in Catalan and Galician. They are now also defined at the
  top level, where the detail views and the form look them up.

## v1.0.4-edval (2026-09-16)

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
