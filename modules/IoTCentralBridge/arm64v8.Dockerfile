FROM arm64v8/node:13-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    net-tools \
    unzip \
    systemd-sysv \
    && rm -rf /var/lib/apt/lists/*

ENV WORKINGDIR /app
WORKDIR ${WORKINGDIR}

ADD package.json ${WORKINGDIR}/package.json
ADD tslint.json ${WORKINGDIR}/tslint.json
ADD tsconfig.json ${WORKINGDIR}/tsconfig.json
ADD src ${WORKINGDIR}/src

RUN npm install -q && \
    ./node_modules/typescript/bin/tsc -p . && \
    ./node_modules/tslint/bin/tslint -p ./tsconfig.json && \
    npm prune --production && \
    rm -f tslint.json && \
    rm -f tsconfig.json && \
    rm -rf src

# HEALTHCHECK \
#     --interval=30s \
#     --timeout=30s \
#     --start-period=60s \
#     --retries=3 \
#     CMD curl -f http://localhost:9014/health || exit 1

EXPOSE 9014

CMD ["node", "./dist/index"]
