# Modification notice (Apache License 2.0, Section 4)

**This is a modified version of the Eclipse EDC Data Dashboard. It is not the original work.**

The original work, EDC Data Dashboard, is © its contributors and is licensed under the **Apache
License, Version 2.0**. Its full text is in [LICENSE](LICENSE), unchanged. Source files inherited
from the original work keep their copyright and `SPDX-License-Identifier` headers exactly as they
were, as Section 4(c) requires. The upstream project ships no `NOTICE` file, so Section 4(d) does
not apply.

This file is the record Section 4(b) asks for: *"You must cause any modified files to carry
prominent notices stating that You changed the files."* The tables below list every file this fork
changed, removed or renamed, and summarise what it added.

## Upstream baseline

| | |
|---|---|
| Original work | EDC Data Dashboard |
| Upstream repository | https://github.com/eclipse-edc/DataDashboard |
| Baseline commit | `4921ba32c97ac8b074f7ffc8693300d4971ce329` (2025-12-02) |

## Modifications

| | |
|---|---|
| Modified by | EDNEL-RIOJA project team, for CNIE-ES |
| Public repository of this derivative work | https://github.com/cnie-es/edc-data-dashboard |
| Version of this derivative work | `v1.0.5-edval` |
| Dates of modification | **2026-02-20 to 2026-09-16** |

The modifications are licensed under the **Apache License 2.0**, the same licence as the original
work. Neither the Eclipse Foundation nor the original contributors endorse this fork; "Eclipse" and
"EDC" are used only to describe the origin of the work, as Section 6 of the licence allows.

The source of this derivative work is available at the public repository above. The published
container images (`ghcr.io/cnie-es/datadashboard`) are built from it.

### Scale of the change

This is an extensive derivative work, not a patch: 291 commits between the baseline and this
release, touching 511 files. The bulk of it is a new `projects/dashboard-core` library that did not
exist upstream, with modules for `assets`, `catalog`, `connector-data-locations`,
`contract-definitions`, `home`, `negotiations`, `policies`, `sdtooling`, `shacl-schema`,
`transfer` and `xfsc-advSearch`, plus the dashboard shell in `src/app` that consumes it. Alongside
it: SHACL schema handling and self-description tooling, multiple negotiation and transfer
perspectives, Spanish-language forms and validation messages, and the branding, styling and
deployment configuration of the EDNEL dataspace.

### Files added

393 files, of which 330 are the new `projects/dashboard-core` library. These are new works of this
fork rather than modifications of the original, so they are summarised by location rather than
listed one by one; the exhaustive list is in the diff command at the end of this file.

| Location | Files |
|---|---|
| `projects/dashboard-core` | 330 |
| `src/app` | 24 |
| `public/assets` | 10 |
| `src/assets` | 7 |
| `public/resources` | 6 |
| `cypress/fixtures` | 5 |
| `config-templates` | 3 |
| `src`, `public`, `public/config`, `.github/workflows`, `pnpm-lock.yaml`, `docker-entrypoint.sh` | 7 |
| `NOTICE.EDNEL.md` (this file) | 1 |

### Files modified

Every file of the original work that this fork changed, with the dates on which it changed.

