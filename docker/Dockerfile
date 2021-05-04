FROM amazon/aws-lambda-nodejs:14 AS builder
WORKDIR /usr/app

COPY package*.json tsconfig.json ./
RUN npm install

COPY ./src ./src/
RUN npm run build

RUN ls -la # for debugging

# ============================

FROM amazon/aws-lambda-nodejs:14

WORKDIR /usr/app

COPY package*.json ./

RUN npm install --only=prod

COPY --from=builder /usr/app/dist /usr/app/dist

CMD [ "/usr/app/dist/handler.index" ]
