FROM node:alpine

ADD src/ /app
WORKDIR /app

RUN npm install

CMD [ "node", "index.js" ]