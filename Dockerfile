FROM node:18-alpine

# Create app directory outside of /app to avoid Coolify's volume mount
WORKDIR /simple-app

# Create public directory for static files
RUN mkdir -p public/css public/js

# Create index.html in public folder
RUN echo '<!DOCTYPE html><html><head><title>AI Report Analyzer</title><link rel="stylesheet" href="/css/style.css"></head><body><header><h1>AI Report Analyzer</h1><nav><a href="/">Home</a><a href="/dashboard.html">Dashboard</a></nav></header><main><section class="hero"><h2>Transform Your Reports with AI</h2><p>Upload and analyze your reports with advanced AI technology</p><a href="/dashboard.html" class="btn">Get Started</a></section><section class="features"><div class="feature"><h3>Fast Analysis</h3><p>Process documents in seconds</p></div><div class="feature"><h3>Smart Insights</h3><p>Extract key data automatically</p></div><div class="feature"><h3>Visual Reports</h3><p>Beautiful charts and visualizations</p></div></section></main><footer>&copy; 2025 AI Report Analyzer</footer><script src="/js/main.js"></script></body></html>' > public/index.html

# Create dashboard.html in public folder
RUN echo '<!DOCTYPE html><html><head><title>Dashboard - AI Report Analyzer</title><link rel="stylesheet" href="/css/style.css"><link rel="stylesheet" href="/css/dashboard.css"></head><body><header><h1>AI Report Analyzer</h1><nav><a href="/">Home</a><a href="/dashboard.html">Dashboard</a></nav></header><main><h2>Dashboard</h2><div class="upload-area"><h3>Upload Report</h3><div class="dropzone" id="dropzone">Drop file here or click to upload</div><button class="btn" id="analyze-btn" disabled>Analyze Report</button></div><div class="stats"><h3>Statistics</h3><div class="stat-container"><div class="stat"><h4>Reports</h4><p>28</p></div><div class="stat"><h4>Pages</h4><p>342</p></div><div class="stat"><h4>Data Points</h4><p>1,240</p></div></div></div></main><footer>&copy; 2025 AI Report Analyzer</footer><script src="/js/main.js"></script><script src="/js/dashboard.js"></script></body></html>' > public/dashboard.html

# Create CSS files
RUN echo 'body{font-family:Arial,sans-serif;margin:0;padding:0;line-height:1.6}header{background:#0066cc;color:white;padding:1rem;display:flex;justify-content:space-between;align-items:center}nav a{color:white;margin-left:1rem;text-decoration:none}main{max-width:1200px;margin:0 auto;padding:1rem}footer{text-align:center;padding:1rem;background:#f5f5f5;margin-top:2rem}.hero{text-align:center;padding:3rem 1rem;background:#f0f8ff}.btn{display:inline-block;background:#0066cc;color:white;padding:0.5rem 1rem;text-decoration:none;border-radius:4px;border:none;cursor:pointer}.btn:hover{background:#004c99}.btn:disabled{opacity:0.5;cursor:not-allowed}.features{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:2rem;margin-top:2rem}.feature{background:white;padding:1.5rem;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);text-align:center}' > public/css/style.css

RUN echo '.upload-area{background:white;padding:1.5rem;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);margin-bottom:2rem}.dropzone{border:2px dashed #ccc;border-radius:4px;padding:2rem;text-align:center;margin:1rem 0;cursor:pointer}.dropzone:hover,.dropzone.active{border-color:#0066cc;background:#f0f8ff}.stats{background:white;padding:1.5rem;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1)}.stat-container{display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:1rem}.stat{text-align:center}.stat h4{margin-bottom:0.5rem}.stat p{font-size:1.5rem;font-weight:bold;color:#0066cc;margin:0}' > public/css/dashboard.css

# Create JavaScript files
RUN echo 'console.log("Main script loaded");' > public/js/main.js

