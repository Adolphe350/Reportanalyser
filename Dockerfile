FROM node:18-alpine

# Create a different app directory to avoid Coolify's volume mount on /app
WORKDIR /srv/app

# Create a package.json with Express dependency
RUN echo '{"name":"reportanalyser","version":"1.0.0","main":"server.js","scripts":{"start":"node server.js"},"dependencies":{"express":"^4.18.2"}}' > package.json

# Install dependencies
RUN npm install

# Copy the public directory first to make sure it's available
COPY public /srv/app/public

# Create the server.js file that will serve the public folder
RUN echo 'const express = require("express");' > server.js && \
    echo 'const path = require("path");' >> server.js && \
    echo 'const fs = require("fs");' >> server.js && \
    echo 'const app = express();' >> server.js && \
    echo 'const port = process.env.PORT || 9000;' >> server.js && \
    echo '' >> server.js && \
    echo '// Log requests middleware' >> server.js && \
    echo 'app.use((req, res, next) => {' >> server.js && \
    echo '  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);' >> server.js && \
    echo '  next();' >> server.js && \
    echo '});' >> server.js && \
    echo '' >> server.js && \
    echo '// Check if public directory exists' >> server.js && \
    echo 'if (fs.existsSync(path.join(__dirname, "public"))) {' >> server.js && \
    echo '  console.log("Public directory found, serving static files");' >> server.js && \
    echo '  app.use(express.static(path.join(__dirname, "public")));' >> server.js && \
    echo '} else {' >> server.js && \
    echo '  console.log("Public directory not found, will serve fallback content");' >> server.js && \
    echo '}' >> server.js && \
    echo '' >> server.js && \
    echo '// API health endpoint' >> server.js && \
    echo 'app.get("/api/health", (req, res) => {' >> server.js && \
    echo '  res.json({' >> server.js && \
    echo '    status: "ok",' >> server.js && \
    echo '    time: new Date().toISOString(),' >> server.js && \
    echo '    publicDir: fs.existsSync(path.join(__dirname, "public")),' >> server.js && \
    echo '    directory: __dirname,' >> server.js && \
    echo '    files: fs.existsSync(path.join(__dirname, "public")) ? fs.readdirSync(path.join(__dirname, "public")) : []' >> server.js && \
    echo '  });' >> server.js && \
    echo '});' >> server.js && \
    echo '' >> server.js && \
    echo '// Fallback route if index.html doesn\'t exist' >> server.js && \
    echo 'app.get("/", (req, res) => {' >> server.js && \
    echo '  const indexPath = path.join(__dirname, "public", "index.html");' >> server.js && \
    echo '  if (fs.existsSync(indexPath)) {' >> server.js && \
    echo '    res.sendFile(indexPath);' >> server.js && \
    echo '  } else {' >> server.js && \
    echo '    res.send(`' >> server.js && \
    echo '      <!DOCTYPE html>' >> server.js && \
    echo '      <html><head><title>Report Analyzer</title></head>' >> server.js && \
    echo '      <body><h1>Report Analyzer</h1><p>Serving from ${__dirname}</p>' >> server.js && \
    echo '      <p>Cannot find public/index.html</p></body></html>' >> server.js && \
    echo '    `);' >> server.js && \
    echo '  }' >> server.js && \
    echo '});' >> server.js && \
    echo '' >> server.js && \
    echo '// Catch all route - send to index.html for client-side routing' >> server.js && \
    echo 'app.get("*", (req, res) => {' >> server.js && \
    echo '  const indexPath = path.join(__dirname, "public", "index.html");' >> server.js && \
    echo '  if (fs.existsSync(indexPath)) {' >> server.js && \
    echo '    res.sendFile(indexPath);' >> server.js && \
    echo '  } else {' >> server.js && \
    echo '    res.redirect("/");' >> server.js && \
    echo '  }' >> server.js && \
    echo '});' >> server.js && \
    echo '' >> server.js && \
    echo '// Start the server' >> server.js && \
    echo 'app.listen(port, "0.0.0.0", () => {' >> server.js && \
    echo '  console.log(`Server running on port ${port}`);' >> server.js && \
    echo '  console.log(`Current directory: ${__dirname}`);' >> server.js && \
    echo '  console.log(`Public directory exists: ${fs.existsSync(path.join(__dirname, "public"))}`);' >> server.js && \
    echo '  if (fs.existsSync(path.join(__dirname, "public"))) {' >> server.js && \
    echo '    console.log(`Files in public: ${fs.readdirSync(path.join(__dirname, "public")).join(", ")}`);' >> server.js && \
    echo '  }' >> server.js && \
    echo '});'

# Verify the server.js file and public directory were created during build
RUN echo "--- Build Step: Contents of /srv/app ---" && ls -la /srv/app
RUN echo "--- Build Step: Contents of /srv/app/public (if exists) ---" && \
    if [ -d "/srv/app/public" ]; then ls -la /srv/app/public; else echo "public directory doesn't exist"; fi

# Set environment variables
ENV PORT=9000
ENV NODE_ENV=production

# Expose the port
EXPOSE 9000

# Start the server using the generated server.js
CMD ["node", "/srv/app/server.js"] 