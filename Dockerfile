FROM node:18-alpine

# Create app directory outside of /app to avoid Coolify's volume mount
WORKDIR /simple-app

# Create a minimal server with inline HTML
RUN echo 'const http = require("http");' > index.js
RUN echo 'const port = process.env.PORT || 9000;' >> index.js
RUN echo '' >> index.js

# Create the HTML content as a template string
RUN echo 'const html = `<!DOCTYPE html>' >> index.js
RUN echo '<html><head><title>AI Report Analyzer</title>' >> index.js
RUN echo '<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">' >> index.js
RUN echo '<style>' >> index.js
RUN echo 'body{font-family:Arial,sans-serif;margin:0;padding:0;background:#f5f5f5;}' >> index.js
RUN echo 'header{background:#0066cc;color:white;padding:20px;text-align:center;}' >> index.js
RUN echo 'main{max-width:800px;margin:20px auto;padding:20px;background:white;box-shadow:0 0 10px rgba(0,0,0,0.1);}' >> index.js
RUN echo 'h1{margin:0;}footer{text-align:center;padding:20px;color:#666;}' >> index.js
RUN echo '</style></head><body>' >> index.js
RUN echo '<header><h1>AI Report Analyzer</h1></header>' >> index.js
RUN echo '<main><h2>Welcome to Report Analyzer</h2>' >> index.js
RUN echo '<p>This application helps you analyze complex reports using advanced AI technology.</p>' >> index.js
RUN echo '<p>Key features:</p><ul>' >> index.js
RUN echo '<li>Process large reports up to hundreds of pages</li>' >> index.js
RUN echo '<li>Extract key insights and data points</li>' >> index.js
RUN echo '<li>Generate summaries and visualizations</li></ul>' >> index.js
RUN echo '</main><footer>© 2025 AI Report Analyzer</footer>' >> index.js
RUN echo '</body></html>`;' >> index.js
RUN echo '' >> index.js

# Create the server
RUN echo 'const server = http.createServer((req, res) => {' >> index.js
RUN echo '  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);' >> index.js
RUN echo '  res.writeHead(200, { "Content-Type": "text/html" });' >> index.js
RUN echo '  res.end(html);' >> index.js
RUN echo '});' >> index.js
RUN echo '' >> index.js
RUN echo 'server.listen(port, "0.0.0.0", () => {' >> index.js
RUN echo '  console.log(`Server running at http://0.0.0.0:${port}/`);' >> index.js
RUN echo '});' >> index.js

# Set environment variables  
ENV PORT=9000
ENV NODE_ENV=production

# Expose the port
EXPOSE 9000

# Start the server
CMD ["node", "index.js"] 