| File | Date |
|---|---|
| `.dockerignore` | 2026-05-19 |
| `.github/workflows/verify.yaml` | 2026-02-20 |
| `CHANGELOG.md` | 2026-09-11, 2026-09-15, 2026-09-16 |
| `Dockerfile` | 2026-05-19, 2026-09-11, 2026-09-15, 2026-09-16 |
| `README.md` | 2026-05-29, 2026-09-11, 2026-09-15, 2026-09-16 |
| `angular.json` | 2026-05-19,2026-06-03 2026-06-18 |
| `cypress/e2e/asset-view.cy.ts` | 2026-05-29 |
| `cypress/e2e/contract-definition-view.cy.ts` | 2026-05-19,2026-05-20 2026-06-04 |
| `cypress/e2e/contract-view.cy.ts` | 2026-05-21,2026-05-22 |
| `cypress/e2e/contract_definition.cy.ts` | 2026-05-19 |
| `cypress/e2e/policy-definition-view.cy.ts` | 2026-05-29 |
| `cypress/e2e/transfer-history.cy.ts` | 2026-05-29,2026-06-08 |
| `nginx.conf` | 2026-05-19 |
| `package-lock.json` | 2026-05-19,2026-05-28 2026-06-01,2026-06-18 |
| `package.json` | 2026-05-19,2026-05-28 2026-06-08 |
| `projects/dashboard-core/assets/index.ts` | 2026-05-19 |
| `projects/dashboard-core/assets/src/asset-view/asset-view.component.html` | 2026-05-19,2026-06-08 2026-06-09 |
| `projects/dashboard-core/assets/src/asset-view/asset-view.component.spec.ts` | 2026-05-19,2026-05-29 2026-06-08,2026-07-09 |
| `projects/dashboard-core/assets/src/asset-view/asset-view.component.ts` | 2026-05-19,2026-06-08 2026-06-09,2026-07-09 2026-07-22 |
| `projects/dashboard-core/assets/src/asset.service.ts` | 2026-05-19,2026-07-03 |
| `projects/dashboard-core/catalog/index.ts` | 2026-06-09 |
| `projects/dashboard-core/catalog/src/catalog-card/catalog-card.component.css` | 2026-05-19 |
| `projects/dashboard-core/catalog/src/catalog-card/catalog-card.component.html` | 2026-05-19 |
| `projects/dashboard-core/catalog/src/catalog-card/catalog-card.component.ts` | 2026-05-19 |
| `projects/dashboard-core/catalog/src/catalog-request/catalog-request.component.html` | 2026-05-19 |
| `projects/dashboard-core/catalog/src/catalog-request/catalog-request.component.ts` | 2026-05-19 |
| `projects/dashboard-core/catalog/src/catalog-view/catalog-view.component.css` | 2026-05-19 |
| `projects/dashboard-core/catalog/src/catalog-view/catalog-view.component.html` | 2026-05-19,2026-06-09 |
| `projects/dashboard-core/catalog/src/catalog-view/catalog-view.component.ts` | 2026-05-19,2026-06-09 |
| `projects/dashboard-core/catalog/src/catalog.service.ts` | 2026-05-29 |
| `projects/dashboard-core/catalog/src/contract-negotiation/contract-negotiation.component.html` | 2026-05-29 |
| `projects/dashboard-core/catalog/src/contract-negotiation/contract-negotiation.component.ts` | 2026-05-29,2026-06-08 |
| `projects/dashboard-core/contract-definitions/index.ts` | 2026-05-19,2026-06-09 |
| `projects/dashboard-core/contract-definitions/src/contract-definition-card/contract-definition-card.component.css` | 2026-05-19,2026-06-08 2026-06-09,2026-07-09 |
| `projects/dashboard-core/contract-definitions/src/contract-definition-card/contract-definition-card.component.html` | 2026-05-19,2026-06-04 2026-06-08,2026-06-15 2026-06-22,2026-06-30 2026-07-02,2026-07-08 2026-07-09,2026-07-10 |
| `projects/dashboard-core/contract-definitions/src/contract-definition-card/contract-definition-card.component.spec.ts` | 2026-05-19,2026-06-04 2026-06-08,2026-06-09 2026-07-09 |
| `projects/dashboard-core/contract-definitions/src/contract-definition-card/contract-definition-card.component.ts` | 2026-05-19,2026-06-08 2026-06-22,2026-07-02 2026-07-13,2026-08-07 |
| `projects/dashboard-core/contract-definitions/src/contract-definitions-view/contract-definitions-view.component.html` | 2026-05-19,2026-06-04 2026-06-09 |
| `projects/dashboard-core/contract-definitions/src/contract-definitions-view/contract-definitions-view.component.spec.ts` | 2026-05-19,2026-06-04 2026-06-08,2026-06-09 2026-07-09 |
| `projects/dashboard-core/contract-definitions/src/contract-definitions-view/contract-definitions-view.component.ts` | 2026-05-19,2026-05-20 2026-06-04,2026-06-08 2026-06-09,2026-06-26 2026-07-09 |
| `projects/dashboard-core/contract-definitions/src/contract-definitions.service.spec.ts` | 2026-05-19 |
| `projects/dashboard-core/contract-definitions/src/contract-definitions.service.ts` | 2026-05-19,2026-05-29 |
| `projects/dashboard-core/home/src/home-view/home-view.component.html` | 2026-05-19,2026-05-21 2026-06-09 |
| `projects/dashboard-core/home/src/home-view/home-view.component.ts` | 2026-05-19,2026-06-09 |
| `projects/dashboard-core/policies/index.ts` | 2026-05-19,2026-06-04 2026-06-08,2026-06-09 |
| `projects/dashboard-core/policies/src/policy-create/policy-create.component.html` | 2026-05-19,2026-05-29 |
| `projects/dashboard-core/policies/src/policy-create/policy-create.component.spec.ts` | 2026-05-29 |
| `projects/dashboard-core/policies/src/policy-create/policy-create.component.ts` | 2026-05-19,2026-05-29 |
| `projects/dashboard-core/policies/src/policy-view/policy-view.component.css` | 2026-06-08 |
| `projects/dashboard-core/policies/src/policy-view/policy-view.component.html` | 2026-05-19,2026-05-22 2026-05-25,2026-06-08 2026-06-09 |
| `projects/dashboard-core/policies/src/policy-view/policy-view.component.spec.ts` | 2026-05-19,2026-05-22 2026-06-09 |
| `projects/dashboard-core/policies/src/policy-view/policy-view.component.ts` | 2026-05-19,2026-05-22 2026-05-25,2026-06-09 |
| `projects/dashboard-core/policies/src/policy.service.spec.ts` | 2026-05-19 |
| `projects/dashboard-core/policies/src/policy.service.ts` | 2026-05-19 |
| `projects/dashboard-core/src/lib/common/connector-config-form/connector-config-form.component.html` | 2026-05-19,2026-05-29 |
| `projects/dashboard-core/src/lib/common/connector-config-form/connector-config-form.component.ts` | 2026-05-19,2026-05-29 2026-06-18 |
| `projects/dashboard-core/src/lib/common/consumer-provider-switch/comsumer-provider-switch.component.cy.ts` | 2026-05-19 |
| `projects/dashboard-core/src/lib/common/consumer-provider-switch/consumer-provider-switch.component.html` | 2026-05-19 |
| `projects/dashboard-core/src/lib/common/consumer-provider-switch/consumer-provider-switch.component.ts` | 2026-05-19 |
| `projects/dashboard-core/src/lib/common/data-address/fallback-data-type/fallback-data-type.component.ts` | 2026-06-08 |
| `projects/dashboard-core/src/lib/common/filter-input/filter-input.component.cy.ts` | 2026-05-19 |
| `projects/dashboard-core/src/lib/common/filter-input/filter-input.component.html` | 2026-05-19 |
| `projects/dashboard-core/src/lib/common/filter-input/filter-input.component.ts` | 2026-05-19 |
| `projects/dashboard-core/src/lib/common/item-count-selector/item-count-selector.component.cy.ts` | 2026-05-19 |
| `projects/dashboard-core/src/lib/common/item-count-selector/item-count-selector.component.html` | 2026-05-19 |
| `projects/dashboard-core/src/lib/common/item-count-selector/item-count-selector.component.ts` | 2026-05-19 |
| `projects/dashboard-core/src/lib/common/json-object-input/json-object-input.component.ts` | 2026-06-08 |
| `projects/dashboard-core/src/lib/common/json-object-table/json-object-table.component.html` | 2026-06-08 |
| `projects/dashboard-core/src/lib/common/json-object-table/json-object-table.component.ts` | 2026-06-08 |
| `projects/dashboard-core/src/lib/common/pagination/pagination.component.cy.ts` | 2026-05-19 |
| `projects/dashboard-core/src/lib/common/pagination/pagination.component.html` | 2026-05-19,2026-05-22 |
| `projects/dashboard-core/src/lib/common/pagination/pagination.component.ts` | 2026-05-19,2026-05-22 2026-07-22 |
| `projects/dashboard-core/src/lib/dashboard-app/dashboard-app.component.html` | 2026-05-19,2026-05-21 2026-05-22,2026-06-01 2026-06-03,2026-06-04 |
| `projects/dashboard-core/src/lib/dashboard-app/dashboard-app.component.ts` | 2026-05-19,2026-05-21 2026-05-22,2026-06-03 |
| `projects/dashboard-core/src/lib/models/app-config.ts` | 2026-05-19,2026-05-29 |
| `projects/dashboard-core/src/lib/models/edc-config.ts` | 2026-05-19,2026-07-10 |
| `projects/dashboard-core/src/lib/models/menu-item.ts` | 2026-05-19 |
| `projects/dashboard-core/src/lib/services/dashboard-state.service.spec.ts` | 2026-05-19 |
| `projects/dashboard-core/src/lib/services/dashboard-state.service.ts` | 2026-05-19,2026-05-29 |
| `projects/dashboard-core/src/lib/services/edc-client.service.spec.ts` | 2026-05-19 |
| `projects/dashboard-core/src/lib/services/edc-client.service.ts` | 2026-05-19,2026-05-29 2026-06-18 |
| `projects/dashboard-core/src/lib/services/modal-and-alert.service.ts` | 2026-05-22 |
| `projects/dashboard-core/src/public-api.ts` | 2026-05-19,2026-05-20 2026-05-21,2026-05-22 2026-05-29,2026-06-03 2026-06-08,2026-06-09 2026-07-02 |
| `projects/dashboard-core/transfer/index.ts` | 2026-05-19,2026-06-18 |
| `projects/dashboard-core/transfer/src/contract-agreement-view/contract-view.component.html` | 2026-05-19,2026-06-18 |
| `projects/dashboard-core/transfer/src/contract-agreement-view/contract-view.component.ts` | 2026-05-19,2026-06-18 |
| `projects/dashboard-core/transfer/src/contract-and-transfer.service.spec.ts` | 2026-06-05 |
| `projects/dashboard-core/transfer/src/contract-and-transfer.service.ts` | 2026-06-05 |
| `projects/dashboard-core/transfer/src/transfer-history-details/transfer-history-details.component.html` | 2026-05-19,2026-06-08 |
| `projects/dashboard-core/transfer/src/transfer-history-details/transfer-history-details.component.ts` | 2026-05-19,2026-06-08 |
| `projects/dashboard-core/transfer/src/transfer-history-table/transfer-history-table.component.html` | 2026-05-19,2026-05-29 2026-06-05,2026-06-08 2026-06-09 |
| `projects/dashboard-core/transfer/src/transfer-history-table/transfer-history-table.component.ts` | 2026-05-19,2026-05-22 2026-05-29,2026-06-05 2026-06-08,2026-06-09 |
| `projects/dashboard-core/transfer/src/transfer-history-view/transfer-history-view.component.html` | 2026-05-19,2026-05-21 2026-05-29,2026-06-05 2026-06-08,2026-06-09 2026-08-07 |
| `projects/dashboard-core/transfer/src/transfer-history-view/transfer-history-view.component.ts` | 2026-05-19,2026-05-21 2026-05-29,2026-06-05 2026-06-08,2026-06-09 2026-07-02,2026-07-08 2026-07-13,2026-08-07 |
| `projects/dashboard-core/tsconfig.lib.json` | 2026-05-19 |
| `public/config/app-config.json` | 2026-05-19,2026-05-29 |
| `public/config/edc-connector-config.json` | 2026-05-19,2026-07-10 |
| `public/favicon.ico` | 2026-07-03 |
| `src/app/app.component.html` | 2026-05-19,2026-06-01 |
| `src/app/app.component.spec.ts` | 2026-05-19 |
| `src/app/app.component.ts` | 2026-05-19,2026-05-21 2026-06-01 |
| `src/app/app.config.ts` | 2026-05-19,2026-05-21 2026-05-22,2026-07-10 2026-08-07 |
| `src/app/app.routes.ts` | 2026-05-19,2026-05-20 2026-05-21 |
| `src/index.html` | 2026-05-19 |
| `src/main.ts` | 2026-05-19,2026-05-22 |
| `src/styles.css` | 2026-05-19,2026-05-21 |
| `tsconfig.json` | 2026-05-19,2026-06-08 |

