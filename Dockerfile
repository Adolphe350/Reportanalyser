FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Use the PORT environment variable or default to 3000
ENV PORT=3000
EXPOSE ${PORT}

CMD ["npm", "start"] 