FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Use a different port to avoid conflicts
ENV PORT=8080
EXPOSE ${PORT}

CMD ["npm", "start"] 