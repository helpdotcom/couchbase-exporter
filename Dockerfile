FROM node:carbon as base

WORKDIR /opt/app

COPY package.json package-lock.json /opt/app/

RUN npm i

COPY . /opt/app

FROM debian:jessie-slim as release

RUN groupadd --gid 1000 help \
  && useradd --uid 1000 --gid help --shell /bin/bash --create-home help

COPY --from=base /usr/local/bin /usr/local/bin
COPY --from=base /usr/local/include/node /usr/local/include
COPY --from=base /usr/local/lib/node_modules/ /usr/local/lib/node_modules/
COPY --from=base --chown=help:help /opt/app /opt/app

USER help

WORKDIR /opt/app

CMD ["node", "index.js"]
