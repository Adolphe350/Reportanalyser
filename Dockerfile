FROM node:18-alpine

# Create app directory outside of /app to avoid Coolify's volume mount
WORKDIR /simple-app

# Create public directory for static files
RUN mkdir -p public

# Create an improved index.html with distinctive styling
RUN echo '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Report Analyzer - Home</title>
    <style>
        /* Reset and base styles */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: "Segoe UI", Arial, sans-serif; 
            line-height: 1.6;
            color: #333;
            background-color: #f7f9fc;
        }
        
        /* Header styles */
        header {
            background: linear-gradient(135deg, #0066cc, #004080);
            color: white;
            padding: 25px 0;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.2);
        }
        header p {
            font-size: 1.2rem;
            opacity: 0.9;
        }
        
        /* Main content */
        main {
            max-width: 1000px;
            margin: 40px auto;
            padding: 30px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
        }
        
        .intro {
            text-align: center;
            margin-bottom: 40px;
        }
        
        .intro h2 {
            font-size: 2rem;
            color: #0066cc;
            margin-bottom: 15px;
        }
        
        .intro p {
            font-size: 1.1rem;
            color: #555;
            max-width: 700px;
            margin: 0 auto 20px;
        }
        
        /* Features section */
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 30px;
            margin-top: 50px;
        }
        
        .feature-card {
            background-color: #f9f9f9;
            border-radius: 8px;
            padding: 25px;
            text-align: center;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .feature-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
        }
        
        .feature-icon {
            font-size: 2.5rem;
            margin-bottom: 15px;
            color: #0066cc;
        }
        
        .feature-card h3 {
            font-size: 1.3rem;
            margin-bottom: 10px;
            color: #0066cc;
        }
        
        /* Status section */
        .status-section {
            margin-top: 40px;
            background-color: #e8f4ff;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        
        .status-section h3 {
            color: #0066cc;
            margin-bottom: 10px;
        }
        
        /* Footer */
        footer {
            text-align: center;
            padding: 25px 0;
            color: #666;
            border-top: 1px solid #eee;
            margin-top: 50px;
        }
    </style>
</head>
<body>
    <header>
        <h1>AI Report Analyzer</h1>
        <p>Unlock insights from your documents with advanced AI</p>
    </header>
    
    <main>
        <section class="intro">
            <h2>Welcome to AI Report Analyzer</h2>
            <p>Our powerful AI platform transforms complex reports into actionable insights, saving you hours of analysis time.</p>
        </section>
        
        <div class="features">
            <div class="feature-card">
                <div class="feature-icon">📊</div>
                <h3>Data Extraction</h3>
                <p>Automatically extract key metrics and data points from any document format</p>
            </div>
            
            <div class="feature-card">
                <div class="feature-icon">🔍</div>
                <h3>Intelligent Analysis</h3>
                <p>Discover patterns and insights that would take hours to find manually</p>
            </div>
            
            <div class="feature-card">
                <div class="feature-icon">📈</div>
                <h3>Visual Reports</h3>
                <p>Generate beautiful visualizations to communicate your findings effectively</p>
            </div>
        </div>
        
        <section class="status-section">
            <h3>Server Status</h3>
            <p>Current Time: <span id="server-time">Loading...</span></p>
            <p>Page Loaded Successfully from Public Directory</p>
        </section>
    </main>
    
    <footer>
        <p>&copy; 2025 AI Report Analyzer. All rights reserved.</p>
    </footer>
    
    <script>
        // Update the server time
        document.getElementById("server-time").textContent = new Date().toLocaleString();
        
        // Add a little animation to the feature cards
        document.addEventListener("DOMContentLoaded", function() {
            const cards = document.querySelectorAll(".feature-card");
            cards.forEach((card, index) => {
                setTimeout(() => {
                    card.style.opacity = "1";
                }, 100 * index);
            });
        });
    </script>
</body>
</html>' > public/index.html

# Create an ultra simple server that loads the index.html file dynamically
RUN echo 'const http = require("http");' > server.js
RUN echo 'const fs = require("fs");' >> server.js
RUN echo 'const path = require("path");' >> server.js
RUN echo 'const port = process.env.PORT || 9000;' >> server.js
RUN echo '' >> server.js
RUN echo 'console.log(`Starting server on port ${port}`);' >> server.js
RUN echo 'console.log(`Current directory: ${__dirname}`);' >> server.js
RUN echo 'console.log(`Files in public directory:`);' >> server.js
RUN echo 'try {' >> server.js
RUN echo '  console.log(fs.readdirSync(path.join(__dirname, "public")).join(", "));' >> server.js
RUN echo '} catch (err) {' >> server.js
RUN echo '  console.error(`Error reading directory: ${err.message}`);' >> server.js
RUN echo '}' >> server.js
RUN echo '' >> server.js
RUN echo 'const server = http.createServer((req, res) => {' >> server.js
RUN echo '  const timestamp = new Date().toISOString();' >> server.js
RUN echo '  console.log(`[${timestamp}] ${req.method} ${req.url}`);' >> server.js
RUN echo '' >> server.js
RUN echo '  // Health check endpoint' >> server.js
RUN echo '  if (req.url === "/health" || req.url === "/api/health") {' >> server.js
RUN echo '    console.log(`[${timestamp}] Serving health check response`);' >> server.js
RUN echo '    res.writeHead(200, { "Content-Type": "application/json" });' >> server.js
RUN echo '    res.end(JSON.stringify({' >> server.js
RUN echo '      status: "ok",' >> server.js
RUN echo '      time: timestamp,' >> server.js
RUN echo '      uptime: process.uptime()' >> server.js
RUN echo '    }));' >> server.js
RUN echo '    return;' >> server.js
RUN echo '  }' >> server.js
RUN echo '' >> server.js
RUN echo '  // Serve the index.html for all other requests' >> server.js
RUN echo '  const indexPath = path.join(__dirname, "public", "index.html");' >> server.js
RUN echo '  console.log(`[${timestamp}] Reading index.html from ${indexPath}`);' >> server.js
RUN echo '' >> server.js
RUN echo '  fs.readFile(indexPath, "utf8", (err, content) => {' >> server.js
RUN echo '    if (err) {' >> server.js
RUN echo '      console.error(`Error reading index.html: ${err.message}`);' >> server.js
RUN echo '      res.writeHead(500);' >> server.js
RUN echo '      res.end(`Server Error: Unable to read index.html`);' >> server.js
RUN echo '      return;' >> server.js
RUN echo '    }' >> server.js
RUN echo '' >> server.js
RUN echo '    console.log(`[${timestamp}] Successfully read index.html (${content.length} bytes)`);' >> server.js
RUN echo '    res.writeHead(200, { "Content-Type": "text/html" });' >> server.js
RUN echo '    res.end(content);' >> server.js
RUN echo '  });' >> server.js
RUN echo '});' >> server.js
RUN echo '' >> server.js
RUN echo 'server.on("error", (err) => {' >> server.js
RUN echo '  console.error(`Server error: ${err.message}`);' >> server.js
RUN echo '});' >> server.js
RUN echo '' >> server.js
RUN echo 'server.listen(port, "0.0.0.0", () => {' >> server.js
RUN echo '  console.log(`Server is running at http://0.0.0.0:${port}/`);' >> server.js
RUN echo '  console.log(`Environment: ${process.env.NODE_ENV}`);' >> server.js
RUN echo '});' >> server.js

# Set environment variables  
ENV PORT=9000
ENV NODE_ENV=production

# Expose the port
EXPOSE 9000

# Start the server with increased diagnostic output
CMD ["node", "--trace-warnings", "server.js"] 