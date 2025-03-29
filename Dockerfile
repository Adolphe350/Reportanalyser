FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Use port 3005 as suggested in the error message
ENV PORT=3005
EXPOSE ${PORT}

CMD ["npm", "start"] 