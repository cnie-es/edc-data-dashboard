#
#  Copyright (c) 2025 Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V.
#
#  This program and the accompanying materials are made available under the
#  terms of the Apache License, Version 2.0 which is available at
#  https://www.apache.org/licenses/LICENSE-2.0
#
#  SPDX-License-Identifier: Apache-2.0
#
#  Contributors:
#       Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V. - initial API and implementation
#

FROM nginxinc/nginx-unprivileged:1.27.4-alpine3.21-slim@sha256:e9796392bfbd5d97721c1d67fa1433cb2f5658a72b9b3ef6af3f63b00a4c273e

ARG IMAGE_REVISION="0000000000000000000000000000000000000000"
ARG IMAGE_CREATED="1970-01-01T00:00:00Z"

# Apache License 2.0, Section 4: this image ships a modified version of the Eclipse EDC Data
# Dashboard. Section 4(a) requires a copy of the Licence to travel with every distribution, and
# 4(b) a prominent notice of which files were changed; both are copied in below. The labels point
# to the repository where the source of this fork lives.
#
# The base image (nginx-unprivileged) declares its own maintainer/url/revision/created labels;
# every key below is re-declared explicitly so none of that third-party metadata survives here.
LABEL org.opencontainers.image.title="EDC Data Dashboard (CNIE-ES fork)" \
      org.opencontainers.image.description="Modified version of the Eclipse EDC Data Dashboard (upstream eclipse-edc/DataDashboard at 4921ba3), modified by the EDNEL-RIOJA project team for CNIE-ES between 2026-02-20 and 2026-09-16. See /licenses/NOTICE.EDNEL.md." \
      org.opencontainers.image.version="v1.0.13-edval" \
      org.opencontainers.image.vendor="CNIE-ES" \
      org.opencontainers.image.licenses="Apache-2.0" \
      org.opencontainers.image.source="https://github.com/cnie-es/edc-data-dashboard" \
      maintainer="EDVAL Maintainers <info@cnie.es>" \
      org.opencontainers.image.url="https://github.com/cnie-es/edc-data-dashboard" \
      org.opencontainers.image.revision="${IMAGE_REVISION}" \
      org.opencontainers.image.created="${IMAGE_CREATED}"

USER root
RUN apk add --no-cache gettext

# The release/build.sh hook produces dist/; the image only copies what it needs.
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --chown=nginx:nginx dist/data-dashboard/browser /app
COPY --chown=nginx:nginx config-templates /app/config-templates
COPY --chmod=755 docker-entrypoint.sh /docker-entrypoint.sh

# Apache License 2.0, Sections 4(a) and 4(b): the licence and the record of what this fork changed
# travel with every copy of the Work. The upstream project ships no NOTICE file, so none is copied.
COPY LICENSE NOTICE.EDNEL.md /licenses/

RUN mkdir -p /app/config && chown -R nginx:nginx /app/config

USER nginx

EXPOSE 8080

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
