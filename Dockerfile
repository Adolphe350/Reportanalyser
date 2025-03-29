FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Set a different port to avoid port 3000
ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"] 