FROM node:carbon

WORKDIR /opt/app

COPY package.json package-lock.json /opt/app/

RUN npm i

COPY . /opt/app

CMD ["node", "index.js"]
