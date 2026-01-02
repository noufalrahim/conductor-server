FROM node:20

WORKDIR /app

ENV NODE_ENV=development

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 8000
CMD ["npm", "run", "dev"]