### Files renamed

| From | To |
|---|---|
| `projects/dashboard-core/assets/src/asset-create/asset-create.component.css` | `projects/dashboard-core/contract-definitions/src/offer-create-selection/offer-create-selection.component.css` |
| `projects/dashboard-core/contract-definitions/src/contract-definition-create/contract-definition-create.component.css` | `projects/dashboard-core/negotiations/negotiation-details-modal/negotiation-details-modal.component.css` |
| `projects/dashboard-core/transfer/src/contract-agreement-view/contract-view.component.css` | `projects/dashboard-core/negotiations/src/contract-agreement-view/contract-view.component.css` |
| `projects/dashboard-core/contract-definitions/src/contract-definitions-view/contract-definitions-view.component.css` | `projects/dashboard-core/policies/src/policy-create-contratacion/policy-create-contratacion.component.css` |
| `projects/dashboard-core/src/lib/dashboard-app/dashboard-app.component.css` | `projects/dashboard-core/policies/src/policy-create-lds/policy-create-lds.component.css` |

### Files removed

| File | Date |
|---|---|
| `projects/dashboard-core/assets/src/asset-create/asset-create.component.html` | 2026-05-19 |
| `projects/dashboard-core/assets/src/asset-create/asset-create.component.spec.ts` | 2026-05-19 |
| `projects/dashboard-core/assets/src/asset-create/asset-create.component.ts` | 2026-05-19 |
| `projects/dashboard-core/contract-definitions/src/contract-definition-create/contract-definition-create.component.html` | 2026-05-19 |
| `projects/dashboard-core/contract-definitions/src/contract-definition-create/contract-definition-create.component.spec.ts` | 2026-05-19 |
| `projects/dashboard-core/contract-definitions/src/contract-definition-create/contract-definition-create.component.ts` | 2026-05-19 |

No copyright, licence or disclaimer notice of the original work has been altered. The files removed
above are upstream components this fork replaced with its own; nothing else of the original work
was removed, and [LICENSE](LICENSE) is untouched.

The exhaustive, per-file diff for every change is obtainable with:

```
git diff 4921ba32c97ac8b074f7ffc8693300d4971ce329..ednel
```

For a published image, substitute the release tag it was built from for `ednel`.
