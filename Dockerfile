FROM node:18-alpine

# Use a different directory less likely to be overwritten by mounts
WORKDIR /usr/src/app

# Create a minimal package.json in the new directory
RUN echo '{"name":"reportanalyser-alt-dir","version":"1.0.0","main":"server.js","scripts":{"start":"node server.js"},"dependencies":{}}' > package.json

# Create the server.js file in the new directory
RUN echo 'const http = require("http");' > server.js && \
    echo 'const port = process.env.PORT || 9000;' >> server.js && \
    echo 'const server = http.createServer((req, res) => {' >> server.js && \
    echo '  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} (running from /usr/src/app)`);' >> server.js && \
    echo '  if (req.url === "/api/health") { res.writeHead(200, { \"Content-Type\": \"application/json\" }); res.end(JSON.stringify({status: \"ok\", time: new Date().toISOString(), node: process.version, dir: \"/usr/src/app\"})); return; }' >> server.js && \
    echo '  if (req.url === "/") { res.writeHead(200, { \"Content-Type\": \"text/html\" }); res.end(\"<html><body><h1>Report Analyzer (Alt Dir)</h1><p>Running from /usr/src/app.</p></body></html>\"); return; }' >> server.js && \
    echo '  res.writeHead(302, { \"Location\": \"/\" }); res.end();' >> server.js && \
    echo '});' >> server.js && \
    echo 'server.listen(port, "0.0.0.0", () => { console.log(`Alt Dir Server running on port ${port}`); });'

# Verify the files were created during build in the new directory
RUN echo "--- Build Step: Contents of /usr/src/app ---" && ls -la /usr/src/app

# Set environment variables
ENV PORT=9000
ENV NODE_ENV=production

# Expose the port
EXPOSE 9000

# Start the server using the absolute path to server.js in the new directory
CMD ["node", "/usr/src/app/server.js"] 