RUN echo 'document.addEventListener("DOMContentLoaded",function(){const e=document.getElementById("dropzone"),t=document.getElementById("analyze-btn");e&&t&&(e.addEventListener("click",function(){console.log("Dropzone clicked")}),e.addEventListener("dragover",function(t){t.preventDefault(),e.classList.add("active")}),e.addEventListener("dragleave",function(){e.classList.remove("active")}),e.addEventListener("drop",function(n){n.preventDefault(),e.classList.remove("active"),console.log("File dropped"),e.textContent="File selected: example.pdf",t.disabled=!1}),t.addEventListener("click",function(){alert("Analysis started! This is a demo.")}))});' > public/js/dashboard.js

# Create server.js to serve the static files
RUN echo 'const http = require("http");' > server.js
RUN echo 'const fs = require("fs");' >> server.js
RUN echo 'const path = require("path");' >> server.js
RUN echo 'const port = process.env.PORT || 9000;' >> server.js
RUN echo '' >> server.js
RUN echo 'const mimeTypes = {' >> server.js
RUN echo '  ".html": "text/html",' >> server.js
RUN echo '  ".css": "text/css",' >> server.js
RUN echo '  ".js": "text/javascript",' >> server.js
RUN echo '  ".json": "application/json",' >> server.js
RUN echo '  ".png": "image/png",' >> server.js
RUN echo '  ".jpg": "image/jpeg"' >> server.js
RUN echo '};' >> server.js
RUN echo '' >> server.js
RUN echo 'const server = http.createServer((req, res) => {' >> server.js
RUN echo '  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);' >> server.js
RUN echo '' >> server.js
RUN echo '  if (req.url === "/api/health") {' >> server.js
RUN echo '    res.writeHead(200, { "Content-Type": "application/json" });' >> server.js
RUN echo '    res.end(JSON.stringify({ status: "ok", time: new Date().toISOString() }));' >> server.js
RUN echo '    return;' >> server.js
RUN echo '  }' >> server.js
RUN echo '' >> server.js
RUN echo '  let filePath = path.join(__dirname, "public", req.url === "/" ? "index.html" : req.url);' >> server.js
RUN echo '  const extname = path.extname(filePath);' >> server.js
RUN echo '' >> server.js
RUN echo '  fs.access(filePath, fs.constants.F_OK, (err) => {' >> server.js
RUN echo '    if (err) {' >> server.js
RUN echo '      if (!extname) {' >> server.js
RUN echo '        filePath = path.join(__dirname, "public", "index.html");' >> server.js
RUN echo '      } else {' >> server.js
RUN echo '        res.writeHead(404);' >> server.js
RUN echo '        res.end("404 Not Found");' >> server.js
RUN echo '        return;' >> server.js
RUN echo '      }' >> server.js
RUN echo '    }' >> server.js
RUN echo '' >> server.js
RUN echo '    fs.readFile(filePath, (err, content) => {' >> server.js
RUN echo '      if (err) {' >> server.js
RUN echo '        res.writeHead(500);' >> server.js
RUN echo '        res.end(`Server Error: ${err.code}`);' >> server.js
RUN echo '        return;' >> server.js
RUN echo '      }' >> server.js
RUN echo '' >> server.js
RUN echo '      const contentType = mimeTypes[extname] || "text/plain";' >> server.js
RUN echo '      res.writeHead(200, { "Content-Type": contentType });' >> server.js
RUN echo '      res.end(content);' >> server.js
RUN echo '    });' >> server.js
RUN echo '  });' >> server.js
RUN echo '});' >> server.js
RUN echo '' >> server.js
RUN echo 'server.listen(port, "0.0.0.0", () => {' >> server.js
RUN echo '  console.log(`Server running on port ${port}`);' >> server.js
RUN echo '});' >> server.js

# Verify files were created
RUN ls -la /simple-app/public/css /simple-app/public/js

# Set environment variables  
ENV PORT=9000
ENV NODE_ENV=production

# Expose the port
EXPOSE 9000

# Start the server
CMD ["node", "server.js"] 