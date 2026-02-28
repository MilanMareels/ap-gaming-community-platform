FROM node:24

WORKDIR /backend

COPY package*.json .
RUN npm install --frozen-lockfile

COPY . .

RUN npm run build

USER node

EXPOSE 3000
CMD ["node", "dist/main.js"]