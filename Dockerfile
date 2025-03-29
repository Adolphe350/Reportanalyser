FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Set a different port to avoid conflicts
ENV PORT=9000
EXPOSE 9000

CMD ["npm", "start"] 